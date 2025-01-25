"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletes = exports.updates = exports.creates = exports.roomParticipantsUsageCheck = exports.triggerRoomParticipantUsageChecksF = void 0;
// @ts-nocheck - Node.js 16 compatibility
// @ts-nocheck
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const streamingSessions = __importStar(require("./lib/streamingSessions/index"));
const gameservers = __importStar(require("./lib/gameservers/index"));
const deploy_standard_1 = require("./lib/streamingSessions/deploy-standard");
const shared_1 = require("./shared");
const firebase_1 = require("./lib/firebase");
const firestore_1 = require("./lib/documents/firestore");
const shared_2 = require("./lib/unrealProjects/shared");
const participants_1 = require("./lib/participants");
const billing_1 = require("./lib/billing");
const usage_1 = require("./lib/organizations/usage");
const organizations_1 = require("./lib/organizations");
const afkCheck = 
// Https callable
// Update the afkCheck timestamp for a given participant
functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    try {
        const afkCheckParticipantRequestData = data;
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (userId == undefined) {
            throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        const [participantDoc] = await (0, firestore_1.getParticipant)(afkCheckParticipantRequestData.organizationId, afkCheckParticipantRequestData.roomId, userId + ":" + afkCheckParticipantRequestData.deviceId);
        if (participantDoc == undefined || participantDoc.exists == false) {
            console.error("Participant to afkCheck is missing");
            throw new functions.https.HttpsError("not-found", "Participant not found");
        }
        else {
            return participantDoc.ref.update({ afkCheck: admin.firestore.Timestamp.now() });
        }
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            console.error("Unknown error encountered");
            console.error(e);
            throw new functions.https.HttpsError("internal", "Unknown error");
        }
    }
});
const createParticipant = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a, _b;
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
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (userId == undefined) {
            throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        const room = (await (0, firestore_1.getRoom)(data.organizationId, data.roomId))[1];
        if (room == undefined || room.spaceId == undefined) {
            throw new functions.https.HttpsError("not-found", "Room or its associated space not found");
        }
        const userCanViewSpaceResult = await (0, organizations_1.userCanViewSpace)(data.organizationId, room.spaceId, userId);
        if (userCanViewSpaceResult.result === false) {
            console.debug(userCanViewSpaceResult.reason);
            throw new functions.https.HttpsError("permission-denied", "User doesn't have permission to view the space");
        }
        const participantId = userId + ":" + data.deviceId;
        const [existingParticipantDoc, existingParticipant] = (await (0, firestore_1.getParticipant)(data.organizationId, data.roomId, participantId));
        const deployments = (_b = (await (0, firestore_1.getDeployments)(data.organizationId, data.roomId, participantId))) === null || _b === void 0 ? void 0 : _b.flatMap((r) => {
            return (r[1] != undefined) ? [r] : [];
        });
        // If the participant doesn't exist now, but did exist in the past (i.e. it has at least one deployment doc), return an error
        if (existingParticipant === undefined && deployments != undefined && deployments.length > 0) {
            throw new functions.https.HttpsError("resource-exhausted", "A participant with that id already existed in the past");
        }
        // if the participant still exists now, just return it
        if (existingParticipant !== undefined && existingParticipantDoc !== undefined) {
            return Object.assign(Object.assign({}, existingParticipant), { id: existingParticipantDoc.id });
        }
        // Create a new participant
        if (existingParticipant === undefined) {
            const newParticipant = {
                deviceId: data.deviceId,
                userId,
                created: admin.firestore.Timestamp.now(),
                updated: admin.firestore.Timestamp.now(),
                state: "new",
            };
            await (0, firestore_1.getParticipantRef)(data.organizationId, data.roomId, participantId).create(newParticipant);
            const [, participant] = await (0, firestore_1.getParticipant)(data.organizationId, data.roomId, participantId);
            if (participant === undefined) {
                throw new Error("Failed to create participant");
            }
            return Object.assign(Object.assign({}, participant), { id: participantId });
        }
        return null;
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
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
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const participant = snapshot.data();
    const organizationId = context.params.organizationId;
    const participantId = context.params.participantId;
    const roomId = context.params.roomId;
    const [, user] = await (0, firestore_1.getUser)(participantId.split(":")[0]);
    if (user == undefined) {
        return console.error("User undefined");
    }
    const [, room] = await (0, firestore_1.getRoom)(organizationId, roomId);
    if (room == undefined) {
        return console.error("Room undefined");
    }
    const spaceId = room.spaceId || "";
    // determine user role
    let role = "space_visitor";
    const [, orgMember] = await (0, firestore_1.getOrganizationUser)(organizationId, participantId.split(":")[0]);
    const [, spaceMember] = await (0, firestore_1.getSpaceUser)(organizationId, spaceId, participantId.split(":")[0]);
    if (orgMember != undefined) {
        role = orgMember.role;
    }
    else if (spaceMember != undefined) {
        role = spaceMember.role;
    }
    const participantDenormalized = {
        created: participant.created,
        updated: participant.updated,
        userId: participant.userId,
        userEmail: user.email,
        deviceId: participant.deviceId,
        userRole: role,
    };
    if (user.name != undefined) {
        participantDenormalized.userName = user.name;
    }
    if (user.avatarReadyPlayerMeImg != undefined) {
        participantDenormalized.avatarReadyPlayerMeImg = user.avatarReadyPlayerMeImg;
    }
    return await (0, firestore_1.getParticipantDenormalizedRef)(organizationId, roomId, participantId).set(participantDenormalized);
});
const newParticipantIncrementCount = 
// onCreate() of new participant
// Increment currentParticipantCount by 1
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantCount = (await (0, firestore_1.getParticipantsRef)(organizationId, roomId).orderBy("created").get()).size;
    console.debug("Setting room currentParticipantCount: ", participantCount);
    return await (0, firestore_1.getRoomRef)(organizationId, roomId).update({ currentParticipantCount: participantCount });
});
const newCommsParticipant = 
// onCreate() of new participant
// Create new commsParticipant
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const participantId = context.params.participantId;
    const roomId = context.params.roomId;
    const userId = participantId.split(":")[0];
    const [, user] = await (0, firestore_1.getUser)(userId);
    if (user == undefined) {
        return console.error("User undefined");
    }
    const roomsCommsParticipant = {
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
    return await (0, firestore_1.getCommsParticipantRef)(organizationId, roomId, participantId).set(roomsCommsParticipant);
});
const newAdminIncrementCount = 
// onCreate() of new participantDenormalized
// Increment currentAdminCount by 1
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantDenormalizedWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const adminCount = (await (0, firestore_1.getParticipantsDenormalizedRef)(organizationId, roomId).get()).docs.filter((doc) => doc.exists && (doc.data().userRole.includes("org_"))).length;
    console.debug("Setting room currentAdminCount: ", adminCount);
    return await (0, firestore_1.getRoomRef)(organizationId, roomId).update({ currentAdminCount: adminCount });
});
const newParticipantNewRoomShard = 
// onCreate() of new participant
// Create a new roomShard if participants exceeds the threshold
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onCreate(async (snapshot, context) => {
    var _a, _b, _c;
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const defaultNewShardThreshold = 70;
    const [roomDoc, room] = await (0, firestore_1.getRoom)(organizationId, roomId);
    if (room == undefined || roomDoc == undefined) {
        return console.error("Room undefined");
    }
    console.debug("Getting original room");
    const getOriginalRoom = async () => (room.shardOf == undefined) ? Promise.resolve([roomDoc, room]) : await (0, firestore_1.getRoom)(organizationId, room.shardOf);
    const [originalRoomDoc, originalRoom] = await getOriginalRoom();
    if (originalRoom == undefined || originalRoomDoc == undefined) {
        return console.error("Unable to resolve original room");
    }
    const spaceId = room.spaceId;
    if (spaceId == undefined) {
        return console.error("Unable to resolve space");
    }
    const [, bridgeToolkitFileSettingsData] = await (0, firestore_1.getBridgeToolkitSettingsItem)(organizationId, spaceId);
    const supportsMultiplayer = (_c = (_b = (_a = bridgeToolkitFileSettingsData === null || bridgeToolkitFileSettingsData === void 0 ? void 0 : bridgeToolkitFileSettingsData.data) === null || _a === void 0 ? void 0 : _a.supportsMultiplayer) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : false;
    if (supportsMultiplayer == true && (originalRoom.enableSharding == undefined || originalRoom.enableSharding == false)) {
        return console.debug("Sharding is disabled for this room or its original.");
    }
    const shardingAvailable = await gameservers.billingFeatureShardingEnabled(organizationId, snapshot);
    if (!shardingAvailable) {
        return console.warn("Sharding not available:", snapshot.ref.path);
    }
    const fiveSecondsAgo = admin.firestore.Timestamp.fromMillis((admin.firestore.Timestamp.now().seconds - 5) * 1000);
    const shardsCreatedWithinFiveSeconds = (await (0, firestore_1.getRoomsRef)(organizationId)
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
        }
        else {
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
        }
        else {
            console.debug("Room already has shards, calculating total participants from all shards");
            const totalShardParticipants = (await Promise.all(originalRoom.shards.map(async (shardRoomId) => {
                const [, shardRoom] = await (0, firestore_1.getRoom)(organizationId, shardRoomId);
                return (shardRoom != undefined && shardRoom.currentParticipantCount != undefined) ? shardRoom.currentParticipantCount : 0;
            }))).reduce((x, y) => x + y);
            return originalRoomParticipants + totalShardParticipants;
        }
    };
    const totalParticipants = await getTotalParticipants();
    if (totalParticipants == undefined) {
        return console.error("Failed to get total participants across all shards");
    }
    else {
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
        };
        const shardRoomId = (await (0, firestore_1.addRoom)(organizationId, shardRoom)).id;
        console.debug("Created shard room: ", shardRoomId);
        const shardRoomName = originalRoom.name + " | " + shardRoomId.slice(0, 5).toUpperCase();
        console.debug("Updating shardRoom name to: ", shardRoomName);
        await (0, firestore_1.getRoomRef)(organizationId, shardRoomId).update({
            updated: admin.firestore.Timestamp.now(),
            name: shardRoomName,
        });
        console.debug("Adding shardRoom name to: ", shardRoomName);
        return await originalRoomDoc.ref.update({
            updated: admin.firestore.Timestamp.now(),
            shards: admin.firestore.FieldValue.arrayUnion(shardRoomId),
        });
    }
    else {
        return console.debug("Participants count does not exceed the total threshold of all shards.");
    }
});
const newParticipantNewDeployments = 
// onCreate() of new participant
// deploy a streaming session to kubernetes
functions
    .runWith(shared_1.customRunWithWarm)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const [userId, deviceId] = participantId.split(":");
    const participant = snapshot.data();
    const updated = admin.firestore.Timestamp.fromDate(new Date(context.timestamp));
    const participantUpdated = Object.assign(Object.assign({}, participant), { stateChanges: admin.firestore.FieldValue.arrayUnion({
            state: participant.state,
            timestamp: updated,
        }) });
    const [, billingPublic] = await (0, firestore_1.getBillingPublic)(organizationId);
    if (billingPublic == undefined || billingPublic.aggregateBillingState == "inactive") {
        console.log(`Participant rejected by billing: ${snapshot.ref.path}`);
        participantUpdated.updated = admin.firestore.Timestamp.now();
        participantUpdated.state = "rejected-by-billing";
        return await streamingSessions.updateParticipant(participantUpdated, organizationId, roomId, participantId);
    }
    const [, room] = await (0, firestore_1.getRoom)(organizationId, roomId);
    if ((room === null || room === void 0 ? void 0 : room.spaceId) == undefined) {
        console.error("Failed to create deployment: Room has no spaceId");
        participantUpdated.updated = admin.firestore.Timestamp.now();
        participantUpdated.state = "create-deployments-failed";
        return await streamingSessions.updateParticipant(participantUpdated, organizationId, roomId, participantId);
    }
    const result = Promise.all(await streamingSessions.createNewDeployments(organizationId, room.spaceId, roomId, participantId, userId, deviceId, room === null || room === void 0 ? void 0 : room.shardOf))
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
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const participant = snapshot.data();
    const historicParticipant = {
        created: participant.created,
        userId: participant.userId,
        deviceId: participant.deviceId,
        workloadClusterProvider: participant.workloadClusterProvider,
    };
    console.debug("Creating historicParticipant: ", historicParticipant);
    return await (0, firestore_1.getHistoricParticipantRef)(organizationId, roomId, participantId).set(historicParticipant);
});
const deletedParticipantFinalUsage = 
// onDelete() of participant
// Set the deleted timestamp on the historicParticipant
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const participantUsage = await (0, participants_1.calculateParticipantUsage)(organizationId, roomId, true, new Date(context.timestamp), snapshot);
    if (participantUsage == undefined)
        return console.error(`Failed to calculate usage for deleted participant ${snapshot.ref.path}`);
    return await (0, firestore_1.getParticipantUsageCollectionRef)(organizationId, roomId, participantId).add(participantUsage.participantUsage);
});
const deletedParticipantAddHistory = 
// onDelete() of participant
// Set the deleted timestamp on the historicParticipant
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const deleted = admin.firestore.Timestamp.fromDate(new Date(Date.parse(context.timestamp)));
    const [, historicParticpant] = await (0, firestore_1.getHistoricParticipant)(organizationId, roomId, participantId);
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
    return await (0, firestore_1.getHistoricParticipantRef)(organizationId, roomId, participantId).update(historicParticipantUpdate);
});
const deletedParticipantAddCompleted = 
// onDelete() of participant
// Add a new document to completedParticipants
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const deleted = admin.firestore.Timestamp.fromDate(new Date(Date.parse(context.timestamp)));
    const [, room] = await (0, firestore_1.getRoom)(organizationId, roomId);
    const spaceId = room === null || room === void 0 ? void 0 : room.spaceId;
    const completedParticpant = Object.assign(Object.assign({}, snapshot.data()), { organizationId,
        spaceId,
        roomId,
        deleted });
    console.debug("Creating completed participant:", snapshot.ref.path);
    return await (0, firestore_1.getCompletedParticipantRef)(participantId).create(completedParticpant);
});
async function triggerRoomParticipantUsageChecksF(context) {
    const roomDocs = (await admin.firestore().collectionGroup("rooms").where("currentParticipantCount", ">=", 1).get()).docs;
    console.debug(`Got ${roomDocs.length} room docs`);
    return (await Promise.allSettled(roomDocs.map(async (rd) => {
        var _a;
        const organizationId = (_a = rd.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
        if (organizationId == undefined) {
            console.debug(`organizationId from parent of parent doc is undefined: ${rd.ref.path}`);
            return;
        }
        console.debug(`Triggering room participants usage check for room ${rd.ref.path}`);
        const usageCheck = {
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
exports.triggerRoomParticipantUsageChecksF = triggerRoomParticipantUsageChecksF;
const onUsageChecksCompleteUpdateOrgUsage = functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomParticipantUsageCheckWildcardPath)())
    .onUpdate(async (change, context) => {
    const projectId = (0, firebase_1.getFirebaseProjectId)();
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantUsageCheckId = context.params.participantUsageCheckId;
    const participantUsageCheck = change.after.data();
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
    const lastParticipantUsageCheck = lastParticipantUsageCheckDoc === null || lastParticipantUsageCheckDoc === void 0 ? void 0 : lastParticipantUsageCheckDoc.data();
    console.debug(`Last lastParticipantUsageCheck is ${lastParticipantUsageCheckDoc === null || lastParticipantUsageCheckDoc === void 0 ? void 0 : lastParticipantUsageCheckDoc.ref.path}`);
    const afterOrEqualToEndTimestamp = ((lastParticipantUsageCheck === null || lastParticipantUsageCheck === void 0 ? void 0 : lastParticipantUsageCheck.startedAt) == undefined) ? fiveMinutesAgo : lastParticipantUsageCheck.startedAt.toDate();
    if ((lastParticipantUsageCheck === null || lastParticipantUsageCheck === void 0 ? void 0 : lastParticipantUsageCheck.startedAt) == undefined)
        console.debug(`lastParticipantUsageCheck startedAt undefined. Calculating usage from ${fiveMinutesAgo.toISOString()} for participantUsageCheck: ${change.after.ref.path}`);
    const beforeEndTimestamp = participantUsageCheck.startedAt.toDate();
    const configurationBilling = await (0, billing_1.getConfigurationBilling)({
        organizationId: organizationId,
        roomId: roomId,
    });
    const result = await (0, usage_1.queryRoomUsageCheckOperation)({ projectId, organizationId, roomId, participantUsageCheckId, afterOrEqualToEndTimestamp, beforeEndTimestamp, configurationBilling });
    const sumCreditsUsed = result.sumCreditsUsed;
    const participantUsageDocsAccounted = result.participantUsageDocCount;
    if (sumCreditsUsed === undefined || sumCreditsUsed === null || Number.isNaN(result.sumCreditsUsed)) {
        console.error(`Failed to calculate sumCreditsUsed for participantUsageCheck: ${change.after.ref.path}`);
        return;
    }
    console.debug(`Updating billing/usage, deducting ${sumCreditsUsed} from availableCredits due to participantUsageCheck: ${change.after.ref.path}`);
    await (0, firestore_1.getBillingUsageRef)(organizationId).set({ updated: admin.firestore.Timestamp.now(), availableCredits: admin.firestore.FieldValue.increment(-sumCreditsUsed) }, { merge: true });
    console.debug(`Updating participantUsageCheck with accountedAt: ${change.after.ref.path}`);
    await (0, firestore_1.getParticipantUsageCheckRef)(organizationId, roomId, participantUsageCheckId).update({ deductedCredits: sumCreditsUsed, participantUsageDocsAccounted, afterOrEqualToEndTimestamp, accountedAt: admin.firestore.Timestamp.now(), excludedUsageEmailDomains: configurationBilling === null || configurationBilling === void 0 ? void 0 : configurationBilling.excludedUsageEmailDomains, result: "accounted" });
    return;
});
const triggerRoomParticipantUsageChecks = functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async (context) => {
    return await triggerRoomParticipantUsageChecksF(context);
});
async function roomParticipantsUsageCheck(eventTimestamp, participantUsageCheck, organizationId, roomId, participantUsageCheckId) {
    const lastUsageCheckOperationStarted = (await (0, firestore_1.getParticipantUsageChecksRef)(organizationId, roomId).orderBy("triggeredAt", "desc").limit(1).get()).docs.pop();
    const lastSuccessfulUsageCheckOperationCompleted = (await (0, firestore_1.getParticipantUsageChecksRef)(organizationId, roomId).where("result", "in", ["participant-usage-docs-added", "completed", "accounted"]).orderBy("participantUsageDocsAddedAt", "desc").limit(1).get()).docs.pop();
    console.debug({ lastUsageCheckOperationStarted, lastSuccessfulUsageCheckOperationCompleted });
    const startedAt = admin.firestore.Timestamp.fromDate(eventTimestamp);
    const usageCheckStarted = {
        triggeredAt: participantUsageCheck.triggeredAt,
        startedAt,
    };
    const getParticipantUsageCheckDocRef = (0, firestore_1.getParticipantUsageCheckRef)(organizationId, roomId, participantUsageCheckId);
    await getParticipantUsageCheckDocRef.set(usageCheckStarted, { merge: true });
    const participantDocs = (await (0, firestore_1.getParticipantsRef)(organizationId, roomId).where("state", "==", "ready-deployment").get()).docs;
    const createdParticipantUsageDocs = (await Promise.allSettled(participantDocs.map(async (participantDoc) => {
        const participantUsageResult = await (0, participants_1.calculateParticipantUsage)(organizationId, roomId, false, eventTimestamp, participantDoc);
        if (participantUsageResult == undefined)
            return undefined;
        return await (0, firestore_1.getParticipantUsageCollectionRef)(organizationId, roomId, participantDoc.id).add(participantUsageResult.participantUsage);
    })));
    const participantUsageDocsAdded = createdParticipantUsageDocs.reduce((acc, o) => {
        return (o.status == "fulfilled" && o.value != undefined) ? acc + 1 : acc;
    }, 0);
    const usageCheckFinished = {
        triggeredAt: participantUsageCheck.triggeredAt,
        participantUsageDocsAdded,
        startedAt,
        participantUsageDocsAddedAt: admin.firestore.Timestamp.now(),
        result: "participant-usage-docs-added",
    };
    await getParticipantUsageCheckDocRef.set(usageCheckFinished, { merge: true });
    // Clean up previous incomplete usage check operations
    if ((lastUsageCheckOperationStarted === null || lastUsageCheckOperationStarted === void 0 ? void 0 : lastUsageCheckOperationStarted.id) != (lastSuccessfulUsageCheckOperationCompleted === null || lastSuccessfulUsageCheckOperationCompleted === void 0 ? void 0 : lastSuccessfulUsageCheckOperationCompleted.id) && !(lastSuccessfulUsageCheckOperationCompleted == undefined && lastUsageCheckOperationStarted == undefined)) {
        const previousCheckOperationsStarted = (await (0, firestore_1.getParticipantUsageChecksRef)(organizationId, roomId).orderBy("triggeredAt", "desc").limit(10).get()).docs;
        const updates = await Promise.all(previousCheckOperationsStarted.map(async (usageCheckDoc) => {
            try {
                const usageCheck = usageCheckDoc.data();
                if (usageCheck.startedAt == undefined || usageCheck.result == undefined || usageCheck.participantUsageDocsAddedAt == undefined) {
                    const now = new Date(new Date().toUTCString()).valueOf();
                    const fiveMinutesAgo = now - (300 * 1000);
                    if (usageCheck.triggeredAt.toMillis() < fiveMinutesAgo) {
                        await usageCheckDoc.ref.update({
                            completedAt: admin.firestore.Timestamp.now(),
                            result: "timed-out",
                        });
                        return { updated: true, doc: usageCheckDoc };
                    }
                    return { updated: false, doc: usageCheckDoc };
                }
                return { updated: false, doc: usageCheckDoc };
            }
            catch (e) {
                return { updated: false, error: e, doc: usageCheckDoc };
            }
        }));
        updates.forEach((o) => {
            if (o.error != undefined)
                return console.error(`Failed to update usage check operation doc: ${o.doc.ref.path}`);
            return console.debug(`Marked old participantUsageCheck as timed-out: ${o.doc.ref.path}`);
        });
    }
}
exports.roomParticipantsUsageCheck = roomParticipantsUsageCheck;
// onCreate of a participantUsageCheck doc on a room
const onCreateParticipantUsageCheckRoom = functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomParticipantUsageCheckWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantUsageCheckId = context.params.participantUsageCheckId;
    const participantUsageCheck = snapshot.data();
    return await roomParticipantsUsageCheck(new Date(context.timestamp), participantUsageCheck, organizationId, roomId, participantUsageCheckId);
});
const newDeploymentNewStreamingSession = 
// onCreate() of new participant
// deploy a streaming session to kubernetes
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.deploymentWildcardPath)())
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    const projectId = (0, firebase_1.getFirebaseProjectId)();
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const [userId, deviceId] = participantId.split(":");
    const deploymentId = context.params.deploymentId;
    const deployment = snapshot.data();
    try {
        const [, room] = await (0, firestore_1.getRoom)(organizationId, roomId);
        if (room == undefined) {
            await (0, deploy_standard_1.updateDeploymentState)(organizationId, roomId, participantId, deploymentId, "failed-before-provisioning");
            return console.error("Room is undefined");
        }
        if (room.spaceId == undefined) {
            await (0, deploy_standard_1.updateDeploymentState)(organizationId, roomId, participantId, deploymentId, "failed-before-provisioning");
            return console.error("Room spaceId is undefined");
        }
        const [, space] = await (0, firestore_1.getSpace)(organizationId, room.spaceId);
        if (space == undefined) {
            await (0, deploy_standard_1.updateDeploymentState)(organizationId, roomId, participantId, deploymentId, "failed-before-provisioning");
            return console.error("Space is undefined");
        }
        console.debug("Resolving space unreal project version...");
        const resolvedUnrealProjectVersion = await (0, shared_2.resolveSpaceUnrealProjectVersion)(space);
        if (resolvedUnrealProjectVersion == "not-found") {
            await (0, deploy_standard_1.updateDeploymentState)(organizationId, roomId, participantId, deploymentId, "failed-before-provisioning");
            return console.error(`Failed to find unreal project version ${(_a = space.unrealProject) === null || _a === void 0 ? void 0 : _a.unrealProjectId}/${(_b = space.unrealProject) === null || _b === void 0 ? void 0 : _b.unrealProjectVersionId}`);
        }
        return streamingSessions
            .deployStreamingSession(projectId, deployment, organizationId, room.spaceId, room.shardOf, roomId, participantId, deploymentId, room.serverAddress, room.levelId, userId, deviceId, (room.graphicsBenchmark != undefined) ? room.graphicsBenchmark : 5, resolvedUnrealProjectVersion, room.region);
    }
    catch (e) {
        return;
    }
});
const updateDeploymentStateReact = 
// onCreate() of new participant
// deploy a streaming session to kubernetes
functions
    .runWith(shared_1.customRunWithWarm)
    .firestore
    .document((0, firestore_1.deploymentWildcardPath)())
    .onUpdate(async (change, context) => {
    var _a;
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const [userId, deviceId] = participantId.split(":");
    const deploymentId = context.params.deploymentId;
    const deploymentBefore = change.before.data();
    const deploymentAfterDocId = change.after.id;
    const deploymentAfter = change.after.data();
    if (deploymentBefore.state == deploymentAfter.state) {
        console.debug("Not running as state hasn't changed");
        return;
    }
    try {
        await streamingSessions.collectDeploymentPodStackState(organizationId, roomId, participantId, deploymentId, userId, deploymentAfter.workloadClusterProvider, deploymentAfter.state);
    }
    catch (e) {
        console.error("Error with streamingSessions.collectDeploymentPodStackState");
    }
    switch (deploymentAfter.state) {
        case "pod-ready": {
            console.debug(`This deployment ${deploymentId} is ready: `, deploymentAfter);
            // Gather latest state of all deployments
            const deployments = (_a = (await (0, firestore_1.getDeployments)(organizationId, roomId, participantId))) === null || _a === void 0 ? void 0 : _a.flatMap(([doc, deploy]) => {
                return (doc == undefined || deploy == undefined) ? [] : [[doc.id, deploy]];
            });
            if (deployments == undefined || deployments.length == 0) {
                return console.error("No deployments");
            }
            // Check if any other deployments "won" the race before this one
            const [winnerDeploymentId, winnerDeployment] = deployments.reduce((acc, [docId, deploy]) => {
                if (deploy.state == "pod-ready" && deploy.updated < deploymentAfter.updated) {
                    return [docId, deploy];
                }
                else {
                    return acc;
                }
            }, [deploymentAfterDocId, deploymentAfter]);
            console.debug(`This deployment is the winner ${winnerDeploymentId}: `, winnerDeployment);
            // Set loser deployment docs to deprovisioning
            deployments.forEach(async (deploymentWithId) => {
                const [deployId] = deploymentWithId;
                if (deployId != winnerDeploymentId) {
                    console.debug(`Setting loser deployment doc to deprovisioning: ${deployId}`);
                    await (0, deploy_standard_1.updateDeploymentState)(organizationId, roomId, participantId, deployId, "deprovisioning");
                }
            });
            // If this deployment won the race
            if (winnerDeploymentId == deploymentId) {
                // Update participant
                if (winnerDeployment.signallingUrl == undefined) {
                    throw new Error("Winner has no signallingUrl");
                }
                return (0, deploy_standard_1.updateParticipantState)(organizationId, roomId, participantId, "ready-deployment", "pod-ready", winnerDeployment.signallingUrl, deploymentId);
            }
            else {
                return;
            }
        }
        case "deprovisioning": {
            const deleteResult = await (0, deploy_standard_1.deletePodStack)(userId, deploymentId, deploymentAfter.workloadClusterProvider);
            if (deleteResult) {
                return await (0, deploy_standard_1.updateDeploymentState)(organizationId, roomId, participantId, deploymentId, "deprovisioned");
            }
            else {
                return await (0, deploy_standard_1.updateDeploymentState)(organizationId, roomId, participantId, deploymentId, "failed-deprovisioning");
            }
        }
        case "failed-provisioning":
        case "failed-before-provisioning":
        case "pod-failed":
        case "timed-out-provisioning": {
            const [, latestParticipant] = await (0, firestore_1.getParticipant)(organizationId, roomId, participantId);
            if (latestParticipant == undefined) {
                console.debug(`Participant no longer exists for deployment: ${deploymentId}, deprovisioning`);
                return await streamingSessions.deprovisionDeployment(organizationId, roomId, participantId, deploymentId);
            }
            const result = await streamingSessions.replaceAndDeprovisionDeployment(organizationId, roomId, participantId, deploymentId, userId, deviceId, deploymentAfter.attempts + 1, deploymentAfter.workloadClusterProvider);
            if (typeof (result) === "string") {
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
async function deprovisionParticipantDeployments(organizationId, roomId, participantId) {
    const deployments = await (0, firestore_1.getDeployments)(organizationId, roomId, participantId);
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
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    return await deprovisionParticipantDeployments(organizationId, roomId, participantId);
});
const onUpdateParticipantRejectedByBilling = functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const participant = change.after.data();
    if (participant.state === "rejected-by-billing") {
        console.log(`Participant has been rejected by billing: ${change.after.ref.path}. Deleting`);
        return await change.after.ref.delete();
    }
    return null;
});
const onUpdateParticipantCountScaleGameServer = 
// onUpdate() of room
// Provision or deprovision the game server
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomWildcardPath)())
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const roomBefore = change.before.data();
    const roomAfter = change.after.data();
    if (roomAfter == undefined) {
        return console.error("Room change after undefined");
    }
    if (roomAfter.spaceId == undefined) {
        return console.error(`Room '${roomId}' is missing spaceId`);
    }
    const roomDocPath = (0, firestore_1.getRoomRef)(organizationId, roomId);
    const [, space] = await (0, firestore_1.getSpace)(organizationId, roomAfter.spaceId);
    if (space == undefined) {
        return console.error(`Failed to get space '${roomAfter.spaceId}' of '${roomDocPath}'`);
    }
    const unrealProjectVersion = await (0, shared_2.resolveSpaceUnrealProjectVersion)(space);
    const supportsMultiplayer = (() => {
        var _a, _b;
        if (unrealProjectVersion == "not-found")
            return false;
        return (_b = (_a = unrealProjectVersion === null || unrealProjectVersion === void 0 ? void 0 : unrealProjectVersion.unrealProjectVersion.bridgeToolkitFileSettings) === null || _a === void 0 ? void 0 : _a.supportsMultiplayer) !== null && _b !== void 0 ? _b : false;
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
        const [, billingPublic] = await (0, firestore_1.getBillingPublic)(organizationId);
        if (billingPublic !== undefined && billingPublic.aggregateBillingState === "inactive") {
            console.log(`Room rejected by billing: ${(0, firestore_1.getRoomRef)(organizationId, roomId).path}`);
            return;
        }
        return await gameservers.waitAndProvision(Date.now(), organizationId, roomId);
    }
    if (roomAfter.currentParticipantCount == 0) {
        // Zero participants, deprovision once in a state to do so
        if (roomAfter.state != "deprovisioning" && roomAfter.state != "deprovisioned") {
            return await gameservers.waitAndDeprovision(Date.now(), organizationId, roomId);
        }
        else {
            console.debug("Room already deprovisioning, nothing to do");
            return;
        }
    }
});
const deletedParticipantDenormalize = 
// onDelete() of a participant
// Remove the denormalized copy of the participant
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    console.debug("Deleting participant denormalized");
    return await (0, firestore_1.getParticipantDenormalizedRef)(organizationId, roomId, participantId).delete();
});
const deletedCommsParticipant = 
// onDelete() of a participant
// Remove comms participant
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    console.debug("Deleting participant denormalized");
    return await (0, firestore_1.getCommsParticipantRef)(organizationId, roomId, participantId).delete();
});
const deletedParticipantDecrementCount = 
// onDelete() of new participant
// Decrement currentParticipantCount by 1
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantCount = (await (0, firestore_1.getParticipantsRef)(organizationId, roomId).get()).docs.filter((doc) => doc.exists).length;
    console.debug("Setting room currentParticipantCount: ", participantCount);
    return await (0, firestore_1.getRoomRef)(organizationId, roomId).update({ currentParticipantCount: participantCount });
});
const deletedBrowserStateUpdateDeleteParticipant = functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.browserStateUpdateWebRtcWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const [userId, deviceId] = participantId.split(":");
    const [deviceDoc, device] = await (0, firestore_1.getDevice)(userId, deviceId);
    const oneMinuteAgo = admin.firestore.Timestamp.now().seconds - 60;
    if (device != undefined && deviceDoc != undefined && deviceDoc.exists == true && device.state == "online" && device.lastChanged.seconds > oneMinuteAgo) {
        console.debug("Device still active for deleted webrtc browserStateUpdate, skipping", snapshot.ref.path);
        return;
    }
    else {
        console.debug("Device does not exist for deleted webrtc browserStateUpdate, finding participants", snapshot.ref.path);
    }
    const participantDocsThatExist = (await (0, firestore_1.getParticipantsRef)(organizationId, roomId)
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
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantDenormalizedWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const adminCount = (await (0, firestore_1.getParticipantsDenormalizedRef)(organizationId, roomId).get()).docs.filter((doc) => doc.exists && (doc.data().userRole.includes("org_"))).length;
    console.debug("Setting room currentAdminCount: ", adminCount);
    return await (0, firestore_1.getRoomRef)(organizationId, roomId).update({ currentAdminCount: adminCount });
});
exports.creates = {
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
exports.updates = {
    updateDeploymentStateReact,
    onUpdateParticipantCountScaleGameServer,
    onUpdateParticipantRejectedByBilling,
    triggerRoomParticipantUsageChecks,
    onUsageChecksCompleteUpdateOrgUsage,
    afkCheck,
};
exports.deletes = {
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
const updateDeploymentStateReactOld = 
// onUpdate() of new participant
// deploy a streaming session to kubernetes
functions
    .runWith(shared_1.customRunWithWarm)
    .firestore
    .document((0, firestore_1.deploymentWildcardPath)())
    .onUpdate(async (change, context) => {
    const deploymentId = context.params.deploymentId;
    const deploymentBefore = change.before.data();
    const deploymentAfter = change.after.data();
    if (deploymentAfter == undefined || deploymentBefore == undefined) {
        return console.error("Deployment data is undefined");
    }
    // If state hasn't changed, nothing to do
    if (deploymentBefore.state == deploymentAfter.state) {
        return;
    }
    switch (deploymentAfter.state) {
        case "pod-ready": {
            console.debug(`This deployment ${deploymentId} is ready: `, deploymentAfter);
            // Gather latest state of all deployments
            const [deploymentsDoc] = await (0, firestore_1.getDeployments)(deploymentAfter.organizationId, deploymentAfter.roomId, deploymentAfter.participantId);
            if (deploymentsDoc == undefined) {
                return console.error("Failed to get deployments");
            }
            const deployments = deploymentsDoc.data();
            if (deployments == undefined) {
                return console.error("Failed to get deployments data");
            }
            // Check if all deployments are ready
            const allDeploymentsReady = Object.values(deployments).every((deployment) => deployment.state == "pod-ready");
            if (allDeploymentsReady) {
                await (0, deploy_standard_1.updateParticipantState)(deploymentAfter.organizationId, deploymentAfter.roomId, deploymentAfter.participantId, "ready");
            }
            break;
        }
    }
});
//# sourceMappingURL=participants.js.map