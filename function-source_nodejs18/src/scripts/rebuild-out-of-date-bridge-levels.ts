import * as admin from "firebase-admin";
import {Storage} from "@google-cloud/storage";
import {UnrealProjectVersion} from "../lib/docTypes";
import {chunkList, sleep} from "../lib/misc";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

const storage = new Storage();

function downloadUrlToParts(downloadUrl: string) {
  // gs://{bucketName}/{organizationId}/{unrealProjectId}/[file = {unrealProjectVersionId}.zip]
  // returns [bucketName, organizationId, unrealProjectId, unrealProjectVersionId]
  return downloadUrl
    .replace(/gs:\/\//, "") // Remove the "gs://" prefix
    .replace(/.zip/, "") // Remove the ".zip" suffix
    .split("/");
}

async function copyThumbnail(newVersionId: string, oldThumbUrl?: string) {
  try {
  // https://storage.googleapis.com/{bucketName}/{subDir1}%2F{subDir2}%2F{unrealProjectId}%2F{unrealProjectVersionId}%2FautoThumbnail.png
    if (oldThumbUrl === undefined) return undefined;
    const [bucketName, subDir1, subDir2, unrealProjectId, unrealProjectVersionId, fileName] = oldThumbUrl
      .replace(/https:\/\/storage.googleapis.com\//, "") // Remove https
      .replace(/%2F/g, "/") // Replace URL encoded slashses with slashes
      .split("/");

    const oldFileLocation = fileName === undefined ?
      `${subDir1}/${subDir2}/${unrealProjectId}/${unrealProjectVersionId}/${fileName}` :
      `${subDir1}/${unrealProjectId}/${unrealProjectVersionId}/${fileName}`;
    const newFileLocation = fileName === undefined ?
      `${subDir1}/${subDir2}/${unrealProjectId}/${newVersionId}/${fileName}` :
      `${subDir1}/${unrealProjectId}/${newVersionId}/${fileName}`;

    const oldFile = storage
      .bucket(bucketName)
      .file(oldFileLocation);
    const newFile = (await oldFile.copy(newFileLocation))[0];
    await newFile.makePublic();

    console.log("Copied to new thumbnail url");
    return newFile.publicUrl();
  } catch (e: any) {
    // If you want to know why it's returning the old thumbnail uncomment this
    // console.log(e);
    console.warn("Returning old thumbnail url");
    return oldThumbUrl;
  }
}

async function copyDownloadUrl(newVersionId: string, oldDownloadUrl: string) {
  const [bucketName, organizationId, unrealProjectId, unrealProjectVersionId] = downloadUrlToParts(oldDownloadUrl);
  const oldFile = storage
    .bucket(bucketName)
    .file(`${organizationId}/${unrealProjectId}/${unrealProjectVersionId}.zip`);
  const newFileDestination = `${organizationId}/${unrealProjectId}/${newVersionId}.zip`;
  await oldFile.copy(newFileDestination);
  return `gs://${bucketName}/${newFileDestination}`;
}

// Signing requires a service account, it cannot be done through the default auth
async function generatePresignedUploadUrl(downloadUrl: string) {
  const [bucketName, organizationId, unrealProjectId, unrealProjectVersionId] = downloadUrlToParts(downloadUrl);
  const [url] = await storage
    .bucket(bucketName)
    .file(`${organizationId}/${unrealProjectId}/${unrealProjectVersionId}.zip`)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
    });
  return url;
}

async function getLatestUnrealPluginVersion() {
  const query = await admin.firestore().collection("unrealPluginVersions")
    .where("status", "in", ["supported-5.2.1", "supported"])
    .orderBy("created", "desc")
    .limit(1)
    .get();
  const pluginVersion = query.docs.pop();
  console.log(`Current plugin version: ${pluginVersion?.id}`);
  return pluginVersion;
}

async function getUnrealProjects() {
  const query = await admin.firestore().collection("unrealProjects").get();
  console.log(`Retrieved ${query.docs.length} projects`);
  return query.docs.length >= 1 ? query.docs : undefined;
}

async function getActiveUnrealProjectVersionsWithoutLatestPluginVersion(unrealProjectId: string, pluginVersionId: string) {
  // Get active unreal project versions
  const query = await admin.firestore()
    .collection("unrealProjects")
    .doc(unrealProjectId)
    .collection("unrealProjectVersions")
    .where("state", "==", "volume-copy-complete")
    .orderBy("created", "desc")
    .get();
  // Ignore if the latest is the current plugin version
  if (query.docs.length <= 0) return undefined;
  // Only return the latest project version
  const latest = query.docs[0];
  if (latest.data().pluginVersionId === pluginVersionId) return undefined;
  return latest;
}

