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
exports.getLatestUnrealProjectVersion = exports.expireUnrealProjectVersions = exports.getAllExpirableUnrealProjectVersions = exports.createUpdateBridgeToolkitSettingsItem = exports.createUpdateBridgeToolkitSettingsTemplateItem = exports.createUpdateConfiguratorItems = exports.createConfiguratorTemplateItems = exports.resolveSpaceUnrealProjectVersion = exports.formatPluginVersionClaimName = exports.formatSharedDdcClaimName = exports.formatUnrealProjectVersionClaimName = exports.formatUnrealProjectVersionPackageValidatorPodName = exports.formatPackageValidatorConfigMapName = exports.formatVolumeCopyConfigMapName = exports.formatBuilderConfigMapName = exports.formatUnrealProjectVersionVolumeCopyPodName = exports.formatUnrealProjectVersionBuildPodName = exports.getConfigurationUnrealProjectVersion = exports.getUnrealProjectName = void 0;
// @ts-nocheck
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("../documents/firestore");
const firebase_1 = require("../firebase");
const deploy_standard_1 = require("./deploy-standard");
const utils_1 = require("../utils");
function getUnrealProjectName(unrealProject, unrealProjectVersion) {
    if ((unrealProjectVersion === null || unrealProjectVersion === void 0 ? void 0 : unrealProjectVersion.name) !== undefined)
        return unrealProjectVersion.name;
    if ((unrealProject === null || unrealProject === void 0 ? void 0 : unrealProject.name) !== undefined)
        return unrealProject.name;
    console.log("Project name could not be found");
    return undefined;
}
exports.getUnrealProjectName = getUnrealProjectName;
async function getConfigurationUnrealProjectVersion(options) {
    async function getConfiguration(docRef) {
        const configurationDoc = await docRef.get();
        if (configurationDoc.exists) {
            return configurationDoc.data();
        }
        else {
            return undefined;
        }
    }
    const configurationSources = [
        (0, firestore_1.getConfigurationUnrealProjectVersionRef)({ location: "root" }),
        options.organizationId && (0, firestore_1.getConfigurationUnrealProjectVersionRef)({ location: "organization", organizationId: options.organizationId }),
        options.authorUserId && (0, firestore_1.getConfigurationUnrealProjectVersionRef)({ location: "authorUser", userId: options.authorUserId }),
        options.unrealProjectId && (0, firestore_1.getConfigurationUnrealProjectVersionRef)({ location: "unrealProject", unrealProjectId: options.unrealProjectId }),
        (options.unrealProjectId && options.unrealProjectVersionId) && (0, firestore_1.getConfigurationUnrealProjectVersionRef)({ location: "unrealProjectVersion", unrealProjectId: options.unrealProjectId, unrealProjectVersionId: options.unrealProjectVersionId }),
    ].flatMap((o) => (o == "" || o == undefined) ? [] : o);
    return await configurationSources.reduce(async (acc, docRef) => {
        const result = await getConfiguration(docRef);
        if (result == undefined) {
            console.log(`Configuration document ${docRef.path} doesn't exist`);
            return await acc;
        }
        else {
            const accResolved = await acc;
            if (accResolved == undefined) {
                console.log(`Setting configuration from ${docRef.path}`);
                return result;
            }
            else {
                console.log(`Merging configuration from ${docRef.path} with existing`);
                return Object.assign(Object.assign({}, accResolved), result);
            }
        }
    }, Promise.resolve(undefined));
}
exports.getConfigurationUnrealProjectVersion = getConfigurationUnrealProjectVersion;
function formatUnrealProjectVersionBuildPodName(unrealProjectVersionId) {
    return "ue-project-version-build-" + unrealProjectVersionId.toLowerCase();
}
exports.formatUnrealProjectVersionBuildPodName = formatUnrealProjectVersionBuildPodName;
function formatUnrealProjectVersionVolumeCopyPodName(unrealProjectVersionId, region) {
    return ("ue-project-version-volume-copy-" + unrealProjectVersionId + "-" + region).toLowerCase();
}
exports.formatUnrealProjectVersionVolumeCopyPodName = formatUnrealProjectVersionVolumeCopyPodName;
function formatBuilderConfigMapName(projectId) {
    const envName = (0, firebase_1.projectToEnvName)(projectId);
    if (envName == undefined)
        return undefined;
    return "unreal-project-version-builder-" + envName;
}
exports.formatBuilderConfigMapName = formatBuilderConfigMapName;
function formatVolumeCopyConfigMapName(projectId) {
    const envName = (0, firebase_1.projectToEnvName)(projectId);
    if (envName == undefined)
        return undefined;
    return "unreal-project-version-volume-copy-" + envName;
}
exports.formatVolumeCopyConfigMapName = formatVolumeCopyConfigMapName;
function formatPackageValidatorConfigMapName(projectId) {
    const envName = (0, firebase_1.projectToEnvName)(projectId);
    if (envName == undefined)
        return undefined;
    return "unreal-project-version-package-validator-" + envName;
}
exports.formatPackageValidatorConfigMapName = formatPackageValidatorConfigMapName;
function formatUnrealProjectVersionPackageValidatorPodName(unrealProjectVersionId) {
    return ("ue-project-version-package-validator-" + unrealProjectVersionId).toLowerCase();
}
exports.formatUnrealProjectVersionPackageValidatorPodName = formatUnrealProjectVersionPackageValidatorPodName;
function formatUnrealProjectVersionClaimName(unrealProjectVersionId, region) {
    return ("ue-project-version-" + unrealProjectVersionId + "-" + region).toLowerCase();
}
exports.formatUnrealProjectVersionClaimName = formatUnrealProjectVersionClaimName;
function formatSharedDdcClaimName(region) {
    return ("unreal-shared-ddc-" + region).toLowerCase();
}
exports.formatSharedDdcClaimName = formatSharedDdcClaimName;
function formatPluginVersionClaimName(pluginVersionId, region) {
    return ("plugin-version-" + pluginVersionId.replace(new RegExp("_", "g"), "-") + "-" + region).toLowerCase();
}
exports.formatPluginVersionClaimName = formatPluginVersionClaimName;
async function resolveSpaceUnrealProjectVersion(space) {
    var _a;
    try {
        if (space.unrealProject == undefined)
            return undefined;
        const [, unrealProject] = await (0, firestore_1.getUnrealProject)(space.unrealProject.unrealProjectId);
        if (unrealProject == undefined)
            return "not-found";
        if (space.unrealProject.unrealProjectVersionId == undefined || space.unrealProject.unrealProjectVersionId == "latest") {
            const latestUnrealProjectVersionId = (_a = (await (0, firestore_1.getUnrealProjectVersionsRef)(space.unrealProject.unrealProjectId)
                .where("state", "==", "volume-copy-complete")
                .orderBy("updated", "desc")
                .limit(1)
                .get())
                .docs.pop()) === null || _a === void 0 ? void 0 : _a.id;
            console.debug({ latestUnrealProjectVersionId });
            if (latestUnrealProjectVersionId == undefined)
                return "not-found";
            const [, unrealProjectVersion] = await (0, firestore_1.getUnrealProjectVersion)(space.unrealProject.unrealProjectId, latestUnrealProjectVersionId);
            console.debug({ unrealProjectVersion });
            if (unrealProjectVersion == undefined)
                return "not-found";
            return { unrealProject, unrealProjectId: space.unrealProject.unrealProjectId, unrealProjectVersionId: latestUnrealProjectVersionId, unrealProjectVersion };
        }
        else {
            const [, unrealProjectVersion] = await (0, firestore_1.getUnrealProjectVersion)(space.unrealProject.unrealProjectId, space.unrealProject.unrealProjectVersionId);
            console.debug({ unrealProjectVersion });
            if (unrealProjectVersion == undefined)
                return "not-found";
            return { unrealProject, unrealProjectId: space.unrealProject.unrealProjectId, unrealProjectVersionId: space.unrealProject.unrealProjectVersionId, unrealProjectVersion };
        }
    }
    catch (e) {
        console.error(e);
        return "not-found";
    }
}
exports.resolveSpaceUnrealProjectVersion = resolveSpaceUnrealProjectVersion;
function stringCoordinateToVector3(coordinateString) {
    // Location = "X=000.000 Y=000.000 Z=000.000"
    if (coordinateString === undefined)
        return undefined;
    const coordinateArray = coordinateString.split(" ");
    if (coordinateArray.length !== 3)
        return undefined;
    const xString = coordinateArray.find((coordinate) => coordinate.includes("X="));
    const yString = coordinateArray.find((coordinate) => coordinate.includes("Y="));
    const zString = coordinateArray.find((coordinate) => coordinate.includes("Z="));
    if (xString === undefined || yString === undefined || zString === undefined)
        return undefined;
    const coordinateRegex = /^.+=/; // Get all characters before, and including, the first `=` character
    const x = Number(xString.replace(coordinateRegex, ""));
    const y = Number(yString.replace(coordinateRegex, ""));
    const z = Number(zString.replace(coordinateRegex, ""));
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
        console.error("Invalid numeric");
        console.debug(x, y, z);
        return undefined;
    }
    return { x, y, z };
}
function bridgeToolkitConfiguratorTypeToConfiguratorType(toolkitType) {
    switch (toolkitType) {
        case "Number":
            return "number";
        case "Bool":
            return "boolean";
        case "Enum":
            return "enum";
        case "String":
            return "string";
        case "Trigger":
            return "trigger";
        case "Image":
            return "image";
    }
}
function getBridgeToolkitSettingsConfigurators(unrealProjectVersion) {
    try {
        const settingsFile = unrealProjectVersion.bridgeToolkitFileSettings;
        if (settingsFile === undefined || settingsFile === null)
            return undefined;
        const levelSettingsConfigurators = Object.entries(settingsFile.levels)
            .flatMap(([levelFilePath, levelSettings]) => levelSettings.configurator !== undefined ? { levelFilePath, configurator: levelSettings.configurator } : []);
        return levelSettingsConfigurators;
    }
    catch (e) {
        console.error(`An error occurred: ${e}`);
        return undefined;
    }
}
async function createConfiguratorTemplateItems(spaceTemplateRef, unrealProjectVersion) {
    try {
        const upvConfigurators = getBridgeToolkitSettingsConfigurators(unrealProjectVersion);
        if (upvConfigurators === undefined || upvConfigurators === null || upvConfigurators.length <= 0)
            return undefined;
        const spaceTemplateItemsRef = spaceTemplateRef.collection("spaceTemplateItems");
        const configuratorItems = upvConfigurators.flatMap((configuratorItems) => configuratorItems.configurator.stateConfigurables
            .map((configuratorState) => {
            var _a;
            const spaceItem = {
                type: "Configurator",
                denormalizeOnUpdate: true,
                levelFilePath: configuratorItems.levelFilePath,
                position: (_a = stringCoordinateToVector3(configuratorItems.configurator.location)) !== null && _a !== void 0 ? _a : { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                offsetUpRotation: 0,
                itemTemplateId: configuratorState.id,
                name: configuratorState.displayName,
                currentState: undefined,
                schema: {
                    displayName: configuratorState.displayName,
                    type: bridgeToolkitConfiguratorTypeToConfiguratorType(configuratorState.type),
                    default: configuratorState.default,
                    values: configuratorState.values,
                    max: configuratorState.max,
                    min: configuratorState.min,
                    step: configuratorState.step,
                    isPersisted: configuratorState.isPersisted,
                    isNetworked: configuratorState.isNetworked,
                },
            };
            return spaceItem;
        }));
        const configuratorItemSaves = await Promise.allSettled(configuratorItems.map(async (configurator) => {
            if ((await spaceTemplateItemsRef.doc(configurator.itemTemplateId).get()).exists) {
                await spaceTemplateItemsRef.doc(configurator.itemTemplateId).update((0, utils_1.toFirestoreUpdateData)(configurator));
                console.log(`Configurator ${configurator.itemTemplateId} updated`);
            }
            else {
                await spaceTemplateItemsRef.doc(configurator.itemTemplateId).create(configurator);
                console.log(`Configurator ${configurator.itemTemplateId} created`);
            }
        }));
        console.debug(`Saved/Updated configurator requests: ${configuratorItemSaves.length}`);
        console.dir(configuratorItems);
        return configuratorItems;
    }
    catch (e) {
        // TODO: implement revert on failure
        console.error(`An error occurred: ${e}`);
        return undefined;
    }
}
exports.createConfiguratorTemplateItems = createConfiguratorTemplateItems;
async function createUpdateConfiguratorItems(spaceRef, configuratorTemplateItems) {
    try {
        if (configuratorTemplateItems.length <= 0)
            return undefined;
        const spaceItemsRef = spaceRef.collection("spaceItems");
        const configuratorItems = await Promise.all(configuratorTemplateItems.map(async (configuratorTemplateItem) => {
            const spaceItemRef = spaceItemsRef.doc(configuratorTemplateItem.itemTemplateId);
            const spaceItemDoc = await spaceItemsRef.doc(configuratorTemplateItem.itemTemplateId).get();
            const spaceItemData = spaceItemDoc.data();
            if (spaceItemDoc.exists && spaceItemData !== undefined) {
                // Update flow
                const existingItem = spaceItemData;
                const currentState = validateCurrentState(configuratorTemplateItem.schema, existingItem.currentState);
                const spaceItem = Object.assign(Object.assign({}, configuratorTemplateItem), { currentState });
                await spaceItemRef.update((0, utils_1.toFirestoreUpdateData)(spaceItem));
                console.log(`Configurator ${configuratorTemplateItem.itemTemplateId} created`);
                return spaceItem;
            }
            else {
                // Create flow
                const spaceItem = Object.assign(Object.assign({}, configuratorTemplateItem), { currentState: configuratorTemplateItem.schema.default });
                await spaceItemRef.create(spaceItem);
                console.log(`Configurator ${configuratorTemplateItem.itemTemplateId} updated`);
                return spaceItem;
            }
        }));
        return configuratorItems;
    }
    catch (e) {
        // TODO: implement revert on failure
        console.error(`An error occurred: ${e}`);
        return undefined;
    }
}
exports.createUpdateConfiguratorItems = createUpdateConfiguratorItems;
async function createUpdateBridgeToolkitSettingsTemplateItem(spaceTemplateRef, unrealProjectVersion) {
    var _a, _b, _c;
    try {
        const bridgeToolkitSettings = unrealProjectVersion.bridgeToolkitFileSettings;
        if (bridgeToolkitSettings === undefined || bridgeToolkitSettings === null)
            return undefined;
        const spaceTemplateItemsRef = spaceTemplateRef.collection("spaceTemplateItems");
        const spaceItem = {
            type: "BridgeToolkitSettings",
            itemTemplateId: "BridgeToolkitSettings",
            name: "BridgeToolkitSettings",
            denormalizeOnUpdate: true,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            offsetUpRotation: 0,
            data: {
                customCharacterClass: {
                    immutable: true,
                    value: (_a = bridgeToolkitSettings.customCharacterClass) !== null && _a !== void 0 ? _a : false,
                },
                configurator: {
                    immutable: true,
                    value: (_b = bridgeToolkitSettings.configurator) !== null && _b !== void 0 ? _b : false,
                },
                supportsMultiplayer: {
                    immutable: true,
                    value: (_c = bridgeToolkitSettings.supportsMultiplayer) !== null && _c !== void 0 ? _c : false,
                },
            },
        };
        const spaceTemplateItemRef = spaceTemplateItemsRef.doc(spaceItem.itemTemplateId);
        if ((await spaceTemplateItemRef.get()).exists) {
            await spaceTemplateItemRef.update((0, utils_1.toFirestoreUpdateData)(spaceItem));
            console.log(`BridgeToolkitSettings space template item updated: ${spaceTemplateItemRef.path}`);
        }
        else {
            await spaceTemplateItemRef.create(spaceItem);
            console.log(`BridgeToolkitSettings space template item created: ${spaceTemplateItemRef.path}`);
        }
        return spaceItem;
    }
    catch (e) {
        // TODO: implement revert on failure
        console.error(`An error occurred: ${e}`);
        return undefined;
    }
}
exports.createUpdateBridgeToolkitSettingsTemplateItem = createUpdateBridgeToolkitSettingsTemplateItem;
async function createUpdateBridgeToolkitSettingsItem(spaceRef, bridgeToolkitSettingsTemplateItem) {
    try {
        const spaceItemsRef = spaceRef.collection("spaceItems");
        const spaceItemRef = spaceItemsRef.doc(bridgeToolkitSettingsTemplateItem.itemTemplateId);
        if ((await spaceItemRef.get()).exists) {
            await spaceItemRef.update((0, utils_1.toFirestoreUpdateData)(bridgeToolkitSettingsTemplateItem));
            console.debug(`BridgeToolkitSettings space item updated: ${spaceItemRef.path}`);
        }
        else {
            await spaceItemRef.create(bridgeToolkitSettingsTemplateItem);
            console.debug(`BridgeToolkitSettings space item created: ${spaceItemRef.path}`);
        }
        return bridgeToolkitSettingsTemplateItem;
    }
    catch (e) {
        // TODO: implement revert on failure
        console.error(`An error occurred: ${e}`);
        return undefined;
    }
}
exports.createUpdateBridgeToolkitSettingsItem = createUpdateBridgeToolkitSettingsItem;
async function getAllExpirableUnrealProjectVersions(fromThirtyDaysAgo = true) {
    const thirtyDaysAgo = new Date(admin.firestore.Timestamp.now().toMillis() - (30 * 24 * 60 * 60000));
    const sevenDaysAgo = new Date(admin.firestore.Timestamp.now().toMillis() - (7 * 24 * 60 * 60000));
    const oldUPVs = fromThirtyDaysAgo === true ?
        await (0, firestore_1.getUnrealProjectVersionsCollectionGroup)([
            { fieldPath: "updated", opStr: ">=", value: admin.firestore.Timestamp.fromDate(thirtyDaysAgo) },
            { fieldPath: "updated", opStr: "<=", value: admin.firestore.Timestamp.fromDate(sevenDaysAgo) },
        ]) :
        await (0, firestore_1.getUnrealProjectVersionsCollectionGroup)([
            { fieldPath: "updated", opStr: "<=", value: admin.firestore.Timestamp.fromDate(sevenDaysAgo) },
        ]);
    if (oldUPVs === undefined || oldUPVs.length < 1)
        return [];
    const upvsToExpire = oldUPVs.flatMap((upvRef) => {
        const [upvDoc, upv] = upvRef;
        if (upvDoc === undefined || upv === undefined)
            return [];
        // This cannot be put in a .where clause because it is considered a second inequality clause
        if (upv.state !== undefined && (upv.state === "volume-copy-complete" || upv.state === "expired"))
            return [];
        return [upvRef];
    });
    return upvsToExpire;
}
exports.getAllExpirableUnrealProjectVersions = getAllExpirableUnrealProjectVersions;
async function expireUnrealProjectVersions(unrealProjectVersions) {
    if (unrealProjectVersions === undefined || unrealProjectVersions.length < 1)
        return [];
    const expiringUnrealProjectVersions = unrealProjectVersions.map(async ([upvDoc, upv]) => {
        var _a;
        if (upv === undefined || upvDoc === undefined)
            return undefined;
        const unrealProjectVersionId = upvDoc.id;
        const unrealProjectId = (_a = upvDoc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
        if (unrealProjectId === undefined) {
            console.log(`Could not find Unreal Project for version: ${unrealProjectVersionId}`);
            return undefined;
        }
        console.log(`Updating Unreal Project: ${unrealProjectId}, Version: ${unrealProjectVersionId} to 'expiring'...`);
        return (0, deploy_standard_1.updateUnrealProjectVersionState)({ unrealProjectId, unrealProjectVersionId, state: "expiring" });
    });
    return (await Promise.all(expiringUnrealProjectVersions)).flatMap((response) => response === undefined ? [] : [response]);
}
exports.expireUnrealProjectVersions = expireUnrealProjectVersions;
async function getLatestUnrealProjectVersion(unrealProjectId) {
    const unrealProjectVersions = await (0, firestore_1.getUnrealProjectVersions)(unrealProjectId, [{ fieldPath: "state", opStr: "==", value: "volume-copy-complete" }]);
    if (unrealProjectVersions == undefined)
        return undefined;
    const latestUnrealProjectVersion = unrealProjectVersions.flatMap(([doc, unrealProjectVersion]) => {
        if (doc == undefined || unrealProjectVersion == undefined)
            return [];
        return [{ unrealProjectId, doc, unrealProjectVersion }];
    }).sort((a, b) => a.unrealProjectVersion.created.toMillis() - b.unrealProjectVersion.created.toMillis())
        .pop();
    if (latestUnrealProjectVersion == undefined) {
        // console.warn(`Unreal Project: ${unrealProjectId} has no latest versions`);
        return undefined;
    }
    return latestUnrealProjectVersion;
}
exports.getLatestUnrealProjectVersion = getLatestUnrealProjectVersion;
function validateCurrentState(schema, currentState) {
    const currentValue = currentState;
    // If a current value is NOT set, use the default value
    if (currentValue === undefined)
        return schema.default;
    // If the type of the schema value has change, use the default value
    if (typeof currentValue !== typeof schema.default)
        return schema.default;
    /*
      From here on we know that the schema hasn't changed for this entry
      We will be performing validation for the different types
    */
    // Boolean
    // If the type is boolean, return early
    if (typeof currentValue === "boolean")
        return currentValue;
    // Enum
    // If there is a list of values (e.g. enum), and the current value does NOT appear in that list, return the default value
    const schemaValues = schema.values;
    if (schemaValues !== undefined && !schemaValues.includes(currentValue))
        return schema.default;
    // Number
    if (typeof currentValue === "number" && schema.max !== undefined && schema.min !== undefined && schema.step !== undefined) {
        // If the type is number, and it is outside of the numeric range given, return the default value
        if (currentValue > schema.max || currentValue < schema.min)
            return schema.default;
        // If the type is number, and it isn't inline with the step, return the default value
        if (currentValue - schema.min % schema.step !== 0)
            return schema.default;
    }
    // TODO: add more indepth validation
    // Use the current value
    return currentValue;
}
//# sourceMappingURL=shared.js.map