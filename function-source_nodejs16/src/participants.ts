import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as docTypes from "./lib/docTypes";
import * as streamingSessions from "./lib/streamingSessions/index";
import * as gameservers from "./lib/gameservers/index";
import {deletePodStack, updateDeploymentState, updateParticipantState} from "./lib/streamingSessions/deploy-standard";
import {customRunWith, customRunWithWarm} from "./shared";
import {getFirebaseProjectId} from "./lib/firebase";
import {addRoom, deploymentWildcardPath, getDeployments, GetFirestoreDocResult, getHistoricParticipant, getHistoricParticipantRef, getParticipantDenormalizedRef, getParticipantsRef, participantDenormalizedWildcardPath, getParticipantsDenormalizedRef, getRoom, getRoomRef, getRoomsRef, getUser, participantWildcardPath, roomWildcardPath, getOrganizationUser, getSpaceUser, getParticipant, browserStateUpdateWebRtcWildcardPath, getDevice, getSpace, getCommsParticipantRef, getParticipantUsageCollectionRef, getParticipantUsageChecksRef, roomParticipantUsageCheckWildcardPath, getParticipantUsageCheckRef, getBillingUsageRef, getBillingPublic, getCompletedParticipantRef, getParticipantRef, getBridgeToolkitSettingsItem} from "./lib/documents/firestore";
import {AfkCheckParticipantRequestData, CreateParticipantRequestData} from "./lib/httpTypes";
import {resolveSpaceUnrealProjectVersion} from "./lib/unrealProjects/shared";
import {calculateParticipantUsage} from "./lib/participants";
import {ParticipantUsageCheckOperation} from "./lib/systemDocTypes";
import {getConfigurationBilling} from "./lib/billing";
import {queryRoomUsageCheckOperation} from "./lib/organizations/usage";
import {userCanViewSpace} from "./lib/organizations";

const afkCheck =
// Https callable
// Update the afkCheck timestamp for a given participant
functions
  .runWith(customRunWithWarm)
  .https.onCall(async (data, context) => {
    try {
      const afkCheckParticipantRequestData = data as AfkCheckParticipantRequestData;
      const userId = context.auth?.uid;

      if (userId == undefined) {
        throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
      }

      const [participantDoc] = await getParticipant(afkCheckParticipantRequestData.organizationId, afkCheckParticipantRequestData.roomId, userId + ":" + afkCheckParticipantRequestData.deviceId);

      if (participantDoc == undefined || participantDoc.exists == false) {
        console.error("Participant to afkCheck is missing");
        throw new functions.https.HttpsError("not-found", "Participant not found");
      } else {
        return participantDoc.ref.update({afkCheck: admin.firestore.Timestamp.now()});
      }
    } catch (e: any) {
      if (e instanceof functions.auth.HttpsError) {
        throw e;
      } else {
        console.error("Unknown error encountered");
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
      }
    }
  });

const createParticipant =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: CreateParticipantRequestData, context) => {
      try {
        if (data.organizationId == undefined) {
          throw new functions.https.HttpsError("invalid-argument", "Missing organizationId parameter");
        }
        if (data.deviceId == undefined) {
          throw new functions.https.HttpsError("invalid-argument", "Missing deviceId parameter");
        }
        if (data.roomId == undefined) {
          throw new functions.https.HttpsError("invalid-argument", "Missing roomId parameter");
        }
        const userId = context.auth?.uid;
        if (userId == undefined) {
          throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }

        const room = (await getRoom(data.organizationId, data.roomId))[1];

        if (room == undefined || room.spaceId == undefined) {
          throw new functions.https.HttpsError("not-found", "Room or its associated space not found");
        }

        const userCanViewSpaceResult = await userCanViewSpace(data.organizationId, room.spaceId, userId);

        if (userCanViewSpaceResult.result === false) {
          console.debug(userCanViewSpaceResult.reason);
          throw new functions.https.HttpsError("permission-denied", "User doesn't have permission to view the space");
        }

        const participantId = userId + ":" + data.deviceId;
        const [existingParticipantDoc, existingParticipant] = (await getParticipant(data.organizationId, data.roomId, participantId));
        const deployments = (await getDeployments(data.organizationId, data.roomId, participantId))?.flatMap((r) => {
          return (r[1] != undefined) ? [r] : [];
        });

        // If the participant doesn't exist now, but did exist in the past (i.e. it has at least one deployment doc), return an error
        if (existingParticipant === undefined && deployments != undefined && deployments.length > 0) {
          throw new functions.https.HttpsError("resource-exhausted", "A participant with that id already existed in the past");
        }

        // if the participant still exists now, just return it
        if (existingParticipant !== undefined && existingParticipantDoc !== undefined) {
          return {
            ...existingParticipant,
            id: existingParticipantDoc.id,
          };
        }

        // Create a new participant
        if (existingParticipant === undefined) {
          const newParticipant : docTypes.Participant = {
            deviceId: data.deviceId,
            userId,
            created: admin.firestore.Timestamp.now(),
            updated: admin.firestore.Timestamp.now(),
            state: "new",
          };
          await getParticipantRef(data.organizationId, data.roomId, participantId).create(newParticipant);
          const [, participant] = await getParticipant(data.organizationId, data.roomId, participantId);
          if (participant === undefined) {
            throw new Error("Failed to create participant");
          }
          return {
            ...participant,
            id: participantId,
          };
        }
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

const newParticipantDenormalize =
  // onCreate() of new participant
  // Denormalize participant user / device data
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const participant = snapshot.data() as docTypes.Participant;
      const organizationId = context.params.organizationId;
      const participantId : string = context.params.participantId;
      const [userId, deviceId] = participantId.split(":");
      const roomId : string = context.params.roomId;

      const [, user] = await getUser(userId);
      if (user == undefined) {
        return console.error("User undefined");
      }

      const [, room] = await getRoom(organizationId, roomId);
      if (room == undefined) {
        return console.error("Room undefined");
      }
      const spaceId : string = room.spaceId || "";

      // determine user role
      let role = "space_visitor";
      const [, orgMember] = await getOrganizationUser(organizationId, userId);
      const [, spaceMember] = await getSpaceUser(organizationId, spaceId, userId);
      if (orgMember != undefined) {
        role = orgMember.role;
      } else if (spaceMember != undefined) {
        role = spaceMember.role;
      }

      const participantDenormalized : docTypes.ParticipantDenormalized = {
        created: participant.created,
        updated: participant.updated,
        userId: participant.userId,
        userEmail: user.email,
        deviceId: deviceId,
        userRole: role,
      };

      if (user.name != undefined) {
        participantDenormalized.userName = user.name;
      }

      if (user.avatarReadyPlayerMeImg != undefined) {
        participantDenormalized.avatarReadyPlayerMeImg = user.avatarReadyPlayerMeImg;
      }

      return await getParticipantDenormalizedRef(organizationId, roomId, participantId).set(participantDenormalized);
    });