async function createNewUnrealProjectVersion(oldVersionDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>, latestPluginVersionId: string) {
  const unrealProjectRef = oldVersionDoc.ref.parent;
  const oldVersion = oldVersionDoc.data() as UnrealProjectVersion;
  const now = admin.firestore.Timestamp.now();
  const unrealProjectVersion: UnrealProjectVersion = {
    // Copy field values - only the fields required
    uploader: "bridgeCli",
    levelName: oldVersion.levelName,
    levelFilePath: oldVersion.levelFilePath,
    target: oldVersion.target,
    authorUserId: oldVersion.authorUserId,
    uploadSha256Sum: oldVersion.uploadSha256Sum,
    uploadUrl: oldVersion.uploadUrl,
    downloadUrl: oldVersion.downloadUrl,
    thumb: oldVersion.thumb,
    // New field values
    pluginVersionId: latestPluginVersionId,
    updated: now,
    created: now,
    state: "new",
  };
  // if (oldVersionDoc.id === "8ZnXWx86LXJbfvtvuXsMmE") {
  console.log(`Triggering rebuild for ${oldVersionDoc.id}`);
  // Create new document
  const newUnrealProjectVersion = await unrealProjectRef.add({
    ...unrealProjectVersion,
    // New informational fields
    copied: now,
    copiedFrom: oldVersionDoc.id,
  });
  // Copy old gcloud file to new
  const newThumbUrl = await copyThumbnail(newUnrealProjectVersion.id, oldVersion.thumb);
  const newDownloadUrl = await copyDownloadUrl(newUnrealProjectVersion.id, oldVersion.downloadUrl);
  const newUploadUrl = await generatePresignedUploadUrl(newDownloadUrl);
  // Trigger rebuild
  return await newUnrealProjectVersion.update({
    downloadUrl: newDownloadUrl,
    uploadUrl: newUploadUrl,
    thumb: newThumbUrl,
    state: "upload-complete",
  });
  // }
  // return unrealProjectVersion;
}

async function rebuildOutOfDateUnrealProjectVersions() {
  /*
    1. Get latest plugin version
    2. Get the latest unreal project versions that are "volume-copy-complete" and _DO NOT_ have the latest plugin version id
    3. Create new unreal project version with the following field copied:
      - levelName
      - levelFilePath
      - target
      - authorUserId
      - uploadSha256Sum
    4. Set new unreal project version document fields:
      - pluginVersionId = <new plugin version id>
      - updated = now()
      - created = now()
      - state = "upload-complete"
      - createdAt = now() // new field that isn't in the docTypes
      - createdFrom = <old unreal project version id> // new field that isn't in the docTypes
    5. Copy gcloud storage items to new versionIds & regenerate presigned url
    6. Kick off rebuild by setting "upload-complete"
  */
  const latestPluginVersion = await getLatestUnrealPluginVersion();
  if (latestPluginVersion === undefined) {
    console.error("No unreal plugin versions found");
    return;
  }
  const latestPluginVersionId = latestPluginVersion.id;
  // const latestPluginVersionId = "2024-Testing-UE5.0.3-20230523230443";
  const unrealProjectDocs = await getUnrealProjects();
  if (unrealProjectDocs === undefined) {
    console.error("No unreal projects found");
    return;
  }
  const outOfDateProjectVersionDocs = (await Promise.all(unrealProjectDocs.map((doc) => getActiveUnrealProjectVersionsWithoutLatestPluginVersion(doc.id, latestPluginVersionId))))
    .flatMap((docs) => docs === undefined ? [] : docs);
  if (outOfDateProjectVersionDocs === undefined) {
    console.error("No unreal project versions found");
    return;
  }
  const chunks = chunkList(outOfDateProjectVersionDocs, 10);
  console.log(`${outOfDateProjectVersionDocs.length} unreal project versions to rebuild, across ${chunks.length} chunks`);

  // Process each chunk, with a sleep in between
  return await chunks.reduce<Promise<boolean[]>>(async (finished, chunk, index) => {
    console.log(`Triggering rebuilds of chunk ${index} consisting of ${outOfDateProjectVersionDocs.length} unreal project versions`);
    const chunkResult = await Promise.all(chunk.map(async (upvDoc) => {
      try {
        await createNewUnrealProjectVersion(upvDoc, latestPluginVersionId);
        return true;
      } catch (e: any) {
        console.warn(`Failed to create new unreal project version doc: ${upvDoc.ref.path}`);
        return false;
      }
    }));
    console.warn("Waiting for 120 seconds before processing the next chunk");
    await sleep(120);
    const r = [...await finished, ...chunkResult];
    return r;
  }, Promise.resolve([]));
}

rebuildOutOfDateUnrealProjectVersions();
