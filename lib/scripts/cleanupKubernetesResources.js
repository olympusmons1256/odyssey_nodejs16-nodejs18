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
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const k8s = __importStar(require("@kubernetes/client-node"));
const shared_1 = require("../lib/streamingSessions/shared");
const firestore_1 = require("../lib/documents/firestore");
const deploy_standard_1 = require("../lib/streamingSessions/deploy-standard");
const firebase_1 = require("../lib/firebase");
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
    if (deploymentDoc == undefined || deploymentDoc.exists == false) {
        console.debug("Deployment doc mising: ", resourceInfo.name);
        return resourceInfo;
    }
    if (deployment == undefined) {
        console.debug("Deployment data mising: ", resourceInfo.name);
        return resourceInfo;
    }
    if (deployment.state == "deprovisioning" && deployment.updated.seconds < deploymentTimeout) {
        console.debug("Deployment has been deprovisioning for > 5 minutes: ", resourceInfo.name);
        return resourceInfo;
    }
    const [participantDoc, participant] = await (0, firestore_1.getParticipant)(resourceInfo.organizationId, resourceInfo.roomId, resourceInfo.participantId);
    if (participantDoc == undefined || participantDoc.exists == false) {
        console.debug("Participant doc mising: ", resourceInfo.name);
        return resourceInfo;
    }
    if (participant == undefined) {
        console.debug("Participant data mising: ", resourceInfo.name);
        return resourceInfo;
    }
    const [deviceDoc, device] = await (0, firestore_1.getDevice)(resourceInfo.userId, resourceInfo.deviceId);
    if (deviceDoc == undefined || deviceDoc.exists == false) {
        console.debug("Device doc mising: ", resourceInfo.name);
        return resourceInfo;
    }
    if (device == undefined) {
        console.debug("Device data mising: ", resourceInfo.name);
        return resourceInfo;
    }
    if (device.state == "offline" && device.lastChanged.seconds < deviceTimeout) {
        console.debug("Device has been offline for > 1 minute: ", resourceInfo.name);
        return resourceInfo;
    }
    return undefined;
}
async function cleanupCoreweave() {
    const now = new Date().getTime();
    const fiveMinutesAgo = now - 300;
    const oneMinuteAgo = now - 60;
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
        const result = await (0, deploy_standard_1.deletePodStack)(resourceInfo.userId, resourceInfo.deploymentId, "coreweave");
        return (result) ? console.debug("Deleted resource stack: ", resourceInfo.name) : console.debug("Failed to delete resource stack: ", resourceInfo.name);
    });
    const deleted = await Promise.all(deleteAll);
    console.debug(`Resources deleted: ${deleted.length}`);
}
exports.cleanupCoreweave = cleanupCoreweave;
cleanupCoreweave();
//# sourceMappingURL=cleanupKubernetesResources.js.map