const newParticipantIncrementCount =
  // onCreate() of new participant
  // Increment currentParticipantCount by 1
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantCount = (await getParticipantsRef(organizationId, roomId).orderBy("created").get()).size;
      console.debug("Setting room currentParticipantCount: ", participantCount);
      return await getRoomRef(organizationId, roomId).update({currentParticipantCount: participantCount});
    });

const newCommsParticipant =
// onCreate() of new participant
// Create new commsParticipant
functions
  .runWith(customRunWith)
  .firestore
  .document(participantWildcardPath())
  .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const participantId : string = context.params.participantId;
    const roomId : string = context.params.roomId;

    const userId = participantId.split(":")[0];
    const [, user] = await getUser(userId);
    if (user == undefined) {
      return console.error("User undefined");
    }

    const roomsCommsParticipant : docTypes.RoomsCommsParticipant = {
      userId,
      audioChannelId: "",
      dolbyParticipantId: "",
      connectedToDolby: false,
    };

    if (user.name != undefined) {
      roomsCommsParticipant.userName = user.name;
    }

    if (user.avatarReadyPlayerMeImg != undefined) {
      roomsCommsParticipant.avatarReadyPlayerMeImg = user.avatarReadyPlayerMeImg;
    }

    return await getCommsParticipantRef(organizationId, roomId, participantId).set(roomsCommsParticipant);
  });

const newAdminIncrementCount =
// onCreate() of new participantDenormalized
// Increment currentAdminCount by 1
functions
  .runWith(customRunWith)
  .firestore
  .document(participantDenormalizedWildcardPath())
  .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId : string = context.params.roomId;
    const adminCount = (await getParticipantsDenormalizedRef(organizationId, roomId).get()).docs.filter((doc) => doc.exists && (doc.data().userRole.includes("org_"))).length;
    console.debug("Setting room currentAdminCount: ", adminCount);
    return await getRoomRef(organizationId, roomId).update({currentAdminCount: adminCount});
  });

