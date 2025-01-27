import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getUnrealProjects, getUnrealProjectVersions} from "../lib/documents/firestore";

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
  console.debug(process.argv);
  const operation = process.argv[2];
  if (operation != "enable" && operation != "disable") {
    logerror("Must specify CLI arg 'enable' or 'disable'");
    process.exit(1);
  }
  const newUnrealEngineVersion = "5.2.1";

  const unrealProjects = await getUnrealProjects();
  if (unrealProjects == undefined || unrealProjects.length < 1) {
    logwarn("No projects found");
    return;
  }
  loginfo(`Found ${unrealProjects.length} unreal projects`);

  const oldStateValue = (() => {
    if (operation == "enable") return "volume-copy-complete" + "-" + newUnrealEngineVersion;
    return "volume-copy-complete";
  })();
  const newStateValue = (() => {
    if (operation == "enable") return "volume-copy-complete";
    return "volume-copy-complete" + "-" + newUnrealEngineVersion;
  })();

  const unrealProjectVersionDocs = (await Promise.all(unrealProjects.map(async ([unrealProjectDoc]) => {
    if (unrealProjectDoc == undefined) return [];
    const result = await getUnrealProjectVersions(unrealProjectDoc.id, [{fieldPath: "unrealEngineVersion", opStr: "==", value: newUnrealEngineVersion}, {fieldPath: "state", opStr: "==", value: oldStateValue}]);
    if (result == undefined) return [];
    return result;
  }))).flat().flatMap(([unrealProjectVersionDoc, unrealProjectVersion]) => {
    if (unrealProjectVersionDoc == undefined || unrealProjectVersion == undefined) return [];
    return [{
      doc: unrealProjectVersionDoc,
      unrealProjectVersion,
    }];
  });

  if (unrealProjectVersionDocs == undefined || unrealProjectVersionDocs.length < 1) {
    logwarn("No project versions found");
    return;
  }
  loginfo(`Found ${unrealProjects.length} unreal project versions`);

  const updates = unrealProjectVersionDocs.map(async (o) => {
    try {
      await o.doc.ref.update({state: newStateValue});
      return true;
    } catch (e: any) {
      logerror(`Failed to update project version: ${o.doc.id}`);
      return false;
    }
  });
  const successful = (await Promise.all(updates)).filter((r) => r == true);
  loginfo(`Successfully updated ${successful.length} project versions`);
})();
