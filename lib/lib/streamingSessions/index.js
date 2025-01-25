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
exports.collectDeploymentPodStackState = exports.deployStreamingSession = exports.createNewDeployments = exports.replaceAndDeprovisionDeployment = exports.deprovisionDeployment = exports.orderOfDeploymentState = exports.createNewDeployment = exports.getConfigurationOdysseyClientPod = exports.updateParticipant = exports.checkWebRtcStateOnline = void 0;
const admin = __importStar(require("firebase-admin"));
const deployStandard = __importStar(require("./deploy-standard"));
const firestore_1 = require("../documents/firestore");
function checkWebRtcStateOnline(result, deviceTimeout) {
    const [webRtcStateDoc, webRtcState] = result;
    return (webRtcStateDoc != undefined &&
        webRtcStateDoc.exists == true &&
        webRtcState != undefined &&
        webRtcState.updated != undefined &&
        webRtcState.updated.seconds > deviceTimeout &&
        webRtcState.state != undefined &&
        webRtcState.state != null &&
        ["new", "checking", "connected", "completed", "disconnected"].includes(webRtcState.state));
}
exports.checkWebRtcStateOnline = checkWebRtcStateOnline;
async function updateParticipant(participant, organizationId, roomId, participantId) {
    console.log("Updating participant...");
    return await (0, firestore_1.getParticipantRef)(organizationId, roomId, participantId).update(participant);
}
exports.updateParticipant = updateParticipant;
async function getConfigurationOdysseyClientPod(organizationId, spaceId, shardOfRoomId, roomId, userId) {
    async function getConfiguration(configurationDocPath) {
        const configurationDoc = await admin.firestore()
            .doc(configurationDocPath).get();
        if (configurationDoc.exists) {
            return configurationDoc.data();
        }
        else {
            return undefined;
        }
    }
    const configurationSources = [];
    const systemConfigurationRef = (0, firestore_1.getOdysseyClientPodRef)();
    configurationSources.push(systemConfigurationRef.path);
    if (organizationId != undefined) {
        const organizationConfigurationRef = (0, firestore_1.getOrganizationOdysseyClientPodRef)(organizationId);
        configurationSources.push(organizationConfigurationRef.path);
    }
    if (organizationId != undefined && spaceId != undefined) {
        const spaceConfigurationRef = (0, firestore_1.getSpaceConfigurationOdysseyClientPodRef)(organizationId, spaceId);
        configurationSources.push(spaceConfigurationRef.path);
    }
    if (organizationId != undefined && shardOfRoomId != undefined) {
        const shardOfRoomConfigurationRef = (0, firestore_1.getRoomConfigurationOdysseyClientPodRef)(organizationId, shardOfRoomId);
        configurationSources.push(shardOfRoomConfigurationRef.path);
    }
    if (organizationId != undefined && roomId != undefined) {
        const roomConfigurationRef = (0, firestore_1.getRoomConfigurationOdysseyClientPodRef)(organizationId, roomId);
        configurationSources.push(roomConfigurationRef.path);
    }
    if (organizationId != undefined && userId != undefined) {
        const userConfigurationRef = (0, firestore_1.getOrganizationUserConfigurationOdysseyClientPodRef)(organizationId, userId);
        configurationSources.push(userConfigurationRef.path);
    }
    if (userId != undefined) {
        const userConfigurationRef = (0, firestore_1.getUserConfigurationOdysseyClientPodRef)(userId);
        configurationSources.push(userConfigurationRef.path);
    }
    return await configurationSources.reduce(async (acc, docPath) => {
        const result = await getConfiguration(docPath);
        if (result == undefined) {
            console.log(`Configuration document ${docPath} doesn't exist`);
            return await acc;
        }
        else {
            const accResolved = await acc;
            if (accResolved == undefined) {
                console.log(`Setting configuration from ${docPath}`);
                return result;
            }
            else {
                console.log(`Merging configuration from ${docPath} with existing`);
                return Object.assign(Object.assign({}, accResolved), result);
            }
        }
    }, Promise.resolve(undefined));
}
exports.getConfigurationOdysseyClientPod = getConfigurationOdysseyClientPod;
function createNewDeployment(userId, deviceId, attempts, workloadClusterProvider) {
    const now = admin.firestore.Timestamp.now();
    return {
        workloadClusterProvider: workloadClusterProvider,
        created: now,
        updated: now,
        attempts,
        deviceId,
        userId,
        state: "new",
        stateChanges: [{ state: "new", timestamp: now }],
    };
}
exports.createNewDeployment = createNewDeployment;
function orderOfDeploymentState(deploymentState) {
    switch (deploymentState) {
        case "new": {
            return 1;
        }
        case "provisioning": {
            return 2;
        }
        case "failed-provisioning": {
            return 3;
        }
        case "timed-out-provisioning": {
            return 4;
        }
        case "pod-pending": {
            return 5;
        }
        case "pod-unschedulable": {
            return 6;
        }
        case "pod-scheduled": {
            return 7;
        }
        case "pod-creating": {
            return 8;
        }
        case "pod-initialized": {
            return 9;
        }
        case "pod-failed": {
            return 10;
        }
        case "pod-ready": {
            return 11;
        }
        case "pod-deleted": {
            return 0;
        }
        case "deprovisioning": {
            return 0;
        }
        case "failed-deprovisioning": {
            return 0;
        }
        case "timed-out-deprovisioning": {
            return 0;
        }
        case "deprovisioned": {
            return 0;
        }
        default: {
            return 0;
        }
    }
}
exports.orderOfDeploymentState = orderOfDeploymentState;
async function deprovisionDeployment(organizationId, roomId, participantId, deploymentId) {
    const [, deployment] = await (0, firestore_1.getDeployment)(organizationId, roomId, participantId, deploymentId);
    const dontReplaceStates = ["deprovisioning", "deprovisioned"];
    if (deployment == undefined) {
        throw new Error("Deployment undefined");
    }
    console.debug("Latest deployment:", deployment);
    if (deployment.state in dontReplaceStates) {
        console.warn("Deployment state already deprovisioning or deprovisioned, not updating");
        return;
    }
    return await deployStandard.updateDeploymentState(organizationId, roomId, participantId, deploymentId, "deprovisioning");
}
exports.deprovisionDeployment = deprovisionDeployment;
async function replaceAndDeprovisionDeployment(organizationId, roomId, participantId, deploymentId, userId, deviceId, attempts, workloadClusterProvider) {
    const [, latestDeployment] = await (0, firestore_1.getDeployment)(organizationId, roomId, participantId, deploymentId);
    if (latestDeployment == undefined) {
        console.error("latestDeployment undefined");
        return;
    }
    if (latestDeployment.state != "failed-provisioning") {
        console.warn(`Deployment has changed state from failed-provisioning, not replacing or removing: ${deploymentId}`);
        return;
    }
    // Deprovision failed deployment
    await (async () => {
        try {
            await deprovisionDeployment(organizationId, roomId, participantId, deploymentId);
        }
        catch (e) {
            console.error(e);
            console.error(`Failed to deprovision deployment ${deploymentId}`);
        }
    })();
    const [latestParticipantDoc, latestParticipant] = await (0, firestore_1.getParticipant)(organizationId, roomId, participantId);
    if (latestParticipantDoc == undefined || latestParticipant == undefined) {
        console.warn("latestParticipant undefined");
        return;
    }
    if (!latestParticipantDoc.exists) {
        console.warn("Participant no longer exists, not replacing.");
        return;
    }
    if (latestParticipant.state == "ready-deployment") {
        console.warn("Participant has ready deployment, not replacing.");
        return;
    }
    if (latestDeployment.state != "failed-provisioning" && latestDeployment.state != "failed-before-provisioning") {
        console.warn("Deployment has changed state from failed-provisioning or failed-before-provisioning, not replacing.");
        return;
    }
    if (attempts > 3) {
        console.log(`Reached maximum number of deployment attempts: ${attempts}, not replacing`);
        return;
    }
    const replacementDeployment = createNewDeployment(userId, deviceId, attempts, workloadClusterProvider);
    // Create replacement deployment
    const addDeploymentResult = await (async () => {
        try {
            return (await (0, firestore_1.addDeployment)(organizationId, roomId, participantId, replacementDeployment)).id;
        }
        catch (e) {
            console.error(e);
            console.error(`Failed to replace failed deployment ${deploymentId}`);
            return false;
        }
    })();
    return addDeploymentResult;
}
exports.replaceAndDeprovisionDeployment = replaceAndDeprovisionDeployment;
async function createNewDeployments(organizationId, spaceId, roomId, participantId, userId, deviceId, shardOfRoomId) {
    const configuration = await getConfigurationOdysseyClientPod(organizationId, spaceId, shardOfRoomId, roomId, userId);
    if (configuration == undefined) {
        throw new Error("Unable to resolve configuration");
    }
    if (configuration.workloadClusterProviders == undefined) {
        throw (new Error("Configuration has no workloadClusterProviders"));
    }
    console.log(configuration);
    const deployments = configuration.workloadClusterProviders
        .reduce((unique, item) => {
        // Remove any duplicate providers
        return unique.includes(item) ? unique : [...unique, item];
    }, [])
        .map((clusterProvider) => createNewDeployment(userId, deviceId, 1, clusterProvider))
        .map((deployment) => {
        return (0, firestore_1.addDeployment)(organizationId, roomId, participantId, deployment);
    });
    return deployments;
}
exports.createNewDeployments = createNewDeployments;
async function deployStreamingSession(projectId, deployment, organizationId, spaceId, shardOfRoomId, roomId, participantId, deploymentId, serverAddress, levelId, userId, deviceId, graphicsBenchmark, resolvedSpaceUnrealProjectVersion, serverRegion) {
    const configuration = await getConfigurationOdysseyClientPod(organizationId, spaceId, shardOfRoomId, roomId, userId);
    if (configuration == undefined) {
        throw new Error("Unable to resolve configuration");
    }
    const customToken = await admin.auth().createCustomToken(userId);
    return await deployStandard.deployPodstack(projectId, configuration, deployment.workloadClusterProvider, organizationId, spaceId, roomId, participantId, deploymentId, serverAddress, levelId, userId, deviceId, customToken, graphicsBenchmark, resolvedSpaceUnrealProjectVersion, serverRegion);
}
exports.deployStreamingSession = deployStreamingSession;
async function collectDeploymentPodStackState(organizationId, roomId, participantId, deploymentId, userId, workloadClusterProvider, deploymentState) {
    console.debug("Collecting and saving pod stack state");
    try {
        const podStack = await deployStandard.collectPodStackStates(userId, deploymentId, workloadClusterProvider);
        const podStackState = {
            deploymentState,
            timestamp: admin.firestore.Timestamp.now(),
            eventsJson: podStack.events && JSON.stringify(podStack.events),
            podJson: podStack.pod && JSON.stringify(podStack.pod),
            configMapJson: podStack.configMap && JSON.stringify(podStack.configMap),
            serviceJson: podStack.service && JSON.stringify(podStack.service),
            ingressJson: podStack.ingress && JSON.stringify(podStack.ingress),
        };
        const result = await (0, firestore_1.getPodStackStatesRef)(organizationId, roomId, participantId, deploymentId).add(podStackState);
        return result.id;
    }
    catch (e) {
        console.error("Error collecting and/or adding pod stack state");
        console.error(e);
        return undefined;
    }
}
exports.collectDeploymentPodStackState = collectDeploymentPodStackState;
//# sourceMappingURL=index.js.map