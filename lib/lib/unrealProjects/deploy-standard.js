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
exports.deleteVolumeCopyPvcs = exports.deleteVolumeCopyPodStack = exports.deployVolumeCopyPodStacks = exports.watchPackageValidatorPodUntilReady = exports.watchVolumeCopyPvcUntilReady = exports.watchVolumeCopyPodUntilReady = exports.deletePackageValidatorPodStack = exports.deleteBuilderPodStack = exports.deployPackageValidatorPod = exports.deployBuilderPod = exports.watchPodUntilReady = exports.updateUnrealProjectVersionState = void 0;
const admin = __importStar(require("firebase-admin"));
const k8s = __importStar(require("@kubernetes/client-node"));
const misc_1 = require("../misc");
const resourceYaml = __importStar(require("./yaml-standard"));
const shared_1 = require("../streamingSessions/shared");
const firestore_1 = require("../documents/firestore");
const shared_2 = require("../kubernetes/shared");
const shared_3 = require("./shared");
const buildPodYamlFile = "./unreal-project-version-build-pod.yaml";
const volumeCopyPodYamlFile = "./unreal-project-version-volume-copy-pod.yaml";
const packageValidatorPodYamlFile = "./unreal-project-version-package-validator-pod.yaml";
const pvcYamlFile = "./unreal-project-version-pvc.yaml";
async function updateUnrealProjectVersionState(options) {
    const now = admin.firestore.Timestamp.now();
    const stateUpdate = {
        state: options.state,
        volumeCopyRegionsComplete: (options.state === "volume-copy-expiring") ? admin.firestore.FieldValue.delete() :
            (options.state === "volume-copy-region-complete") ? admin.firestore.FieldValue.arrayUnion(options.region) : undefined,
        volumeCopyRegionsFailed: (options.state === "volume-copy-expiring") ? admin.firestore.FieldValue.delete() :
            (options.state === "volume-copy-region-failed") ? admin.firestore.FieldValue.arrayUnion(options.region) : undefined,
        updated: now,
        lastPingFromBuilder: options.lastPingFromBuilder,
        lastPingFromVolumeCopyRegion: options.lastPingFromVolumeCopyRegion,
        packageArchiveUrl: options.packageArchiveUrl,
        packageArchiveSha256Sum: options.packageArchiveSha256Sum,
        symbolsArchiveUrl: options.symbolsArchiveUrl,
        symbolsArchiveSha256Sum: options.symbolsArchiveSha256Sum,
        volumeSizeGb: options.volumeSizeGb,
        volumeRegions: options.volumeRegions,
        expiredArtifacts: options.expiredArtifacts,
        buildRegion: options.buildRegion,
        buildLogUrls: options.buildLogUrl ? admin.firestore.FieldValue.arrayUnion(options.buildLogUrl) : undefined,
        systemLogUrls: options.systemLogUrl ? admin.firestore.FieldValue.arrayUnion(options.systemLogUrl) : undefined,
    };
    const [unrealProjectVersionDoc] = await (0, firestore_1.getUnrealProjectVersion)(options.unrealProjectId, options.unrealProjectVersionId);
    if (unrealProjectVersionDoc == undefined) {
        console.error("unrealProjectVersionDoc doc undefined");
        return undefined;
    }
    console.debug(`Updating unrealProjectVersion ${unrealProjectVersionDoc.ref.path} with changes: `, stateUpdate);
    try {
        return await unrealProjectVersionDoc.ref.update(stateUpdate);
    }
    catch (e) {
        console.error("Failed to update unrealProjectVersion state", e);
        return undefined;
    }
}
exports.updateUnrealProjectVersionState = updateUnrealProjectVersionState;
async function watchPodUntilReady({ unrealProjectId, unrealProjectVersionId, kc, podName, unrealProjectVersionState, timeoutSeconds = 240, }) {
    const startTime = new Date().getTime();
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const checkIntervalMilliseconds = 2000;
    async function checkContainersReady(lastUnrealProjectVersionState, numberFailed) {
        await (0, misc_1.sleep)(checkIntervalMilliseconds);
        const elapsedSeconds = ((Date.now() - startTime) / 1000);
        if (elapsedSeconds >= timeoutSeconds) {
            return console.debug(`Timeout exceeded after ${elapsedSeconds} seconds of waiting for containers ready`);
        }
        if (numberFailed >= 3) {
            console.log("Failed to get pod status 3 times, marking unrealProjectVersion provisioning as failed");
            return await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "builder-pod-failed-to-create" });
        }
        try {
            const pod = (await coreClient.readNamespacedPod(podName, namespace)).body;
            const podStatus = (0, shared_2.getPodStatus)(pod);
            console.log("Pod status:", podStatus);
            if (podStatus == "ready") {
                return await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "builder-pod-ready" });
            }
            if (podStatus == "failed") {
                return await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "builder-pod-failed" });
            }
        }
        catch (e) {
            console.warn(`Error statusCode: ${e.response.statusCode} fetching pod: ${podName}`);
            return await checkContainersReady(lastUnrealProjectVersionState, numberFailed + 1);
        }
        console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for ${checkIntervalMilliseconds / 1000} seconds before checking again...`);
        return await checkContainersReady(lastUnrealProjectVersionState, numberFailed);
    }
    return await checkContainersReady(unrealProjectVersionState, 0);
}
exports.watchPodUntilReady = watchPodUntilReady;
async function deployBuilderPod(firebaseProjectId, configuration, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, unrealPluginVersionId, unrealPluginVersion) {
    var _a;
    const state = "builder-pod-creating";
    await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state });
    const kc = await (0, shared_1.resolveKubeConfig)("coreweave");
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const podYaml = await (0, misc_1.readFile)(buildPodYamlFile);
    // TODO: Setup UnrealProjectVersionBuild configuration system
    if ((configuration === null || configuration === void 0 ? void 0 : configuration.builderValidRegions) == undefined) {
        console.error("Failed to resolve valid builder region(s)");
        return undefined;
    }
    const region = configuration === null || configuration === void 0 ? void 0 : configuration.builderValidRegions[Math.floor(Math.random() * configuration.builderValidRegions.length)];
    const pod = resourceYaml.templateUnrealProjectVersionBuildPod(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, unrealPluginVersionId, unrealPluginVersion, region, configuration.builderImageRepo, configuration.builderImageId, podYaml);
    if (pod == undefined) {
        console.error("Failed to template pod for unrealProjectVersionId: ", unrealProjectVersionId);
        return undefined;
    }
    if (((_a = pod.metadata) === null || _a === void 0 ? void 0 : _a.name) == undefined) {
        console.error("Template pod is missing metadata.name for unrealProjectVersionId: ", unrealProjectVersionId);
        return undefined;
    }
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    console.debug("Creating kubernetes pod");
    const createPodResult = await coreClient.createNamespacedPod(namespace, pod)
        .then((pod) => {
        var _a;
        return {
            podName: (_a = pod.body.metadata) === null || _a === void 0 ? void 0 : _a.name,
            error: undefined,
        };
    })
        .catch((e) => {
        return {
            podName: undefined,
            error: {
                statusCode: e.response.statusCode,
                statusMessage: e.response.statusMessage,
            },
        };
    });
    if (createPodResult.error != undefined) {
        console.error("Failed to create pod over kubernetes API");
        console.error(createPodResult);
        return undefined;
    }
    if (createPodResult.podName == undefined) {
        console.error("Created pod has no name");
        console.error(createPodResult);
        return undefined;
    }
    await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "builder-pod-waiting-for-ready", buildRegion: region });
    await watchPodUntilReady({ unrealProjectId, unrealProjectVersionId, kc, podName: createPodResult.podName, unrealProjectVersionState: state });
    return;
}
exports.deployBuilderPod = deployBuilderPod;
async function deployPackageValidatorPod(firebaseProjectId, configuration, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion) {
    var _a;
    const state = "package-validator-pod-creating";
    await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state });
    const kc = await (0, shared_1.resolveKubeConfig)("coreweave");
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const podYaml = await (0, misc_1.readFile)(packageValidatorPodYamlFile);
    if ((configuration === null || configuration === void 0 ? void 0 : configuration.packageValidatorValidRegions) == undefined) {
        console.error("Failed to resolve valid packageValidator region(s) ");
        return undefined;
    }
    const region = configuration === null || configuration === void 0 ? void 0 : configuration.packageValidatorValidRegions[Math.floor(Math.random() * configuration.packageValidatorValidRegions.length)];
    const pod = resourceYaml.templateUnrealProjectVersionPackageValidatorPod(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, region, configuration === null || configuration === void 0 ? void 0 : configuration.packageValidatorImageRepo, configuration === null || configuration === void 0 ? void 0 : configuration.packageValidatorImageId, podYaml);
    if (pod == undefined) {
        console.error("Failed to template pod for unrealProjectVersionId: ", unrealProjectVersionId);
        return undefined;
    }
    if (((_a = pod.metadata) === null || _a === void 0 ? void 0 : _a.name) == undefined) {
        console.error("Template pod is missing metadata.name for unrealProjectVersionId: ", unrealProjectVersionId);
        return undefined;
    }
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    console.debug("Creating kubernetes pod");
    const createPodResult = await coreClient.createNamespacedPod(namespace, pod)
        .then((pod) => {
        var _a;
        return {
            podName: (_a = pod.body.metadata) === null || _a === void 0 ? void 0 : _a.name,
            error: undefined,
        };
    })
        .catch((e) => {
        return {
            podName: undefined,
            error: {
                statusCode: e.response.statusCode,
                statusMessage: e.response.statusMessage,
            },
        };
    });
    if (createPodResult.error != undefined) {
        console.error("Failed to create pod over kubernetes API");
        console.error(createPodResult);
        return undefined;
    }
    if (createPodResult.podName == undefined) {
        console.error("Created pod has no name");
        console.error(createPodResult);
        return undefined;
    }
    await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "package-validator-pod-waiting-for-ready", buildRegion: region });
    return await watchPackageValidatorPodUntilReady({ kc, name: createPodResult.podName });
}
exports.deployPackageValidatorPod = deployPackageValidatorPod;
function podDetailsToStatus(pod) {
    var _a;
    const podBodyPhase = (_a = pod.body.status) === null || _a === void 0 ? void 0 : _a.phase;
    if (podBodyPhase !== undefined && (podBodyPhase === "Succeeded" || podBodyPhase === "Failed"))
        return "pod-terminating";
    if (podBodyPhase !== undefined && podBodyPhase === "Pending")
        return "pod-pending";
    if (podBodyPhase !== undefined && podBodyPhase === "Running")
        return "pod-running";
    const podRequestStatusCode = pod.response.statusCode;
    if (podRequestStatusCode !== undefined && (podRequestStatusCode < 200 || podRequestStatusCode >= 300))
        return "pod-does-not-exist";
    console.error("Unknown pod response");
    console.error(pod);
    return "unknown";
}
async function waitUntilNotTerminating(client, podName, namespace, backoff = 1) {
    if (backoff > 3)
        return "unknown";
    console.debug("Checking for existing pod: ", podName);
    const existingPod = await client.readNamespacedPod(podName, namespace);
    const existingPodStatus = podDetailsToStatus(existingPod);
    if (existingPodStatus !== "pod-terminating")
        return existingPodStatus;
    await (0, misc_1.sleep)(500 * backoff);
    return await waitUntilNotTerminating(client, podName, namespace, backoff++);
}
async function deleteBuilderPodStack(unrealProjectVersionId) {
    const kc = await (0, shared_1.resolveKubeConfig)("coreweave");
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const podName = (0, shared_3.formatUnrealProjectVersionBuildPodName)(unrealProjectVersionId);
    try {
        const existingPodStatus = await waitUntilNotTerminating(coreClient, podName, namespace);
        console.debug("Current pod status: ", existingPodStatus);
        if (existingPodStatus === "pod-does-not-exist") {
            console.debug("Pod does not exist, skipping deletion");
            return true;
        }
        console.debug("Deleting pod: ", podName);
        const podDelete = await coreClient.deleteNamespacedPod(podName, namespace, undefined, undefined, 15);
        const podDeleted = podDelete.response.statusCode;
        console.debug("Delete pod response status code: ", podDelete.response.statusCode);
        console.debug("Delete pod response status message: ", podDelete.response.statusMessage);
        if (podDeleted != undefined && podDeleted >= 200 && podDeleted < 300) {
            console.debug("Deleted pod successfully");
            return true;
        }
    }
    catch (e) {
        console.error(e);
    }
    console.error("Failed to delete pod");
    return false;
}
exports.deleteBuilderPodStack = deleteBuilderPodStack;
async function deletePackageValidatorPodStack(unrealProjectVersionId) {
    const kc = await (0, shared_1.resolveKubeConfig)("coreweave");
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const podName = (0, shared_3.formatUnrealProjectVersionPackageValidatorPodName)(unrealProjectVersionId);
    try {
        console.debug("Deleting pod: ", podName);
        const podDelete = await coreClient.deleteNamespacedPod(podName, namespace, undefined, undefined, 15);
        const podDeleted = podDelete.response.statusCode;
        console.debug("Delete pod response status code: ", podDelete.response.statusCode);
        console.debug("Delete pod response status message: ", podDelete.response.statusMessage);
        if (podDeleted != undefined && podDeleted >= 200 && podDeleted < 300) {
            console.debug("Deleted pod successfully");
            return true;
        }
    }
    catch (e) {
        console.error(e);
    }
    console.error("Failed to delete pod");
    return false;
}
exports.deletePackageValidatorPodStack = deletePackageValidatorPodStack;
async function watchVolumeCopyPodUntilReady({ kc, name, timeoutSeconds = 240, }) {
    const startTime = new Date().getTime();
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const checkIntervalMilliseconds = 2000;
    async function checkContainersReady(numberFailed) {
        await (0, misc_1.sleep)(checkIntervalMilliseconds);
        const elapsedSeconds = ((Date.now() - startTime) / 1000);
        if (elapsedSeconds >= timeoutSeconds) {
            return { name, result: "timed-out" };
        }
        if (numberFailed >= 3) {
            console.log("Failed to get pod status 3 times, marking unrealProjectVersion provisioning as failed");
            return { name, result: "failed-create" };
        }
        try {
            const pod = (await coreClient.readNamespacedPod(name, namespace)).body;
            const podStatus = (0, shared_2.getPodStatus)(pod);
            console.log("Pod status:", podStatus);
            if (podStatus == "ready") {
                return { name, result: "ready" };
            }
            if (podStatus == "failed") {
                return { name, result: "failed" };
            }
        }
        catch (e) {
            console.warn(`Error statusCode: ${e.response.statusCode} fetching pod: ${name}`);
            return await checkContainersReady(numberFailed + 1);
        }
        console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for ${checkIntervalMilliseconds / 1000} seconds before checking again...`);
        return await checkContainersReady(numberFailed);
    }
    return await checkContainersReady(0);
}
exports.watchVolumeCopyPodUntilReady = watchVolumeCopyPodUntilReady;
async function watchVolumeCopyPvcUntilReady({ kc, name, timeoutSeconds = 240, }) {
    const startTime = new Date().getTime();
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const checkIntervalMilliseconds = 2000;
    async function checkPvcReady(numberFailed) {
        var _a;
        await (0, misc_1.sleep)(checkIntervalMilliseconds);
        const elapsedSeconds = ((Date.now() - startTime) / 1000);
        if (elapsedSeconds >= timeoutSeconds) {
            return { name, result: "timed-out" };
        }
        if (numberFailed >= 3) {
            console.warn("Failed to get pvc status 3 times, marking unrealProjectVersion provisioning as failed");
            return { name, result: "failed" };
        }
        try {
            const pvc = (await coreClient.readNamespacedPersistentVolumeClaim(name, namespace)).body;
            const pvcStatus = (_a = pvc.status) === null || _a === void 0 ? void 0 : _a.phase;
            console.debug("Pvc status:", pvcStatus);
            if (pvcStatus == "Bound") {
                return { name, result: "bound" };
            }
            if (pvcStatus == "Failed") {
                return { name, result: "failed" };
            }
            if (pvcStatus == "Pending" && elapsedSeconds >= 60) {
                console.warn("PVC is still pending after > 60 seconds:", name);
                console.debug({ pvc });
            }
        }
        catch (e) {
            console.warn(`Error statusCode: ${e.response.statusCode} fetching pvc: ${name}`);
            return await checkPvcReady(numberFailed + 1);
        }
        console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for ${checkIntervalMilliseconds / 1000} seconds before checking again...`);
        return await checkPvcReady(numberFailed);
    }
    return await checkPvcReady(0);
}
exports.watchVolumeCopyPvcUntilReady = watchVolumeCopyPvcUntilReady;
async function watchPackageValidatorPodUntilReady({ kc, name, timeoutSeconds = 240, }) {
    const startTime = new Date().getTime();
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const client = kc.makeApiClient(k8s.CoreV1Api);
    const checkIntervalMilliseconds = 5000;
    let elapsedSeconds = ((Date.now() - startTime) / 1000);
    async function checkContainersReady(numberFailed) {
        var _a, _b;
        if (elapsedSeconds >= timeoutSeconds) {
            console.error(`Pod ${name} did not become ready within ${timeoutSeconds} seconds`);
            return false;
        }
        const podStatus = await waitUntilNotTerminating(client, name, namespace, 1);
        if (podStatus === "pod-terminating") {
            console.error(`Pod ${name} did not become ready within ${timeoutSeconds} seconds`);
            return false;
        }
        if (podStatus === "pod-pending") {
            console.log(`Pod ${name} is pending`);
            await (0, misc_1.sleep)(checkIntervalMilliseconds);
            elapsedSeconds = ((Date.now() - startTime) / 1000);
            return await checkContainersReady(numberFailed);
        }
        if (podStatus === "pod-running") {
            console.log(`Pod ${name} is running`);
            const pod = (await client.readNamespacedPod(name, namespace)).body;
            if ((_b = (_a = pod.status) === null || _a === void 0 ? void 0 : _a.containerStatuses) === null || _b === void 0 ? void 0 : _b.every((status) => { var _a; return ((_a = status.state) === null || _a === void 0 ? void 0 : _a.running) !== undefined; })) {
                console.log(`Pod ${name} is ready`);
                return true;
            }
            await (0, misc_1.sleep)(checkIntervalMilliseconds);
            elapsedSeconds = ((Date.now() - startTime) / 1000);
            return await checkContainersReady(numberFailed);
        }
        if (podStatus === "pod-does-not-exist") {
            console.error(`Pod ${name} does not exist`);
            return false;
        }
        if (podStatus === "unknown") {
            console.error(`Unknown pod status for ${name}`);
            return false;
        }
        console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for ${checkIntervalMilliseconds / 1000} seconds before checking again...`);
        return await checkContainersReady(numberFailed + 1);
    }
    return await checkContainersReady(0);
}
exports.watchPackageValidatorPodUntilReady = watchPackageValidatorPodUntilReady;
async function deployVolumeCopyPodStacks(firebaseProjectId, configuration, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion) {
    if (unrealProjectVersion.packageArchiveUrl == undefined) {
        console.error("Package archive URL is undefined");
        return false;
    }
    if (unrealProjectVersion.packageArchiveSha256Sum == undefined) {
        console.error("unrealProjectVersion.packageArchiveSha256Sum == undefined");
        return false;
    }
    const state = "volume-copy-pvcs-creating";
    await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state });
    const kc = await (0, shared_1.resolveKubeConfig)("coreweave");
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const podYaml = await (0, misc_1.readFile)(volumeCopyPodYamlFile);
    const pvcYaml = await (0, misc_1.readFile)(pvcYamlFile);
    // TODO: Setup UnrealProjectVersionVolumeCopy configuration system
    const regions = configuration === null || configuration === void 0 ? void 0 : configuration.volumeCopyToRegions;
    if (regions == undefined) {
        console.error("Failed to resolve valid regions");
        return false;
    }
    await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state, volumeRegions: regions });
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    if (unrealProjectVersion.volumeSizeGb == undefined) {
        console.error("Unreal project version has no volumeSizeGb field:", unrealProjectVersionId);
        return false;
    }
    const createdPvcs = await Promise.all(regions.map(async (region) => {
        var _a;
        const pvc = resourceYaml.templateUnrealProjectVersionPvc(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, region, configuration, pvcYaml);
        if (pvc == undefined) {
            console.error(`Failed to template pvc ${unrealProjectVersionId}-${region}`);
            return { region };
        }
        if (((_a = pvc.metadata) === null || _a === void 0 ? void 0 : _a.name) == undefined) {
            console.error(`Pvc is missing metadata.name for ${unrealProjectVersionId}-${region}`);
            return { region };
        }
        console.debug("Creating kubernetes pvc");
        const createPvcResult = await coreClient.createNamespacedPersistentVolumeClaim(namespace, pvc)
            .then((pvc) => {
            var _a;
            return {
                pvcName: (_a = pvc.body.metadata) === null || _a === void 0 ? void 0 : _a.name,
                error: undefined,
            };
        })
            .catch((e) => {
            return {
                pvcName: undefined,
                error: {
                    statusCode: e.response.statusCode,
                    statusMessage: e.response.statusMessage,
                },
            };
        });
        if (createPvcResult.error != undefined) {
            console.error("Failed to create pvc over kubernetes API");
            console.error(createPvcResult);
            return { region };
        }
        if (createPvcResult.pvcName == undefined) {
            console.error("Created pvc has no name");
            console.error(createPvcResult);
            return { region };
        }
        return { region, pvcName: createPvcResult.pvcName };
    }));
    if (createdPvcs.filter((r) => r.pvcName == undefined).length > 0) {
        console.error(`Error: At least one created pvc for ${unrealProjectId}/${unrealProjectVersionId} is undefined`);
        return await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-pvcs-failed" });
    }
    await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-pvcs-creating" });
    const pvcsBound = await Promise.all(createdPvcs.map(async (createdPvc) => {
        if (createdPvc.pvcName == undefined)
            return undefined;
        return await watchVolumeCopyPvcUntilReady({ kc, name: createdPvc.pvcName });
    }));
    if (pvcsBound.filter((pvc) => pvc == undefined || pvc.result != "bound").length > 0) {
        console.error(`Error: At least one pvc is not bound for ${unrealProjectId}/${unrealProjectVersionId}`);
        return await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-pvcs-failed" });
    }
    await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-pvcs-bound" });
    const createdPods = await Promise.all(regions.map(async (region) => {
        var _a;
        const pod = resourceYaml.templateUnrealProjectVersionVolumeCopyPod(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, region, configuration === null || configuration === void 0 ? void 0 : configuration.volumeCopyImageRepo, configuration === null || configuration === void 0 ? void 0 : configuration.volumeCopyImageId, podYaml);
        if (pod == undefined) {
            console.error(`Failed to template volume copy pod ${unrealProjectVersionId}-${region}`);
            return { region };
        }
        if (((_a = pod.metadata) === null || _a === void 0 ? void 0 : _a.name) == undefined) {
            console.error("Volume copy pod is missing metadata.name for unrealProjectVersionId: ", unrealProjectVersionId);
            return { region };
        }
        console.debug("Creating kubernetes pod");
        const createPodResult = await coreClient.createNamespacedPod(namespace, pod)
            .then((pod) => {
            var _a;
            return {
                podName: (_a = pod.body.metadata) === null || _a === void 0 ? void 0 : _a.name,
                error: undefined,
            };
        })
            .catch((e) => {
            return {
                podName: undefined,
                error: {
                    statusCode: e.response.statusCode,
                    statusMessage: e.response.statusMessage,
                },
            };
        });
        if (createPodResult.error != undefined) {
            console.error("Failed to create pod over kubernetes API");
            console.error(createPodResult);
            return { region };
        }
        if (createPodResult.podName == undefined) {
            console.error("Created pod has no name");
            console.error(createPodResult);
            return { region };
        }
        return { region, podName: createPodResult.podName };
    }));
    if (createdPods.filter((r) => r.podName == undefined).length > 0) {
        return await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-failed-to-create" });
    }
    await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-waiting-for-ready" });
    const podsReady = await Promise.all(createdPods.map(async (createdPod) => {
        if (createdPod.podName == undefined) {
            console.error("podName is undefined");
            console.debug({ createdPod });
            return undefined;
        }
        return await watchVolumeCopyPodUntilReady({ kc, name: createdPod.podName });
    }));
    const failedPods = podsReady.filter((pod) => pod == undefined || pod.result == "failed" || pod.result == "failed-create");
    console.debug({ failedPods });
    if (failedPods.length > 0) {
        return await updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-failed" });
    }
    return true;
}
exports.deployVolumeCopyPodStacks = deployVolumeCopyPodStacks;
// TODO: Develop the deletion side of volume-copy
async function deleteVolumeCopyPodStack(unrealProjectVersionId, regions) {
    const kc = await (0, shared_1.resolveKubeConfig)("coreweave");
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const podDeleteResults = await Promise.all(regions.map(async (region) => {
        const podName = (0, shared_3.formatUnrealProjectVersionVolumeCopyPodName)(unrealProjectVersionId, region);
        try {
            console.debug("Deleting pod: ", podName);
            const podDelete = await coreClient.deleteNamespacedPod(podName, namespace, undefined, undefined, 15);
            const podDeleted = podDelete.response.statusCode;
            console.debug("Delete pod response status code: ", podDelete.response.statusCode);
            console.debug("Delete pod response status message: ", podDelete.response.statusMessage);
            if (podDeleted != undefined && podDeleted >= 200 && podDeleted < 300) {
                console.debug("Deleted pod successfully");
                return true;
            }
        }
        catch (e) {
            console.error(e);
        }
        console.error("Failed to delete pod");
        return false;
    }));
    const successfullyDeletedPods = podDeleteResults.reduce((acc, r) => (acc == false) ? false : r, true);
    return successfullyDeletedPods;
}
exports.deleteVolumeCopyPodStack = deleteVolumeCopyPodStack;
async function deleteVolumeCopyPvcs(unrealProjectVersionId, regions) {
    const kc = await (0, shared_1.resolveKubeConfig)("coreweave");
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const pvcDeleteResults = await Promise.all(regions.map(async (region) => {
        const pvcName = (0, shared_3.formatUnrealProjectVersionClaimName)(unrealProjectVersionId, region);
        try {
            console.debug("Deleting pvc: ", pvcName);
            const pvcDelete = await coreClient.deleteNamespacedPersistentVolumeClaim(pvcName, namespace, undefined, undefined, 15);
            const pvcDeleted = pvcDelete.response.statusCode;
            console.debug("Delete pvc response status code: ", pvcDelete.response.statusCode);
            console.debug("Delete pvc response status message: ", pvcDelete.response.statusMessage);
            if (pvcDeleted != undefined && pvcDeleted >= 200 && pvcDeleted < 300) {
                console.debug("Deleted pvc successfully");
                return true;
            }
        }
        catch (e) {
            console.error(e);
        }
        console.error("Failed to delete pvc");
        return false;
    }));
    const successfullyDeletedPvcs = pvcDeleteResults.reduce((acc, r) => (acc == false) ? false : r, true);
    return successfullyDeletedPvcs;
}
exports.deleteVolumeCopyPvcs = deleteVolumeCopyPvcs;
//# sourceMappingURL=deploy-standard.js.map