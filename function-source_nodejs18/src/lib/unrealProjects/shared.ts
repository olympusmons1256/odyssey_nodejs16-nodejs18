// @ts-nocheck
import * as admin from "firebase-admin";
import {BridgeToolkitSettings, Configurator, ConfiguratorSchema, ConfiguratorType, OrgSpace} from "../cmsDocTypes";
import {BridgeToolkitFileConfiguratorType, UnrealProject, UnrealProjectVersion} from "../docTypes";
import {getConfigurationUnrealProjectVersionRef, GetFirestoreDocResult, getUnrealProject, getUnrealProjectVersion, getUnrealProjectVersions, getUnrealProjectVersionsCollectionGroup, getUnrealProjectVersionsRef} from "../documents/firestore";
import {projectToEnvName} from "../firebase";
import {ConfigurationUnrealProjectVersion} from "../systemDocTypes";
import {updateUnrealProjectVersionState} from "./deploy-standard";
import { toFirestoreUpdateData } from "../utils";

export function getUnrealProjectName(unrealProject?: UnrealProject, unrealProjectVersion?: UnrealProjectVersion) {
  if (unrealProjectVersion?.name !== undefined) return unrealProjectVersion.name;
  if (unrealProject?.name !== undefined) return unrealProject.name;

  console.log("Project name could not be found");
  return undefined;
}

export async function getConfigurationUnrealProjectVersion(options: {organizationId? : string, unrealProjectId?: string, unrealProjectVersionId?: string, authorUserId?: string}) : Promise<ConfigurationUnrealProjectVersion | undefined> {
  async function getConfiguration(docRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>) : Promise<ConfigurationUnrealProjectVersion | undefined> {
    const configurationDoc = await docRef.get();
    if (configurationDoc.exists) {
      return configurationDoc.data() as ConfigurationUnrealProjectVersion;
    } else {
      return undefined;
    }
  }

  const configurationSources = [
    getConfigurationUnrealProjectVersionRef({location: "root"}),
    options.organizationId && getConfigurationUnrealProjectVersionRef({location: "organization", organizationId: options.organizationId}),
    options.authorUserId && getConfigurationUnrealProjectVersionRef({location: "authorUser", userId: options.authorUserId}),
    options.unrealProjectId && getConfigurationUnrealProjectVersionRef({location: "unrealProject", unrealProjectId: options.unrealProjectId}),
    (options.unrealProjectId && options.unrealProjectVersionId) && getConfigurationUnrealProjectVersionRef({location: "unrealProjectVersion", unrealProjectId: options.unrealProjectId, unrealProjectVersionId: options.unrealProjectVersionId}),
  ].flatMap((o) => (o == "" || o == undefined) ? [] : o);

  return await configurationSources.reduce<Promise<ConfigurationUnrealProjectVersion | undefined>>(async (acc, docRef) => {
    const result = await getConfiguration(docRef);
    if (result == undefined) {
      console.log(`Configuration document ${docRef.path} doesn't exist`);
      return await acc;
    } else {
      const accResolved = await acc;
      if (accResolved == undefined) {
        console.log(`Setting configuration from ${docRef.path}`);
        return result;
      } else {
        console.log(`Merging configuration from ${docRef.path} with existing`);
        return {...accResolved, ...result};
      }
    }
  }, Promise.resolve(undefined));
}

export function formatUnrealProjectVersionBuildPodName(unrealProjectVersionId: string) {
  return "ue-project-version-build-" + unrealProjectVersionId.toLowerCase();
}

export function formatUnrealProjectVersionVolumeCopyPodName(unrealProjectVersionId: string, region: string) {
  return ("ue-project-version-volume-copy-" + unrealProjectVersionId + "-" + region).toLowerCase();
}

export function formatBuilderConfigMapName(projectId: string) {
  const envName = projectToEnvName(projectId);
  if (envName == undefined) return undefined;
  return "unreal-project-version-builder-" + envName;
}

