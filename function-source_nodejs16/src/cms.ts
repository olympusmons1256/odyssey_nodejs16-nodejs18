import {customRunWith, customRunWithDefinedMemory} from "./shared";
import * as shortUuid from "short-uuid";
import * as functions from "firebase-functions";
import {uploadFileUrlToCloudStorage} from "./lib/cloudStorage";
import {spaceItemWildcardPath, getSpaceRuntimeModel, getConfiguratorItem, getSpaceItemsRef, getSpaceRef, spaceTemplateItemWildcardPath, getDerivedSpacesRefWithSpaceTemplate} from "./lib/documents/firestore";
import {createUpdateConfiguratorItems} from "./lib/unrealProjects/shared";
import {Configurator, SpaceItemType} from "./lib/cmsDocTypes";
import {SpaceItem} from "./api/organizations/item.entity";

const onCreateRuntimeModelUpdateModelUrl =
// onCreate() RuntimeModel
// if model has temp URL, download file, upload to storage, update url
functions
  .runWith(customRunWithDefinedMemory("512MB"))
  .firestore
  .document(spaceItemWildcardPath())
  .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId : string = context.params.organizationId;
    const spaceId : string = context.params.spaceId;
    const spaceItemId : string = context.params.spaceItemId;

    const [newSpaceItemDoc, newSpaceItem] = await getSpaceRuntimeModel(organizationId, spaceId, spaceItemId);
    if (newSpaceItem == undefined || newSpaceItemDoc == undefined || newSpaceItemDoc.exists == false) {
      return console.error("ERROR: Unable to get newest space item");
    }

    if (!newSpaceItem.sketchfabTempUrl) {
      return console.log("Temp URL does not exist for newly created model");
    }

    if (newSpaceItem.gltfUrl !== "") {
      return console.log("Model already has gltfUrl");
    }
    const fileName = `${shortUuid().new()}.glb`;
    const gltfUrl = await uploadFileUrlToCloudStorage(newSpaceItem.sketchfabTempUrl, `/user-uploaded/${organizationId}/models`, fileName)
      .catch((err: any)=> {
        console.error(err);
        return undefined;
      });

    if (!gltfUrl) {
      console.error("ERROR: There was an error generating model URL, deleting");
      return await newSpaceItemDoc.ref.delete();
    }

    return await newSpaceItemDoc.ref.update({gltfUrl});
  });

const newSpaceConfiguratorItemDefineDefaultValue =
      // onCreate() of new spaceItem
      // define default value
      functions
        .runWith(customRunWith)
        .firestore
        .document(spaceItemWildcardPath())
        .onCreate(async (snapshot, context) => {
          console.log("Document context:");
          console.log(JSON.stringify(context));
          console.log("Document data:");
          console.log(JSON.stringify(snapshot.data()));
          const organizationId : string = context.params.organizationId;
          const spaceId : string = context.params.spaceId;
          const spaceItemId : string = context.params.spaceItemId;
          const [newSpaceItemDoc, newSpaceItem] = await getConfiguratorItem(organizationId, spaceId, spaceItemId);

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

          return await newSpaceItemDoc?.ref.update({currentState: newSpaceItem.schema.default});
        });

const newSpaceItemIncrementCount =
    // onCreate() of new spaceItem
    // Increment spaceItemSum by 1
    functions
      .runWith(customRunWith)
      .firestore
      .document(spaceItemWildcardPath())
      .onCreate(async (snapshot, context) => {
        console.log("Document context:");
        console.log(JSON.stringify(context));
        console.log("Document data:");
        console.log(JSON.stringify(snapshot.data()));
        const organizationId : string = context.params.organizationId;
        const spaceId : string = context.params.spaceId;
        const spaceItemSum = (await getSpaceItemsRef(organizationId, spaceId).where("type", "not-in", ["BridgeToolkitSettings", "Configurator"]).get()).docs.filter((doc) => doc.exists).length;
        console.debug("Setting space item count: ", spaceItemSum);
        return await getSpaceRef(organizationId, spaceId).update({spaceItemSum});
      });

