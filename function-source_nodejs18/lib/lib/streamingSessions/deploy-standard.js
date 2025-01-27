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
exports.collectPodStackStates = exports.deletePodStack = exports.deployPodstack = exports.watchPodUntilReady = exports.watchConfigMapUntilReady = exports.updateParticipantState = exports.updateDeploymentState = void 0;
const k8s = __importStar(require("@kubernetes/client-node"));
const misc_1 = require("../misc");
const resourceYaml = __importStar(require("./yaml-standard"));
const shared_1 = require("./shared");
const admin = __importStar(require("firebase-admin"));
const shared_2 = require("../kubernetes/shared");
const firestore_1 = require("../documents/firestore");
const twilio_1 = require("../twilio");
const availability_1 = require("../coreweave/availability");
const utils_1 = require("../utils");
const podYamlFile = "./" + shared_1.serviceNameBase + "-pod" + ".yaml";
const configMapCustomYamlFile = "./" + shared_1.serviceNameBase + "-configmap-custom" + ".yaml";
const serviceYamlFile = "./" + shared_1.serviceNameBase + "-service" + ".yaml";
async function updateDeploymentState(organizationId, roomId, participantId, deploymentId, newState, signallingUrl, nodeName, region) {
    const now = admin.firestore.Timestamp.now();
    const newStateChangeEntry = { state: newState, timestamp: now };
    const stateUpdate = {
        state: newState,
        stateChanges: admin.firestore.FieldValue.arrayUnion(newStateChangeEntry),
        updated: now,
        signallingUrl,
        nodeName,
        region,
    };
    const [deploymentDoc] = await (0, firestore_1.getDeployment)(organizationId, roomId, participantId, deploymentId);
    if (deploymentDoc == undefined) {
        console.error("Deployment doc undefined");
        return undefined;
    }
    console.debug(`Updating deployment ${deploymentDoc.ref.path} with changes: `, stateUpdate);
    try {
        return await deploymentDoc.ref.update((0, utils_1.toFirestoreUpdateData)(stateUpdate));
    }
    catch (e) {
        console.error("Failed to update deployment state", e);
        return undefined;
    }
}
exports.updateDeploymentState = updateDeploymentState;
async function updateParticipantState(organizationId, roomId, participantId, newState, latestDeploymentState, signallingUrl, winnerDeploymentId) {
    const now = admin.firestore.Timestamp.now();
    const stateUpdate = {
        state: newState,
        updated: now,
        latestDeploymentState,
        signallingUrl,
        winnerDeploymentId,
    };
    if (newState != undefined) {
        const newStateChangeEntry = { state: newState, timestamp: now };
        stateUpdate.stateChanges = admin.firestore.FieldValue.arrayUnion(newStateChangeEntry);
    }
    const [participantDoc] = await (0, firestore_1.getParticipant)(organizationId, roomId, participantId);
    if (participantDoc == undefined) {
        console.error("Participant doc undefined");
        return undefined;
    }
    console.debug(`Updating participant ${participantDoc.ref.path} with changes: `, stateUpdate);
    try {
        return await participantDoc.ref.update((0, utils_1.toFirestoreUpdateData)(stateUpdate));
    }
    catch (e) {
        console.error("Failed to update participant state", e);
        return undefined;
    }
}
exports.updateParticipantState = updateParticipantState;
async function watchConfigMapUntilReady(kc, configMapName, timeout) {
    const startTime = new Date().getTime();
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    async function checkConfigMapReady() {
        await (0, misc_1.sleep)(2000);
        const elapsedSeconds = ((Date.now() - startTime) / 1000);
        if (elapsedSeconds >= 60) {
            console.error("Timed out waiting for configmap to be ready");
            return "timed-out-provisioning";
        }
        else if (Date.now() >= (timeout - 60)) {
            console.error("Timed out waiting for configmap to be ready. Not enough time left for pod");
            return "timed-out-provisioning";
        }
        else {
            try {
                await (0, misc_1.logHttpResponse)(coreClient.readNamespacedConfigMap(configMapName, namespace));
                return "ready";
            }
            catch (e) {
                if (e.response.statusCode == 404) {
                    return checkConfigMapReady();
                }
                return "failed-provisioning";
            }
        }
    }
    return checkConfigMapReady();
}
exports.watchConfigMapUntilReady = watchConfigMapUntilReady;
async function watchPodUntilReady(organizationId, roomId, participantId, deploymentId, kc, podName, signallingUrl) {
    const startTime = new Date().getTime();
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    async function checkContainersReady(lastDeploymentState, numberFailed) {
        var _a, _b;
        await (0, misc_1.sleep)(2000);
        const elapsedSeconds = ((Date.now() - startTime) / 1000);
        if (elapsedSeconds >= 240) {
            return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "timed-out-provisioning");
        }
        else if (numberFailed >= 3) {
            console.log("Failed to get pod status 3 times, marking deployment provisioning as failed");
            return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "failed-provisioning");
        }
        else {
            try {
                const pod = (await coreClient.readNamespacedPod(podName, namespace)).body;
                const podStatus = (0, shared_2.getPodStatus)(pod);
                console.log("Pod status:", podStatus);
                if (podStatus != undefined) {
                    const deploymentState = (0, shared_2.podStatusToPodState)(podStatus);
                    if (podStatus == "ready") {
                        return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, deploymentState, signallingUrl, (_a = pod.spec) === null || _a === void 0 ? void 0 : _a.nodeName);
                    }
                    else {
                        if (deploymentState != lastDeploymentState) {
                            await updateDeploymentState(organizationId, roomId, participantId, deploymentId, deploymentState, undefined, (_b = pod.spec) === null || _b === void 0 ? void 0 : _b.nodeName);
                        }
                        if (elapsedSeconds > 120) {
                            console.warn(`Pod not ready after ${elapsedSeconds} seconds. Printing pod status`);
                            console.debug(pod.status);
                        }
                        return await checkContainersReady(deploymentState, numberFailed);
                    }
                }
                else {
                    return await checkContainersReady(lastDeploymentState, numberFailed + 1);
                }
            }
            catch (e) {
                console.warn("Error fetching pod: ", podName);
                if (e.response.statusCode == 404) {
                    console.warn("Pod doesn't exist: 404");
                    return await checkContainersReady(lastDeploymentState, numberFailed + 1);
                }
                else {
                    console.warn(e);
                }
            }
            console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for 2 more before checking again...`);
            return await checkContainersReady(lastDeploymentState, numberFailed);
        }
    }
    return await checkContainersReady("new", 0);
}
exports.watchPodUntilReady = watchPodUntilReady;
async function resolveIceServers(configuration) {
    const defaultGoogleIceServers = [{
            urls: "stun:stun.l.google.com:19302",
        }];
    try {
        if (configuration.iceServersProvider == undefined || configuration.iceServersProvider == "twilio") {
            console.debug("Using twilio ICE servers");
            return await (0, twilio_1.getTwilioIceServers)();
        }
        else if (configuration.iceServersProvider == "manual" && configuration.iceServers != undefined && configuration.iceServers.length > 0) {
            console.debug("Using manually configured ICE servers");
            return configuration.iceServers;
        }
        else {
            console.debug("Using default Google ICE servers");
            return defaultGoogleIceServers;
        }
    }
    catch (e) {
        console.error("Failed to retrieve ICE servers, defaulting to Google ICE servers");
        return defaultGoogleIceServers;
    }
}
async function deployPodstack(projectId, configuration, workloadClusterProvider, organizationId, spaceId, roomId, participantId, deploymentId, serverAddress, levelId, userId, deviceId, customToken, graphicsBenchmark, resolvedSpaceUnrealProjectVersion, serverRegion) {
    var _a, _b, _c, _d;
    const startTime = new Date().getTime();
    const timeout = (startTime / 1000) + 200;
    console.debug("Set timeout to: ", timeout);
    const kc = await (0, shared_1.resolveKubeConfig)(workloadClusterProvider);
    const resolveIngressYamlFile = () => {
        if (workloadClusterProvider == "gke") {
            return "./" + shared_1.serviceNameBase + "-ingress" + "-gke" + ".yaml";
        }
        else if (workloadClusterProvider == "coreweave") {
            return "./" + shared_1.serviceNameBase + "-ingress" + ".yaml";
        }
        else {
            throw new Error("Unsupported cluster provider");
        }
    };
    const podYaml = await (0, misc_1.readFile)(podYamlFile);
    const configMapCustomYaml = await (0, misc_1.readFile)(configMapCustomYamlFile);
    const serviceYaml = await (0, misc_1.readFile)(serviceYamlFile);
    const ingressYaml = await (0, misc_1.readFile)(resolveIngressYamlFile());
    const iceServers = await resolveIceServers(configuration);
    const unrealProjectVersionRegions = (resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersion.volumeRegions) || [];
    const gpuRegions = await (0, availability_1.resolveGpuRegions)(configuration, graphicsBenchmark, unrealProjectVersionRegions, serverRegion);
    const region = gpuRegions[0].region;
    const configMap = resourceYaml.templateStreamingSessionConfigMap(projectId, organizationId, spaceId, roomId, userId, deviceId, deploymentId, iceServers, configMapCustomYaml);
    const pod = resourceYaml.templateStreamingSessionPod(projectId, (0, misc_1.inEmulatorEnv)(), workloadClusterProvider, configuration, organizationId, spaceId, roomId, serverAddress, levelId, userId, deviceId, deploymentId, customToken, podYaml, gpuRegions, region, resolvedSpaceUnrealProjectVersion);
    const service = resourceYaml.templateStreamingSessionService(projectId, organizationId, spaceId, roomId, userId, deviceId, deploymentId, serviceYaml);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    if (((_a = configMap.metadata) === null || _a === void 0 ? void 0 : _a.name) == undefined) {
        throw new Error("ConfigMap metadata.name undefined");
    }
    function templateIngress() {
        if (workloadClusterProvider == "gke") {
            return resourceYaml.templateStreamingSessionIngressGke(projectId, organizationId, spaceId, roomId, userId, deviceId, deploymentId, ingressYaml);
        }
        else if (workloadClusterProvider == "coreweave") {
            return resourceYaml.templateStreamingSessionIngress(projectId, namespace, region, organizationId, spaceId, roomId, userId, deviceId, deploymentId, ingressYaml);
        }
        else {
            throw new Error("Unsupported cluster provider");
        }
    }
    const ingress = templateIngress();
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const networkingClient = kc.makeApiClient(k8s.NetworkingV1Api);
    console.debug("Updating deployment state to `provisioning`");
    await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "provisioning", undefined, undefined, region);
    console.debug("Creating configMap");
    const createConfigMapResponse = await (0, misc_1.logHttpResponse)(coreClient.createNamespacedConfigMap(namespace, configMap));
    if (createConfigMapResponse.response.statusCode == 201) {
        console.debug("Created ConfigMap");
    }
    else if (createConfigMapResponse.response.statusCode == 200 || createConfigMapResponse.response.statusCode == 202) {
        console.debug(`Create ConfigMap got response code ${createConfigMapResponse.response.statusCode}, checking it exists before continuing`);
        const checkConfigMapResult = await watchConfigMapUntilReady(kc, (_b = configMap.metadata) === null || _b === void 0 ? void 0 : _b.name, timeout);
        if (checkConfigMapResult != "ready") {
            console.error("Failed to createConfigMap: ", checkConfigMapResult);
            return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, checkConfigMapResult);
        }
    }
    else {
        console.error("Failed to createConfigMap: ", createConfigMapResponse.response.statusCode);
        return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "failed-provisioning");
    }
    console.debug("Creating pod");
    const createPodResponse = await (0, misc_1.logHttpResponse)(coreClient.createNamespacedPod(namespace, pod));
    const createdPodName = (_c = createPodResponse.body.metadata) === null || _c === void 0 ? void 0 : _c.name;
    console.debug("Creating service");
    const createServiceResponse = await (0, misc_1.logHttpResponse)(coreClient.createNamespacedService(namespace, service));
    const createdServiceName = (_d = createServiceResponse.body.metadata) === null || _d === void 0 ? void 0 : _d.name;
    async function createIngress() {
        var _a, _b;
        if (workloadClusterProvider == "gke") {
            return (_a = (await (0, misc_1.logHttpResponse)(networkingClient.createNamespacedIngress(namespace, ingress))).body.metadata) === null || _a === void 0 ? void 0 : _a.name;
        }
        else if (workloadClusterProvider == "coreweave") {
            return (_b = (await (0, misc_1.logHttpResponse)(networkingClient.createNamespacedIngress(namespace, ingress))).body.metadata) === null || _b === void 0 ? void 0 : _b.name;
        }
        else {
            throw new Error("Unsupported cluster provider");
        }
    }
    console.debug("Creating ingress");
    const createdIngressName = await createIngress();
    const [, clustProviderConfiguration] = await (0, firestore_1.getWorkloadClusterProviderConfiguration)(workloadClusterProvider);
    function formatSignallingUrl(host) {
        var _a;
        if (workloadClusterProvider == "gke") {
            return "https://" + host + "/" + ((_a = ingress.metadata) === null || _a === void 0 ? void 0 : _a.name);
        }
        else {
            if ((clustProviderConfiguration === null || clustProviderConfiguration === void 0 ? void 0 : clustProviderConfiguration.staticSignallingProxy) != undefined && (clustProviderConfiguration === null || clustProviderConfiguration === void 0 ? void 0 : clustProviderConfiguration.staticSignallingProxy) != "") {
                return (clustProviderConfiguration === null || clustProviderConfiguration === void 0 ? void 0 : clustProviderConfiguration.staticSignallingProxy) + "/" + host.replace(new RegExp("(.*?)\\.(.*)"), "$1/$2");
            }
            else {
                return "https://" + host;
            }
        }
    }
    if (ingress.spec == undefined || ingress.spec.rules == undefined || ingress.spec.rules[0].host == undefined) {
        throw new Error("Ingress spec has no host rules");
    }
    const signallingUrl = formatSignallingUrl(ingress.spec.rules[0].host);
    if (createdPodName == undefined) {
        throw new Error("Failed to create pod");
    }
    if (createdServiceName == undefined) {
        throw new Error("Failed to create service");
    }
    if (createdIngressName == undefined) {
        throw new Error("Failed to create ingress");
    }
    return await watchPodUntilReady(organizationId, roomId, participantId, deploymentId, kc, createdPodName, signallingUrl);
}
exports.deployPodstack = deployPodstack;
async function deletePodStack(userId, deploymentId, workloadClusterProvider) {
    const kc = await (0, shared_1.resolveKubeConfig)(workloadClusterProvider);
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const networkingClient = kc.makeApiClient(k8s.NetworkingV1Api);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const sessionName = (0, shared_1.formatSessionName)(userId, deploymentId);
    const deleted = [];
    try {
        console.debug("Deleting pod: ", sessionName);
        const podDelete = await (0, misc_1.logHttpResponse)(coreClient.deleteNamespacedPod(sessionName, namespace, undefined, undefined, 15));
        const podDeleted = podDelete.response.statusCode;
        console.debug("Delete pod response status code: ", podDelete.response.statusCode);
        console.debug("Delete pod response status message: ", podDelete.response.statusMessage);
        if (podDeleted != undefined && podDeleted >= 200 && podDeleted < 300) {
            console.debug("Deleted pod successfully");
            deleted.push("pod");
        }
        else {
            console.error("Failed to delete pod");
        }
    }
    catch (e) {
        if (e.response.statusCode == 404) {
            console.debug("Doesn't exist");
            deleted.push("pod");
        }
        else {
            console.error("Failed to delete configMap");
        }
    }
    console.debug("Deleting configMap: ", sessionName);
    try {
        const configMapDelete = await (0, misc_1.logHttpResponse)(coreClient.deleteNamespacedConfigMap(sessionName, namespace, undefined, undefined, 15));
        const configMapDeleted = configMapDelete.response.statusCode;
        console.debug("Delete configMap response status code: ", configMapDelete.response.statusCode);
        console.debug("Delete configMap response status message: ", configMapDelete.response.statusMessage);
        if (configMapDeleted != undefined && configMapDeleted >= 200 && configMapDeleted < 300) {
            console.debug("Deleted configMap successfully");
            deleted.push("configmap");
        }
        else {
            console.error("Failed to delete configMap");
        }
    }
    catch (e) {
        if (e.response.statusCode == 404) {
            console.debug("Doesn't exist");
            deleted.push("configmap");
        }
        else {
            console.error("Failed to delete configMap");
        }
    }
    try {
        console.debug("Deleting service: ", sessionName);
        const serviceDelete = await (0, misc_1.logHttpResponse)(coreClient.deleteNamespacedService(sessionName, namespace, undefined, undefined, 15));
        const serviceDeleted = serviceDelete.response.statusCode;
        console.debug("Delete service response status code: ", serviceDelete.response.statusCode);
        console.debug("Delete service response status message: ", serviceDelete.response.statusMessage);
        if (serviceDeleted != undefined && serviceDeleted >= 200 && serviceDeleted < 300) {
            console.debug("Deleted service successfully");
            deleted.push("service");
        }
        else {
            console.error("Failed to delete service");
        }
    }
    catch (e) {
        if (e.response.statusCode == 404) {
            console.debug("Doesn't exist");
            deleted.push("service");
        }
        else {
            console.error("Failed to delete configMap");
        }
    }
    console.debug("Deleting ingress: ", sessionName);
    async function deleteIngress() {
        return (await (0, misc_1.logHttpResponse)(networkingClient.deleteNamespacedIngress(sessionName, namespace, undefined, undefined, 15)));
    }
    try {
        const ingressDelete = await deleteIngress();
        const ingressDeleted = ingressDelete.response.statusCode;
        console.debug("Delete ingress response status code: ", ingressDelete.response.statusCode);
        console.debug("Delete ingress response status message: ", ingressDelete.response.statusMessage);
        if (ingressDeleted != undefined && ingressDeleted >= 200 && ingressDeleted < 300) {
            console.debug("Deleted ingress successfully");
            deleted.push("ingress");
        }
        else {
            console.error("Failed to delete ingress");
        }
    }
    catch (e) {
        if (e.response.statusCode == 404) {
            console.debug("Doesn't exist");
            deleted.push("ingress");
        }
        else {
            console.error("Failed to delete configMap");
        }
    }
    if (deleted.includes("pod") && deleted.includes("configmap") && deleted.includes("service") && deleted.includes("ingress")) {
        return true;
    }
    else {
        return false;
    }
}
exports.deletePodStack = deletePodStack;
async function collectPodStackStates(userId, deploymentId, workloadClusterProvider) {
    const kc = await (0, shared_1.resolveKubeConfig)(workloadClusterProvider);
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const networkingClient = kc.makeApiClient(k8s.NetworkingV1Api);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const sessionName = (0, shared_1.formatSessionName)(userId, deploymentId);
    console.debug("Getting pod events: ", sessionName);
    const events = await (async () => {
        try {
            return (await coreClient.listNamespacedEvent(namespace, undefined, undefined, undefined, "involvedObject.name=" + sessionName)).body;
        }
        catch (e) {
            console.error("Failed to get events");
            console.error(e);
            return undefined;
        }
    })();
    const pod = await (async () => {
        try {
            return (await coreClient.readNamespacedPod(sessionName, namespace)).body;
        }
        catch (e) {
            console.error("Failed to get pod");
            console.error(e);
            return undefined;
        }
    })();
    const configMap = await (async () => {
        try {
            return (await coreClient.readNamespacedConfigMap(sessionName, namespace)).body;
        }
        catch (e) {
            console.error("Failed to get configMap");
            console.error(e);
            return undefined;
        }
    })();
    const service = await (async () => {
        try {
            return (await coreClient.readNamespacedService(sessionName, namespace)).body;
        }
        catch (e) {
            console.error("Failed to get service");
            console.error(e);
            return undefined;
        }
    })();
    const ingress = await (async () => {
        try {
            return (await networkingClient.readNamespacedIngress(sessionName, namespace)).body;
        }
        catch (e) {
            console.error("Failed to get ingress");
            console.error(e);
            return undefined;
        }
    })();
    const all = await Promise.all([events, pod, configMap, service, ingress]);
    return { events: all[0], pod: all[1], configMap: all[2], service: all[3], ingress: all[4] };
}
exports.collectPodStackStates = collectPodStackStates;
//# sourceMappingURL=deploy-standard.js.map