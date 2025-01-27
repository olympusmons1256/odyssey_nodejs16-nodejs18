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
exports.deletes = exports.creates = exports.writes = void 0;
const shared_1 = require("./shared");
const uuid_1 = require("uuid");
const functions = __importStar(require("firebase-functions"));
const cloudStorage_1 = require("./lib/cloudStorage");
const firestore_1 = require("./lib/documents/firestore");
const shared_2 = require("./lib/unrealProjects/shared");
const onCreateRuntimeModelUpdateModelUrl = 
// onCreate() RuntimeModel
// if model has temp URL, download file, upload to storage, update url
functions
    .runWith((0, shared_1.customRunWithDefinedMemory)("512MB"))
    .firestore
    .document((0, firestore_1.spaceItemWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    const spaceItemId = context.params.spaceItemId;
    const [newSpaceItemDoc, newSpaceItem] = await (0, firestore_1.getSpaceRuntimeModel)(organizationId, spaceId, spaceItemId);
    if (newSpaceItem == undefined || newSpaceItemDoc == undefined || newSpaceItemDoc.exists == false) {
        return console.error("ERROR: Unable to get newest space item");
    }
    if (!newSpaceItem.sketchfabTempUrl) {
        return console.log("Temp URL does not exist for newly created model");
    }
    if (newSpaceItem.gltfUrl !== "") {
        return console.log("Model already has gltfUrl");
    }
    const fileName = `${(0, uuid_1.v4)()}.glb`;
    const gltfUrl = await (0, cloudStorage_1.uploadFileUrlToCloudStorage)(newSpaceItem.sketchfabTempUrl, `/user-uploaded/${organizationId}/models`, fileName)
        .catch((err) => {
        console.error(err);
        return undefined;
    });
    if (!gltfUrl) {
        console.error("ERROR: There was an error generating model URL, deleting");
        return await newSpaceItemDoc.ref.delete();
    }
    return await newSpaceItemDoc.ref.update({ gltfUrl });
});
const newSpaceConfiguratorItemDefineDefaultValue = 
// onCreate() of new spaceItem
// define default value
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceItemWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    const spaceItemId = context.params.spaceItemId;
    const [newSpaceItemDoc, newSpaceItem] = await (0, firestore_1.getConfiguratorItem)(organizationId, spaceId, spaceItemId);
    if (!newSpaceItem || !newSpaceItemDoc || !newSpaceItemDoc.exists) {
        console.error("Item was not found");
        return;
    }
    if (newSpaceItem.type != "Configurator") {
        console.error("Space item is not of type configurator - return");
        return;
    }
    if (newSpaceItem.currentState != undefined) {
        console.error("Current state is already defined - return");
        return;
    }
    if (newSpaceItem.schema.default == undefined) {
        console.error("Default state is not defined - return");
        return;
    }
    return await (newSpaceItemDoc === null || newSpaceItemDoc === void 0 ? void 0 : newSpaceItemDoc.ref.update({ currentState: newSpaceItem.schema.default }));
});
const newSpaceItemIncrementCount = 
// onCreate() of new spaceItem
// Increment spaceItemSum by 1
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceItemWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    const spaceItemSum = (await (0, firestore_1.getSpaceItemsRef)(organizationId, spaceId).where("type", "not-in", ["BridgeToolkitSettings", "Configurator"]).get()).docs.filter((doc) => doc.exists).length;
    console.debug("Setting space item count: ", spaceItemSum);
    return await (0, firestore_1.getSpaceRef)(organizationId, spaceId).update({ spaceItemSum });
});
const deletedSpaceItemIncrementCount = 
// onDelete() of new spaceItem
// Decrement spaceItemSum by 1
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.spaceItemWildcardPath)())
    .onDelete(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const spaceId = context.params.spaceId;
    const spaceItemSum = (await (0, firestore_1.getSpaceItemsRef)(organizationId, spaceId).get()).docs.filter((doc) => doc.exists).length;
    console.debug("Setting space item count: ", spaceItemSum);
    return await (0, firestore_1.getSpaceRef)(organizationId, spaceId).update({ spaceItemSum });
});
function getSpaceItemTypeFromChange(previousState, currentState) {
    if (previousState === undefined && currentState === undefined)
        return undefined;
    if (previousState === undefined && currentState !== undefined)
        return currentState.type;
    if (previousState !== undefined && currentState === undefined)
        return previousState.type;
    if (previousState !== undefined && currentState !== undefined && previousState.type !== currentState.type)
        return undefined;
    if (previousState !== undefined && currentState !== undefined && previousState.type === currentState.type)
        return previousState.type;
    console.log("This should have been unreachable...");
    console.debug(previousState);
    console.debug(currentState);
    return undefined;
}
const writeSpaceTemplateItemChanges = functions
    .firestore
    .document((0, firestore_1.spaceTemplateItemWildcardPath)())
    .onWrite(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    const previousState = change.before.data();
    console.debug("Document data before:");
    console.debug(JSON.stringify(previousState));
    const currentState = change.after.data();
    console.debug("Document data after:");
    console.debug(JSON.stringify(currentState));
    if (previousState === undefined && currentState === undefined) {
        // Should not be possible, but exit if it does occur
        console.error("No state available");
        return;
    }
    const previousSpaceItem = previousState;
    const currentSpaceItem = currentState;
    switch (getSpaceItemTypeFromChange(previousSpaceItem, currentSpaceItem)) {
        case undefined: {
            console.error("Invalid space item change");
            // TODO: implement reversion
            return;
        }
        case "BridgeToolkitSettings": // This should only be able to be mutated at buildtime
        case "RuntimeModel":
        case "SpatialMedia":
        case "LibraryModel":
        case "RuntimeStream": {
            console.log("On write template updates not supported");
            return;
        }
        case "Configurator": {
            // Get derived spaces of parent
            const spaceTemplateId = context.params.spaceTemplateId;
            const derivedSpaces = (await (0, firestore_1.getDerivedSpacesRefWithSpaceTemplate)(spaceTemplateId).get()).docs;
            if (derivedSpaces === undefined || derivedSpaces.length <= 0) {
                console.log(`No spaces derived from template ${spaceTemplateId}`);
                return;
            }
            if (previousState === undefined && currentState !== undefined) {
                // Create case
                const currentConfigurator = currentState;
                const createdSpaceItems = await Promise.all(derivedSpaces.map((space) => (0, shared_2.createUpdateConfiguratorItems)(space.ref, [currentConfigurator])));
                const successfulSpaceItems = createdSpaceItems.flatMap((spaceItem) => typeof spaceItem === "undefined" ? [] : spaceItem);
                if (successfulSpaceItems.length !== derivedSpaces.length) {
                    // TODO: implement revert on failure
                    console.debug(`${derivedSpaces.length - successfulSpaceItems.length} configurator space items failed to create`);
                }
            }
            if (previousState !== undefined && currentState !== undefined) {
                // Update case
                const currentConfigurator = currentState;
                const updatedSpaceItems = await Promise.all(derivedSpaces.map((space) => (0, shared_2.createUpdateConfiguratorItems)(space.ref, [currentConfigurator])));
                const successfulSpaceItems = updatedSpaceItems.flatMap((spaceItem) => typeof spaceItem === "undefined" ? [] : spaceItem);
                if (successfulSpaceItems.length !== derivedSpaces.length) {
                    // TODO: implement revert on failure
                    console.debug(`${derivedSpaces.length - successfulSpaceItems.length} configurator space items failed to update`);
                }
            }
            if (previousState !== undefined && currentState === undefined) {
                // Delete case
                const previousConfigurator = previousState;
                const deletedSpaceItems = await Promise.all(derivedSpaces.map(async (space) => {
                    try {
                        const docRef = await space.ref.collection("spaceItems").doc(previousConfigurator.itemTemplateId).get();
                        if (docRef.exists) {
                            await space.ref.collection("spaceItems").doc(previousConfigurator.itemTemplateId).delete();
                        }
                        return true;
                    }
                    catch (e) {
                        console.error(`Failed to delete configurator space item for space: ${space.id}`);
                        return undefined;
                    }
                }));
                const successfulSpaceItems = deletedSpaceItems.flatMap((spaceItem) => typeof spaceItem === "undefined" ? [] : spaceItem);
                if (successfulSpaceItems.length !== derivedSpaces.length) {
                    // TODO: implement revert on failure
                    console.debug(`${derivedSpaces.length - successfulSpaceItems.length} configurator space items failed to update`);
                }
            }
        }
    }
});
exports.writes = {
    writeSpaceTemplateItemChanges,
};
exports.creates = {
    onCreateRuntimeModelUpdateModelUrl,
    newSpaceConfiguratorItemDefineDefaultValue,
    newSpaceItemIncrementCount,
};
exports.deletes = {
    deletedSpaceItemIncrementCount,
};
//# sourceMappingURL=cms.js.map