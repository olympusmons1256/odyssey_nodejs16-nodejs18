import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getUnrealPluginVersionsRef, getUnrealProjects, getUnrealProjectVersions, getUnrealProjectVersionsRef} from "../lib/documents/firestore";
import {UnrealProjectVersion} from "../lib/docTypes";
import {chunkList, timeChunkedOperation} from "../lib/misc";

const targetVersion = "5.2.1";

async function getLatestUnrealPluginVersion() {
  const query = await getUnrealPluginVersionsRef()
    .where("status", "in", ["supported-5.2", "supported"])
    .orderBy("created", "desc")
    .limit(1)
    .get();
  const pluginVersion = query.docs.pop();
  console.log(`Current plugin version: ${pluginVersion?.id}`);
  return pluginVersion;
}

async function getLatestUnrealProjectVersion(unrealProjectId: string, latestPluginVersionId: string) {
  const unrealProjectVersions = await getUnrealProjectVersions(unrealProjectId, [{fieldPath: "state", opStr: "==", value: "volume-copy-complete"}]);
  if (unrealProjectVersions == undefined) return [];
  const latestUnrealProjectVersion = unrealProjectVersions.flatMap(([doc, unrealProjectVersion]) => {
    if (doc == undefined || unrealProjectVersion == undefined) return [];
    return [{unrealProjectId, doc, unrealProjectVersion}];
  }).sort((a, b) => a.unrealProjectVersion.created.toMillis() - b.unrealProjectVersion.created.toMillis())
    .pop();
  if (latestUnrealProjectVersion == undefined ||
     latestUnrealProjectVersion.unrealProjectVersion.pluginVersionId == latestPluginVersionId) {
    console.warn(`Unreal project has no latest unreal project version to rebuild: ${unrealProjectId}`);
    return [];
  }
  return latestUnrealProjectVersion;
}

async function createNewUnrealProjectVersion(unrealProjectId: string, oldVersionId: string, oldVersion: UnrealProjectVersion, latestPluginVersionId: string) {
  const unrealProjectVersion: UnrealProjectVersion = {
    uploader: "bridgeCli",
    levelName: oldVersion.levelName,
    levelFilePath: oldVersion.levelFilePath,
    target: oldVersion.target,
    authorUserId: oldVersion.authorUserId,
    uploadSha256Sum: oldVersion.uploadSha256Sum,
    unrealEngineVersion: targetVersion,
    uploadUrl: oldVersion.uploadUrl,
    downloadUrl: oldVersion.downloadUrl,
    thumb: oldVersion.thumb,
    pluginVersionId: latestPluginVersionId,
    updated: admin.firestore.Timestamp.now(),
    created: admin.firestore.Timestamp.now(),
    state: "upload-complete",
  };
  return await getUnrealProjectVersionsRef(unrealProjectId).add({
    ...unrealProjectVersion,
    copied: admin.firestore.Timestamp.now(),
    copiedFrom: oldVersionId,
  });
}

interface OutOfDateVersionDoc {
  unrealProjectId: string;
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
  unrealProjectVersion: UnrealProjectVersion;
}

(async () => {
  const latestPluginVersion = await getLatestUnrealPluginVersion();
  if (latestPluginVersion === undefined) {
    console.error("No unreal plugin versions found");
    return;
  }
  const latestPluginVersionId = latestPluginVersion.id;

  const unrealProjectDocs = await getUnrealProjects();
  if (unrealProjectDocs === undefined) {
    console.error("No unreal projects found");
    return;
  }
  const unrealProjects = unrealProjectDocs.flatMap(([doc, unrealProject]) => (doc == undefined || unrealProject == undefined) ? [] : [{doc, unrealProject}]);
  if (unrealProjects.length < 1) {
    console.error("No unreal projects found");
    return;
  }

  const outOfDateProjectVersionDocs = (await Promise.all(unrealProjects.map(async (o) => {
    return await getLatestUnrealProjectVersion(o.doc.id, latestPluginVersionId);
  }))).flatMap((docs) => docs === undefined ? [] : docs);

  if (outOfDateProjectVersionDocs === undefined) {
    console.error("No unreal project versions found");
    return;
  }
  const chunks = chunkList(outOfDateProjectVersionDocs, 10);
  console.log(`${outOfDateProjectVersionDocs.length} unreal project versions to rebuild, across ${chunks.length} chunks`);

  const f = async (outOfDate: OutOfDateVersionDoc) => {
    try {
      await createNewUnrealProjectVersion(outOfDate.unrealProjectId, outOfDate.doc.id, outOfDate.unrealProjectVersion, latestPluginVersionId);
      return true;
    } catch (e: any) {
      console.warn(`Failed to create new unreal project version doc: ${outOfDate.doc.ref.path}`);
      return false;
    }
  };

  return await timeChunkedOperation<OutOfDateVersionDoc, boolean>(outOfDateProjectVersionDocs, 10, 120000, undefined, undefined, f);
})();
