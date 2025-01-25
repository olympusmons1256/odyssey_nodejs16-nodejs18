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
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const firestore_1 = require("../lib/documents/firestore");
const misc_1 = require("../lib/misc");
const targetVersion = "5.2.1";
async function getLatestUnrealPluginVersion() {
    const query = await (0, firestore_1.getUnrealPluginVersionsRef)()
        .where("status", "in", ["supported-5.2", "supported"])
        .orderBy("created", "desc")
        .limit(1)
        .get();
    const pluginVersion = query.docs.pop();
    console.log(`Current plugin version: ${pluginVersion === null || pluginVersion === void 0 ? void 0 : pluginVersion.id}`);
    return pluginVersion;
}
async function getLatestUnrealProjectVersion(unrealProjectId, latestPluginVersionId) {
    const unrealProjectVersions = await (0, firestore_1.getUnrealProjectVersions)(unrealProjectId, [{ fieldPath: "state", opStr: "==", value: "volume-copy-complete" }]);
    if (unrealProjectVersions == undefined)
        return [];
    const latestUnrealProjectVersion = unrealProjectVersions.flatMap(([doc, unrealProjectVersion]) => {
        if (doc == undefined || unrealProjectVersion == undefined)
            return [];
        return [{ unrealProjectId, doc, unrealProjectVersion }];
    }).sort((a, b) => a.unrealProjectVersion.created.toMillis() - b.unrealProjectVersion.created.toMillis())
        .pop();
    if (latestUnrealProjectVersion == undefined ||
        latestUnrealProjectVersion.unrealProjectVersion.pluginVersionId == latestPluginVersionId) {
        console.warn(`Unreal project has no latest unreal project version to rebuild: ${unrealProjectId}`);
        return [];
    }
    return latestUnrealProjectVersion;
}
async function createNewUnrealProjectVersion(unrealProjectId, oldVersionId, oldVersion, latestPluginVersionId) {
    const unrealProjectVersion = {
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
    return await (0, firestore_1.getUnrealProjectVersionsRef)(unrealProjectId).add(Object.assign(Object.assign({}, unrealProjectVersion), { copied: admin.firestore.Timestamp.now(), copiedFrom: oldVersionId }));
}
(async () => {
    const latestPluginVersion = await getLatestUnrealPluginVersion();
    if (latestPluginVersion === undefined) {
        console.error("No unreal plugin versions found");
        return;
    }
    const latestPluginVersionId = latestPluginVersion.id;
    const unrealProjectDocs = await (0, firestore_1.getUnrealProjects)();
    if (unrealProjectDocs === undefined) {
        console.error("No unreal projects found");
        return;
    }
    const unrealProjects = unrealProjectDocs.flatMap(([doc, unrealProject]) => (doc == undefined || unrealProject == undefined) ? [] : [{ doc, unrealProject }]);
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
    const chunks = (0, misc_1.chunkList)(outOfDateProjectVersionDocs, 10);
    console.log(`${outOfDateProjectVersionDocs.length} unreal project versions to rebuild, across ${chunks.length} chunks`);
    const f = async (outOfDate) => {
        try {
            await createNewUnrealProjectVersion(outOfDate.unrealProjectId, outOfDate.doc.id, outOfDate.unrealProjectVersion, latestPluginVersionId);
            return true;
        }
        catch (e) {
            console.warn(`Failed to create new unreal project version doc: ${outOfDate.doc.ref.path}`);
            return false;
        }
    };
    return await (0, misc_1.timeChunkedOperation)(outOfDateProjectVersionDocs, 10, 120000, undefined, undefined, f);
})();
//# sourceMappingURL=migrate-5.2.1_rebuild-upvs.js.map