const deletedSpaceItemIncrementCount =
  // onDelete() of new spaceItem
  // Decrement spaceItemSum by 1
  functions
    .runWith(customRunWith)
    .firestore
    .document(spaceItemWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId : string = context.params.organizationId;
      const spaceId : string = context.params.spaceId;
      const spaceItemSum = (await getSpaceItemsRef(organizationId, spaceId).get()).docs.filter((doc) => doc.exists).length;
      console.debug("Setting space item count: ", spaceItemSum);
      return await getSpaceRef(organizationId, spaceId).update({spaceItemSum});
    });

function getSpaceItemTypeFromChange(previousState?: SpaceItem, currentState?: SpaceItem): SpaceItemType | undefined {
  if (previousState === undefined && currentState === undefined) return undefined;
  if (previousState === undefined && currentState !== undefined) return currentState.type;
  if (previousState !== undefined && currentState === undefined) return previousState.type;
  if (previousState !== undefined && currentState !== undefined && previousState.type !== currentState.type) return undefined;
  if (previousState !== undefined && currentState !== undefined && previousState.type === currentState.type) return previousState.type;

  console.log("This should have been unreachable...");
  console.debug(previousState);
  console.debug(currentState);
  return undefined;
}

const writeSpaceTemplateItemChanges =
  functions
    .firestore
    .document(spaceTemplateItemWildcardPath())
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

      const previousSpaceItem = previousState as SpaceItem | undefined;
      const currentSpaceItem = currentState as SpaceItem | undefined;

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
          const spaceTemplateId: string = context.params.spaceTemplateId;
          const derivedSpaces = (await getDerivedSpacesRefWithSpaceTemplate(spaceTemplateId).get()).docs;
          if (derivedSpaces === undefined || derivedSpaces.length <= 0) {
            console.log(`No spaces derived from template ${spaceTemplateId}`);
            return;
          }

          if (previousState === undefined && currentState !== undefined) {
            // Create case
            const currentConfigurator = currentState as Configurator;
            const createdSpaceItems = await Promise.all(derivedSpaces.map((space) => createUpdateConfiguratorItems(space.ref, [currentConfigurator])));
            const successfulSpaceItems = createdSpaceItems.flatMap((spaceItem) => typeof spaceItem === "undefined" ? [] : spaceItem);
            if (successfulSpaceItems.length !== derivedSpaces.length) {
              // TODO: implement revert on failure
              console.debug(`${derivedSpaces.length - successfulSpaceItems.length} configurator space items failed to create`);
            }
          }
          if (previousState !== undefined && currentState !== undefined) {
            // Update case
            const currentConfigurator = currentState as Configurator;
            const updatedSpaceItems = await Promise.all(derivedSpaces.map((space) => createUpdateConfiguratorItems(space.ref, [currentConfigurator])));
            const successfulSpaceItems = updatedSpaceItems.flatMap((spaceItem) => typeof spaceItem === "undefined" ? [] : spaceItem);
            if (successfulSpaceItems.length !== derivedSpaces.length) {
              // TODO: implement revert on failure
              console.debug(`${derivedSpaces.length - successfulSpaceItems.length} configurator space items failed to update`);
            }
          }
          if (previousState !== undefined && currentState === undefined) {
            // Delete case
            const previousConfigurator = previousState as Configurator;
            const deletedSpaceItems = await Promise.all(derivedSpaces.map(async (space) => {
              try {
                const docRef = await space.ref.collection("spaceItems").doc(previousConfigurator.itemTemplateId).get();
                if (docRef.exists) {
                  await space.ref.collection("spaceItems").doc(previousConfigurator.itemTemplateId).delete();
                }
                return true;
              } catch (e: any) {
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

export const writes = {
  writeSpaceTemplateItemChanges,
};

export const creates = {
  onCreateRuntimeModelUpdateModelUrl,
  newSpaceConfiguratorItemDefineDefaultValue,
  newSpaceItemIncrementCount,
};
export const deletes = {
  deletedSpaceItemIncrementCount,
};
