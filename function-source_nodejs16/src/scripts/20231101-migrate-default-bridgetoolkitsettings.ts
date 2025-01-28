import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import {isEqual as lIsEqual} from "lodash";

import {BridgeToolkitFileSettings, OldBridgeToolkitFileSettings, UnrealProjectVersion} from "../lib/docTypes";
import {timeChunkedOperation} from "../lib/misc";


interface Update {
  doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
  update?: any
}

(async () => {
  const upvs = (await admin.firestore().collectionGroup("unrealProjectVersions").where("state", "==", "volume-copy-complete").get()).docs;
  console.debug(`Got ${upvs.length} UPVs`);
  const upvsToUpdate : Update[] = upvs.map((doc) => {
    const upv = doc.data() as UnrealProjectVersion;
    const oldBridgeToolkitFileSettings = upv.bridgeToolkitFileSettings as OldBridgeToolkitFileSettings | undefined;
    const bridgeToolkitFileSettings = (() => {
      // Legacy projects
      if (oldBridgeToolkitFileSettings === undefined) {
        console.debug(`${doc.ref.path}: Legacy project with no bridgeToolkitFileSettings`);
        return {
          levels: {},
          configurator: true,
          supportsMultiplayer: true,
          customCharacterClass: false,
        } as BridgeToolkitFileSettings;
      }
      if (oldBridgeToolkitFileSettings.customCharacterClass === undefined &&
          oldBridgeToolkitFileSettings.supportsMultiplayer === undefined &&
          oldBridgeToolkitFileSettings.pixelstreamingOnly === undefined &&
          oldBridgeToolkitFileSettings.levels === undefined
      ) {
        console.debug(`${doc.ref.path}: Legacy project with old levels schema`);
        return {
          levels: {...oldBridgeToolkitFileSettings},
          configurator: true,
          supportsMultiplayer: true,
          customCharacterClass: false,
        } as BridgeToolkitFileSettings;
      }
      // Defunct pixelstreamingOnly
      if (oldBridgeToolkitFileSettings.pixelstreamingOnly === true) {
        console.debug(`${doc.ref.path}: pixelstreamingOnly project`);
        return {
          levels: oldBridgeToolkitFileSettings.levels,
          configurator: false,
          supportsMultiplayer: false,
          customCharacterClass: true,
        } as BridgeToolkitFileSettings;
      }
      // TODO: Singleplayer projects (e.g. The Promontory)
      if (oldBridgeToolkitFileSettings.supportsMultiplayer === false) {
        console.debug(`${doc.ref.path}: Singleplayer project`);
        return {
          levels: oldBridgeToolkitFileSettings.levels,
          configurator: false,
          supportsMultiplayer: false,
          customCharacterClass: true,
        } as BridgeToolkitFileSettings;
      }
      // TODO: Configurator projects (e.g. Iris Hall)
      if (oldBridgeToolkitFileSettings.supportsMultiplayer === true) {
        console.debug(`${doc.ref.path}: Multiplayer project customCharacterClass = ${oldBridgeToolkitFileSettings.customCharacterClass}`);
        return {
          levels: oldBridgeToolkitFileSettings.levels,
          configurator: true,
          supportsMultiplayer: true,
          customCharacterClass: oldBridgeToolkitFileSettings.customCharacterClass ?? false,
        } as BridgeToolkitFileSettings;
      }
    })();
    if (bridgeToolkitFileSettings == undefined) {
      console.debug(`${doc.ref.path}: Unmatched case`);
      return {doc};
    }
    if (lIsEqual(upv.bridgeToolkitFileSettings, bridgeToolkitFileSettings)) {
      console.debug(`${doc.ref.path}: No change to object`);
      return {doc};
    }

    const update = {
      ...({
        ...upv,
        bridgeToolkitFileSettings,
      } as UnrealProjectVersion),
      oldBridgeToolkitFileSettings,
      oldBridgeToolkitFileSettingsMigratedAt: admin.firestore.Timestamp.now(),
    };

    return {doc, update};
  });

  const f = async (update: Update) => {
    if (update.update == undefined) return;
    console.debug(`Updating ${update.doc.ref.path} with ${JSON.stringify(update.update)}`);
    return update.doc.ref.update(update.update).catch((e) => console.error(`Failed to update ${update.doc.ref.path}: ${e}`)).then(() => console.error(`Successfully updated ${update.doc.ref.path}`));
  };

  return await timeChunkedOperation(upvsToUpdate, 10, 1000, undefined, undefined, f);
}
)();