const newParticipantNewRoomShard =
  // onCreate() of new participant
  // Create a new roomShard if participants exceeds the threshold
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const defaultNewShardThreshold = 70;

      const [roomDoc, room] = await getRoom(organizationId, roomId);

      if (room == undefined || roomDoc == undefined) {
        return console.error("Room undefined");
      }

      console.debug("Getting original room");
      const getOriginalRoom = async () => (room.shardOf == undefined) ? Promise.resolve([roomDoc, room]) as Promise<GetFirestoreDocResult<docTypes.Room>> : await getRoom(organizationId, room.shardOf);
      const [originalRoomDoc, originalRoom] = await getOriginalRoom();

      if (originalRoom == undefined || originalRoomDoc == undefined) {
        return console.error("Unable to resolve original room");
      }

      const spaceId = room.spaceId;

      if (spaceId == undefined) {
        return console.error("Unable to resolve space");
      }

      const [, bridgeToolkitFileSettingsData] = await getBridgeToolkitSettingsItem(organizationId, spaceId);
      const supportsMultiplayer = bridgeToolkitFileSettingsData?.data?.supportsMultiplayer?.value ?? false;

      if (supportsMultiplayer == true && (originalRoom.enableSharding == undefined || originalRoom.enableSharding == false)) {
        return console.debug("Sharding is disabled for this room or its original.");
      }

      const shardingAvailable = await gameservers.billingFeatureShardingEnabled(organizationId, snapshot);
      if (!shardingAvailable) {
        return console.warn("Sharding not available:", snapshot.ref.path);
      }

      const fiveSecondsAgo = admin.firestore.Timestamp.fromMillis((admin.firestore.Timestamp.now().seconds - 5) * 1000);
      const shardsCreatedWithinFiveSeconds = (await getRoomsRef(organizationId)
        .where("created", ">", fiveSecondsAgo)
        .where("shardOf", "==", originalRoomDoc.id)
        .get()).docs.length;
      if (shardsCreatedWithinFiveSeconds != 0) {
        return console.debug("A new shard has already been created in the last 5 seconds. Skipping creation of new shard");
      }

      console.debug("Getting room configuration");
      const originalRoomConfiguration = await gameservers.getConfigurationOdysseyServer(organizationId, originalRoom.spaceId, originalRoomDoc.id);

      const getNewShardThreshold = () => {
        if (originalRoomConfiguration == undefined || originalRoomConfiguration.newShardParticipantsThreshold == undefined) {
          console.debug("Defaulting newShardParticipantsThreshold to: ", defaultNewShardThreshold);
          return defaultNewShardThreshold;
        } else {
          console.debug("Using room configuration newShardParticipantsThreshold: ", originalRoomConfiguration.newShardParticipantsThreshold);
          return originalRoomConfiguration.newShardParticipantsThreshold;
        }
      };

      const newShardThreshold = getNewShardThreshold();

      console.debug("Calculating total participants");
      const originalRoomParticipants = (originalRoom.currentParticipantCount != undefined) ? originalRoom.currentParticipantCount : 0;
      const getTotalParticipants = async () => {
        if (originalRoom.shards == undefined || originalRoom.shards.length == 0) {
          console.debug("Room doesn't have any shards");
          return originalRoomParticipants;
        } else {
          console.debug("Room already has shards, calculating total participants from all shards");
          const totalShardParticipants =
              (await Promise.all(originalRoom.shards.map(async (shardRoomId) => {
                const [, shardRoom] = await getRoom(organizationId, shardRoomId);
                return (shardRoom != undefined && shardRoom.currentParticipantCount != undefined) ? shardRoom.currentParticipantCount : 0;
              }))).reduce((x, y) => x + y);
          return originalRoomParticipants + totalShardParticipants;
        }
      };
      const totalParticipants = await getTotalParticipants();
      if (totalParticipants == undefined) {
        return console.error("Failed to get total participants across all shards");
      } else {
        console.debug("Total participants: ", totalParticipants);
      }
      const totalRoomShards = (originalRoom.shards == undefined || originalRoom.shards.length == 0) ? 1 : originalRoom.shards.length;
      console.debug("totalRoomShards: ", totalRoomShards);
      const participantsPerRoomShard = totalParticipants / totalRoomShards;
      console.debug("participantsPerRoomShard: ", participantsPerRoomShard);


      if (participantsPerRoomShard > newShardThreshold) {
        console.debug("Creating a new shard");
        const shardRoom = {
          shardOf: originalRoomDoc.id,
          name: originalRoom.name,
          isPublic: originalRoom.isPublic,
          persistentLiveStream: originalRoom.persistentLiveStream,
          isLiveStreamActive: originalRoom.isLiveStreamActive,
          infoFields: originalRoom.infoFields,
          created: admin.firestore.Timestamp.now(),
          updated: admin.firestore.Timestamp.now(),
          levelId: originalRoom.levelId,
          spaceId: originalRoom.spaceId,
          flags: originalRoom.flags,
        } as docTypes.Room;
        const shardRoomId = (await addRoom(organizationId, shardRoom)).id;
        console.debug("Created shard room: ", shardRoomId);
        const shardRoomName = originalRoom.name + " | " + shardRoomId.slice(0, 5).toUpperCase();
        console.debug("Updating shardRoom name to: ", shardRoomName);
        await getRoomRef(organizationId, shardRoomId).update({
          updated: admin.firestore.Timestamp.now(),
          name: shardRoomName,
        });
        console.debug("Adding shardRoom name to: ", shardRoomName);
        return await originalRoomDoc.ref.update({
          updated: admin.firestore.Timestamp.now(),
          shards: admin.firestore.FieldValue.arrayUnion(shardRoomId),
        });
      } else {
        return console.debug("Participants count does not exceed the total threshold of all shards.");
      }
    });

const newParticipantNewDeployments =
  // onCreate() of new participant
  // deploy a streaming session to kubernetes
  functions
    .runWith(customRunWithWarm)
    .firestore
    .document(participantWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      const [userId, deviceId] = participantId.split(":");
      const participant = snapshot.data() as docTypes.Participant;

      const updated = admin.firestore.Timestamp.fromDate(new Date(context.timestamp));
      const participantUpdated : streamingSessions.ParticipantUpdate = {
        ...participant,
        stateChanges: admin.firestore.FieldValue.arrayUnion({
          state: participant.state,
          timestamp: updated,
        }),
      };

      const [, billingPublic] = await getBillingPublic(organizationId);
      if (billingPublic == undefined || billingPublic.aggregateBillingState == "inactive") {
        console.log(`Participant rejected by billing: ${snapshot.ref.path}`);
        participantUpdated.updated = admin.firestore.Timestamp.now();
        participantUpdated.state = "rejected-by-billing";
        return await streamingSessions.updateParticipant(participantUpdated, organizationId, roomId, participantId);
      }

      const [, room] = await getRoom(organizationId, roomId);
      if (room?.spaceId == undefined) {
        console.error("Failed to create deployment: Room has no spaceId");
        participantUpdated.updated = admin.firestore.Timestamp.now();
        participantUpdated.state = "create-deployments-failed";
        return await streamingSessions.updateParticipant(participantUpdated, organizationId, roomId, participantId);
      }

      const result = Promise.all(await streamingSessions.createNewDeployments(organizationId, room.spaceId, roomId, participantId, userId, deviceId, room?.shardOf))
        .then(async () => {
          participantUpdated.updated = admin.firestore.Timestamp.now();
          participantUpdated.state = "created-deployments";
          return await streamingSessions.updateParticipant(participantUpdated, organizationId, roomId, participantId);
        })
        .catch(async (e) => {
          console.error("Failed to create deployments");
          console.error(e);
          participantUpdated.updated = admin.firestore.Timestamp.now();
          participantUpdated.state = "create-deployments-failed";
          return await streamingSessions.updateParticipant(participantUpdated, organizationId, roomId, participantId);
        });
      return result;
    });

