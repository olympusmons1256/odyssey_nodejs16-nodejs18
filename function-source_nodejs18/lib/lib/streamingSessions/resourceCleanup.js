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
exports.cleanupCoreweave = void 0;
const k8s = __importStar(require("@kubernetes/client-node"));
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("./shared");
const firestore_1 = require("../../lib/documents/firestore");
const deploy_standard_1 = require("./deploy-standard");
const firebase_1 = require("../firebase");
const _1 = require(".");
function getResourceInfo(resource) {
    if (resource.metadata == undefined || resource.metadata.labels == undefined || resource.metadata.name == undefined) {
        console.debug("Pod missing one of metadata, labels or name: ", resource);
        return undefined;
    }
    else {
        const nameMatch = resource.metadata.name.match(RegExp("odyssey-client-[0-9a-z]+-[0-9a-z]+"));
        if (nameMatch == null || nameMatch.length < 1) {
            console.debug("Pod name doesn't match expected format for an odyssey client: ", resource.metadata.name);
            return undefined;
        }
        if (resource.metadata.labels.organizationId == undefined ||
            resource.metadata.labels.roomId == undefined ||
            resource.metadata.labels.userId == undefined ||
            resource.metadata.labels.deviceId == undefined ||
            resource.metadata.labels.deploymentId == undefined ||
            resource.metadata.labels.firebaseProjectId == undefined) {
            console.error("Pod missing a necessary label: ", resource.metadata.name);
            return undefined;
        }
        else {
            return {
                organizationId: resource.metadata.labels.organizationId,
                roomId: resource.metadata.labels.roomId,
                userId: resource.metadata.labels.userId,
                deviceId: resource.metadata.labels.deviceId,
                participantId: resource.metadata.labels.userId + ":" + resource.metadata.labels.deviceId,
                deploymentId: resource.metadata.labels.deploymentId,
                name: resource.metadata.name,
                firebaseProjectId: resource.metadata.labels.firebaseProjectId,
            };
        }
    }
}
async function checkResourceShouldBeDeleted(resourceInfo, deploymentTimeout, deviceTimeout) {
    const [deploymentDoc, deployment] = await (0, firestore_1.getDeployment)(resourceInfo.organizationId, resourceInfo.roomId, resourceInfo.participantId, resourceInfo.deploymentId);
    const [participantDoc, participant] = await (0, firestore_1.getParticipant)(resourceInfo.organizationId, resourceInfo.roomId, resourceInfo.participantId);
    const [deviceDoc, device] = await (0, firestore_1.getDevice)(resourceInfo.userId, resourceInfo.deviceId);
    const participantBrowserStateUpdateWebRtc = await (0, firestore_1.getParticipantBrowserStateUpdateWebRtc)(resourceInfo.organizationId, resourceInfo.roomId, resourceInfo.participantId);
    const [, webRtcState] = participantBrowserStateUpdateWebRtc;
    const webRtcOnline = (0, _1.checkWebRtcStateOnline)(participantBrowserStateUpdateWebRtc, deviceTimeout);
    if (!webRtcOnline)
        console.debug(`Browser WebRtc state not online: ${resourceInfo.name}`, webRtcState);
    if (participant != undefined && participant.bot) {
        console.debug("Participant is a bot, skipping: ", resourceInfo.name);
        return undefined;
    }
    if (deploymentDoc != undefined && deploymentDoc.exists == false) {
        console.debug("Deployment doc no longer exists: ", resourceInfo.name);
        return resourceInfo;
    }
    if (deployment != undefined && deployment.state in ["deprovisioning", "deprovisioned"] && deployment.updated.seconds < deploymentTimeout) {
        console.debug("Deployment has been deprovisioning or deprovisioned for > 5 minutes: ", resourceInfo.name);
        return resourceInfo;
    }
    if (participantDoc != undefined && participantDoc.exists == false) {
        console.debug("Participant doc no longer exists: ", resourceInfo.name);
        return resourceInfo;
    }
    if (deviceDoc != undefined && deviceDoc.exists == false && !webRtcOnline) {
        console.debug("Device doc no longer exists: ", resourceInfo.name);
        return resourceInfo;
    }
    if (device != undefined && device.state == "offline" && device.lastChanged.seconds < deviceTimeout && !webRtcOnline) {
        console.debug("Device has been offline for > 1 minute: ", resourceInfo.name);
        return resourceInfo;
    }
    return undefined;
}
async function cleanupCoreweave() {
    const fiveMinutesAgo = admin.firestore.Timestamp.now().seconds - 300;
    const oneMinuteAgo = admin.firestore.Timestamp.now().seconds - 60;
    const kc = await (0, shared_1.resolveKubeConfig)("coreweave");
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const networkingClient = kc.makeApiClient(k8s.NetworkingV1Api);
    const firebaseProjectId = (0, firebase_1.getFirebaseProjectId)();
    const pods = (await coreClient.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, `app=odyssey-client,firebaseProjectId=${firebaseProjectId}`)).body.items;
    const ingresses = (await networkingClient.listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, `app=odyssey-client,firebaseProjectId=${firebaseProjectId}`)).body.items;
    const configmaps = (await coreClient.listNamespacedConfigMap(namespace, undefined, undefined, undefined, undefined, `app=odyssey-client,firebaseProjectId=${firebaseProjectId}`)).body.items;
    const services = (await coreClient.listNamespacedService(namespace, undefined, undefined, undefined, undefined, `app=odyssey-client,firebaseProjectId=${firebaseProjectId}`)).body.items;
    const resources = Array.from(new Set([...pods, ...ingresses, ...configmaps, ...services]).values());
    console.debug(`Found ${resources.length} resources`);
    const resourceInfos = resources.map((resource) => getResourceInfo(resource))
        .flatMap((resourceInfo) => (resourceInfo == undefined) ? [] : [resourceInfo]);
    console.debug(`Got info for ${resourceInfos.length} resources`);
    const resourcesToDelete = (await Promise.all(resourceInfos.map(async (resourceInfo) => await checkResourceShouldBeDeleted(resourceInfo, fiveMinutesAgo, oneMinuteAgo))))
        .flatMap((p) => (p == undefined) ? [] : p);
    console.debug(`Resources to delete: ${resourcesToDelete.length}`);
    const deleteAll = resourcesToDelete.map(async (resourceInfo) => {
        console.debug("Deleting resource stack: ", resourceInfo.name);
        await (0, deploy_standard_1.deletePodStack)(resourceInfo.userId, resourceInfo.deploymentId, "coreweave");
        console.debug("Deleting participant: ", resourceInfo.name);
        await (0, firestore_1.getParticipantRef)(resourceInfo.organizationId, resourceInfo.roomId, resourceInfo.participantId).delete();
        return;
    });
    const deleted = await Promise.all(deleteAll);
    console.debug(`Resources deleted: ${deleted.length}`);
}
exports.cleanupCoreweave = cleanupCoreweave;
//# sourceMappingURL=resourceCleanup.js.map