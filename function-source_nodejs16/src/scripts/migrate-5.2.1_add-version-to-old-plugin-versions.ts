import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getUnrealPluginVersions} from "../lib/documents/firestore";

function log(level: string, msg: string, obj?: any) {
  const message = `${new Date().toISOString()} - ${level}: ${msg}`;
  if (obj == undefined) {
    console.log(message);
  } else {
    console.log(message, obj);
  }
}

function loginfo(msg: string, obj?: any) {
  log("INFO", msg, obj);
}

function logerror(msg: string, obj?: any) {
  log("ERROR", msg, obj);
}

function logwarn(msg: string, obj?: any) {
  log("WARN", msg, obj);
}

(async () => {
  const oldPluginEngineVersion = "5.0.3";

  const pluginVersions = await getUnrealPluginVersions();
  if (pluginVersions == undefined || pluginVersions.length < 1) {
    logwarn("No plugin versions found");
    return;
  }
  loginfo(`Found ${pluginVersions.length}`);

  const pluginVersionsToUpdate = pluginVersions.flatMap(([doc, pluginVersion]) => {
    if (pluginVersion == undefined || doc == undefined) {
      logwarn("Plugin version undefined");
      return [];
    }
    if (pluginVersion.unrealEngineVersion != undefined) {
      logwarn(`Plugin version already has unrealEngineVersion: ${pluginVersion.unrealEngineVersion} - ${doc.id}`);
      return [];
    }
    return [{doc, pluginVersion}];
  });
  loginfo(`Found ${pluginVersionsToUpdate.length} to update`);

  const updates = pluginVersionsToUpdate.map(async (o) => {
    try {
      await o.doc.ref.update({unrealEngineVersion: oldPluginEngineVersion});
      return true;
    } catch (e: any) {
      logerror(`Failed to update plugin version: ${o.doc.id}`);
      return false;
    }
  });
  const successful = (await Promise.all(updates)).filter((r) => r == true);
  loginfo(`Successfully updated ${successful.length} plugin versions`);
})();
