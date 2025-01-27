"use strict";
// @ts-nocheck - Node.js 16 compatibility
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
async function getLatestUnrealProjectVersion(unrealProjectId, latestPluginVersionId, rebuildAlways = true, rebuildSelfPackaged = false) {
    const unrealProjectVersions = await (0, firestore_1.getUnrealProjectVersions)(unrealProjectId, [{ fieldPath: "state", opStr: "==", value: "volume-copy-complete" }]);
    if (unrealProjectVersions == undefined)
        return [];
    const latestUnrealProjectVersion = unrealProjectVersions.flatMap(([doc, unrealProjectVersion]) => {
        if (doc == undefined || unrealProjectVersion == undefined)
            return [];
        return [{ unrealProjectId, doc, unrealProjectVersion }];
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
async function createNewUnrealProjectVersion(unrealProjectId, oldVersionId, oldVersion, latestPluginVersionId) {
    const unrealProjectVersion = {
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
    const newUpv = Object.assign(Object.assign({}, unrealProjectVersion), { copiedAt: admin.firestore.Timestamp.now(), copiedFrom: oldVersionId });
    console.debug(`Creating new UPV for ${unrealProjectId}:${oldVersion.name}`);
    return await (0, firestore_1.getUnrealProjectVersionsRef)(unrealProjectId).add(newUpv);
}
(async () => {
    var _a, _b;
    const organizationId = process.env["ORGANIZATION_ID"];
    const unrealProjectId = process.env["UNREAL_PROJECT_ID"];
    const rebuildAlways = process.env["REBUILD_ALWAYS"];
    const rebuildSelfPackaged = process.env["REBUILD_SELFPACKAGED"];
    const spaceIds = (() => {
        const s = process.env["SPACE_IDS"];
        if (s == undefined)
            return undefined;
        return s.split(",");
    })();
    if (spaceIds == undefined && unrealProjectId == undefined && organizationId == undefined) {
        console.error("Must specify at least one of SPACE_IDS, ORGANIZATION_ID or UNREAL_PROJECT_ID");
        process.exit(1);
    }
    const spaces = await (async () => {
        const allSpaces = (await admin.firestore().collectionGroup("spaces").get()).docs.flatMap((doc) => {
            var _a;
            const organizationId = (_a = doc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
            if (organizationId == undefined) {
                console.error(`Space has no organizationId: ${doc.ref.path}`);
                return [];
            }
            return doc.exists == true ? [{ organizationId, id: doc.id, space: doc.data() }] : [];
        });
        const spacesFilteredByIds = allSpaces.filter((s) => spaceIds == undefined || spaceIds.includes(s.id));
        const spacesFilteredByOrganizationId = spacesFilteredByIds.filter((s) => organizationId == undefined || s.organizationId == organizationId);
        const oneMonthAgoEpoch = Date.now() - (1000 * 60 * 60 * 24 * 30);
        const spacesFilteredByRecentActivity = spacesFilteredByOrganizationId.filter((s) => { var _a; return s.space.updated != undefined && ((_a = s.space.updated) === null || _a === void 0 ? void 0 : _a.toMillis()) > oneMonthAgoEpoch; });
        return spacesFilteredByRecentActivity;
    })();
    const unrealProjectsFromSpaces = (spaces == undefined) ? [] : spaces.flatMap((s) => { var _a; return ((_a = s.space.unrealProject) === null || _a === void 0 ? void 0 : _a.unrealProjectId) == undefined ? [] : [s.space.unrealProject.unrealProjectId]; });
    console.debug({ unrealProjectsFromSpaces });
    const organization = await (async () => {
        if (organizationId == undefined)
            return undefined;
        const [, organization] = await (0, firestore_1.getOrganization)(organizationId);
        return organization;
    })();
    if (organizationId != undefined)
        console.debug(`Rebuilding only UPVs in organization: ${(_a = organization === null || organization === void 0 ? void 0 : organization.name) !== null && _a !== void 0 ? _a : organizationId}`);
    const unrealProject = await (async () => {
        if (unrealProjectId == undefined)
            return undefined;
        const [, unrealProject] = await (0, firestore_1.getUnrealProject)(unrealProjectId);
        return unrealProject;
    })();
    if (unrealProjectId != undefined)
        console.debug(`Rebuilding only the latest UPV in unrealProject: ${(_b = unrealProject === null || unrealProject === void 0 ? void 0 : unrealProject.name) !== null && _b !== void 0 ? _b : unrealProjectId}`);
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
    const unrealProjects = unrealProjectDocs
        .flatMap(([doc, unrealProject]) => (doc == undefined || unrealProject == undefined) ? [] : [{ doc, unrealProject }])
        .flatMap((o) => (unrealProjectsFromSpaces.includes(o.doc.id)) ? [o] : [])
        .flatMap((o) => (unrealProjectId == undefined || unrealProjectId == o.doc.id) ? [o] : []);
    if (unrealProjects.length < 1) {
        console.error("No unreal projects found/matched");
        return;
    }
    const _rebuildAlways = (rebuildAlways === "1" || (rebuildAlways === null || rebuildAlways === void 0 ? void 0 : rebuildAlways.toLowerCase()) === "yes" || (rebuildAlways === null || rebuildAlways === void 0 ? void 0 : rebuildAlways.toLowerCase()) === "y" || (rebuildAlways === null || rebuildAlways === void 0 ? void 0 : rebuildAlways.toLowerCase()) === "true");
    const _rebuildSelfPackaged = (rebuildSelfPackaged === "1" || (rebuildSelfPackaged === null || rebuildSelfPackaged === void 0 ? void 0 : rebuildSelfPackaged.toLowerCase()) === "yes" || (rebuildSelfPackaged === null || rebuildSelfPackaged === void 0 ? void 0 : rebuildSelfPackaged.toLowerCase()) === "y" || (rebuildSelfPackaged === null || rebuildSelfPackaged === void 0 ? void 0 : rebuildSelfPackaged.toLowerCase()) === "true");
    const outOfDateProjectVersionDocs = (await Promise.all(unrealProjects.map(async (o) => {
        return await getLatestUnrealProjectVersion(o.doc.id, latestPluginVersionId, _rebuildAlways, _rebuildSelfPackaged);
    }))).flatMap((docs) => docs === undefined ? [] : docs);
    if (outOfDateProjectVersionDocs === undefined || outOfDateProjectVersionDocs.length < 1) {
        console.error("No unreal project versions found for rebuild");
        process.exit(1);
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
//# sourceMappingURL=rebuild-unrealProjects.js.map