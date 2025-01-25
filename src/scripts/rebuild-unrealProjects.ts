// @ts-nocheck - Node.js 16 compatibility

import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getOrganization, getUnrealPluginVersionsRef, getUnrealProject, getUnrealProjects, getUnrealProjectVersions, getUnrealProjectVersionsRef} from "../lib/documents/firestore";
import {UnrealProjectVersion} from "../lib/docTypes";
import {chunkList, timeChunkedOperation} from "../lib/misc";
import {OrgSpace} from "../lib/cmsDocTypes";

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

async function getLatestUnrealProjectVersion(unrealProjectId: string, latestPluginVersionId: string, rebuildAlways = true, rebuildSelfPackaged = false) {
  const unrealProjectVersions = await getUnrealProjectVersions(unrealProjectId, [{fieldPath: "state", opStr: "==", value: "volume-copy-complete"}]);
  if (unrealProjectVersions == undefined) return [];
  const latestUnrealProjectVersion = unrealProjectVersions.flatMap(([doc, unrealProjectVersion]) => {
    if (doc == undefined || unrealProjectVersion == undefined) return [];
    return [{unrealProjectId, doc, unrealProjectVersion}];
  }).sort((a, b) => a.unrealProjectVersion.created.toMillis() - b.unrealProjectVersion.created.toMillis())
    .pop();
  if (latestUnrealProjectVersion == undefined) {
    console.warn(`Unreal project has no volume-copy-complete unreal project version to rebuild: ${unrealProjectId}`);
    return [];
  }

  if (rebuildAlways === false && latestUnrealProjectVersion.unrealProjectVersion.pluginVersionId == latestPluginVersionId) {
    console.warn(`Unreal project latest UPV is already running the latest plugin version. No need to rebuild: ${unrealProjectId}`);
    return [];
  }
  if (rebuildSelfPackaged == false && latestUnrealProjectVersion.unrealProjectVersion.selfPackaged == true) {
    console.warn(`Unreal project is self-packaged, nothing to rebuild: ${unrealProjectId}`);
    return [];
  }
  return latestUnrealProjectVersion;
}

async function createNewUnrealProjectVersion(unrealProjectId: string, oldVersionId: string, oldVersion: UnrealProjectVersion, latestPluginVersionId: string) {
  const unrealProjectVersion: UnrealProjectVersion = {
    levelName: oldVersion.levelName,
    levelFilePath: oldVersion.levelFilePath,
    target: oldVersion.target,
    authorUserId: oldVersion.authorUserId,
    uploadSha256Sum: oldVersion.uploadSha256Sum,
    unrealEngineVersion: oldVersion.unrealEngineVersion,
    uploadUrl: oldVersion.uploadUrl,
    downloadUrl: oldVersion.downloadUrl,
    thumb: oldVersion.thumb,
    pluginVersionId: latestPluginVersionId,
    uploader: oldVersion.uploader || "bridgeCli",
    selfPackaged: oldVersion.selfPackaged,
    updated: admin.firestore.Timestamp.now(),
    created: admin.firestore.Timestamp.now(),
    state: "upload-complete",
  };
  const newUpv = {
    ...unrealProjectVersion,
    copiedAt: admin.firestore.Timestamp.now(),
    copiedFrom: oldVersionId,
  };
  console.debug(`Creating new UPV for ${unrealProjectId}:${oldVersion.name}`);
  return await getUnrealProjectVersionsRef(unrealProjectId).add(newUpv);
}

interface OutOfDateVersionDoc {
  unrealProjectId: string;
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
  unrealProjectVersion: UnrealProjectVersion;
}