const newParticipantAddHistory =
  // onCreate() of new participant
  // Add the participant to historicParticipants
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      const participant = snapshot.data() as docTypes.Participant;

      const historicParticipant : docTypes.HistoricParticipant = {
        created: participant.created,
        userId: participant.userId,
        deviceId: participant.deviceId,
        workloadClusterProvider: participant.workloadClusterProvider,
      };

      console.debug("Creating historicParticipant: ", historicParticipant);
      return await getHistoricParticipantRef(organizationId, roomId, participantId).set(historicParticipant);
    });

const deletedParticipantFinalUsage =
  // onDelete() of participant
  // Set the deleted timestamp on the historicParticipant
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      const participantUsage = await calculateParticipantUsage(organizationId, roomId, true, new Date(context.timestamp), snapshot);
      if (participantUsage == undefined) return console.error(`Failed to calculate usage for deleted participant ${snapshot.ref.path}`);
      return await getParticipantUsageCollectionRef(organizationId, roomId, participantId).add(participantUsage.participantUsage);
    });

const deletedParticipantAddHistory =
  // onDelete() of participant
  // Set the deleted timestamp on the historicParticipant
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      const deleted = admin.firestore.Timestamp.fromDate(new Date(Date.parse(context.timestamp)));
      const [, historicParticpant] = await getHistoricParticipant(organizationId, roomId, participantId);

      if (historicParticpant == undefined) {
        return console.error("Unable to get historic participant");
      }

      if (historicParticpant.created == undefined) {
        return console.error("Historic participant missing created timestamp");
      }

      if (historicParticpant.created.seconds > deleted.seconds) {
        console.warn(`Historic participant deleted '${deleted.toDate().toUTCString()}' before created '${historicParticpant.created.toDate().toUTCString()}'`);
      }

      const totalSeconds = deleted.seconds - historicParticpant.created.seconds;

      const historicParticipantUpdate = {
        deleted,
        totalSeconds: totalSeconds,
      };

      console.debug("Updating historicParticipant: ", historicParticipantUpdate);
      return await getHistoricParticipantRef(organizationId, roomId, participantId).update(historicParticipantUpdate);
    });

const deletedParticipantAddCompleted =
  // onDelete() of participant
  // Add a new document to completedParticipants
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      const deleted = admin.firestore.Timestamp.fromDate(new Date(Date.parse(context.timestamp)));

      const [, room] = await getRoom(organizationId, roomId);
      const spaceId = room?.spaceId;

      const completedParticpant : docTypes.CompletedParticipant = {
        ...snapshot.data() as docTypes.Participant,
        organizationId,
        spaceId,
        roomId,
        deleted,
      };

      console.debug("Creating completed participant:", snapshot.ref.path);
      return await getCompletedParticipantRef(participantId).create(completedParticpant);
    });

export async function triggerRoomParticipantUsageChecksF(context: {timestamp: string}) {
  const roomDocs = (await admin.firestore().collectionGroup("rooms").where("currentParticipantCount", ">=", 1).get()).docs;
  console.debug(`Got ${roomDocs.length} room docs`);
  return (await Promise.allSettled(roomDocs.map(async (rd) => {
    const organizationId = rd.ref.parent.parent?.id;
    if (organizationId == undefined) {
      console.debug(`organizationId from parent of parent doc is undefined: ${rd.ref.path}`);
      return;
    }
    console.debug(`Triggering room participants usage check for room ${rd.ref.path}`);
    const usageCheck :ParticipantUsageCheckOperation = {
      triggeredAt: admin.firestore.Timestamp.fromDate(new Date(context.timestamp)),
    };
    return await rd.ref.collection("participantUsageChecks").add(usageCheck);
  }))).map((result) => {
    if (result.status == "rejected") {
      console.error("Failed to add participantUsageCheck");
      console.error(result.reason);
    }
  });
}