export function formatVolumeCopyConfigMapName(projectId: string) {
  const envName = projectToEnvName(projectId);
  if (envName == undefined) return undefined;
  return "unreal-project-version-volume-copy-" + envName;
}

export function formatPackageValidatorConfigMapName(projectId: string) {
  const envName = projectToEnvName(projectId);
  if (envName == undefined) return undefined;
  return "unreal-project-version-package-validator-" + envName;
}

export function formatUnrealProjectVersionPackageValidatorPodName(unrealProjectVersionId: string) {
  return ("ue-project-version-package-validator-" + unrealProjectVersionId).toLowerCase();
}

export function formatUnrealProjectVersionClaimName(unrealProjectVersionId: string, region: string) {
  return ("ue-project-version-" + unrealProjectVersionId + "-" + region).toLowerCase();
}

export function formatSharedDdcClaimName(region: string) {
  return ("unreal-shared-ddc-" + region).toLowerCase();
}

export function formatPluginVersionClaimName(pluginVersionId: string, region: string) {
  return ("plugin-version-" + pluginVersionId.replace(new RegExp("_", "g"), "-") + "-" + region).toLowerCase();
}

export type ResolvedSpaceUnrealProjectVersion =
  undefined |
  {
    unrealProjectId: string;
    unrealProject: UnrealProject;
    unrealProjectVersionId: string;
    unrealProjectVersion: UnrealProjectVersion;
  }

export async function resolveSpaceUnrealProjectVersion(space: OrgSpace) : Promise<"not-found" | ResolvedSpaceUnrealProjectVersion> {
  try {
    if (space.unrealProject == undefined) return undefined;
    const [, unrealProject] = await getUnrealProject(space.unrealProject.unrealProjectId);
    if (unrealProject == undefined) return "not-found";
    if (space.unrealProject.unrealProjectVersionId == undefined || space.unrealProject.unrealProjectVersionId == "latest") {
      const latestUnrealProjectVersionId =
                (await getUnrealProjectVersionsRef(space.unrealProject.unrealProjectId)
                  .where("state", "==", "volume-copy-complete")
                  .orderBy("updated", "desc")
                  .limit(1)
                  .get())
                  .docs.pop()?.id;
      console.debug({latestUnrealProjectVersionId});
      if (latestUnrealProjectVersionId == undefined) return "not-found";
      const [, unrealProjectVersion] = await getUnrealProjectVersion(space.unrealProject.unrealProjectId, latestUnrealProjectVersionId);
      console.debug({unrealProjectVersion});
      if (unrealProjectVersion == undefined) return "not-found";
      return {unrealProject, unrealProjectId: space.unrealProject.unrealProjectId, unrealProjectVersionId: latestUnrealProjectVersionId, unrealProjectVersion};
    } else {
      const [, unrealProjectVersion] = await getUnrealProjectVersion(space.unrealProject.unrealProjectId, space.unrealProject.unrealProjectVersionId);
      console.debug({unrealProjectVersion});
      if (unrealProjectVersion == undefined) return "not-found";
      return {unrealProject, unrealProjectId: space.unrealProject.unrealProjectId, unrealProjectVersionId: space.unrealProject.unrealProjectVersionId, unrealProjectVersion};
    }
  } catch (e: any) {
    console.error(e);
    return "not-found";
  }
}

function stringCoordinateToVector3(coordinateString?: string) {
  // Location = "X=000.000 Y=000.000 Z=000.000"
  if (coordinateString === undefined) return undefined;
  const coordinateArray = coordinateString.split(" ");
  if (coordinateArray.length !== 3) return undefined;
  const xString = coordinateArray.find((coordinate) => coordinate.includes("X="));
  const yString = coordinateArray.find((coordinate) => coordinate.includes("Y="));
  const zString = coordinateArray.find((coordinate) => coordinate.includes("Z="));
  if (xString === undefined || yString === undefined || zString === undefined) return undefined;
  const coordinateRegex = /^.+=/; // Get all characters before, and including, the first `=` character
  const x = Number(xString.replace(coordinateRegex, ""));
  const y = Number(yString.replace(coordinateRegex, ""));
  const z = Number(zString.replace(coordinateRegex, ""));
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
    console.error("Invalid numeric");
    console.debug(x, y, z);
    return undefined;
  }
  return {x, y, z};
}

