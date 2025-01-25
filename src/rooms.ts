// @ts-nocheck - Node.js 16 compatibility
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as docTypes from "./lib/docTypes";
import * as cmsDocTypes from "./lib/cmsDocTypes";
import * as gameservers from "./lib/gameservers/index";
import {v4 as uuidv4} from "uuid";
import {customRunWith, customRunWithWarm} from "./shared";
import {deleteRoom, getHistoricRoomRef, getRoom, getRoomRef, roomWildcardPath, getSpaceRef, spaceWildcardPath, getSpace, getSpaceTemplateItems, getSpaceItemRef, addSpaceItem, getSpaceStreamPrivate, spaceItemWildcardPath, getOrganizationRef, getSpaceItems, getParticipantsRef} from "./lib/documents/firestore";
import {getEncryptionSecretKey} from "./lib/functions-config";
import {DecryptSpaceStreamPrivateRequestData, DecryptSpaceStreamPrivateResponseBody} from "./lib/httpTypes";
import {addSpaceStreamingInfo} from "./lib/spaceStreams";
import {decryptWithKey} from "./lib/encryption";
import {saveSpaceHistory} from "./lib/spaces";
import {updateOrganizationBillingUsage} from "./lib/organizations";
import { toFirestoreUpdateData } from "./lib/utils";

const onCreateRoomAddToSpace =
// onCreate() room
// Add id to correct space.room[] collection
functions
  .runWith(customRunWith)
  .firestore
  .document(roomWildcardPath())
  .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId : string = context.params.organizationId;
    const roomId : string = context.params.roomId;
    const room = snapshot.data() as docTypes.Room;

    // get correct space
    const spaceId : string = room.spaceId as string;
    const spaceRef = getSpaceRef(organizationId, spaceId);

    return await spaceRef.update({rooms: admin.firestore.FieldValue.arrayUnion(roomId)});
  });

const onCreateSpaceCopyTemplateSpaceItems =
// onCreate() space
// Copy space template space items
functions
  .runWith(customRunWith)
  .firestore
  .document(spaceWildcardPath())
  .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId : string = context.params.organizationId;
    const spaceId : string = context.params.spaceId;

    const [latestSpaceDoc, latestSpace] = await getSpace(organizationId, spaceId);
    if (latestSpace == undefined || latestSpaceDoc == undefined || latestSpaceDoc.exists == false) {
      return console.error("ERROR: Unable to get latest space");
    }

    if (!latestSpace.spaceTemplateId) {
      return console.log("Space was not created by template");
    }

    const spaceTemplateId = latestSpace.spaceTemplateId;
    const spaceTemplateItems = await getSpaceTemplateItems(spaceTemplateId);
    if (spaceTemplateItems == undefined || spaceTemplateItems.length < 1) {
      return console.error("No space template items were found");
    }

    return await Promise.all([
        spaceTemplateItems?.forEach(async ([spaceItem]) => {
          if (spaceItem) {
            const spaceTemplateItem = spaceItem.data() as cmsDocTypes.SpaceItem;
            await getSpaceItemRef(organizationId, spaceId, spaceItem.id).set(spaceTemplateItem);
          }
        }),
    ]);
  });

const onCreateSpaceAddStreamingInfo =
// onCreate() space
// Create new room and add room id to space's room array
functions
  .runWith(customRunWith)
  .firestore
  .document(spaceWildcardPath())
  .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId : string = context.params.organizationId;
    const spaceId : string = context.params.spaceId;
    return await addSpaceStreamingInfo(organizationId, spaceId);
  });