const onUsageChecksCompleteUpdateOrgUsage =
  functions
    .runWith(customRunWith)
    .firestore
    .document(roomParticipantUsageCheckWildcardPath())
    .onUpdate(async (change, context) => {
      const projectId = getFirebaseProjectId();
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantUsageCheckId : string = context.params.participantUsageCheckId;
      const participantUsageCheck = change.after.data() as ParticipantUsageCheckOperation;
      if (participantUsageCheck.accountedAt != undefined || participantUsageCheck.result == "accounted") {
        console.debug(`Participant usage check operation ${change.after.ref.path} has already been accounted. Nothing to do`);
        return;
      }
      if (participantUsageCheck.participantUsageDocsAddedAt == undefined) {
        console.debug(`Participant usage check operation ${change.after.ref.path} is not completed. Nothing to do`);
        return;
      }
      if (participantUsageCheck.startedAt == undefined) {
        console.warn(`Participant usage check operation ${change.after.ref.path} is missing startedAt field. Nothing to do`);
        return;
      }

      const fiveMinutesAgo = new Date((Date.now() - (60 * 5 * 1000)));
      const lastParticipantUsageCheckDoc = (await change.after.ref.parent.where("startedAt", "<", participantUsageCheck.startedAt).orderBy("startedAt", "desc").limit(1).get()).docs.pop();
      const lastParticipantUsageCheck = lastParticipantUsageCheckDoc?.data() as ParticipantUsageCheckOperation | undefined;
      console.debug(`Last lastParticipantUsageCheck is ${lastParticipantUsageCheckDoc?.ref.path}`);
      const afterOrEqualToEndTimestamp = (lastParticipantUsageCheck?.startedAt == undefined) ? fiveMinutesAgo : lastParticipantUsageCheck.startedAt.toDate();
      if (lastParticipantUsageCheck?.startedAt == undefined) console.debug(`lastParticipantUsageCheck startedAt undefined. Calculating usage from ${fiveMinutesAgo.toISOString()} for participantUsageCheck: ${change.after.ref.path}`);
      const beforeEndTimestamp = participantUsageCheck.startedAt.toDate();

      const configurationBilling = await getConfigurationBilling({
        organizationId: organizationId,
        roomId: roomId,
      });

      const result = await queryRoomUsageCheckOperation({projectId, organizationId, roomId, participantUsageCheckId, afterOrEqualToEndTimestamp, beforeEndTimestamp, configurationBilling});
      const sumCreditsUsed = result.sumCreditsUsed;
      const participantUsageDocsAccounted = result.participantUsageDocCount;
      if (sumCreditsUsed === undefined || sumCreditsUsed === null || Number.isNaN(result.sumCreditsUsed)) {
        console.error(`Failed to calculate sumCreditsUsed for participantUsageCheck: ${change.after.ref.path}`);
        return;
      }
      console.debug(`Updating billing/usage, deducting ${sumCreditsUsed} from availableCredits due to participantUsageCheck: ${change.after.ref.path}`);
      await getBillingUsageRef(organizationId).set({updated: admin.firestore.Timestamp.now(), availableCredits: admin.firestore.FieldValue.increment(-sumCreditsUsed)}, {merge: true});
      console.debug(`Updating participantUsageCheck with accountedAt: ${change.after.ref.path}`);
      await getParticipantUsageCheckRef(organizationId, roomId, participantUsageCheckId).update({deductedCredits: sumCreditsUsed, participantUsageDocsAccounted, afterOrEqualToEndTimestamp, accountedAt: admin.firestore.Timestamp.now(), excludedUsageEmailDomains: configurationBilling?.excludedUsageEmailDomains, result: "accounted"});
      return;
    });

const triggerRoomParticipantUsageChecks =
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async (context) => {
      return await triggerRoomParticipantUsageChecksF(context);
    });

export async function roomParticipantsUsageCheck(eventTimestamp: Date, participantUsageCheck: ParticipantUsageCheckOperation, organizationId: string, roomId: string, participantUsageCheckId: string) {
  const lastUsageCheckOperationStarted = (await getParticipantUsageChecksRef(organizationId, roomId).orderBy("triggeredAt", "desc").limit(1).get()).docs.pop();
  const lastSuccessfulUsageCheckOperationCompleted = (await getParticipantUsageChecksRef(organizationId, roomId).where("result", "in", ["participant-usage-docs-added", "completed", "accounted"]).orderBy("participantUsageDocsAddedAt", "desc").limit(1).get()).docs.pop();
  console.debug({lastUsageCheckOperationStarted, lastSuccessfulUsageCheckOperationCompleted});

  const startedAt = admin.firestore.Timestamp.fromDate(eventTimestamp);
  const usageCheckStarted: ParticipantUsageCheckOperation = {
    triggeredAt: participantUsageCheck.triggeredAt,
    startedAt,
  };
  const getParticipantUsageCheckDocRef = getParticipantUsageCheckRef(organizationId, roomId, participantUsageCheckId);
  await getParticipantUsageCheckDocRef.set(usageCheckStarted, {merge: true});

  const participantDocs = (await getParticipantsRef(organizationId, roomId).where("state", "==", "ready-deployment").get()).docs;
  const createdParticipantUsageDocs = (await Promise.allSettled(participantDocs.map(async (participantDoc) => {
    const participantUsageResult = await calculateParticipantUsage(organizationId, roomId, false, eventTimestamp, participantDoc);
    if (participantUsageResult == undefined) return undefined;
    return await getParticipantUsageCollectionRef(organizationId, roomId, participantDoc.id).add(participantUsageResult.participantUsage);
  })));
  const participantUsageDocsAdded = createdParticipantUsageDocs.reduce<number>((acc, o) => {
    return (o.status == "fulfilled" && o.value != undefined) ? acc + 1 : acc;
  }, 0);
  const usageCheckFinished: ParticipantUsageCheckOperation = {
    triggeredAt: participantUsageCheck.triggeredAt,
    participantUsageDocsAdded,
    startedAt,
    participantUsageDocsAddedAt: admin.firestore.Timestamp.now(),
    result: "participant-usage-docs-added",
  };
  await getParticipantUsageCheckDocRef.set(usageCheckFinished, {merge: true});

  // Clean up previous incomplete usage check operations
  if (lastUsageCheckOperationStarted?.id != lastSuccessfulUsageCheckOperationCompleted?.id && !(lastSuccessfulUsageCheckOperationCompleted == undefined && lastUsageCheckOperationStarted == undefined)) {
    const previousCheckOperationsStarted = (await getParticipantUsageChecksRef(organizationId, roomId).orderBy("triggeredAt", "desc").limit(10).get()).docs;
    const updates = await Promise.all(previousCheckOperationsStarted.map(async (usageCheckDoc) => {
      try {
        const usageCheck = usageCheckDoc.data() as ParticipantUsageCheckOperation;
        if (usageCheck.startedAt == undefined || usageCheck.result == undefined || usageCheck.participantUsageDocsAddedAt == undefined) {
          const now = new Date(new Date().toUTCString()).valueOf();
          const fiveMinutesAgo = now - (300 * 1000);
          if (usageCheck.triggeredAt.toMillis() < fiveMinutesAgo) {
            await usageCheckDoc.ref.update({
              completedAt: admin.firestore.Timestamp.now(),
              result: "timed-out",
            });
            return {updated: true, doc: usageCheckDoc};
          }
          return {updated: false, doc: usageCheckDoc};
        }
        return {updated: false, doc: usageCheckDoc};
      } catch (e: any) {
        return {updated: false, error: e, doc: usageCheckDoc};
      }
    }));
    updates.forEach((o) => {
      if (o.error != undefined) return console.error(`Failed to update usage check operation doc: ${o.doc.ref.path}`);
      return console.debug(`Marked old participantUsageCheck as timed-out: ${o.doc.ref.path}`);
    });
  }
}