function bridgeToolkitConfiguratorTypeToConfiguratorType(toolkitType: BridgeToolkitFileConfiguratorType): ConfiguratorType {
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

function getBridgeToolkitSettingsConfigurators(unrealProjectVersion: UnrealProjectVersion) {
  try {
    const settingsFile = unrealProjectVersion.bridgeToolkitFileSettings;
    if (settingsFile === undefined || settingsFile === null) return undefined;

    const levelSettingsConfigurators = Object.entries(settingsFile.levels)
      .flatMap(([levelFilePath, levelSettings]) => levelSettings.configurator !== undefined ? {levelFilePath, configurator: levelSettings.configurator} : []);

    return levelSettingsConfigurators;
  } catch (e: any) {
    console.error(`An error occurred: ${e}`);
    return undefined;
  }
}

export async function createConfiguratorTemplateItems(spaceTemplateRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, unrealProjectVersion: UnrealProjectVersion) {
  try {
    const upvConfigurators = getBridgeToolkitSettingsConfigurators(unrealProjectVersion);
    if (upvConfigurators === undefined || upvConfigurators === null || upvConfigurators.length <= 0) return undefined;

    const spaceTemplateItemsRef = spaceTemplateRef.collection("spaceTemplateItems");

    const configuratorItems = upvConfigurators.flatMap((configuratorItems) => configuratorItems.configurator.stateConfigurables
      .map((configuratorState) => {
        const spaceItem: Configurator = {
          type: "Configurator",
          denormalizeOnUpdate: true,
          levelFilePath: configuratorItems.levelFilePath,
          position: stringCoordinateToVector3(configuratorItems.configurator.location) ?? {x: 0, y: 0, z: 0},
          rotation: {x: 0, y: 0, z: 0},
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
        await spaceTemplateItemsRef.doc(configurator.itemTemplateId).update(toFirestoreUpdateData(configurator));
        console.log(`Configurator ${configurator.itemTemplateId} updated`);
      } else {
        await spaceTemplateItemsRef.doc(configurator.itemTemplateId).create(configurator);
        console.log(`Configurator ${configurator.itemTemplateId} created`);
      }
    }));
    console.debug(`Saved/Updated configurator requests: ${configuratorItemSaves.length}`);
    console.dir(configuratorItems);

    return configuratorItems;
  } catch (e: any) {
    // TODO: implement revert on failure
    console.error(`An error occurred: ${e}`);
    return undefined;
  }
}

export async function createUpdateConfiguratorItems(spaceRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, configuratorTemplateItems: Configurator[]) {
  try {
    if (configuratorTemplateItems.length <= 0) return undefined;
    const spaceItemsRef = spaceRef.collection("spaceItems");

    const configuratorItems = await Promise.all(configuratorTemplateItems.map(async (configuratorTemplateItem) => {
      const spaceItemRef = spaceItemsRef.doc(configuratorTemplateItem.itemTemplateId);
      const spaceItemDoc = await spaceItemsRef.doc(configuratorTemplateItem.itemTemplateId).get();
      const spaceItemData = spaceItemDoc.data();
      if (spaceItemDoc.exists && spaceItemData !== undefined) {
        // Update flow
        const existingItem = spaceItemData as Configurator;
        const currentState = validateCurrentState(configuratorTemplateItem.schema, existingItem.currentState);
        const spaceItem: Configurator = {
          ...configuratorTemplateItem,
          currentState,
        };
        await spaceItemRef.update(toFirestoreUpdateData(spaceItem));
        console.log(`Configurator ${configuratorTemplateItem.itemTemplateId} created`);

        return spaceItem;
      } else {
        // Create flow
        const spaceItem: Configurator = {
          ...configuratorTemplateItem,
          currentState: configuratorTemplateItem.schema.default,
        };
        await spaceItemRef.create(spaceItem);
        console.log(`Configurator ${configuratorTemplateItem.itemTemplateId} updated`);

        return spaceItem;
      }
    }));

    return configuratorItems;
  } catch (e: any) {
    // TODO: implement revert on failure
    console.error(`An error occurred: ${e}`);
    return undefined;
  }
}

export async function createUpdateBridgeToolkitSettingsTemplateItem(spaceTemplateRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, unrealProjectVersion: UnrealProjectVersion) {
  try {
    const bridgeToolkitSettings = unrealProjectVersion.bridgeToolkitFileSettings;
    if (bridgeToolkitSettings === undefined || bridgeToolkitSettings === null) return undefined;

    const spaceTemplateItemsRef = spaceTemplateRef.collection("spaceTemplateItems");

    const spaceItem: BridgeToolkitSettings = {
      type: "BridgeToolkitSettings",
      itemTemplateId: "BridgeToolkitSettings",
      name: "BridgeToolkitSettings",
      denormalizeOnUpdate: true,
      position: {x: 0, y: 0, z: 0},
      rotation: {x: 0, y: 0, z: 0},
      offsetUpRotation: 0,
      data: {
        customCharacterClass: {
          immutable: true,
          value: bridgeToolkitSettings.customCharacterClass ?? false,
        },
        configurator: {
          immutable: true,
          value: bridgeToolkitSettings.configurator ?? false,
        },
        supportsMultiplayer: {
          immutable: true,
          value: bridgeToolkitSettings.supportsMultiplayer ?? false,
        },
      },
    };

    const spaceTemplateItemRef = spaceTemplateItemsRef.doc(spaceItem.itemTemplateId);

    if ((await spaceTemplateItemRef.get()).exists) {
      await spaceTemplateItemRef.update(toFirestoreUpdateData(spaceItem));
      console.log(`BridgeToolkitSettings space template item updated: ${spaceTemplateItemRef.path}`);
    } else {
      await spaceTemplateItemRef.create(spaceItem);
      console.log(`BridgeToolkitSettings space template item created: ${spaceTemplateItemRef.path}`);
    }

    return spaceItem;
  } catch (e: any) {
    // TODO: implement revert on failure
    console.error(`An error occurred: ${e}`);
    return undefined;
  }
}

export async function createUpdateBridgeToolkitSettingsItem(spaceRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, bridgeToolkitSettingsTemplateItem: BridgeToolkitSettings) {
  try {
    const spaceItemsRef = spaceRef.collection("spaceItems");

    const spaceItemRef = spaceItemsRef.doc(bridgeToolkitSettingsTemplateItem.itemTemplateId);
    if ((await spaceItemRef.get()).exists) {
      await spaceItemRef.update(toFirestoreUpdateData(bridgeToolkitSettingsTemplateItem));
      console.debug(`BridgeToolkitSettings space item updated: ${spaceItemRef.path}`);
    } else {
      await spaceItemRef.create(bridgeToolkitSettingsTemplateItem);
      console.debug(`BridgeToolkitSettings space item created: ${spaceItemRef.path}`);
    }

    return bridgeToolkitSettingsTemplateItem;
  } catch (e: any) {
    // TODO: implement revert on failure
    console.error(`An error occurred: ${e}`);
    return undefined;
  }
}

export async function getAllExpirableUnrealProjectVersions(fromThirtyDaysAgo = true) {
  const thirtyDaysAgo = new Date(admin.firestore.Timestamp.now().toMillis() - (30 * 24 * 60 * 60000));
  const sevenDaysAgo = new Date(admin.firestore.Timestamp.now().toMillis() - (7 * 24 * 60 * 60000));

  const oldUPVs = fromThirtyDaysAgo === true ?
    await getUnrealProjectVersionsCollectionGroup([
      {fieldPath: "updated", opStr: ">=", value: admin.firestore.Timestamp.fromDate(thirtyDaysAgo)},
      {fieldPath: "updated", opStr: "<=", value: admin.firestore.Timestamp.fromDate(sevenDaysAgo)},
    ]) :
    await getUnrealProjectVersionsCollectionGroup([
      {fieldPath: "updated", opStr: "<=", value: admin.firestore.Timestamp.fromDate(sevenDaysAgo)},
    ]);

  if (oldUPVs === undefined || oldUPVs.length < 1) return [];

  const upvsToExpire = oldUPVs.flatMap((upvRef) => {
    const [upvDoc, upv] = upvRef;
    if (upvDoc === undefined || upv === undefined) return [];
    // This cannot be put in a .where clause because it is considered a second inequality clause
    if (upv.state !== undefined && (upv.state === "volume-copy-complete" || upv.state === "expired")) return [];
    return [upvRef];
  });

  return upvsToExpire;
}

export async function expireUnrealProjectVersions(unrealProjectVersions: GetFirestoreDocResult<UnrealProjectVersion>[]) {
  if (unrealProjectVersions === undefined || unrealProjectVersions.length < 1) return [];
  const expiringUnrealProjectVersions = unrealProjectVersions.map(async ([upvDoc, upv]) => {
    if (upv === undefined || upvDoc === undefined) return undefined;

    const unrealProjectVersionId = upvDoc.id;
    const unrealProjectId = upvDoc.ref.parent.parent?.id;
    if (unrealProjectId === undefined) {
      console.log(`Could not find Unreal Project for version: ${unrealProjectVersionId}`);
      return undefined;
    }
    console.log(`Updating Unreal Project: ${unrealProjectId}, Version: ${unrealProjectVersionId} to 'expiring'...`);
    return updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "expiring"});
  });
  return (await Promise.all(expiringUnrealProjectVersions)).flatMap((response) => response === undefined ? [] : [response]);
}

