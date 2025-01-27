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
exports.billingFeatureShardingEnabled = exports.onUpdateRoomState = exports.deleteGameServer = exports.newGameServer = exports.waitAndDeprovision = exports.waitAndProvision = exports.getConfigurationOdysseyServer = void 0;
const deployStandard = __importStar(require("./deploy-standard"));
const admin = __importStar(require("firebase-admin"));
const firebase_1 = require("../firebase");
const misc_1 = require("../misc");
const firestore_1 = require("../documents/firestore");
const streamingSessions_1 = require("../streamingSessions");
const availability_1 = require("../coreweave/availability");
const shared_1 = require("../unrealProjects/shared");
async function getConfigurationOdysseyServer(organizationId, spaceId, shardOfRoomId, roomId) {
    async function getConfiguration(configurationDocPath) {
        const configurationDoc = await admin.firestore().doc(configurationDocPath).get();
        if (configurationDoc.exists) {
            return configurationDoc.data();
        }
        else {
            return undefined;
        }
    }
    const configurationSources = [];
    configurationSources.push((0, firestore_1.getOdysseyServerRef)().path);
    if (organizationId != undefined) {
        configurationSources.push((0, firestore_1.getOrganizationOdysseyServerRef)(organizationId).path);
    }
    if (organizationId != undefined && spaceId != undefined) {
        configurationSources.push((0, firestore_1.getSpaceConfigurationOdysseyServerRef)(organizationId, spaceId).path);
    }
    if (organizationId != undefined && shardOfRoomId != undefined) {
        configurationSources.push((0, firestore_1.getRoomConfigurationOdysseyServerRef)(organizationId, shardOfRoomId).path);
    }
    if (organizationId != undefined && roomId != undefined) {
        configurationSources.push((0, firestore_1.getRoomConfigurationOdysseyServerRef)(organizationId, roomId).path);
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
exports.getConfigurationOdysseyServer = getConfigurationOdysseyServer;
async function waitAndProvision(startTime, organizationId, roomId) {
    await (0, misc_1.sleep)(2000);
    console.debug("Waiting for 2 seconds before getting room");
    const [, room] = await (0, firestore_1.getRoom)(organizationId, roomId);
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (room == undefined) {
        console.debug(`Seconds elapsed: ${elapsedSeconds}, room undefined, waiting for 2 more seconds`);
        return await waitAndDeprovision(startTime, organizationId, roomId);
    }
    else if (room.state == undefined ||
        room.state == "deprovisioned" ||
        room.state == "failed-deprovisioning" ||
        room.state == "timed-out-deprovisioning" ||
        room.state == "pod-deleted") {
        console.debug("Updating room state to provisioning");
        return await deployStandard.updateRoomState(organizationId, roomId, "provisioning");
    }
    else if (room.state == "provisioning" ||
        room.state == "pod-ready" ||
        room.state == "pod-containersReady" ||
        room.state == "pod-initialized" ||
        room.state == "pod-creating" ||
        room.state == "pod-pending" ||
        room.state == "pod-scheduled" ||
        room.state == "pod-unschedulable") {
        console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, already provisioning or provisioned`);
        return;
    }
    else if (elapsedSeconds >= 200) {
        console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, timed out`);
        return;
    }
    else {
        console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, waiting for 2 more seconds`);
        return await waitAndProvision(startTime, organizationId, roomId);
    }
}
exports.waitAndProvision = waitAndProvision;
async function waitAndDeprovision(startTime, organizationId, roomId) {
    console.debug("Waiting for 2 seconds before getting room");
    await (0, misc_1.sleep)(2000);
    const [, room] = await (0, firestore_1.getRoom)(organizationId, roomId);
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (room == undefined) {
        console.debug(`Seconds elapsed: ${elapsedSeconds}, room undefined, waiting for 2 more seconds`);
        return await waitAndDeprovision(startTime, organizationId, roomId);
    }
    else if (elapsedSeconds >= 200 ||
        room.state == undefined ||
        room.state == "pod-ready" ||
        room.state == "failed-deprovisioning" ||
        room.state == "failed-provisioning" ||
        room.state == "timed-out-deprovisioning" ||
        room.state == "timed-out-provisioning" ||
        room.state == "pod-deleted" ||
        room.state == "pod-failed") {
        console.debug("Updating room state to deprovisioning");
        return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioning");
    }
    else if (room.state == "deprovisioned" || room.state == "deprovisioning") {
        console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, done`);
        return;
    }
    else {
        console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, waiting for 2 more seconds`);
        return await waitAndDeprovision(startTime, organizationId, roomId);
    }
}
exports.waitAndDeprovision = waitAndDeprovision;
async function newGameServer(projectId, organizationId, spaceId, roomId, graphicsBenchmark, resolvedSpaceUnrealProjectVersion, levelId, shardOfRoomId) {
    const configuration = await getConfigurationOdysseyServer(organizationId, spaceId, shardOfRoomId, roomId);
    if (configuration == undefined) {
        throw new Error("configuration is undefined");
    }
    const clientConfiguration = await (0, streamingSessions_1.getConfigurationOdysseyClientPod)(organizationId, spaceId, shardOfRoomId, roomId);
    const unrealProjectVersionRegions = (resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersion.volumeRegions) || [];
    const gpuRegions = await (0, availability_1.resolveGpuRegions)(clientConfiguration, graphicsBenchmark, unrealProjectVersionRegions);
    const region = gpuRegions[0].region;
    return await deployStandard.deployGameServerPodStack(projectId, configuration, region, organizationId, spaceId, roomId, resolvedSpaceUnrealProjectVersion, levelId);
}
exports.newGameServer = newGameServer;
async function deleteGameServer(organizationId, roomId) {
    const configuration = await getConfigurationOdysseyServer(organizationId, roomId);
    if (configuration == undefined) {
        throw new Error("configuration is undefined");
    }
    return await deployStandard.deleteGameServerPodStack(roomId, configuration.workloadClusterProvider);
}
exports.deleteGameServer = deleteGameServer;
async function onUpdateRoomState(organizationId, roomId, room) {
    var _a, _b;
    console.debug("Waiting for 3 seconds before getting latest room state");
    await (0, misc_1.sleep)(3000);
    const [roomLatestRef, roomLatest] = await (0, firestore_1.getRoom)(organizationId, roomId);
    if (roomLatestRef == undefined || roomLatest == undefined) {
        return console.error("Latest room undefined");
    }
    if (roomLatest.spaceId == undefined) {
        return console.error("Room spaceId is undefined");
    }
    const [, space] = await (0, firestore_1.getSpace)(organizationId, roomLatest.spaceId);
    if (space == undefined) {
        return console.error("Space is undefined");
    }
    if (roomLatest.state == room.state) {
        console.debug("Room stat still matches latest");
        switch (room.state) {
            case "provisioning": {
                const [, billingPublic] = await (0, firestore_1.getBillingPublic)(organizationId);
                if (billingPublic != undefined && billingPublic.aggregateBillingState == "inactive") {
                    console.log(`Room provisioning rejected by billing: ${(0, firestore_1.getRoomRef)(organizationId, roomId).path}`);
                    return await deployStandard.updateRoomState(organizationId, roomId, "failed-provisioning", admin.firestore.FieldValue.delete(), undefined, 0, undefined, true);
                }
                const resolvedUnrealProjectVersion = await (0, shared_1.resolveSpaceUnrealProjectVersion)(space);
                if (resolvedUnrealProjectVersion == "not-found") {
                    console.error(`Failed to find unreal project version ${(_a = space.unrealProject) === null || _a === void 0 ? void 0 : _a.unrealProjectId}/${(_b = space.unrealProject) === null || _b === void 0 ? void 0 : _b.unrealProjectVersionId}`);
                    return await deployStandard.updateRoomState(organizationId, roomId, "failed-provisioning", admin.firestore.FieldValue.delete(), undefined, 0);
                }
                const projectId = (0, firebase_1.getFirebaseProjectId)();
                if (roomLatest.spaceId == undefined) {
                    console.error("Room spaceId is undefined");
                    return await deployStandard.updateRoomState(organizationId, roomId, "failed-provisioning", admin.firestore.FieldValue.delete(), undefined, 0);
                }
                return await newGameServer(projectId, organizationId, roomLatest.spaceId, roomId, (roomLatest.graphicsBenchmark != undefined) ? roomLatest.graphicsBenchmark : 5, resolvedUnrealProjectVersion, roomLatest.levelId, roomLatest.shardOf);
            }
            case "deprovisioning": {
                const deleteResult = await deleteGameServer(organizationId, roomId);
                if (deleteResult) {
                    return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioned", admin.firestore.FieldValue.delete(), undefined, 0);
                }
                else {
                    return await deployStandard.updateRoomState(organizationId, roomId, "failed-deprovisioning", undefined, undefined, admin.firestore.FieldValue.increment(1));
                }
            }
            case "failed-provisioning": {
                if (room.provisioningFailures != undefined && room.provisioningFailures > 2) {
                    console.warn("Too many failed provisioning attempts, deprovisioning");
                    return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioning");
                }
                console.debug("Updating room state back to provisioning");
                return await deployStandard.updateRoomState(organizationId, roomId, "provisioning", undefined, (room.provisioningFailures == undefined) ? 1 : room.provisioningFailures + 1);
            }
            case "failed-deprovisioning": {
                if (room.deprovisioningFailures != undefined && room.deprovisioningFailures > 2) {
                    console.warn("Too many failed deprovisioning attempts, giving up");
                    return;
                }
                console.debug("Updating room state back to deprovisioning");
                return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioning");
            }
            case "timed-out-provisioning": {
                return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioning");
            }
            default: {
                return;
            }
        }
    }
    else {
        console.debug("Room state has been updated since the start of this execution. Stopping here.");
        return;
    }
}
exports.onUpdateRoomState = onUpdateRoomState;
async function billingFeatureShardingEnabled(organizationId, triggerDoc) {
    const [, billingPublic] = await (0, firestore_1.getBillingPublic)(organizationId);
    if (billingPublic == undefined) {
        console.error(`Unable to get billing/public for document: ${triggerDoc.ref.path}`);
        return false;
    }
    if (billingPublic.aggregateBillingState != "active") {
        console.warn(`Sharding feature disabled because aggregateBillingState != active: ${triggerDoc.ref.path}`);
        return false;
    }
    if (billingPublic.features.sharding != true) {
        console.warn(`Sharding feature disabled because it is not included in subscription features: ${triggerDoc.ref.path}`);
        return false;
    }
    return true;
}
exports.billingFeatureShardingEnabled = billingFeatureShardingEnabled;
//# sourceMappingURL=index.js.map