const onCreateSpaceCopySpaceItems =
// onCreate() space
// Copy space items if space items exist in original space
functions
  .runWith(customRunWith)
  .firestore
  .document(spaceWildcardPath())
  .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId : string = context.params.organizationId;
    const spaceId : string = context.params.spaceId;

    const [, newSpace] = await getSpace(organizationId, spaceId);
    if (newSpace == undefined) {
      return console.error("ERROR: Unable to get newSpace space");
    }

    if (!newSpace.originalSpaceId) {
      return console.log("Space is not a copy");
    }

    const originalSpaceId = newSpace.originalSpaceId;
    const spaceItems = await getSpaceItems(organizationId, originalSpaceId);
    if (spaceItems == undefined || spaceItems.length < 1) {
      return console.error("ERROR: No space items were found");
    }

    return await Promise.all([
        spaceItems?.forEach(async ([spaceItem]) => {
          const spaceItemData = spaceItem?.data() as cmsDocTypes.SpaceItem;
          console.log(spaceItemData);
          await addSpaceItem(organizationId, spaceId, spaceItemData);
        }),
    ]);
  });

const saveSpaceHistoryOnSpaceWrite =
  functions
    .runWith(customRunWith)
    .firestore
    .document(spaceWildcardPath())
    .onWrite(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(change.after.data()));
      const organizationId : string = context.params.organizationId;
      const spaceId : string = context.params.spaceId;
      const space = change.after.data() as cmsDocTypes.OrgSpace;
      return await saveSpaceHistory(organizationId, spaceId, new Date(context.timestamp), space);
    });

const saveSpaceHistoryOnSpaceItemWrite =
  functions
    .runWith(customRunWith)
    .firestore
    .document(spaceItemWildcardPath())
    .onWrite(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(change.after.data()));
      const organizationId : string = context.params.organizationId;
      const spaceId : string = context.params.spaceId;
      return await saveSpaceHistory(organizationId, spaceId, new Date(context.timestamp));
    });

const decryptSpaceStreamPrivate =
functions
  .runWith(customRunWithWarm)
  .https.onCall(async (data: DecryptSpaceStreamPrivateRequestData) => {
    try {
      const [, spaceStreamPrivate] = await getSpaceStreamPrivate(data.organizationId, data.spaceId, data.spaceStreamId);
      if (spaceStreamPrivate == undefined) {
        throw new functions.https.HttpsError("not-found", "Not found");
      }

      const cryptoSecretKey = getEncryptionSecretKey();
      if (cryptoSecretKey == undefined) {
        console.error("Failed to get encryption secret key");
        throw new functions.https.HttpsError("internal", "Internal server error");
      }

      const decrypted = decryptWithKey(Buffer.from(spaceStreamPrivate.encryptedPublisherToken, "base64"), cryptoSecretKey);
      if (decrypted == undefined) {
        console.error("Failed decryption");
        throw new functions.https.HttpsError("internal", "Internal server error");
      }

      const decryptedPublisherToken = decrypted.toString("ascii");
      const result : DecryptSpaceStreamPrivateResponseBody = {
        publisherToken: decryptedPublisherToken,
      };

      return result;
    } catch (e: any) {
      console.error(e);
      throw new functions.https.HttpsError("internal", "Internal server error");
    }
  });

const onCreateSpaceAddNewRoom =
// onCreate() space
// Create new room and add room id to space's room array
functions
  .runWith(customRunWithWarm)
  .firestore
  .document(spaceWildcardPath())
  .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId : string = context.params.organizationId;
    const spaceId : string = context.params.spaceId;

    const [latestSpaceDoc, latestSpace] = await getSpace(organizationId, spaceId);
    if (latestSpace == undefined || latestSpaceDoc == undefined || latestSpaceDoc.exists == false) {
      return console.error("Unable to get latest space");
    }

    if (latestSpace.rooms.length < 1) {
      console.log("Space doesn't have an associated room. Creating it now.");
      const roomId = uuidv4();
      const roomData : docTypes.Room = {
        created: admin.firestore.Timestamp.now(),
        updated: admin.firestore.Timestamp.now(),
        name: latestSpace.name,
        levelId: latestSpace.ueId,
        spaceId,
        avatarControlSystem: latestSpace.avatarControlSystem || "eventMode",
      };
      return await Promise.all([
        getRoomRef(organizationId, roomId).set(roomData),
        latestSpaceDoc.ref.update({id: spaceId, rooms: admin.firestore.FieldValue.arrayUnion(roomId)}),
      ]);
    } else {
      return;
    }
  });