// onCreate of a participantUsageCheck doc on a room
const onCreateParticipantUsageCheckRoom =
  functions
    .runWith(customRunWith)
    .firestore
    .document(roomParticipantUsageCheckWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantUsageCheckId : string = context.params.participantUsageCheckId;
      const participantUsageCheck = snapshot.data() as ParticipantUsageCheckOperation;
      return await roomParticipantsUsageCheck(new Date(context.timestamp), participantUsageCheck, organizationId, roomId, participantUsageCheckId);
    });

const newDeploymentNewStreamingSession =
  // onCreate() of new participant
  // deploy a streaming session to kubernetes
  functions
    .runWith(customRunWith)
    .firestore
    .document(deploymentWildcardPath())
    .onCreate(async (snapshot, context) => {
      const projectId = getFirebaseProjectId();
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      const [userId, deviceId] = participantId.split(":");
      const deploymentId : string = context.params.deploymentId;
      const deployment = snapshot.data() as docTypes.Deployment;

      try {
        const [, room] = await getRoom(organizationId, roomId);
        if (room == undefined) {
          await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "failed-before-provisioning");
          return console.error("Room is undefined");
        }
        if (room.spaceId == undefined) {
          await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "failed-before-provisioning");
          return console.error("Room spaceId is undefined");
        }

        const [, space] = await getSpace(organizationId, room.spaceId);
        if (space == undefined) {
          await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "failed-before-provisioning");
          return console.error("Space is undefined");
        }

        console.debug("Resolving space unreal project version...");
        const resolvedUnrealProjectVersion = await resolveSpaceUnrealProjectVersion(space);


        if (resolvedUnrealProjectVersion == "not-found") {
          await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "failed-before-provisioning");
          return console.error(`Failed to find unreal project version ${space.unrealProject?.unrealProjectId}/${space.unrealProject?.unrealProjectVersionId}`);
        }

        return streamingSessions
          .deployStreamingSession(projectId, deployment, organizationId, room.spaceId, room.shardOf, roomId, participantId, deploymentId, room.serverAddress, room.levelId, userId, deviceId, (room.graphicsBenchmark != undefined) ? room.graphicsBenchmark : 5, resolvedUnrealProjectVersion, room.region);
      } catch (e: any) {
        return;
      }
    });