(async () => {
  const organizationId = process.env["ORGANIZATION_ID"];
  const unrealProjectId = process.env["UNREAL_PROJECT_ID"];
  const rebuildAlways = process.env["REBUILD_ALWAYS"];
  const rebuildSelfPackaged = process.env["REBUILD_SELFPACKAGED"];
  const spaceIds = (() => {
    const s = process.env["SPACE_IDS"];
    if (s == undefined) return undefined;
    return s.split(",");
  })();

  if (spaceIds == undefined && unrealProjectId == undefined && organizationId == undefined) {
    console.error("Must specify at least one of SPACE_IDS, ORGANIZATION_ID or UNREAL_PROJECT_ID");
    process.exit(1);
  }

  const spaces = await (async () => {
    const allSpaces = (await admin.firestore().collectionGroup("spaces").get()).docs.flatMap((doc) => {
      const organizationId = doc.ref.parent.parent?.id;
      if (organizationId == undefined) {
        console.error(`Space has no organizationId: ${doc.ref.path}`);
        return [];
      }
      return doc.exists == true ? [{organizationId, id: doc.id, space: doc.data() as OrgSpace}] : [];
    });
    const spacesFilteredByIds = allSpaces.filter((s) => spaceIds == undefined || spaceIds.includes(s.id));
    const spacesFilteredByOrganizationId = spacesFilteredByIds.filter((s) => organizationId == undefined || s.organizationId == organizationId);
    const oneMonthAgoEpoch = Date.now() - (1000 * 60 * 60 * 24 * 30);
    const spacesFilteredByRecentActivity = spacesFilteredByOrganizationId.filter((s) => s.space.updated != undefined && s.space.updated?.toMillis() > oneMonthAgoEpoch);
    return spacesFilteredByRecentActivity;
  })();

  const unrealProjectsFromSpaces = (spaces == undefined) ? [] : spaces.flatMap((s) => s.space.unrealProject?.unrealProjectId == undefined ? [] : [s.space.unrealProject.unrealProjectId]);
  console.debug({unrealProjectsFromSpaces});

  const organization = await (async () => {
    if (organizationId == undefined) return undefined;
    const [, organization] = await getOrganization(organizationId);
    return organization;
  })();

  if (organizationId != undefined) console.debug(`Rebuilding only UPVs in organization: ${organization?.name ?? organizationId}`);

  const unrealProject = await (async () => {
    if (unrealProjectId == undefined) return undefined;
    const [, unrealProject] = await getUnrealProject(unrealProjectId);
    return unrealProject;
  })();

  if (unrealProjectId != undefined) console.debug(`Rebuilding only the latest UPV in unrealProject: ${unrealProject?.name ?? unrealProjectId}`);

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

  const unrealProjects =
    unrealProjectDocs
      .flatMap(([doc, unrealProject]) => (doc == undefined || unrealProject == undefined) ? [] : [{doc, unrealProject}])
      .flatMap((o) => (unrealProjectsFromSpaces.includes(o.doc.id)) ? [o] : [])
      .flatMap((o) => (unrealProjectId == undefined || unrealProjectId == o.doc.id) ? [o] : []);

  if (unrealProjects.length < 1) {
    console.error("No unreal projects found/matched");
    return;
  }

  const _rebuildAlways = (rebuildAlways === "1" || rebuildAlways?.toLowerCase() === "yes" || rebuildAlways?.toLowerCase() === "y" || rebuildAlways?.toLowerCase() === "true");
  const _rebuildSelfPackaged = (rebuildSelfPackaged === "1" || rebuildSelfPackaged?.toLowerCase() === "yes" || rebuildSelfPackaged?.toLowerCase() === "y" || rebuildSelfPackaged?.toLowerCase() === "true");
  const outOfDateProjectVersionDocs =
      (await Promise.all(unrealProjects.map(async (o) => {
        return await getLatestUnrealProjectVersion(o.doc.id, latestPluginVersionId, _rebuildAlways, _rebuildSelfPackaged);
      }))).flatMap((docs) => docs === undefined ? [] : docs);

  if (outOfDateProjectVersionDocs === undefined || outOfDateProjectVersionDocs.length < 1) {
    console.error("No unreal project versions found for rebuild");
    process.exit(1);
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
