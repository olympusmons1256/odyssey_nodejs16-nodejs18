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
exports.getParticipantsDenormalized = exports.getDocs = exports.getAllRooms = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("./lib/documents/firestore");
// This file contains tests
// Manually specify here so that Google Support can see what this function is doing
const firebaseServiceAccount = "firebase-functions-backend@";
const customRunWith = {
    memory: "256MB",
    serviceAccount: firebaseServiceAccount,
    timeoutSeconds: 300,
    vpcConnector: "gke-odyssey",
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
};
// Every minute, get all rooms from all organizations
exports.getAllRooms = functions
    .runWith(customRunWith)
    .pubsub.schedule("every minute")
    .onRun(async () => {
    try {
        const organizationDocs = await Promise.all((await admin.firestore().collection("organizations").listDocuments()).map(async (doc) => await doc.get()));
        if (organizationDocs.length < 1) {
            throw new Error("No organizations found");
        }
        const validOrganizationIds = organizationDocs.flatMap((organizationDoc) => {
            const organization = organizationDoc.data();
            return (organization == undefined) ? [] : [organizationDoc.id];
        });
        if (validOrganizationIds.length != organizationDocs.length) {
            throw new Error("At least one organization is undefined");
        }
        const rooms = await Promise.all((await Promise.all(validOrganizationIds.map(async (organizationId) => {
            const orgRooms = await Promise.all((await admin.firestore().collection("organizations").doc(organizationId).collection("rooms").listDocuments()).map(async (doc) => await doc.get()));
            if (orgRooms.length < 1) {
                throw new Error(`No rooms found in organization: ${organizationId}`);
            }
            return orgRooms.map(async (roomDoc) => {
                // TODO: Remove this doc update once stateChanges have been removed accross all environments
                if (roomDoc != undefined) {
                    const d = roomDoc.data();
                    if (Object.keys(d).includes("stateChanges")) {
                        console.log("Deleting stateChanges field from doc: ", roomDoc.ref.path);
                        await roomDoc.ref.update({ stateChanges: admin.firestore.FieldValue.delete() });
                    }
                    // TODO: Remove this doc delete once the participantsDenormalized/0 docs been removed accross all environments
                    const doc = (0, firestore_1.getParticipantsDenormalizedRef)(organizationId, roomDoc.id).doc("0");
                    console.debug("Deleting participantsDenormalized doc: ", doc.path);
                    await doc.delete();
                }
                return roomDoc === null || roomDoc === void 0 ? void 0 : roomDoc.ref.path;
            });
        }))).flat());
        rooms.forEach((room) => (room == undefined) ? console.log("Undefined room") : console.log("Got room: ", room));
    }
    catch (e) {
        console.error("Test failed");
        return console.error(e);
    }
});
// Every minute, get the document system/configuration/workloadClusterProviders/coreweave 100 times
exports.getDocs = functions
    .runWith(customRunWith)
    .pubsub.schedule("every minute")
    .onRun(async () => {
    await Promise.all(Array.from(Array(100).keys()).map(async () => {
        try {
            const coreweave = await admin.firestore().doc("system/configuration/workloadClusterProviders/coreweave").get();
            if (coreweave.exists) {
                return console.debug("Got doc 'system/configuration/workloadClusterProviders/coreweave'");
            }
            else {
                return console.warn("Doc 'system/configuration/workloadClusterProviders/coreweave' doesn't exist");
            }
        }
        catch (e) {
            console.error(e);
            return console.error("Failed to get doc 'system/configuration/workloadClusterProviders/coreweave'");
        }
    }));
});
// Every minute, get the document system/configuration/workloadClusterProviders/coreweave 100 times
exports.getParticipantsDenormalized = functions
    .runWith(customRunWith)
    .pubsub.schedule("every minute")
    .onRun(async () => {
    await Promise.all(Array.from(Array(100).keys()).map(async () => {
        try {
            const coreweave = await admin.firestore().doc("system/configuration/workloadClusterProviders/coreweave").get();
            if (coreweave.exists) {
                return console.debug("Got doc 'system/configuration/workloadClusterProviders/coreweave'");
            }
            else {
                return console.warn("Doc 'system/configuration/workloadClusterProviders/coreweave' doesn't exist");
            }
        }
        catch (e) {
            console.error(e);
            return console.error("Failed to get doc 'system/configuration/workloadClusterProviders/coreweave'");
        }
    }));
});
//# sourceMappingURL=tests.js.map