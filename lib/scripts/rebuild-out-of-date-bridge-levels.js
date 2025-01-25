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
const admin = __importStar(require("firebase-admin"));
const storage_1 = require("@google-cloud/storage");
const misc_1 = require("../lib/misc");
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const storage = new storage_1.Storage();
function downloadUrlToParts(downloadUrl) {
    // gs://{bucketName}/{organizationId}/{unrealProjectId}/[file = {unrealProjectVersionId}.zip]
    // returns [bucketName, organizationId, unrealProjectId, unrealProjectVersionId]
    return downloadUrl
        .replace(/gs:\/\//, "") // Remove the "gs://" prefix
        .replace(/.zip/, "") // Remove the ".zip" suffix
        .split("/");
}
async function copyThumbnail(newVersionId, oldThumbUrl) {
    try {
        // https://storage.googleapis.com/{bucketName}/{subDir1}%2F{subDir2}%2F{unrealProjectId}%2F{unrealProjectVersionId}%2FautoThumbnail.png
        if (oldThumbUrl === undefined)
            return undefined;
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
    }
    catch (e) {
        // If you want to know why it's returning the old thumbnail uncomment this
        // console.log(e);
        console.warn("Returning old thumbnail url");
        return oldThumbUrl;
    }
}
async function copyDownloadUrl(newVersionId, oldDownloadUrl) {
    const [bucketName, organizationId, unrealProjectId, unrealProjectVersionId] = downloadUrlToParts(oldDownloadUrl);
    const oldFile = storage
        .bucket(bucketName)
        .file(`${organizationId}/${unrealProjectId}/${unrealProjectVersionId}.zip`);
    const newFileDestination = `${organizationId}/${unrealProjectId}/${newVersionId}.zip`;
    await oldFile.copy(newFileDestination);
    return `gs://${bucketName}/${newFileDestination}`;
}
// Signing requires a service account, it cannot be done through the default auth
async function generatePresignedUploadUrl(downloadUrl) {
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
    console.log(`Current plugin version: ${pluginVersion === null || pluginVersion === void 0 ? void 0 : pluginVersion.id}`);
    return pluginVersion;
}
async function getUnrealProjects() {
    const query = await admin.firestore().collection("unrealProjects").get();
    console.log(`Retrieved ${query.docs.length} projects`);
    return query.docs.length >= 1 ? query.docs : undefined;
}
async function getActiveUnrealProjectVersionsWithoutLatestPluginVersion(unrealProjectId, pluginVersionId) {
    // Get active unreal project versions
    const query = await admin.firestore()
        .collection("unrealProjects")
        .doc(unrealProjectId)
        .collection("unrealProjectVersions")
        .where("state", "==", "volume-copy-complete")
        .orderBy("created", "desc")
        .get();
    // Ignore if the latest is the current plugin version
    if (query.docs.length <= 0)
        return undefined;
    // Only return the latest project version
    const latest = query.docs[0];
    if (latest.data().pluginVersionId === pluginVersionId)
        return undefined;
    return latest;
}
async function createNewUnrealProjectVersion(oldVersionDoc, latestPluginVersionId) {
    const unrealProjectRef = oldVersionDoc.ref.parent;
    const oldVersion = oldVersionDoc.data();
    const now = admin.firestore.Timestamp.now();
    const unrealProjectVersion = {
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
    const newUnrealProjectVersion = await unrealProjectRef.add(Object.assign(Object.assign({}, unrealProjectVersion), { 
        // New informational fields
        copied: now, copiedFrom: oldVersionDoc.id }));
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
    const chunks = (0, misc_1.chunkList)(outOfDateProjectVersionDocs, 10);
    console.log(`${outOfDateProjectVersionDocs.length} unreal project versions to rebuild, across ${chunks.length} chunks`);
    // Process each chunk, with a sleep in between
    return await chunks.reduce(async (finished, chunk, index) => {
        console.log(`Triggering rebuilds of chunk ${index} consisting of ${outOfDateProjectVersionDocs.length} unreal project versions`);
        const chunkResult = await Promise.all(chunk.map(async (upvDoc) => {
            try {
                await createNewUnrealProjectVersion(upvDoc, latestPluginVersionId);
                return true;
            }
            catch (e) {
                console.warn(`Failed to create new unreal project version doc: ${upvDoc.ref.path}`);
                return false;
            }
        }));
        console.warn("Waiting for 120 seconds before processing the next chunk");
        await (0, misc_1.sleep)(120);
        const r = [...await finished, ...chunkResult];
        return r;
    }, Promise.resolve([]));
}
rebuildOutOfDateUnrealProjectVersions();
//# sourceMappingURL=rebuild-out-of-date-bridge-levels.js.map