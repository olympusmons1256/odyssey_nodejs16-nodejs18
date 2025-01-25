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
exports.updateGkeParticipantsDenormalizedAutoscaleNodePools = exports.updateWorkloadClusterProviderGke = exports.clientNodeImagePullDaemonsetGke = exports.createParticipantDenormalizeToGkeParticipants = exports.deleteParticipantDenormalizeToGkeParticipants = void 0;
// @ts-ignore
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const streamingSessions = __importStar(require("./lib/streamingSessions/index"));
const shared_1 = require("./shared");
const firestore_1 = require("./lib/documents/firestore");
const imagePull_1 = require("./lib/streamingSessions/imagePull");
const clusterProviders_1 = require("./lib/clusterProviders");
function resolveGkeAccelerator(configuration) {
    if (configuration.unrealGkeAccelerator == undefined) {
        console.log("No specific GKE Accelerator provided, defaulting to " + "nvidia-tesla-t4");
        return "nvidia-tesla-t4";
    }
    else {
        return configuration.unrealGkeAccelerator;
    }
}
exports.deleteParticipantDenormalizeToGkeParticipants = 
// onUpdate() of participant
// Denormalize participant user / device data
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data:");
    console.debug(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const [userId, deviceId] = participantId.split(":");
    const configuration = await streamingSessions.getConfigurationOdysseyClientPod(organizationId, roomId, userId);
    if (configuration == undefined) {
        console.error("Unable to resolve odyssey client pod configuration");
        return;
    }
    if (configuration.workloadClusterProviders == undefined) {
        console.error("Unable to resolve workloadClusterProviders configuration");
        return;
    }
    if (configuration.workloadClusterProviders.length == 0) {
        console.error("No workloadClusterProviders configured");
        return;
    }
    if (!configuration.workloadClusterProviders.includes("gke")) {
        console.log("GKE not specified in workloadClusterProviders. Nothing to do");
        return;
    }
    const gkeAccelerator = resolveGkeAccelerator(configuration);
    const [gkeParticipantsDenormalizedDoc, gkeParticipantsDenormalized] = await (0, firestore_1.getGkeParticipantsDenormalized)(gkeAccelerator);
    if (gkeParticipantsDenormalizedDoc == undefined || gkeParticipantsDenormalized == undefined) {
        return console.error("gkeParticipantsDenormalizedDoc or gkeParticipantsDenormalized is undefined");
    }
    if (gkeParticipantsDenormalized.participants != undefined) {
        gkeParticipantsDenormalized.participants.forEach((existingParticipant) => {
            if (existingParticipant.userId == userId &&
                existingParticipant.deviceId == deviceId &&
                existingParticipant.roomId == roomId &&
                existingParticipant.organizationId == organizationId) {
                console.log("Removing existing participant from denormalized Gke participants");
                gkeParticipantsDenormalizedDoc.ref.update({
                    updated: admin.firestore.Timestamp.now(),
                    participants: admin.firestore.FieldValue.arrayRemove(existingParticipant),
                });
            }
        });
    }
});
exports.createParticipantDenormalizeToGkeParticipants = 
// onUpdate() of participant
// Denormalize participant user / device data
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.participantWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data:");
    console.debug(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const roomId = context.params.roomId;
    const participantId = context.params.participantId;
    const [userId, deviceId] = participantId.split(":");
    const participant = snapshot.data();
    const configuration = await streamingSessions.getConfigurationOdysseyClientPod(organizationId, roomId, userId);
    if (configuration == undefined) {
        console.error("Unable to resolve odyssey client pod configuration");
        return;
    }
    if (configuration.workloadClusterProviders == undefined) {
        console.error("Unable to resolve workloadClusterProviders configuration");
        return;
    }
    if (configuration.workloadClusterProviders.length == 0) {
        console.error("No workloadClusterProviders configured");
        return;
    }
    if (!configuration.workloadClusterProviders.includes("gke")) {
        console.log("GKE not specified in workloadClusterProviders. Nothing to do");
        return;
    }
    const gkeAccelerator = resolveGkeAccelerator(configuration);
    const gkeParticipantDenormalized = {
        created: participant.created,
        updated: participant.updated,
        deviceId,
        userId,
        organizationId,
        roomId,
    };
    return (0, firestore_1.getGkeParticipantsDenormalizedRef)(gkeAccelerator).update({
        updated: admin.firestore.Timestamp.now(),
        participants: admin.firestore.FieldValue.arrayUnion(gkeParticipantDenormalized),
    });
});
exports.clientNodeImagePullDaemonsetGke = functions
    .runWith(shared_1.customRunWith)
    .firestore.document("system/configuration/configurations/odysseyClientPod")
    .onUpdate(async (change, context) => {
    const existingConfiguration = change.before.data();
    const updatedConfiguration = change.after.data();
    if (updatedConfiguration.unrealImageId == null || updatedConfiguration.unrealImageId == undefined) {
        console.log("Skipping execution due to missing field: unrealImageId");
        return;
    }
    if (updatedConfiguration.unrealImageId != undefined && existingConfiguration.unrealImageId != undefined && existingConfiguration.unrealImageId == updatedConfiguration.unrealImageId) {
        console.log("Skipping execution due to unchanged unrealImageId");
        return;
    }
    if (updatedConfiguration.unrealImageRepo === undefined) {
        throw new Error("Missing image repo");
    }
    const doc = {
        created: admin.firestore.Timestamp.now(),
        updated: admin.firestore.Timestamp.now(),
        imageId: updatedConfiguration.unrealImageId,
        imageRepo: updatedConfiguration.unrealImageRepo,
        workloadClusterProvider: "gke",
    };
    const deployResult = await (0, imagePull_1.deployNodeImagePullDaemonSet)(updatedConfiguration, "gke");
    if (deployResult == undefined) {
        doc.state = "failed";
        doc.updated = admin.firestore.Timestamp.now();
    }
    else {
        const [state] = deployResult;
        doc.state = state;
        doc.updated = admin.firestore.Timestamp.now();
    }
    return await (0, firestore_1.getClientNodeImagePullDaemonsetRef)().doc(context.eventId).set(doc);
});
exports.updateWorkloadClusterProviderGke = 
// onCreate() of new participant
// Denormalize participant user / device data
functions
    .runWith(shared_1.customRunWith)
    .firestore.document("system/configuration/workloadClusterProviders/gke")
    .onUpdate(async (change) => {
    const existingConfiguration = change.before.data();
    console.log("Existing configuration: ", existingConfiguration);
    const updatedConfiguration = change.after.data();
    console.log("Updated configuration: ", updatedConfiguration);
    if (updatedConfiguration.minNodeCounts == undefined) {
        console.error("Missing minNodeCounts array in updated configuration. Skipping execution as assuming old data");
        return;
    }
    if (existingConfiguration.minNodeCounts == undefined) {
        console.error("Missing minNodeCounts array in existing configuration. Skipping execution as assuming old data");
        return;
    }
    const updatedGkeAcceleratorConfigs = updatedConfiguration.minNodeCounts.flatMap((p) => {
        var _a;
        if ((_a = existingConfiguration.minNodeCounts) === null || _a === void 0 ? void 0 : _a.includes(p)) {
            return [];
        }
        else {
            return [p];
        }
    });
    const removedGkeAcceleratorConfigs = existingConfiguration.minNodeCounts.flatMap((p) => {
        var _a;
        if ((_a = updatedConfiguration.minNodeCounts) === null || _a === void 0 ? void 0 : _a.includes(p)) {
            return [];
        }
        else {
            return [p];
        }
    });
    if ((updatedGkeAcceleratorConfigs.length + removedGkeAcceleratorConfigs.length) == 0) {
        console.log("No new or removed GkeAcceleratorNodePoolConfigurations, not scaling Gke");
        return;
    }
    else {
        console.debug(`GkeAcceleratorNodePoolConfiguration - ${updatedGkeAcceleratorConfigs} updated, ${removedGkeAcceleratorConfigs} removed`);
        const uniqueGkeAcceleratorsUpdatedOrRemoved = updatedGkeAcceleratorConfigs.concat(removedGkeAcceleratorConfigs)
            .map((gkeAcceleratorConfig) => {
            return gkeAcceleratorConfig.accelerator;
        })
            .reduce((unique, gkeAccelerator) => {
            return unique.includes(gkeAccelerator) ? unique : [...unique, gkeAccelerator];
        }, []);
        return Promise.all(uniqueGkeAcceleratorsUpdatedOrRemoved
            .map(async (gkeAccelerator) => {
            console.log(`Autoscaling Gke Nodes with ${gkeAccelerator}`);
            return await (0, clusterProviders_1.autoscaleClientNodesGke)(gkeAccelerator);
        }));
    }
});
exports.updateGkeParticipantsDenormalizedAutoscaleNodePools = 
// onCreate() of new participant
// Denormalize participant user / device data
functions
    .runWith(shared_1.customRunWith)
    .firestore.document("system/operations/gkeParticipantsDenormalized/{gkeAccelerator}")
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const gkeAccelerator = context.params.gkeAccelerator;
    console.debug("Change to ", change.after.ref.path);
    const gkeParticipantsDenormalizedBefore = change.before.data();
    const gkeParticipantsDenormalized = change.after.data();
    const newGkeParticipantsDenormalized = gkeParticipantsDenormalized.participants.flatMap((p) => {
        if (gkeParticipantsDenormalizedBefore.participants.includes(p)) {
            return [];
        }
        else {
            return [p];
        }
    });
    const removedGkeParticipantsDenormalized = gkeParticipantsDenormalizedBefore.participants.flatMap((p) => {
        if (gkeParticipantsDenormalized.participants.includes(p)) {
            return [];
        }
        else {
            return [p];
        }
    });
    console.debug(`GkeParticipantsDenormalized - ${newGkeParticipantsDenormalized} new, ${removedGkeParticipantsDenormalized} removed`);
    if ((newGkeParticipantsDenormalized.length + removedGkeParticipantsDenormalized.length) == 0) {
        console.log("No new or removed participants, not scaling Gke");
        return;
    }
    else {
        return (0, clusterProviders_1.autoscaleClientNodesGke)(gkeAccelerator);
    }
});
//# sourceMappingURL=gke.js.map