const updateDeploymentStateReact =
  // onCreate() of new participant
  // deploy a streaming session to kubernetes
  functions
    .runWith(customRunWithWarm)
    .firestore
    .document(deploymentWildcardPath())
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      const [userId, deviceId] = participantId.split(":");
      const deploymentId : string = context.params.deploymentId;
      const deploymentBefore = change.before.data() as docTypes.Deployment;
      const deploymentAfterDocId = change.after.id;
      const deploymentAfter = change.after.data() as docTypes.Deployment;

      if (deploymentBefore.state == deploymentAfter.state) {
        console.debug("Not running as state hasn't changed");
        return;
      }

      try {
        await streamingSessions.collectDeploymentPodStackState(organizationId, roomId, participantId, deploymentId, userId, deploymentAfter.workloadClusterProvider, deploymentAfter.state);
      } catch (e: any) {
        console.error("Error with streamingSessions.collectDeploymentPodStackState");
      }
      switch (deploymentAfter.state) {
        case "pod-ready": {
          console.debug(`This deployment ${deploymentId} is ready: `, deploymentAfter);
          // Gather latest state of all deployments

          const deployments = (await getDeployments(organizationId, roomId, participantId))?.flatMap(([doc, deploy]) => {
            return (doc == undefined || deploy == undefined) ? [] : [[doc.id, deploy] as [string, docTypes.Deployment]];
          });

          if (deployments == undefined || deployments.length == 0) {
            return console.error("No deployments");
          }

          // Check if any other deployments "won" the race before this one
          const [winnerDeploymentId, winnerDeployment] = deployments.reduce((acc, [docId, deploy]) => {
            if (deploy.state == "pod-ready" && deploy.updated < deploymentAfter.updated) {
              return [docId, deploy];
            } else {
              return acc;
            }
          }, [deploymentAfterDocId, deploymentAfter]);
          console.debug(`This deployment is the winner ${winnerDeploymentId}: `, winnerDeployment);

          // Set loser deployment docs to deprovisioning
          deployments.forEach(async (deploymentWithId) => {
            const [deployId] = deploymentWithId;
            if (deployId != winnerDeploymentId) {
              console.debug(`Setting loser deployment doc to deprovisioning: ${deployId}`);
              await updateDeploymentState(organizationId, roomId, participantId, deployId, "deprovisioning");
            }
          });

          // If this deployment won the race
          if (winnerDeploymentId == deploymentId) {
            // Update participant
            if (winnerDeployment.signallingUrl == undefined) {
              throw new Error("Winner has no signallingUrl");
            }
            return updateParticipantState(organizationId, roomId, participantId, "ready-deployment", "pod-ready", winnerDeployment.signallingUrl, deploymentId);
          } else {
            return;
          }
        }
        case "deprovisioning": {
          const deleteResult = await deletePodStack(userId, deploymentId, deploymentAfter.workloadClusterProvider);
          if (deleteResult) {
            return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "deprovisioned");
          } else {
            return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "failed-deprovisioning");
          }
        }
        case "failed-provisioning":
        case "failed-before-provisioning":
        case "pod-failed":
        case "timed-out-provisioning": {
          const [, latestParticipant] = await getParticipant(organizationId, roomId, participantId);
          if (latestParticipant == undefined) {
            console.debug(`Participant no longer exists for deployment: ${deploymentId}, deprovisioning`);
            return await streamingSessions.deprovisionDeployment(organizationId, roomId, participantId, deploymentId);
          }
          const result = await streamingSessions.replaceAndDeprovisionDeployment(organizationId, roomId, participantId, deploymentId, userId, deviceId, deploymentAfter.attempts + 1, deploymentAfter.workloadClusterProvider);
          if (typeof(result) === "string") {
            console.debug(`Sucessfully replaced deployment ${deploymentId} with ${result}`);
          }
          if (result === false) {
            console.debug(`Failed to replaced deployment: ${deploymentId}`);
          }
          return;
        }
        // Default case should just update the participant's deployment state
        default: {
          return;
        }
      }
    });

async function deprovisionParticipantDeployments(organizationId: string, roomId: string, participantId: string) {
  const deployments = await getDeployments(organizationId, roomId, participantId);

  if (deployments == undefined) {
    return console.error("Deployments undefined");
  }

  return await Promise.all(deployments.map(async (deploymentWithId) => {
    const [doc, deploy] = deploymentWithId;
    if (doc != undefined && deploy != undefined) {
      console.debug(`Deployment ${doc.ref.path}: `, deploy);
      if (deploy.state != "deprovisioning") {
        console.debug(`Setting deployment doc to deprovisioning ${doc.ref.path}`);
        await streamingSessions.deprovisionDeployment(organizationId, roomId, participantId, doc.id);
      }
    }
  }));
}

const deletedParticipantDeprovisionDeployments =
  // onDelete() of participant
  // Set all deployments to deprovisioning and delete deprovisioned deployments
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      return await deprovisionParticipantDeployments(organizationId, roomId, participantId);
    });

const onUpdateParticipantRejectedByBilling =
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const participant = change.after.data() as docTypes.Participant;
      if (participant.state === "rejected-by-billing") {
        console.log(`Participant has been rejected by billing: ${change.after.ref.path}. Deleting`);
        return await change.after.ref.delete();
      }
    });

