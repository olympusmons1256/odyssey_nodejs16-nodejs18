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
exports.deletes = exports.updates = exports.reads = exports.creates = void 0;
// @ts-nocheck - Node.js 16 compatibility
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const gameservers = __importStar(require("./lib/gameservers/index"));
const uuid_1 = require("uuid");
const shared_1 = require("./shared");
const firestore_1 = require("./lib/documents/firestore");
const functions_config_1 = require("./lib/functions-config");
const spaceStreams_1 = require("./lib/spaceStreams");
const encryption_1 = require("./lib/encryption");
const spaces_1 = require("./lib/spaces");
const organizations_1 = require("./lib/organizations");
const utils_1 = require("./lib/utils");
const onCreateRoomAddToSpace = 
// onCreate() room
// Add id to correct space.room[] collection
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const room = snapshot.data();
    // get correct space
    const spaceId = room.spaceId;
    const spaceRef = (0, firestore_1.getSpaceRef)(organizationId, spaceId);
    return await spaceRef.update({ rooms: admin.firestore.FieldValue.arrayUnion(roomId) });
});
const onCreateSpaceCopyTemplateSpaceItems = 
// onCreate() space
// Copy space template space items
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    const [latestSpaceDoc, latestSpace] = await (0, firestore_1.getSpace)(organizationId, spaceId);
    if (latestSpace == undefined || latestSpaceDoc == undefined || latestSpaceDoc.exists == false) {
        return console.error("ERROR: Unable to get latest space");
    }
    if (!latestSpace.spaceTemplateId) {
        return console.log("Space was not created by template");
    }
    const spaceTemplateId = latestSpace.spaceTemplateId;
    const spaceTemplateItems = await (0, firestore_1.getSpaceTemplateItems)(spaceTemplateId);
    if (spaceTemplateItems == undefined || spaceTemplateItems.length < 1) {
        return console.error("No space template items were found");
    }
    return await Promise.all([
        spaceTemplateItems === null || spaceTemplateItems === void 0 ? void 0 : spaceTemplateItems.forEach(async ([spaceItem]) => {
            if (spaceItem) {
                const spaceTemplateItem = spaceItem.data();
                await (0, firestore_1.getSpaceItemRef)(organizationId, spaceId, spaceItem.id).set(spaceTemplateItem);
            }
        }),
    ]);
});
const onCreateSpaceAddStreamingInfo = 
// onCreate() space
// Create new room and add room id to space's room array
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    return await (0, spaceStreams_1.addSpaceStreamingInfo)(organizationId, spaceId);
});
const onCreateSpaceCopySpaceItems = 
// onCreate() space
// Copy space items if space items exist in original space
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    const [, newSpace] = await (0, firestore_1.getSpace)(organizationId, spaceId);
    if (newSpace == undefined) {
        return console.error("ERROR: Unable to get newSpace space");
    }
    if (!newSpace.originalSpaceId) {
        return console.log("Space is not a copy");
    }
    const originalSpaceId = newSpace.originalSpaceId;
    const spaceItems = await (0, firestore_1.getSpaceItems)(organizationId, originalSpaceId);
    if (spaceItems == undefined || spaceItems.length < 1) {
        return console.error("ERROR: No space items were found");
    }
    return await Promise.all([
        spaceItems === null || spaceItems === void 0 ? void 0 : spaceItems.forEach(async ([spaceItem]) => {
            const spaceItemData = spaceItem === null || spaceItem === void 0 ? void 0 : spaceItem.data();
            console.log(spaceItemData);
            await (0, firestore_1.addSpaceItem)(organizationId, spaceId, spaceItemData);
        }),
    ]);
});
const saveSpaceHistoryOnSpaceWrite = functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceWildcardPath)())
    .onWrite(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    const space = change.after.data();
    return await (0, spaces_1.saveSpaceHistory)(organizationId, spaceId, new Date(context.timestamp), space);
});
const saveSpaceHistoryOnSpaceItemWrite = functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceItemWildcardPath)())
    .onWrite(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    return await (0, spaces_1.saveSpaceHistory)(organizationId, spaceId, new Date(context.timestamp));
});
const decryptSpaceStreamPrivate = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data) => {
    try {
        const [, spaceStreamPrivate] = await (0, firestore_1.getSpaceStreamPrivate)(data.organizationId, data.spaceId, data.spaceStreamId);
        if (spaceStreamPrivate == undefined) {
            throw new functions.https.HttpsError("not-found", "Not found");
        }
        const cryptoSecretKey = (0, functions_config_1.getEncryptionSecretKey)();
        if (cryptoSecretKey == undefined) {
            console.error("Failed to get encryption secret key");
            throw new functions.https.HttpsError("internal", "Internal server error");
        }
        const decrypted = (0, encryption_1.decryptWithKey)(Buffer.from(spaceStreamPrivate.encryptedPublisherToken, "base64"), cryptoSecretKey);
        if (decrypted == undefined) {
            console.error("Failed decryption");
            throw new functions.https.HttpsError("internal", "Internal server error");
        }
        const decryptedPublisherToken = decrypted.toString("ascii");
        const result = {
            publisherToken: decryptedPublisherToken,
        };
        return result;
    }
    catch (e) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "Internal server error");
    }
});
const onCreateSpaceAddNewRoom = 
// onCreate() space
// Create new room and add room id to space's room array
functions
    .runWith(shared_1.customRunWithWarm)
    .firestore
    .document((0, firestore_1.spaceWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    const [latestSpaceDoc, latestSpace] = await (0, firestore_1.getSpace)(organizationId, spaceId);
    if (latestSpace == undefined || latestSpaceDoc == undefined || latestSpaceDoc.exists == false) {
        return console.error("Unable to get latest space");
    }
    if (latestSpace.rooms.length < 1) {
        console.log("Space doesn't have an associated room. Creating it now.");
        const roomId = (0, uuid_1.v4)();
        const roomData = {
            created: admin.firestore.Timestamp.now(),
            updated: admin.firestore.Timestamp.now(),
            name: latestSpace.name,
            levelId: latestSpace.ueId,
            spaceId,
            avatarControlSystem: latestSpace.avatarControlSystem || "eventMode",
        };
        return await Promise.all([
            (0, firestore_1.getRoomRef)(organizationId, roomId).set(roomData),
            latestSpaceDoc.ref.update({ id: spaceId, rooms: admin.firestore.FieldValue.arrayUnion(roomId) }),
        ]);
    }
    else {
        return;
    }
});
const onWriteSpaceDenormalizeBillingUsage = functions
    .runWith(shared_1.customRunWithWarm)
    .firestore
    .document((0, firestore_1.spaceWildcardPath)())
    .onWrite(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    return await (0, organizations_1.updateOrganizationBillingUsage)(organizationId);
});
const onDeleteRoomRemoveFromSpace = 
// onDelete() room
// Remove id from correct space.room[] collection
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const room = snapshot.data();
    // get correct space
    const spaceId = room.spaceId;
    const spaceRef = (0, firestore_1.getSpaceRef)(organizationId, spaceId);
    return await spaceRef.update({ rooms: admin.firestore.FieldValue.arrayRemove(roomId) });
});
const onUpdateSpaceUpdateRooms = 
// onUpdate() space
// add any necessary information to rooms in space.rooms[]
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceWildcardPath)())
    .onUpdate(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(change.after.data()));
    const space = change.after.data();
    const organizationId = context.params.organizationId;
    const roomIds = space.rooms;
    // loop through each roomId and update their docs with required data
    // TODO: we should be able to remove this completely when things are fully hooked up using spaces
    return roomIds.forEach(async (roomId) => {
        const roomRef = (0, firestore_1.getRoomRef)(organizationId, roomId);
        await roomRef.update((0, utils_1.toFirestoreUpdateData)({
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
        }));
    });
});
const onCreateRoomCreateHistoricRoom = 
// onCreate() room
// Denormalize to historicRooms
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const room = snapshot.data();
    return await (0, firestore_1.getHistoricRoomRef)(organizationId, roomId).create(room);
});
const onUpdateRoomUpdateHistoricRoom = 
// onUpdate() of Room
// If state changed, trigger function
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
    const room = change.after.data();
    return await (0, firestore_1.getHistoricRoomRef)(organizationId, roomId).set(room);
});
const onUpdateRoomUpdateShards = 
// onUpdate() of Room
// If certain fields have changed, update the room's shards
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
    const room = change.after.data();
    const [, roomLatest] = await (0, firestore_1.getRoom)(organizationId, roomId);
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
    const update = {
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
        await (0, firestore_1.getRoomRef)(organizationId, shardRoomId).update((0, utils_1.toFirestoreUpdateData)(updateForShard));
    });
});
const onUpdateRoomUpdateSpaceParticipantSum = 
// onUpdate() of Room
// If change in participant count, update space participant sum
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
    const roomBefore = change.before.data();
    const roomAfter = change.after.data();
    const currentParticipantCountBefore = roomBefore.currentParticipantCount || 0;
    const currentParticipantCountAfter = roomAfter.currentParticipantCount || 0;
    if (currentParticipantCountBefore === currentParticipantCountAfter) {
        return console.log("no change in participant count");
    }
    if (roomAfter.spaceId == undefined) {
        return console.error("Room update missing `spaceId` field");
    }
    const spaceRef = (0, firestore_1.getSpaceRef)(organizationId, roomAfter.spaceId);
    const latestParticipantSum = (await (0, firestore_1.getOrganizationRef)(organizationId).collection("rooms").where("spaceId", "==", roomAfter.spaceId).get())
        .docs.reduce((acc, roomDoc) => {
        const room = roomDoc.data();
        return acc + (room.currentParticipantCount || 0);
    }, 0);
    return await spaceRef.update({ currentParticipantSum: latestParticipantSum });
});
const deletedSpaceDeleteRoom = 
// onDelete() of a space
// Delete all the space's room documents
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceWildcardPath)())
    .onDelete(async (snapshot, context) => {
    var _a;
    const organizationId = context.params.organizationId;
    const space = snapshot.data();
    return (_a = space.rooms) === null || _a === void 0 ? void 0 : _a.map(async (roomId) => {
        await (0, firestore_1.deleteRoom)(organizationId, roomId);
    });
});
const deletedRoomDeleteShards = 
// onDelete() of a room
// Delete all the room's subcollection documents
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomWildcardPath)())
    .onDelete(async (snapshot, context) => {
    var _a;
    const organizationId = context.params.organizationId;
    const room = snapshot.data();
    return (_a = room.shards) === null || _a === void 0 ? void 0 : _a.map(async (roomId) => {
        await (0, firestore_1.deleteRoom)(organizationId, roomId);
    });
});
const deletedRoomRemoveShardFromOriginal = 
// onDelete() of a room
// If this room is a shard, remove the shard from the original room shards list
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomWildcardPath)())
    .onDelete(async (snapshot, context) => {
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const room = snapshot.data();
    if (room.shardOf != undefined) {
        const [originalRoomDoc, originalRoom] = await (0, firestore_1.getRoom)(organizationId, room.shardOf);
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
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomWildcardPath)())
    .onDelete(async (_, context) => {
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
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
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomWildcardPath)())
    .onDelete(async (_, context) => {
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const subcollections = await (0, firestore_1.getRoomRef)(organizationId, roomId).listCollections();
    // TODO: Implement an actual recursive function to ensure n-depth subcollection docs are deleted
    return subcollections.flatMap(async (subcollection) => {
        return (await subcollection.listDocuments()).map((doc) => doc.delete());
    });
});
const newRoomAddId = 
// onCreate() add roomId for collectionGroupQuery
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.roomWildcardPath)())
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
    const room = change.after.data();
    // Execute actual state machine handler for room state change
    if (roomBefore.state == room.state) {
        console.log("Skipping execution as room state didn't change");
        return;
    }
    else {
        await gameservers.onUpdateRoomState(organizationId, roomId, room);
    }
});
const onUpdateRoomRejectedByBilling = 
// onUpdate() of Room
// If state changed, trigger function
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
    const room = change.after.data();
    if (roomBefore.rejectedByBilling == room.rejectedByBilling || room.rejectedByBilling == undefined || room.rejectedByBilling == false) {
        console.log("Skipping execution as room rejectedByBilling is false or didn't change");
        return;
    }
    else {
        console.debug(`Rejecting all ${room.currentParticipantCount} participants in room ${(0, firestore_1.getRoomRef)(organizationId, roomId).path} due to billing`);
        const participantDocs = (await (0, firestore_1.getParticipantsRef)(organizationId, roomId).orderBy("created").get()).docs;
        // Set all participant states to "rejected-by-billing"
        await Promise.all(participantDocs.map(async (pd) => await pd.ref.update({ updated: admin.firestore.Timestamp.now(), state: "rejected-by-billing" })));
        // Remove rejectedByBilling field on room
        return await (0, firestore_1.getRoomRef)(organizationId, roomId).update({ updated: admin.firestore.Timestamp.now(), rejectedByBilling: admin.firestore.FieldValue.delete() });
    }
});
exports.creates = {
    onCreateRoomAddToSpace,
    onCreateSpaceCopyTemplateSpaceItems,
    onCreateSpaceAddStreamingInfo,
    onCreateSpaceCopySpaceItems,
    onCreateSpaceAddNewRoom,
    onCreateRoomCreateHistoricRoom,
    newRoomAddId,
};
exports.reads = {
    decryptSpaceStreamPrivate,
};
exports.updates = {
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
exports.deletes = {
    deletedSpaceDeleteRoom,
    deletedRoomDeleteShards,
    deletedRoomRemoveShardFromOriginal,
    deletedRoomDeleteGameServer,
    deletedRoomDeleteSubcollections,
    onDeleteRoomRemoveFromSpace,
};
//# sourceMappingURL=rooms.js.map