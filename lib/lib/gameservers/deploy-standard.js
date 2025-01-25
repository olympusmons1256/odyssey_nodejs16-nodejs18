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
exports.deleteGameServerPodStack = exports.deployGameServerPodStack = exports.watchPodUntilReady = exports.waitUntilServiceReady = exports.updateRoomState = void 0;
const k8s = __importStar(require("@kubernetes/client-node"));
const admin = __importStar(require("firebase-admin"));
const misc_1 = require("../misc");
const shared_1 = require("../kubernetes/shared");
const utils_1 = require("../utils");
const resourceYaml = __importStar(require("./yaml-standard"));
const shared_2 = require("./shared");
const firestore_1 = require("../documents/firestore");
const podYamlFile = "./" + shared_2.gameServerNameBase + "-pod" + ".yaml";
const serviceYamlFile = "./" + shared_2.gameServerNameBase + "-service" + ".yaml";
async function updateRoomState(organizationId, roomId, newState, serverAddress, provisioningFailures, deprovisioningFailures, region, rejectedByBilling) {
    const now = admin.firestore.Timestamp.now();
    const stateUpdate = {
        state: newState,
        updated: now,
        serverAddress,
        provisioningFailures,
        deprovisioningFailures,
        region,
        rejectedByBilling,
    };
    const roomRef = (0, firestore_1.getRoomRef)(organizationId, roomId);
    console.debug(`Updating room ${roomRef.path} with changes: `, stateUpdate);
    const result = await roomRef.update((0, utils_1.toFirestoreUpdateData)(stateUpdate));
    if (newState != undefined) {
        const newStateChangeEntry = { state: newState, updated: now };
        const stateChangeId = now.toDate().toISOString() + "-" + newState;
        const stateChangeRef = (0, firestore_1.getStateChangeRef)(organizationId, roomId, stateChangeId);
        console.debug(`Add room state change ${stateChangeRef.path} with: `, newStateChangeEntry);
        return await stateChangeRef.set(newStateChangeEntry);
    }
    return result;
}
exports.updateRoomState = updateRoomState;
async function waitUntilServiceReady(kc, serviceName) {
    const startTime = new Date().getTime();
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    async function getServiceExternalIp(serviceName) {
        var _a, _b, _c;
        try {
            const service = await coreClient.readNamespacedService(serviceName, namespace);
            const externalIps = (_c = (_b = (_a = service.body.status) === null || _a === void 0 ? void 0 : _a.loadBalancer) === null || _b === void 0 ? void 0 : _b.ingress) === null || _c === void 0 ? void 0 : _c.flatMap((ingress) => {
                return (ingress.ip != undefined) ? [ingress.ip] : [];
            });
            const externalIp = externalIps === null || externalIps === void 0 ? void 0 : externalIps.pop();
            if (externalIp == undefined) {
                console.warn("Service missing external IP address");
                return "external-ip-missing";
            }
            else {
                return externalIp + ":" + 7777;
            }
        }
        catch (e) {
            console.warn("Hit error resolving service external IP");
            console.error(e);
            return "error";
        }
    }
    async function checkService(attempts = 0) {
        if (attempts > 0) {
            await (0, misc_1.sleep)(2000);
        }
        const elapsedSeconds = ((Date.now() - startTime) / 1000);
        if (elapsedSeconds >= 240) {
            return "timed-out";
        }
        else if (attempts >= 3) {
            return "failed";
        }
        else {
            const externalIp = await getServiceExternalIp(serviceName);
            if (externalIp == "error") {
                return "failed";
            }
            else if (externalIp == "external-ip-missing") {
                console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for 2 more before checking service again...`);
                return await checkService(attempts += 1);
            }
            else {
                return externalIp;
            }
        }
    }
    return await checkService();
}
exports.waitUntilServiceReady = waitUntilServiceReady;
async function watchPodUntilReady(kc, organizationId, roomId, workloadClusterProvider, podName) {
    const startTime = new Date().getTime();
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    async function getPodNodeExternalIP(nodeName) {
        var _a, _b;
        try {
            const node = await coreClient.readNode(nodeName);
            const externalIps = (_b = (_a = node.body.status) === null || _a === void 0 ? void 0 : _a.addresses) === null || _b === void 0 ? void 0 : _b.flatMap((address) => {
                return (address.type == "ExternalIP") ? [address.address] : [];
            });
            const externalIp = externalIps === null || externalIps === void 0 ? void 0 : externalIps.pop();
            if (externalIp == undefined) {
                console.warn("Pod missing ExternalIP address");
                return "external-ip-missing";
            }
            else {
                return externalIp + ":" + 7777;
            }
        }
        catch (e) {
            console.warn("Hit error resolving node external address");
            console.error(e);
            return "error";
        }
    }
    async function getExternalIp(nodeName) {
        if (workloadClusterProvider == "gke") {
            return await getPodNodeExternalIP(nodeName);
        }
        else {
            console.debug("Provider doesn't support node ExternalIP");
            return undefined;
        }
    }
    async function checkContainersReady(lastRoomState, numberFailed) {
        var _a;
        await (0, misc_1.sleep)(2000);
        const elapsedSeconds = ((Date.now() - startTime) / 1000);
        if (elapsedSeconds >= 240) {
            return ["timed-out-provisioning", undefined];
        }
        else if (numberFailed >= 3) {
            console.log("Failed to get pod status 3 times, marking room provisioning as failed");
            return ["failed-provisioning", undefined];
        }
        else {
            try {
                const pod = (await coreClient.readNamespacedPod(podName, namespace)).body;
                const podStatus = (0, shared_1.getPodStatus)(pod);
                console.log("Pod status:", podStatus);
                if (podStatus != undefined) {
                    const roomState = (0, shared_1.podStatusToPodState)(podStatus);
                    if (roomState == "pod-ready") {
                        const nodeName = (_a = pod.spec) === null || _a === void 0 ? void 0 : _a.nodeName;
                        if (nodeName == undefined) {
                            console.warn("Pod ready but no node name present. Strange...");
                            return await checkContainersReady(roomState, numberFailed + 1);
                        }
                        else {
                            const externalIp = await getExternalIp(nodeName);
                            console.debug("ExternalIP: ", externalIp);
                            if (externalIp == "error" || externalIp == "external-ip-missing") {
                                return await checkContainersReady(roomState, numberFailed + 1);
                            }
                            else {
                                return [roomState, externalIp];
                            }
                        }
                    }
                    else {
                        if (roomState != lastRoomState) {
                            await updateRoomState(organizationId, roomId, roomState);
                        }
                        if (elapsedSeconds > 120) {
                            console.warn(`Pod not ready after ${elapsedSeconds} seconds. Printing pod status`);
                            console.debug(pod.status);
                        }
                        return await checkContainersReady(roomState, numberFailed);
                    }
                }
                else {
                    return await checkContainersReady(lastRoomState, numberFailed + 1);
                }
            }
            catch (e) {
                console.warn("Error fetching pod: ", podName);
                if (e.response.statusCode == 404) {
                    console.warn("Pod doesn't exist: 404");
                    return await checkContainersReady(lastRoomState, numberFailed + 1);
                }
                else {
                    console.warn(e);
                }
            }
            console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for 2 more before checking again...`);
            return await checkContainersReady(lastRoomState, numberFailed);
        }
    }
    return await checkContainersReady("provisioning", 0);
}
exports.watchPodUntilReady = watchPodUntilReady;
async function deployGameServerPodStack(projectId, configuration, region, organizationId, spaceId, roomId, resolvedSpaceUnrealProjectVersion, levelId) {
    const kc = await (0, shared_2.resolveKubeConfig)(configuration.workloadClusterProvider);
    const podYaml = await (0, misc_1.readFile)(podYamlFile);
    const pod = resourceYaml.templatePod(projectId, configuration, region, organizationId, spaceId, roomId, levelId, resolvedSpaceUnrealProjectVersion, podYaml);
    const serviceYaml = await (0, misc_1.readFile)(serviceYamlFile);
    const service = resourceYaml.templateService(projectId, configuration, region, organizationId, spaceId, roomId, serviceYaml);
    if (pod == undefined) {
        console.log("Templated pod undefined");
        return undefined;
    }
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    async function tryCreatePod(pod, startTime) {
        const elapsedSeconds = ((Date.now() - startTime) / 1000);
        if (pod.metadata == undefined || pod.metadata.name == undefined) {
            console.log("Pod missing metadata.name");
            return ["failed-provisioning", undefined];
        }
        const podName = pod.metadata.name;
        if (elapsedSeconds >= 200) {
            console.log("Timed out");
            return ["timed-out-provisioning", undefined];
        }
        return await (0, misc_1.logHttpResponse)(coreClient.createNamespacedPod(namespace, pod))
            .then(async () => {
            return await watchPodUntilReady(kc, organizationId, roomId, configuration.workloadClusterProvider, podName);
        })
            .catch(async (e) => {
            console.log(`Failure code ${e.response.statusCode}, message: `, e.response.body.message);
            if (e.response.statusCode == 409) {
                if (e.response.body.message.includes("object is being deleted")) {
                    console.log("Existing pod being deleted, waiting 2 seconds then trying again");
                    await (0, misc_1.sleep)(2000);
                    return await tryCreatePod(pod, startTime);
                }
                else {
                    console.log("Pod already exists");
                    return await watchPodUntilReady(kc, organizationId, roomId, configuration.workloadClusterProvider, podName);
                }
            }
            else {
                return ["failed-provisioning", undefined];
            }
        });
    }
    async function tryCreateService() {
        var _a;
        if (configuration.workloadClusterProvider == "coreweave") {
            const serviceName = (_a = service.metadata) === null || _a === void 0 ? void 0 : _a.name;
            if (serviceName == undefined) {
                console.error("Service name undefined");
                return "failed";
            }
            try {
                await (0, misc_1.logHttpResponse)(coreClient.createNamespacedService(namespace, service));
                ["failed-provisioning", undefined];
                return await waitUntilServiceReady(kc, serviceName);
            }
            catch (e) {
                console.log(`Failure code ${e.response.statusCode}, message: `, e.response.body.message);
                if (e.response.statusCode == 409) {
                    console.log("Service already exists");
                    return await waitUntilServiceReady(kc, serviceName);
                }
                else {
                    console.log("Error creating service");
                    console.log(e);
                    return "failed";
                }
            }
        }
        else {
            console.log("Provider doesn't need service");
            return undefined;
        }
    }
    console.log("Creating service...");
    const createServiceResult = tryCreateService();
    console.log("Creating pod...");
    const createPodResult = await tryCreatePod(pod, new Date().getTime());
    console.debug("createPodResult: ", createPodResult);
    if (createPodResult == undefined) {
        console.error("Pod result undefined");
        return await updateRoomState(organizationId, roomId, "failed-provisioning", undefined, undefined, undefined, region);
    }
    const [roomState, nodeServerAddress] = createPodResult;
    const serviceServerAddress = await createServiceResult;
    const serverAddress = (configuration.workloadClusterProvider == "gke") ? nodeServerAddress : serviceServerAddress;
    if (roomState == "pod-ready") {
        if (serverAddress == undefined) {
            console.warn("Server address undefined should not be possible");
            return undefined;
        }
        else if (serverAddress == "failed") {
            console.error("Server address failed");
            return await updateRoomState(organizationId, roomId, "failed-provisioning", undefined, undefined, undefined, region);
        }
        else if (serverAddress == "timed-out") {
            console.error("Server address timed out");
            return await updateRoomState(organizationId, roomId, "timed-out-provisioning", undefined, undefined, undefined, region);
        }
        else {
            return await updateRoomState(organizationId, roomId, roomState, serverAddress, 0, undefined, region);
        }
    }
    else {
        console.warn("Pod is not ready after create/wait. Something strange is going on with the room provisioning/state");
        return await updateRoomState(organizationId, roomId, roomState, undefined, undefined, undefined, region);
    }
}
exports.deployGameServerPodStack = deployGameServerPodStack;
async function deleteGameServerPodStack(roomId, workloadClusterProvider) {
    const kc = await (0, shared_2.resolveKubeConfig)(workloadClusterProvider);
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const gameServerName = (0, shared_2.formatGameServerName)(roomId);
    async function deletePod() {
        console.log("Deleting pod: ", gameServerName);
        const podDelete = await (0, misc_1.logHttpResponse)(coreClient.deleteNamespacedPod(gameServerName, namespace, undefined, undefined, 15))
            .catch((e) => {
            if (e.response.statusCode != undefined) {
                return e;
            }
            else {
                console.error(e);
                return { response: { statusCode: 0, statusMessage: "Exception" } };
            }
        });
        const podDeleted = podDelete.response.statusCode;
        console.log("Delete pod response status code: ", podDelete.response.statusCode);
        console.log("Delete pod response status message: ", podDelete.response.statusMessage);
        if (podDeleted != undefined && ((podDeleted >= 200 && podDeleted < 300) || podDeleted == 404)) {
            console.log("Deleted pod successfully");
            return true;
        }
        else {
            console.log("Failed to delete pod");
            return false;
        }
    }
    async function deleteService() {
        if (workloadClusterProvider == "coreweave") {
            console.log("Deleting service: ", gameServerName);
            const serviceDelete = await (0, misc_1.logHttpResponse)(coreClient.deleteNamespacedService(gameServerName, namespace, undefined, undefined, 15))
                .catch((e) => {
                if (e.response.statusCode != undefined) {
                    return e;
                }
                else {
                    console.error(e);
                    return { response: { statusCode: 0, statusMessage: "Exception" } };
                }
            });
            const serviceDeleted = serviceDelete.response.statusCode;
            console.log("Delete service response status code: ", serviceDelete.response.statusCode);
            console.log("Delete service response status message: ", serviceDelete.response.statusMessage);
            if (serviceDeleted != undefined && ((serviceDeleted >= 200 && serviceDeleted < 300) || serviceDeleted == 404)) {
                console.log("Deleted service successfully");
                return true;
            }
            else {
                console.log("Failed to delete service");
                return false;
            }
        }
        else {
            return true;
        }
    }
    return (await deletePod() && await deleteService());
}
exports.deleteGameServerPodStack = deleteGameServerPodStack;
//# sourceMappingURL=deploy-standard.js.map