const onUpdateParticipantCountScaleGameServer =
  // onUpdate() of room
  // Provision or deprovision the game server
  functions
    .runWith(customRunWith)
    .firestore
    .document(roomWildcardPath())
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const organizationId : string = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const roomBefore = change.before.data() as docTypes.Room;
      const roomAfter = change.after.data() as docTypes.Room;

      if (roomAfter == undefined) {
        return console.error("Room change after undefined");
      }

      if (roomAfter.spaceId == undefined) {
        return console.error(`Room '${roomId}' is missing spaceId`);
      }

      const roomDocPath = getRoomRef(organizationId, roomId);

      const [, space] = await getSpace(organizationId, roomAfter.spaceId);
      if (space == undefined) {
        return console.error(`Failed to get space '${roomAfter.spaceId}' of '${roomDocPath}'`);
      }

      const unrealProjectVersion = await resolveSpaceUnrealProjectVersion(space);

      const supportsMultiplayer = (() => {
        if (unrealProjectVersion == "not-found") return false;
        return unrealProjectVersion?.unrealProjectVersion.bridgeToolkitFileSettings?.supportsMultiplayer ?? false;
      })();

      if (!supportsMultiplayer) {
        return console.debug(`Multiplayer is not supported, not provisioning room '${roomDocPath}'`);
      }
      console.debug(`Multiplayer is enabled, continuing for room: '${roomDocPath}'`);

      // Static server means no privisioning required
      if (roomAfter.staticServer != undefined && roomAfter.staticServer == true) {
        console.debug("Server address is static, not changing server");
        return;
      }

      if (roomAfter.currentParticipantCount == undefined) {
        return console.error("Room currentParticipantCount is undefined");
      }

      if ((roomBefore.currentParticipantCount == undefined || roomBefore.currentParticipantCount == 0 || roomBefore.state != "pod-ready") && roomAfter.currentParticipantCount > 0) {
        // First participant, provision once in a state to do so
        const [, billingPublic] = await getBillingPublic(organizationId);
        if (billingPublic !== undefined && billingPublic.aggregateBillingState === "inactive") {
          console.log(`Room rejected by billing: ${getRoomRef(organizationId, roomId).path}`);
          return;
        }
        return await gameservers.waitAndProvision(Date.now(), organizationId, roomId);
      }

      if (roomAfter.currentParticipantCount == 0) {
        // Zero participants, deprovision once in a state to do so
        if (roomAfter.state != "deprovisioning" && roomAfter.state != "deprovisioned") {
          return await gameservers.waitAndDeprovision(Date.now(), organizationId, roomId);
        } else {
          console.debug("Room already deprovisioning, nothing to do");
          return;
        }
      }
    });

const deletedParticipantDenormalize =
  // onDelete() of a participant
  // Remove the denormalized copy of the participant
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      console.debug("Deleting participant denormalized");
      return await getParticipantDenormalizedRef(organizationId, roomId, participantId).delete();
    });

const deletedCommsParticipant =
  // onDelete() of a participant
  // Remove comms participant
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      console.debug("Deleting participant denormalized");
      return await getCommsParticipantRef(organizationId, roomId, participantId).delete();
    });

const deletedParticipantDecrementCount =
  // onDelete() of new participant
  // Decrement currentParticipantCount by 1
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantCount = (await getParticipantsRef(organizationId, roomId).get()).docs.filter((doc) => doc.exists).length;
      console.debug("Setting room currentParticipantCount: ", participantCount);
      return await getRoomRef(organizationId, roomId).update({currentParticipantCount: participantCount});
    });

const deletedBrowserStateUpdateDeleteParticipant =
functions
  .runWith(customRunWith)
  .firestore
  .document(browserStateUpdateWebRtcWildcardPath())
  .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId : string = context.params.roomId;
    const participantId : string = context.params.participantId;
    const [userId, deviceId] = participantId.split(":");
    const [deviceDoc, device] = await getDevice(userId, deviceId);
    const oneMinuteAgo = admin.firestore.Timestamp.now().seconds - 60;
    if (device != undefined && deviceDoc != undefined && deviceDoc.exists == true && device.state == "online" && device.lastChanged.seconds > oneMinuteAgo) {
      console.debug("Device still active for deleted webrtc browserStateUpdate, skipping", snapshot.ref.path);
      return;
    } else {
      console.debug("Device does not exist for deleted webrtc browserStateUpdate, finding participants", snapshot.ref.path);
    }
    const participantDocsThatExist = (await getParticipantsRef(organizationId, roomId)
      .where("userId", "==", userId)
      .where("deviceId", "==", deviceId)
      .get()).docs.filter((doc) => doc.exists);
    console.debug(`Found ${participantDocsThatExist.length} participants`);

    return await Promise.all(participantDocsThatExist.map(async (doc) => {
      console.debug("Deleting participant: ", doc.ref.path);
      return await doc.ref.delete();
    }));
  });

const deletedAdminDecrementCount =
// onDelete() of new participantDenormalized
// Decrement currentAdminCount by 1
functions
  .runWith(customRunWith)
  .firestore
  .document(participantDenormalizedWildcardPath())
  .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId : string = context.params.roomId;
    const adminCount = (await getParticipantsDenormalizedRef(organizationId, roomId).get()).docs.filter((doc) => doc.exists && (doc.data().userRole.includes("org_"))).length;
    console.debug("Setting room currentAdminCount: ", adminCount);
    return await getRoomRef(organizationId, roomId).update({currentAdminCount: adminCount});
  });

export const creates = {
  createParticipant,
  newParticipantDenormalize,
  newParticipantIncrementCount,
  newAdminIncrementCount,
  newParticipantNewRoomShard,
  newParticipantNewDeployments,
  newParticipantAddHistory,
  newDeploymentNewStreamingSession,
  newCommsParticipant,
  onCreateParticipantUsageCheckRoom,
};
export const updates = {
  updateDeploymentStateReact,
  onUpdateParticipantCountScaleGameServer,
  onUpdateParticipantRejectedByBilling,
  triggerRoomParticipantUsageChecks,
  onUsageChecksCompleteUpdateOrgUsage,
  afkCheck,
};
export const deletes = {
  deletedParticipantDenormalize,
  deletedCommsParticipant,
  deletedParticipantDecrementCount,
  deletedParticipantDeprovisionDeployments,
  deletedParticipantAddHistory,
  deletedAdminDecrementCount,
  deletedBrowserStateUpdateDeleteParticipant,
  deletedParticipantFinalUsage,
  deletedParticipantAddCompleted,
};
