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
exports.updateCoreweaveAvailability = exports.updateSystemOdysseyServerPod = exports.updateSystemOdysseyClientPod = exports.updateImageIds = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("./lib/documents/firestore");
const shared_1 = require("./shared");
const availability_1 = require("./lib/coreweave/availability");
const misc_1 = require("./lib/misc");
const utils_1 = require("./lib/utils");
// onPublish to updateImageIds topic
// Update the odysseyClientPod & odysseyServer configurations
exports.updateImageIds = functions
    .runWith(shared_1.customRunWith)
    .pubsub.topic("updateImageIds")
    .onPublish(async (data, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(data));
    const payload = data.json;
    if ((payload.clientImageId == null || payload.clientImageId == undefined) && (payload.clientMountImageId == null || payload.clientMountImageId == undefined)) {
        throw new Error("Must specify one clientImageId or clientMountImageId");
    }
    if ((payload.clientImageRepo == null || payload.clientImageRepo == undefined) && (payload.clientMountImageRepo == null || payload.clientMountImageRepo == undefined)) {
        throw new Error("Must specify one clientImageRepo or clientMountImageRepo");
    }
    if ((payload.serverImageId == null || payload.serverImageId == undefined) && (payload.serverMountImageId == null || payload.serverMountImageId == undefined)) {
        throw new Error("Must specify one serverImageId or serverMountImageId");
    }
    if ((payload.serverImageRepo == null || payload.serverImageRepo == undefined) && (payload.serverMountImageRepo == null || payload.serverMountImageRepo == undefined)) {
        throw new Error("Must specify one serverImageRepo or serverMountImageRepo");
    }
    const updatedClient = {
        unrealImageRepo: payload.clientImageRepo,
        unrealImageId: payload.clientImageId,
        unrealMountImageRepo: payload.clientMountImageRepo,
        unrealMountImageId: payload.clientMountImageId,
        updated: admin.firestore.Timestamp.now(),
    };
    const updatedServer = {
        unrealImageRepo: payload.serverImageRepo,
        unrealImageId: payload.serverImageId,
        unrealMountImageRepo: payload.serverMountImageRepo,
        unrealMountImageId: payload.serverMountImageId,
        updated: admin.firestore.Timestamp.now(),
    };
    return await Promise.all([
        (0, firestore_1.getOdysseyClientPodRef)().update((0, utils_1.toFirestoreUpdateData)(updatedClient)),
        (0, firestore_1.getOdysseyServerRef)().update((0, utils_1.toFirestoreUpdateData)(updatedServer)),
    ]);
});
// onUpdate of odyssey client configuration, add to versions collection
exports.updateSystemOdysseyClientPod = functions
    .runWith(shared_1.customRunWith)
    .firestore.document((0, firestore_1.getOdysseyClientPodRef)().path)
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const configurationAfter = change.after.data();
    if (configurationAfter.unrealImageId != undefined) {
        return await (0, firestore_1.getOdysseyClientVersionsRef)().doc(configurationAfter.unrealImageId).create({ id: configurationAfter.unrealImageId });
    }
    else {
        return console.log("unrealImageId not set. Nothing to do");
    }
});
// onUpdate of odyssey client configuration, add to versions collection
exports.updateSystemOdysseyServerPod = functions
    .runWith(shared_1.customRunWith)
    .firestore.document((0, firestore_1.getOdysseyServerRef)().path)
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const configurationAfter = change.after.data();
    if (configurationAfter.unrealImageId != undefined) {
        return await (0, firestore_1.getOdysseyServerVersionsRef)().doc(configurationAfter.unrealImageId).create({ id: configurationAfter.unrealImageId });
    }
    else {
        return console.log("unrealImageId not set. Nothing to do");
    }
});
exports.updateCoreweaveAvailability = functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every minute")
    .onRun(async (context) => {
    const executedAt = new Date(context.timestamp).getTime();
    async function loop(executions) {
        console.debug("Getting latest region availability from coreweave API");
        await (0, availability_1.getLatestAvailabilityFromCoreweave)();
        if (new Date().getTime() < executedAt + 45000 && executions < 4) {
            await (0, misc_1.sleep)(15000);
            return loop(executions + 1);
        }
        return;
    }
    console.debug("Starting coreweave region availability API request loop");
    return await loop(0);
});
//# sourceMappingURL=configuration.js.map