const onWriteSpaceDenormalizeBillingUsage =
functions
  .runWith(customRunWithWarm)
  .firestore
  .document(spaceWildcardPath())
  .onWrite(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId : string = context.params.organizationId;
    return await updateOrganizationBillingUsage(organizationId);
  });

const onDeleteRoomRemoveFromSpace =
// onDelete() room
// Remove id from correct space.room[] collection
functions
  .runWith(customRunWith)
  .firestore
  .document(roomWildcardPath())
  .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId : string = context.params.organizationId;
    const roomId : string = context.params.roomId;
    const room = snapshot.data() as docTypes.Room;

    // get correct space
    const spaceId : string = room.spaceId as string;
    const spaceRef = getSpaceRef(organizationId, spaceId);

    return await spaceRef.update({rooms: admin.firestore.FieldValue.arrayRemove(roomId)});
  });

const onUpdateSpaceUpdateRooms =
// onUpdate() space
// add any necessary information to rooms in space.rooms[]
functions
  .runWith(customRunWith)
  .firestore
  .document(spaceWildcardPath())
  .onUpdate(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(change.after.data()));

    const space = change.after.data() as cmsDocTypes.OrgSpace;
    const organizationId : string = context.params.organizationId;
    const roomIds : string[] = space.rooms;

    // loop through each roomId and update their docs with required data
    // TODO: we should be able to remove this completely when things are fully hooked up using spaces
    return roomIds.forEach(async (roomId)=> {
      const roomRef = getRoomRef(organizationId, roomId);
      await roomRef.update(toFirestoreUpdateData({
        updated: admin.firestore.Timestamp.now(),
        name: space.name,
        levelId: space.ueId,
        enableSharding: space.enableSharding,
        // the following fields are low hanging to remove in upcoming commits
        isPublic: space.isPublic,
        showPublicRoomLanding: space.showPublicRoomLanding,
        persistentLiveStream: space.persistentLiveStream,
        isLiveStreamActive: space.isLiveStreamActive,
        graphicsBenchmark: space.graphicsBenchmark,
        infoFields: space.infoFields,
        avatarType: space.avatarType,
        flightControl: space.flightControl,
        avatarControlSystem: space.avatarControlSystem,
      } as docTypes.Room));
    });
  });

const onCreateRoomCreateHistoricRoom =
  // onCreate() room
  // Denormalize to historicRooms
  functions
    .runWith(customRunWith)
    .firestore
    .document(roomWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId : string = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const room = snapshot.data() as docTypes.Room;

      return await getHistoricRoomRef(organizationId, roomId).create(room);
    });

const onUpdateRoomUpdateHistoricRoom =
  // onUpdate() of Room
  // If state changed, trigger function
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
      const room = change.after.data() as docTypes.Room;

      return await getHistoricRoomRef(organizationId, roomId).set(room);
    });

const onUpdateRoomUpdateShards =
  // onUpdate() of Room
  // If certain fields have changed, update the room's shards
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
      const room = change.after.data() as docTypes.Room;

      const [, roomLatest] = await getRoom(organizationId, roomId);
      if (roomLatest == undefined) {
        return console.error(`Unable to get latest room ${change.after.ref.path}`);
      }

      if (room.shards == undefined || room.shards.length == 0) {
        return console.debug("Room has no shards, skipping");
      }

      const shardingAvailable = await gameservers.billingFeatureShardingEnabled(organizationId, change.after);
      if (!shardingAvailable) {
        return console.warn("Sharding not available:", change.after.ref.path);
      }

      const update : docTypes.Room = {
        updated: admin.firestore.Timestamp.now(),
        isPublic: room.isPublic,
        persistentLiveStream: room.persistentLiveStream,
        isLiveStreamActive: room.isLiveStreamActive,
        infoFields: room.infoFields,
        levelId: room.levelId,
        spaceId: room.spaceId,
        graphicsBenchmark: room.graphicsBenchmark,
      };
      console.debug(`Updating room shards of ${roomId} with: `, update);
      return room.shards.forEach(async (shardRoomId) => {
        console.debug("Updating shard room: ", shardRoomId);
        const updateForShard = update;
        updateForShard.name = roomLatest.name + " | " + shardRoomId.slice(0, 5).toUpperCase();
        await getRoomRef(organizationId, shardRoomId).update(toFirestoreUpdateData(updateForShard));
      });
    });