export async function getLatestUnrealProjectVersion(unrealProjectId: string) {
  const unrealProjectVersions = await getUnrealProjectVersions(unrealProjectId, [{fieldPath: "state", opStr: "==", value: "volume-copy-complete"}]);
  if (unrealProjectVersions == undefined) return undefined;
  const latestUnrealProjectVersion = unrealProjectVersions.flatMap(([doc, unrealProjectVersion]) => {
    if (doc == undefined || unrealProjectVersion == undefined) return [];
    return [{unrealProjectId, doc, unrealProjectVersion}];
  }).sort((a, b) => a.unrealProjectVersion.created.toMillis() - b.unrealProjectVersion.created.toMillis())
    .pop();
  if (latestUnrealProjectVersion == undefined) {
    // console.warn(`Unreal Project: ${unrealProjectId} has no latest versions`);
    return undefined;
  }

  return latestUnrealProjectVersion;
}

function validateCurrentState(schema: ConfiguratorSchema, currentState?: number | string | boolean) {
  const currentValue = currentState;
  // If a current value is NOT set, use the default value
  if (currentValue === undefined) return schema.default;
  // If the type of the schema value has change, use the default value
  if (typeof currentValue !== typeof schema.default) return schema.default;

  /*
    From here on we know that the schema hasn't changed for this entry
    We will be performing validation for the different types
  */

  // Boolean
  // If the type is boolean, return early
  if (typeof currentValue === "boolean") return currentValue;

  // Enum
  // If there is a list of values (e.g. enum), and the current value does NOT appear in that list, return the default value
  const schemaValues = schema.values;
  if (schemaValues !== undefined && !schemaValues.includes(currentValue)) return schema.default;

  // Number
  if (typeof currentValue === "number" && schema.max !== undefined && schema.min !== undefined && schema.step !== undefined) {
    // If the type is number, and it is outside of the numeric range given, return the default value
    if (currentValue > schema.max || currentValue < schema.min) return schema.default;
    // If the type is number, and it isn't inline with the step, return the default value
    if (currentValue - schema.min % schema.step !== 0) return schema.default;
  }

  // TODO: add more indepth validation

  // Use the current value
  return currentValue;
}
