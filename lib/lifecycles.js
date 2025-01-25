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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOldBrowserStateUpdates = exports.cleanupCoreweaveResources = exports.firestoreBackup = exports.cleanOldDeprovisioningDeployments = exports.ageCheckParticipantsDenormalized = exports.afkCheckParticipants = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = __importDefault(require("@google-cloud/firestore"));
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("./shared");
const firebase_1 = require("./lib/firebase");
const resourceCleanup_1 = require("./lib/streamingSessions/resourceCleanup");
const firestore_2 = require("./lib/documents/firestore");
async function afkCheckParticipant(doc) {
    const participant = doc.data();
    const maxMinutesOld = 180;
    const twoHoursAgo = admin.firestore.Timestamp.now().seconds - (60 * maxMinutesOld);
    if ((participant.afkCheck == undefined && participant.created.seconds < twoHoursAgo) ||
        (participant.afkCheck != undefined && participant.afkCheck.seconds < twoHoursAgo)) {
        console.debug(`Deleting participant which hasn't completed an afk check for ${maxMinutesOld} minutes: `, doc.ref.path);
        return doc.ref.delete();
    }
    else {
        console.log(`Participant doc newer than ${maxMinutesOld} minutes, not checking or applying afk: `, doc.ref.path);
        return;
    }
}
exports.afkCheckParticipants = 
// Every 5 minutes
// Afk check all participants > 2 hours old
functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
    const participantsDoc = (await admin.firestore().collectionGroup("participants").orderBy("updated").get()).docs;
    if (participantsDoc.length > 0) {
        console.log("Processing query results for collection group query");
        participantsDoc.forEach(async (doc) => await afkCheckParticipant(doc));
    }
    else {
        console.log("Collection group query returned no results. Nothing to do");
        return;
    }
});
async function ageCheckParticipantDenormalized(doc) {
    var _a, _b, _c, _d;
    const maxParticipantAgeMs = 60 * 60 * 24 * 1000;
    const updateTime = doc.updateTime.toMillis();
    const nowMinusMaxAge = Date.now() - maxParticipantAgeMs;
    if (updateTime < nowMinusMaxAge) {
        console.debug({ maxParticipantAgeMs, nowMinusMaxAge, updateTime });
        console.debug(`Deleting participantDenormalized: ${doc.ref.path} which was last updated at ${updateTime}: `, doc.id);
        await doc.ref.delete();
        const organizationId = (_c = (_b = (_a = doc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.parent) === null || _b === void 0 ? void 0 : _b.parent) === null || _c === void 0 ? void 0 : _c.id;
        const roomId = (_d = doc.ref.parent.parent) === null || _d === void 0 ? void 0 : _d.id;
        if (organizationId != undefined && roomId != undefined) {
            console.debug(`Deleting participant: ${doc.ref.path}`);
            await (0, firestore_2.getParticipantRef)(organizationId, roomId, doc.id).delete();
        }
    }
}
exports.ageCheckParticipantsDenormalized = 
// Every 5 minutes
// Delete all participantsDenormalized > 24 hours old
functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
    const denormalizardParticipantsDoc = (await admin.firestore().collectionGroup("participantsDenormalized").orderBy("updated").get()).docs;
    if (denormalizardParticipantsDoc.length > 0) {
        console.log("Processing query results for collection group query");
        denormalizardParticipantsDoc.forEach(async (doc) => await ageCheckParticipantDenormalized(doc));
    }
    else {
        console.log("Collection group query returned no results. Nothing to do");
        return;
    }
});
async function cleanOldDeprovisioningDeployment(doc) {
    const maxMinutesOld = 120;
    const twoHoursAgo = admin.firestore.Timestamp.now().seconds - (60 * maxMinutesOld);
    if (doc.data().state == "deprovisioning" && doc.updateTime.seconds < twoHoursAgo) {
        await doc.ref.update({ state: "deprovisioned", updated: admin.firestore.Timestamp.now() });
        console.debug(`Forced deployment to deprovisioned after ${maxMinutesOld} minutes: `, doc.ref.path);
    }
}
exports.cleanOldDeprovisioningDeployments = 
// Every 5 minutes
// Deprovisioning check for deployments > 2 hours old
functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
    const deploymentDocs = (await admin.firestore().collectionGroup("deployments").orderBy("updated").get()).docs;
    if (deploymentDocs.length > 0) {
        console.log("Processing query results from collection group query");
        deploymentDocs.forEach(async (doc) => await cleanOldDeprovisioningDeployment(doc));
    }
    else {
        console.log("Collection group query returned no results. Nothing to do");
        return;
    }
});
exports.firestoreBackup = 
// Back up entire firestore database on a cron
functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every 24 hours")
    .onRun(async () => {
    const client = new firestore_1.default.v1.FirestoreAdminClient();
    const projectId = (0, firebase_1.getFirebaseProjectId)();
    const bucket = "gs://" + projectId + "-firestore-backups";
    const databaseName = client.databasePath(projectId, "(default)");
    console.debug(`Exporting firestore database '${databaseName}' to bucket '${bucket}'`);
    return client.exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        // Leave collectionIds empty to export all collections
        // or set to a list of collection IDs to export,
        // collectionIds: ['users', 'posts']
        collectionIds: [],
    })
        .then((responses) => {
        const response = responses[0];
        console.log(`Operation Name: ${response["name"]}`);
    })
        .catch((err) => {
        console.error(err);
        throw new Error("Export operation failed");
    });
});
exports.cleanupCoreweaveResources = functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
    return await (0, resourceCleanup_1.cleanupCoreweave)();
});
exports.deleteOldBrowserStateUpdates = functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every minute")
    .onRun(async () => {
    const oneMinuteAgo = new Date(admin.firestore.Timestamp.now().toMillis() - 60000);
    (await admin.firestore()
        .collectionGroup("browserStateUpdates")
        .where("updated", "<", oneMinuteAgo)
        .get())
        .forEach(async (doc) => {
        if (doc.id == "webRtc") {
            console.debug(`Deleting old ${doc.id} browserStateUpdate: `, doc.ref.path);
            await doc.ref.delete();
        }
    });
});
//# sourceMappingURL=lifecycles.js.map