const onUpdateRoomUpdateSpaceParticipantSum =
// onUpdate() of Room
// If change in participant count, update space participant sum
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
    const roomBefore = change.before.data() as docTypes.Room;
    const roomAfter = change.after.data() as docTypes.Room;

    const currentParticipantCountBefore = roomBefore.currentParticipantCount || 0;
    const currentParticipantCountAfter = roomAfter.currentParticipantCount || 0;

    if (currentParticipantCountBefore === currentParticipantCountAfter) {
      return console.log("no change in participant count");
    }

    if (roomAfter.spaceId == undefined) {
      return console.error("Room update missing `spaceId` field");
    }

    const spaceRef = getSpaceRef(organizationId, roomAfter.spaceId);

    const latestParticipantSum =
        (await getOrganizationRef(organizationId).collection("rooms").where("spaceId", "==", roomAfter.spaceId).get())
          .docs.reduce<number>((acc, roomDoc) => {
          const room = roomDoc.data() as docTypes.Room;
          return acc + (room.currentParticipantCount || 0);
        }, 0);


    return await spaceRef.update({currentParticipantSum: latestParticipantSum});
  });

const deletedSpaceDeleteRoom =
  // onDelete() of a space
  // Delete all the space's room documents
  functions
    .runWith(customRunWith)
    .firestore
    .document(spaceWildcardPath())
    .onDelete(async (snapshot, context) => {
      const organizationId : string = context.params.organizationId;
      const space = snapshot.data() as cmsDocTypes.OrgSpace;
      return space.rooms?.map(async (roomId) => {
        await deleteRoom(organizationId, roomId);
      });
    });

const deletedRoomDeleteShards =
  // onDelete() of a room
  // Delete all the room's subcollection documents
  functions
    .runWith(customRunWith)
    .firestore
    .document(roomWildcardPath())
    .onDelete(async (snapshot, context) => {
      const organizationId : string = context.params.organizationId;
      const room = snapshot.data() as docTypes.Room;
      return room.shards?.map(async (roomId) => {
        await deleteRoom(organizationId, roomId);
      });
    });

const deletedRoomRemoveShardFromOriginal =
  // onDelete() of a room
  // If this room is a shard, remove the shard from the original room shards list
  functions
    .runWith(customRunWith)
    .firestore
    .document(roomWildcardPath())
    .onDelete(async (snapshot, context) => {
      const organizationId : string = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const room = snapshot.data() as docTypes.Room;
      if (room.shardOf != undefined) {
        const [originalRoomDoc, originalRoom] = await getRoom(organizationId, room.shardOf);
        if (originalRoom == undefined || originalRoomDoc == undefined) {
          return console.error("Unable to resolve original room");
        }
        return await originalRoomDoc.ref.update({
          updated: admin.firestore.Timestamp.now(),
          shards: admin.firestore.FieldValue.arrayRemove(roomId),
        });
      }
    });

const deletedRoomDeleteGameServer =
  // onDelete() of a room
  // Delete the room's game server
  functions
    .runWith(customRunWith)
    .firestore
    .document(roomWildcardPath())
    .onDelete(async (_, context) => {
      const organizationId : string = context.params.organizationId;
      const roomId : string = context.params.roomId;
      // TODO: There's a potential bug here where the game server's workloadClusterProvider
      // can't be resolved as the room's subcollections have been deleted and therefore the default
      // system workloadClusterProvider won't match that which was used to provision the room's
      // game server.
      // To resolve this, the workloadClusterProvider should be present on the room doc itself
      return await gameservers.deleteGameServer(organizationId, roomId);
    });

const deletedRoomDeleteSubcollections =
  // onDelete() of a room
  // Delete all the room's subcollection documents
  functions
    .runWith(customRunWith)
    .firestore
    .document(roomWildcardPath())
    .onDelete(async (_, context) => {
      const organizationId : string = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const subcollections = await getRoomRef(organizationId, roomId).listCollections();
      // TODO: Implement an actual recursive function to ensure n-depth subcollection docs are deleted
      return subcollections.flatMap(async (subcollection) => {
        return (await subcollection.listDocuments()).map((doc) => doc.delete());
      });
    });

const newRoomAddId =
  // onCreate() add roomId for collectionGroupQuery
  functions
    .runWith(customRunWith)
    .firestore
    .document(roomWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));

      return snapshot.ref.update({
        id: snapshot.id,
      });
    });

const onUpdateRoomStateReact =
  // onUpdate() of Room
  // If state changed, trigger function
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
      const room = change.after.data() as docTypes.Room;

      // Execute actual state machine handler for room state change
      if (roomBefore.state == room.state) {
        console.log("Skipping execution as room state didn't change");
        return;
      } else {
        await gameservers.onUpdateRoomState(organizationId, roomId, room);
      }
    });

const onUpdateRoomRejectedByBilling =
  // onUpdate() of Room
  // If state changed, trigger function
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
      const room = change.after.data() as docTypes.Room;

      if (roomBefore.rejectedByBilling == room.rejectedByBilling || room.rejectedByBilling == undefined || room.rejectedByBilling == false) {
        console.log("Skipping execution as room rejectedByBilling is false or didn't change");
        return;
      } else {
        console.debug(`Rejecting all ${room.currentParticipantCount} participants in room ${getRoomRef(organizationId, roomId).path} due to billing`);
        const participantDocs = (await getParticipantsRef(organizationId, roomId).orderBy("created").get()).docs;
        // Set all participant states to "rejected-by-billing"
        await Promise.all(participantDocs.map(async (pd) => await pd.ref.update({updated: admin.firestore.Timestamp.now(), state: "rejected-by-billing"})));
        // Remove rejectedByBilling field on room
        return await getRoomRef(organizationId, roomId).update({updated: admin.firestore.Timestamp.now(), rejectedByBilling: admin.firestore.FieldValue.delete()});
      }
    });

export const creates = {
  onCreateRoomAddToSpace,
  onCreateSpaceCopyTemplateSpaceItems,
  onCreateSpaceAddStreamingInfo,
  onCreateSpaceCopySpaceItems,
  onCreateSpaceAddNewRoom,
  onCreateRoomCreateHistoricRoom,
  newRoomAddId,
};

export const reads = {
  decryptSpaceStreamPrivate,
};

export const updates = {
  onUpdateSpaceUpdateRooms,
  onUpdateRoomUpdateHistoricRoom,
  onUpdateRoomUpdateShards,
  onUpdateRoomUpdateSpaceParticipantSum,
  saveSpaceHistoryOnSpaceWrite,
  saveSpaceHistoryOnSpaceItemWrite,
  onWriteSpaceDenormalizeBillingUsage,
  onUpdateRoomStateReact,
  onUpdateRoomRejectedByBilling,
};

export const deletes = {
  deletedSpaceDeleteRoom,
  deletedRoomDeleteShards,
  deletedRoomRemoveShardFromOriginal,
  deletedRoomDeleteGameServer,
  deletedRoomDeleteSubcollections,
  onDeleteRoomRemoveFromSpace,
};
