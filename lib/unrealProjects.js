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
exports.getAllUnrealProjects = exports.buildLogLastLinesQuery = exports.buildLogTailQuery = exports._validateUrl = exports._getSpecifiedUnrealProjectVersion = exports._getLatestUnrealProjectVersion = exports.expireUnrealProjectVersions = exports.expireUnrealProjectVersionsSchedule = exports.publishUnrealPluginVersion = exports.updateUnrealProjectVersion = exports.cleanUpOldGCSFilesForUnrealProjectVersions = exports.retryStuckUnrealProjectVersions = exports.onUpdateUnrealProjectVersion = exports.onUpdateUnrealProjectMetadata = exports.notifyUnrealProjectVersionUploaded = exports.newWebUploadedUnrealProjectAndVersion = exports.createNewUnrealProjectVersion = exports.createNewUnrealProject = exports.getUnrealProjectVersionBuildLogs = exports.getUnrealProjectLatestBuildLogDownloadUrl = exports.getSpecificUnrealProjectVersion = exports.getUnrealProjectsWithVersions = exports.getLatestUnrealPluginVersion = exports.addUserBridgeCliLogs = void 0;
// @ts-nocheck - Node.js 16 compatibility
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const bigquery_1 = require("@google-cloud/bigquery");
const firestore_1 = require("./lib/documents/firestore");
const docTypes_1 = require("./lib/docTypes");
const googleStorage_1 = require("./lib/googleStorage");
const shared_1 = require("./shared");
const organizations_1 = require("./lib/organizations");
const deployUnrealProjects = __importStar(require("./lib/unrealProjects/deploy-standard"));
const firebase_1 = require("./lib/firebase");
const uuid_1 = require("uuid");
const misc_1 = require("./lib/misc");
const firestore_bigquery_change_tracker_1 = require("@newgameplus/firestore-bigquery-change-tracker");
const util_1 = require("./lib/bigQueryExport/util");
const shared_2 = require("./lib/unrealProjects/shared");
function generateProjectVersionDestinationName(organizationId, unrealProjectId, unrealProjectVersionId, selfPackaged = false) {
    const suffix = selfPackaged ? "-packaged" : "";
    return `${organizationId}/${unrealProjectId}/${unrealProjectVersionId}${suffix}.zip`;
}
const defaultUnrealEngineVersion = "5.2.1";
exports.addUserBridgeCliLogs = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (userId === undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    try {
        const bigQueryRows = data.map((log) => {
            return {
                user_id: userId,
                timestamp: bigquery_1.BigQuery.timestamp(log.timestamp),
                bridge_cli_version: log.bridgeCliVersion,
                log_level: log.logLevel,
                raw_message: log.rawMessage,
                organization_id: log.organizationId,
                unreal_project_id: log.unrealProjectId,
                unreal_project_version_id: log.unrealProjectVersionId,
                raw_metadata: log.rawMetadata,
            };
        });
        const bigQuery = new bigquery_1.BigQuery();
        const project = await bigQuery.getProjectId();
        const dataset = "logging";
        const table = "user_bridge_cli_logs";
        console.log(`Inserting ${data.length} records into ${project}.${dataset}.${table}...`);
        await bigQuery
            .dataset(dataset)
            .table(table)
            .insert(bigQueryRows);
        return;
    }
    catch (e) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
    }
});
exports.getLatestUnrealPluginVersion = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (_, context) => {
    var _a;
    try {
        if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) == undefined) {
            throw new functions.https.HttpsError("permission-denied", "User not logged in");
        }
        const latestUnrealPluginVersion = await getLatestPluginVersion();
        if (latestUnrealPluginVersion == undefined) {
            throw new functions.https.HttpsError("internal", "Couldn't resolve latest compatible plugin version");
        }
        const unrealPluginVersion = latestUnrealPluginVersion.unrealPluginVersion;
        console.debug({ latestPluginVersion: unrealPluginVersion });
        // Get bucket name from
        const bucketName = functions.config().unrealpluginversion.bucketname;
        // const reg = /gs:\/\//;
        // const pluginUrl = latestPluginVersion.url.replace(reg, "");
        // TODO: handle nested filePath
        const filePath = unrealPluginVersion.toolkitUrl.replace(/.*\//, "");
        console.debug({ filePath });
        const downloadUrl = await (0, googleStorage_1.createSignedDownloadUrl)(bucketName, filePath);
        if (downloadUrl == undefined || downloadUrl == null) {
            throw new functions.https.HttpsError("internal", "Download not available");
        }
        console.debug({ downloadUrl });
        const response = Object.assign({ id: latestUnrealPluginVersion.doc.id, downloadUrl: downloadUrl }, unrealPluginVersion);
        return response;
    }
    catch (e) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
    }
});
exports.getUnrealProjectsWithVersions = functions.region("europe-west1").https.onCall(async (data, context) => {
    var _a;
    const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    const organizationId = data.organizationId;
    if (userId === undefined) {
        throw new functions.https.HttpsError("unauthenticated", "User is not authenticated");
    }
    if (organizationId === undefined) {
        throw new functions.https.HttpsError("invalid-argument", "Organization ID is not provided");
    }
    const unrealProjectsQueryResult = await (0, firestore_1.getUnrealProjectsRef)()
        .where("organizationId", "==", organizationId)
        .get();
    const unrealProjectDocs = unrealProjectsQueryResult.docs;
    const unrealProjectsWithVersions = [];
    for (const unrealProjectDoc of unrealProjectDocs) {
        const unrealProject = unrealProjectDoc.data();
        const unrealProjectVersionsQueryResult = await (0, firestore_1.getUnrealProjectVersionsRef)(unrealProjectDoc.id)
            .orderBy("created", "desc")
            .get();
        const unrealProjectVersions = unrealProjectVersionsQueryResult.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        unrealProjectsWithVersions.push(Object.assign(Object.assign({ id: unrealProjectDoc.id }, unrealProject), { versions: unrealProjectVersions }));
    }
    const response = {
        unrealProjectsWithVersions,
    };
    return response;
});
exports.getSpecificUnrealProjectVersion = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    console.log("Request data from organization:");
    console.log(JSON.stringify(data));
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, context.auth.uid);
    if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of the specified organization");
    }
    if (data.unrealProjectVersionId === "latest") {
        // find and return latest project version
        const latestProjectVersionQueryResult = (await (0, firestore_1.getUnrealProjectVersionsRef)(data.unrealProjectId)
            .orderBy("created", "desc")
            .limit(1).get());
        const latestProjectVersionDoc = latestProjectVersionQueryResult.docs.pop();
        if (latestProjectVersionDoc == undefined) {
            throw new functions.https.HttpsError("internal", "Couldn't resolve latest compatible project version");
        }
        const latestProjectVersion = latestProjectVersionDoc.data();
        const response = Object.assign({ id: latestProjectVersionDoc === null || latestProjectVersionDoc === void 0 ? void 0 : latestProjectVersionDoc.id }, latestProjectVersion);
        return response;
    }
    else {
        // find and return version using passed version id
        const [unrealProjectVersionDoc, unrealProjectVersion] = await getUnrealProjectVersion(data.unrealProjectId, data.unrealProjectVersionId);
        if ((unrealProjectVersionDoc === null || unrealProjectVersionDoc === void 0 ? void 0 : unrealProjectVersionDoc.id) == undefined || unrealProjectVersion == undefined) {
            throw new functions.https.HttpsError("not-found", "Unreal project version could not be found");
        }
        const response = Object.assign({ id: unrealProjectVersionDoc === null || unrealProjectVersionDoc === void 0 ? void 0 : unrealProjectVersionDoc.id }, unrealProjectVersion);
        return response;
    }
});
exports.getUnrealProjectLatestBuildLogDownloadUrl = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    console.log("Document data:");
    console.log(JSON.stringify(data));
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, context.auth.uid);
    if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of the specified organization");
    }
    const [unrealProjectDoc, unrealProject] = await getUnrealProject(data.unrealProjectId);
    if ((unrealProjectDoc === null || unrealProjectDoc === void 0 ? void 0 : unrealProjectDoc.id) == undefined || unrealProject == undefined) {
        throw new functions.https.HttpsError("not-found", "Unreal project could not be found");
    }
    const getLatestUnrealProjectVersion = async () => {
        const projectVersions = (await unrealProjectDoc.ref.collection("unrealProjectVersions")
            .orderBy("created", "desc")
            .limit(1).get());
        const unrealProjectVersionDoc = projectVersions.docs.pop();
        const unrealProjectVersion = unrealProjectVersionDoc === null || unrealProjectVersionDoc === void 0 ? void 0 : unrealProjectVersionDoc.data();
        if ((unrealProjectVersionDoc === null || unrealProjectVersionDoc === void 0 ? void 0 : unrealProjectVersionDoc.id) == undefined || unrealProjectVersion == undefined) {
            throw new functions.https.HttpsError("not-found", "Unreal project version could not be found");
        }
        return unrealProjectVersion;
    };
    const getSpecifiedUnrealProjectVersion = async (unrealProjectVersionId) => {
        const [unrealProjectVersionDoc, unrealProjectVersion] = await getUnrealProjectVersion(data.unrealProjectId, unrealProjectVersionId);
        if ((unrealProjectVersionDoc === null || unrealProjectVersionDoc === void 0 ? void 0 : unrealProjectVersionDoc.id) == undefined || unrealProjectVersion == undefined) {
            throw new functions.https.HttpsError("not-found", "Unreal project version could not be found");
        }
        return unrealProjectVersion;
    };
    const unrealProjectVersion = data.unrealProjectVersionId ?
        await getSpecifiedUnrealProjectVersion(data.unrealProjectVersionId) :
        await getLatestUnrealProjectVersion();
    if (unrealProjectVersion.buildLogUrls === undefined || unrealProjectVersion.buildLogUrls.length <= 0) {
        console.debug(`No build logs available for project: ${data.unrealProjectId}, version: ${unrealProjectDoc.id}`);
        const response = {
            downloadUrl: undefined,
        };
        return response;
    }
    const latestBuildLog = unrealProjectVersion.buildLogUrls.pop();
    const bucketName = functions.config().unrealprojectversionuploads.bucketname;
    const downloadableUrl = latestBuildLog ? await (0, googleStorage_1.createSignedDownloadUrl)(bucketName, latestBuildLog.replace(`gs://${bucketName}/`, "")) : undefined;
    const response = {
        downloadUrl: downloadableUrl,
    };
    return response;
});
async function buildLogTailQuery(data) {
    var _a;
    // Get the earliest instance the unreal project version was changed to "builder-building" since the given start time
    // Currently only the UE build logs are being exported
    const tailableStateChanges = (_a = data.unrealProjectVersion.stateChanges) === null || _a === void 0 ? void 0 : _a.filter((state) => state.state === "builder-building").filter((state) => state.timestamp.toDate().getTime() > data.startTime.getTime()).sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
    const tailableStateChange = tailableStateChanges ? tailableStateChanges.length <= 0 ? data.unrealProjectVersion.created : tailableStateChanges[0].timestamp : data.unrealProjectVersion.created;
    const tailableDate = tailableStateChange.toDate();
    const firebaseProjectId = (0, firebase_1.getFirebaseProjectId)();
    // TODO: the log line formatting should be moved to the fluentd config
    const query = `
  SELECT
    CONCAT("[", time, "] ", rawmessage) AS log_message
  FROM
    \`${firebaseProjectId}.logging.unreal_project_version_build_logs\`
  WHERE
    organization_id = @organization_id
  AND
    unreal_project_version_id = @project_version_id
  AND
    source_path = "/logs/build/Log.txt"
  AND
    time >= @start_time_bq
  ORDER BY time ${data.orderBy.toUpperCase()}
  LIMIT @limit_amount OFFSET @offset_amount
  `;
    const params = {
        organization_id: data.organizationId,
        project_version_id: data.unrealProjectVersionId,
        start_time_bq: bigquery_1.BigQuery.timestamp(tailableDate),
        limit_amount: data.limit,
        offset_amount: data.offset,
    };
    return {
        query,
        params,
        projectId: firebaseProjectId,
        useLegacySql: false,
    };
}
async function buildLogLastLinesQuery(data) {
    const firebaseProjectId = (0, firebase_1.getFirebaseProjectId)();
    // TODO: the log line formatting should be moved to the fluentd config
    const query = `
  SELECT
    log_message
  FROM (
    SELECT
      CONCAT("[", time, "] ", rawmessage) AS log_message,
      time
    FROM
      \`${firebaseProjectId}.logging.unreal_project_version_build_logs\`
    WHERE
      organization_id = @organization_id
    AND
      unreal_project_version_id = @project_version_id
    AND
      source_path = "/logs/build/Log.txt"
    AND
      time <= @end_time_bq
    ORDER BY time DESC
    LIMIT @limit_amount
  ) ORDER BY time ASC
  `;
    const params = {
        organization_id: data.organizationId,
        project_version_id: data.unrealProjectVersionId,
        end_time_bq: bigquery_1.BigQuery.timestamp(new Date()),
        limit_amount: data.limit,
    };
    return {
        query,
        params,
        projectId: firebaseProjectId,
        useLegacySql: false,
    };
}
exports.getUnrealProjectVersionBuildLogs = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    console.log("Document data:");
    console.log(JSON.stringify(data));
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, context.auth.uid);
    if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of the specified organization");
    }
    const [unrealProjectDoc, unrealProject] = await getUnrealProject(data.unrealProjectId);
    if ((unrealProjectDoc === null || unrealProjectDoc === void 0 ? void 0 : unrealProjectDoc.id) == undefined || unrealProject == undefined) {
        throw new functions.https.HttpsError("not-found", "Unreal project could not be found");
    }
    const [unrealProjectVersionDoc, unrealProjectVersion] = await getUnrealProjectVersion(data.unrealProjectId, data.unrealProjectVersionId);
    if ((unrealProjectVersionDoc === null || unrealProjectVersionDoc === void 0 ? void 0 : unrealProjectVersionDoc.id) == undefined || unrealProjectVersion == undefined) {
        throw new functions.https.HttpsError("not-found", "Unreal project version could not be found");
    }
    if (data.tailData && (data.tailData.offset < 0 || !Number.isInteger(data.tailData.offset))) {
        throw new functions.https.HttpsError("invalid-argument", "Offset must be a positive integer");
    }
    if (data.limit < 0 || !Number.isInteger(data.limit)) {
        throw new functions.https.HttpsError("invalid-argument", "Limit must be a positive integer");
    }
    const query = data.tailData ?
        // Tail Mode
        await buildLogTailQuery({
            unrealProjectVersionId: data.unrealProjectVersionId,
            unrealProjectVersion: unrealProjectVersion,
            organizationId: data.organizationId,
            limit: data.limit,
            startTime: data.tailData.startTime,
            offset: data.tailData.offset,
            orderBy: data.tailData.orderBy,
        }) :
        // Error Mode
        await buildLogLastLinesQuery({
            unrealProjectVersionId: data.unrealProjectVersionId,
            unrealProjectVersion: unrealProjectVersion,
            organizationId: data.organizationId,
            limit: data.limit,
        });
    const bigQuery = new bigquery_1.BigQuery();
    const [job] = await bigQuery.createQueryJob(query);
    const result = await job.getQueryResults();
    const [rows] = result;
    const response = {
        lastIndex: data.tailData ? data.tailData.offset + rows.length : rows.length,
        logMessages: rows.map((row) => row.log_message),
    };
    return response;
});
exports.createNewUnrealProject = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    console.log("Document data:");
    console.log(JSON.stringify(data));
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, context.auth.uid);
    if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of organization");
    }
    const now = admin.firestore.Timestamp.now();
    const unrealProject = {
        organizationId: data.organizationId,
        name: data.name,
        updated: now,
        created: now,
    };
    const result = await (0, firestore_1.getUnrealProjectsRef)().add(unrealProject);
    const response = Object.assign({ id: result.id }, unrealProject);
    return response;
});
exports.createNewUnrealProjectVersion = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    console.log("Document data:");
    console.log(JSON.stringify(data));
    const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (userId == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, userId);
    if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of organization");
    }
    const [, unrealProject] = await getUnrealProject(data.unrealProjectId);
    if (unrealProject == undefined) {
        throw new functions.https.HttpsError("not-found", "Unreal project not found");
    }
    const projectName = data.projectName !== undefined ? data.projectName : unrealProject.name;
    if (projectName === undefined) {
        throw new functions.https.HttpsError("invalid-argument", "No project name supplied for project");
    }
    try {
        const unrealProjectVersionId = (0, uuid_1.v4)();
        const unrealProjectVersionRef = (0, firestore_1.getUnrealProjectVersionRef)(data.unrealProjectId, unrealProjectVersionId);
        const bucketName = functions.config().unrealprojectversionuploads.bucketname;
        const destinationName = generateProjectVersionDestinationName(data.organizationId, data.unrealProjectId, unrealProjectVersionId);
        const downloadUrl = "gs://" + bucketName + "/" + destinationName;
        const uploadUrl = await (0, googleStorage_1.createSignedUploadUrl)(bucketName, destinationName);
        if (uploadUrl == undefined) {
            throw new functions.https.HttpsError("internal", "Upload not available");
        }
        const now = admin.firestore.Timestamp.now();
        const unrealProjectVersion = {
            name: projectName,
            uploader: "bridgeCli",
            levelName: data.levelName,
            pluginVersionId: data.odysseyPluginVersionId,
            levelFilePath: data.levelFilePath,
            target: data.target,
            authorUserId: userId,
            updated: now,
            created: now,
            uploadUrl: uploadUrl,
            downloadUrl,
            unrealEngineVersion: (data.unrealEngineVersion != undefined) ? data.unrealEngineVersion : defaultUnrealEngineVersion,
        };
        await unrealProjectVersionRef.create(unrealProjectVersion);
        const response = Object.assign({ id: unrealProjectVersionId }, unrealProjectVersion);
        return response;
    }
    catch (e) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "An unknown internal error occurred");
    }
});
exports.newWebUploadedUnrealProjectAndVersion = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    console.log("Document data:");
    console.log(JSON.stringify(data));
    const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (userId == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    const organizationId = data.organizationId;
    if (organizationId == null || organizationId == undefined || organizationId.length < 1) {
        throw new Error("Must specify valid organizationId");
    }
    const userOrgRole = await (0, organizations_1.getUserOrgRole)(organizationId, userId);
    if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of organization");
    }
    const latestUnrealPluginVersion = await getLatestPluginVersion();
    if (latestUnrealPluginVersion == undefined) {
        console.error("Failed to find the latest unreal plugin version");
        throw new functions.https.HttpsError("internal", "An internal error occurred");
    }
    try {
        const existingUnrealProjectId = async (unrealProjectId) => {
            const [unrealProjectDoc, unrealProject] = await getUnrealProject(unrealProjectId);
            if (unrealProjectDoc === undefined || unrealProject === undefined) {
                console.error(`Unreal project: ${unrealProjectId} could not be found`);
                throw new functions.https.HttpsError("not-found", "Unreal project does not exist");
            }
            if (unrealProject.organizationId !== data.organizationId) {
                console.error(`Unreal project: ${unrealProjectId} does not belong to organization: ${data.organizationId}`);
                console.dir(unrealProject);
                throw new functions.https.HttpsError("not-found", "Unreal project does not exist");
            }
            try {
                console.debug(`Updating unreal project: ${unrealProjectId}`);
                await unrealProjectDoc.ref.update({ displayName: data.unrealProjectDisplayName, updated: admin.firestore.Timestamp.now() });
                return unrealProjectId;
            }
            catch (e) {
                console.error("An error occurred updating existing unreal project");
                console.dir(e);
                throw new functions.https.HttpsError("internal", "An internal error occurred");
            }
        };
        const newUnrealProjectId = async () => {
            const unrealProject = {
                organizationId,
                displayName: data.unrealProjectDisplayName,
                created: admin.firestore.Timestamp.now(),
                updated: admin.firestore.Timestamp.now(),
            };
            return (await (0, firestore_1.getUnrealProjectsRef)().add(unrealProject)).id;
        };
        const unrealProjectId = data.unrealProjectId !== undefined ?
            await existingUnrealProjectId(data.unrealProjectId) :
            await newUnrealProjectId();
        const unrealProjectVersionId = (0, uuid_1.v4)();
        const firebaseProject = (0, firebase_1.getFirebaseProjectId)();
        const destinationName = generateProjectVersionDestinationName(data.organizationId, unrealProjectId, unrealProjectVersionId);
        const storageFilePath = `unrealProjects/${destinationName}`;
        const bucket = `${firebaseProject}.appspot.com`;
        const uploadUrl = `https://storage.googleapis.com/${bucket}/${storageFilePath}`;
        const target = data.target || "Development";
        const unrealEngineVersion = defaultUnrealEngineVersion;
        const unrealProjectVersion = {
            levelName: "",
            levelFilePath: "",
            selfPackaged: data.selfPackaged,
            uploadUrl,
            target,
            downloadUrl: `gs://${bucket}/${storageFilePath}`,
            created: admin.firestore.Timestamp.now(),
            updated: admin.firestore.Timestamp.now(),
            authorUserId: userId,
            uploader: "webClient",
            unrealEngineVersion,
            state: "new",
            pluginVersionId: latestUnrealPluginVersion.doc.id,
        };
        await (0, firestore_1.getUnrealProjectVersionRef)(unrealProjectId, unrealProjectVersionId).create(unrealProjectVersion);
        const response = {
            uploadUrl,
            unrealProjectVersionId,
            unrealEngineVersion,
            target,
            organizationId,
            unrealProjectId,
        };
        return response;
    }
    catch (e) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "An unknown internal error occurred");
    }
});
exports.notifyUnrealProjectVersionUploaded = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    console.log("Document data:");
    console.log(JSON.stringify(data));
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, context.auth.uid);
    if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of organization");
    }
    const [, unrealProject] = await getUnrealProject(data.unrealProjectId);
    if (unrealProject == undefined) {
        throw new functions.https.HttpsError("not-found", "Unreal project not found");
    }
    const [unrealProjectVersionDoc, unrealProjectVersion] = await getUnrealProjectVersion(data.unrealProjectId, data.unrealProjectVersionId);
    if (unrealProjectVersion == undefined || unrealProjectVersionDoc == undefined) {
        throw new functions.https.HttpsError("not-found", "Unreal project version not found");
    }
    try {
        const now = admin.firestore.Timestamp.now();
        if (data.failed === true) {
            const updatePayload = {
                state: "upload-failed",
                updated: now,
            };
            await unrealProjectVersionDoc.ref.update(updatePayload);
            return;
        }
        const bucketName = (() => {
            if (unrealProjectVersion.uploader == "webClient") {
                const firebaseProject = (0, firebase_1.getFirebaseProjectId)();
                return `${firebaseProject}.appspot.com`;
            }
            else {
                return functions.config().unrealprojectversionuploads.bucketname;
            }
        })();
        const destinationName = generateProjectVersionDestinationName(data.organizationId, data.unrealProjectId, unrealProjectVersionDoc.id);
        const storageFilePath = (() => {
            if (unrealProjectVersion.uploader == "webClient")
                return "unrealProjects/" + destinationName;
            return destinationName;
        })();
        const exists = await checkUploadedFileExists(bucketName, storageFilePath);
        if (!exists) {
            const updatePayload = {
                state: "upload-invalid",
                updated: now,
            };
            await unrealProjectVersionDoc.ref.update(updatePayload);
            throw new functions.https.HttpsError("not-found", "Uploaded file does not exist");
        }
        const updatePayload = {
            state: "upload-complete",
            updated: now,
            uploadSha256Sum: data.sha256Sum,
        };
        await unrealProjectVersionDoc.ref.update(updatePayload);
        return;
    }
    catch (e) {
        throw new functions.https.HttpsError("internal", "Failed to update unreal project version");
    }
});
async function ensureBridgeSpaceTemplateExists(existingTemplates, newTemplate) {
    if (existingTemplates.length === 1) {
        return existingTemplates[0];
    }
    if (existingTemplates.length > 1) {
        console.warn(`There are ${existingTemplates.length} templates for unreal project: ${newTemplate.unrealProjectId}`);
        return existingTemplates[0];
    }
    const templateRef = admin.firestore().collection("bridgeSpaceTemplates").doc();
    const templateContents = {
        type: "Bridge",
        public: false,
        hasSpaceItems: true,
        created: admin.firestore.Timestamp.now(),
        updated: admin.firestore.Timestamp.now(),
        description: newTemplate.unrealProject.description || "",
        orgOwner: [newTemplate.unrealProject.organizationId],
        name: newTemplate.unrealProject.name || "",
        thumb: newTemplate.unrealProject.thumb || newTemplate.unrealProjectVersion.thumb || "",
        unrealProject: {
            unrealProjectId: newTemplate.unrealProjectId,
            unrealProjectVersionId: "latest"
        }
    };
    await templateRef.set(templateContents);
    return {
        doc: await templateRef.get(),
        template: templateContents
    };
}
async function getLatestPluginVersion(unrealEngineVersion) {
    try {
        const baseQuery = (0, firestore_1.getUnrealPluginVersionsRef)()
            .where("status", "in", ["supported", "supported-5.2"]);
        const withVersionFilter = unrealEngineVersion === undefined
            ? baseQuery
            : baseQuery.where("unrealEngineVersion", "==", unrealEngineVersion);
        const snapshot = await withVersionFilter.orderBy("created", "desc").limit(1).get();
        if (snapshot.empty) {
            return undefined;
        }
        const doc = snapshot.docs[0];
        return {
            doc,
            unrealPluginVersion: doc.data()
        };
    }
    catch (error) {
        console.error("Failed to get latest unreal plugin version:", error);
        return undefined;
    }
}
exports.onUpdateUnrealProjectMetadata = 
// onWrite() of unreal project
// update any metadata to space template
functions
    .runWith(Object.assign(Object.assign({}, shared_1.customRunWithWarm), { timeoutSeconds: 540 }))
    .firestore
    .document((0, firestore_1.unrealProjectWildcardPath)())
    .onWrite(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    const changeType = (0, util_1.getChangeType)(change);
    if (changeType == firestore_bigquery_change_tracker_1.ChangeType.DELETE || changeType == firestore_bigquery_change_tracker_1.ChangeType.IMPORT) {
        console.debug(`Unreal project document ${changeType} does nothing.`);
        return;
    }
    const unrealProjectId = context.params.unrealProjectId;
    const unrealProject = change.after.data();
    const bridgeSpaceTemplates = await (0, firestore_1.getBridgeSpaceTemplates)(unrealProjectId);
    if (bridgeSpaceTemplates === undefined) {
        console.debug("Unreal project has no space templates to update.");
        return;
    }
    await Promise.all(bridgeSpaceTemplates.flatMap((template) => {
        const [templateDoc, templateData] = template;
        const updatedData = {};
        if ((unrealProject === null || unrealProject === void 0 ? void 0 : unrealProject.displayName) != undefined && (templateData === null || templateData === void 0 ? void 0 : templateData.name) !== (unrealProject === null || unrealProject === void 0 ? void 0 : unrealProject.displayName))
            updatedData.name = unrealProject.displayName;
        if ((unrealProject === null || unrealProject === void 0 ? void 0 : unrealProject.thumb) != undefined && (templateData === null || templateData === void 0 ? void 0 : templateData.thumb) !== (unrealProject === null || unrealProject === void 0 ? void 0 : unrealProject.thumb))
            updatedData.thumb = unrealProject.thumb;
        return templateDoc === null || templateDoc === void 0 ? void 0 : templateDoc.ref.set(updatedData, { merge: true });
    }));
});
function unrealProjectVersionWildcardPath() {
    return "organizations/{organizationId}/unrealProjects/{unrealProjectId}/versions/{unrealProjectVersionId}";
}
exports.onUpdateUnrealProjectVersion = 
// onWrite() of unreal project version
// Build the unreal project version or whatever
functions
    .runWith(Object.assign(Object.assign({}, shared_1.customRunWithWarm), { timeoutSeconds: 540 }))
    .firestore
    .document(unrealProjectVersionWildcardPath())
    .onWrite(async (change, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const projectId = (0, firebase_1.getFirebaseProjectId)();
    console.log("Document context:");
    console.log(JSON.stringify(context));
    const _changeType = (0, util_1.getChangeType)(change);
    if (!change.after.exists) {
        console.log("Document was deleted");
        return;
    }
    const unrealProjectVersionId = context.params.unrealProjectVersionId;
    const unrealProjectId = context.params.unrealProjectId;
    const unrealProjectVersionRef = (0, firestore_1.getUnrealProjectVersionRef)(unrealProjectId, unrealProjectVersionId);
    const unrealProjectRef = getUnrealProjectRef(unrealProjectId);
    const unrealProjectVersion = change.after.data();
    const unrealProject = (await unrealProjectRef.get()).data();
    const _volumeRegionsComplete = unrealProjectVersion.volumeCopyRegionsComplete;
    const volumeRegions = unrealProjectVersion.volumeCopyRegions;
    switch (unrealProjectVersion.state) {
        // Volume copy complete
        case "volume-copy-region-complete": {
            if (volumeRegions != undefined &&
                _volumeRegionsComplete != undefined &&
                volumeRegions.length > 0 &&
                _volumeRegionsComplete.length == volumeRegions.length) {
                if (_volumeRegionsComplete.filter((region) => volumeRegions.includes(region)).length == volumeRegions.length) {
                    console.debug("All volume regions complete");
                    const buildLogUrl = await exportBuilderLogs(unrealProjectVersionId, unrealProjectVersion, unrealProjectId, unrealProject, projectId, "build");
                    const systemLogUrl = await exportBuilderLogs(unrealProjectVersionId, unrealProjectVersion, unrealProjectId, unrealProject, projectId, "system");
                    return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-complete", buildLogUrl, systemLogUrl });
                }
                else {
                    console.debug("Not all volume regions have completed copying");
                }
            }
            break;
        }
        // Document change states -> Document phase states
        case "builder-update-unreal-project-name":
        case "builder-settings-uploaded": {
            // Informational states
            return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "builder-building" });
        }
        case "package-validator-updating-project-path":
        case "package-validator-updating-unreal-project-name": {
            return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "package-validator-validating" });
        }
        //
        case "builder-pod-waiting-for-ready": {
            if (unrealProjectVersion.lastPingFromBuilder != undefined) {
                return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "builder-pod-ready" });
            }
            break;
        }
        case "volume-copy-pods-waiting-for-ready": {
            if (unrealProjectVersion.lastPingFromVolumeCopyRegion != undefined) {
                return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-region-copying" });
            }
            break;
        }
        case "package-validator-required": {
            if (unrealProjectVersion.bridgeToolkitFileSettings == undefined) {
                console.debug(`Setting default bridgeToolkitFileSettings: ${unrealProjectVersionRef.path}`);
                const defaultBridgeToolkitFileSettings = {
                    levels: {},
                    supportsMultiplayer: false,
                    customCharacterClass: true,
                    configurator: false,
                };
                await (0, firestore_1.getUnrealProjectVersionRef)(unrealProjectId, unrealProjectVersionId).update({ bridgeToolkitFileSettings: defaultBridgeToolkitFileSettings });
            }
            try {
                const deployResult = await deployUnrealProjects.deployPackageValidatorPod(projectId, (0, shared_2.getConfigurationUnrealProjectVersion)({
                    organizationId: unrealProject.organizationId,
                    authorUserId: unrealProjectVersion.authorUserId,
                    unrealProjectVersionId,
                    unrealProjectId,
                }), unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion);
                if (!deployResult) {
                    console.error(`Deploy failed: ${unrealProjectVersionRef.path}`);
                    return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "package-validator-failed" });
                }
                return true;
            }
            catch (error) {
                console.error(`Deploy error: ${error}`);
                return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "package-validator-failed" });
            }
        }
        case "upload-complete": {
            if (unrealProjectVersion.selfPackaged === true) {
                console.debug(`Self packaged upload. Package validation required: ${(0, firestore_1.getUnrealProjectVersionRef)(unrealProjectId, unrealProjectVersionId).path}`);
                return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "package-validator-required" });
            }
            const latestPluginVersion = await getLatestPluginVersion(unrealProjectVersion.unrealEngineVersion);
            if (latestPluginVersion == undefined) {
                throw new Error("Couldn't resolve latest compatible plugin version");
            }
            try {
                const resolvedUnrealPluginVersion = latestPluginVersion.unrealPluginVersion;
                return await deployUnrealProjects.deployBuilderPod(projectId, (0, shared_2.getConfigurationUnrealProjectVersion)({
                    organizationId: unrealProject.organizationId,
                    authorUserId: unrealProjectVersion.authorUserId,
                    unrealProjectVersionId,
                    unrealProjectId,
                }), unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, latestPluginVersion.doc.id, resolvedUnrealPluginVersion);
            }
            catch (e) {
                console.error("Failed to deploy builder pod");
                console.error(e);
                return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "builder-pod-failed-to-create" });
            }
        }
        case "package-validator-complete": {
            try {
                await deployUnrealProjects.deletePackageValidatorPodStack(unrealProjectVersionId);
            }
            catch (e) {
                console.error(`Failed to delete package validator pod stack: ${unrealProjectId}/${unrealProjectVersionId}`);
            }
            try {
                return await deployUnrealProjects.deployVolumeCopyPodStacks(projectId, (0, shared_2.getConfigurationUnrealProjectVersion)({
                    organizationId: unrealProject.organizationId,
                    authorUserId: unrealProjectVersion.authorUserId,
                    unrealProjectVersionId,
                    unrealProjectId,
                }), unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion);
            }
            catch (e) {
                await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-failed-to-create" });
                throw e;
            }
        }
        case "package-validator-failed": {
            try {
                await deployUnrealProjects.deletePackageValidatorPodStack(unrealProjectVersionId);
            }
            catch (e) {
                console.error(`Failed to delete package validator pod stack: ${unrealProjectId}/${unrealProjectVersionId}`);
            }
            break;
        }
        case "package-validator-retrying": {
            const maximumPackageValidatorRetries = 3;
            try {
                await deployUnrealProjects.deletePackageValidatorPodStack(unrealProjectVersionId);
            }
            catch (e) {
                return console.error(`Failed to delete package validator pod stack: ${unrealProjectId}/${unrealProjectVersionId}`);
            }
            if (unrealProjectVersion.packageValidatorRetries != undefined && unrealProjectVersion.packageValidatorRetries >= maximumPackageValidatorRetries) {
                console.error(`Exceeded package validator retry threshold of ${maximumPackageValidatorRetries}: ${unrealProjectId}/${unrealProjectVersionId}`);
                return await deployUnrealProjects.updateUnrealProjectVersionState({
                    unrealProjectId,
                    unrealProjectVersionId,
                    state: "package-validator-failed",
                });
            }
            console.error(`Retrying unreal project version: ${unrealProjectId}/${unrealProjectVersionId}`);
            return await deployUnrealProjects.updateUnrealProjectVersionState({
                unrealProjectId,
                unrealProjectVersionId,
                state: "upload-complete",
                incrementPackageValidatorRetries: true,
            });
        }
        case "builder-upload-complete": {
            try {
                await deployUnrealProjects.deleteBuilderPodStack(unrealProjectVersionId);
            }
            catch (e) {
                console.error(`Failed to delete builder pod stack: ${unrealProjectId}/${unrealProjectVersionId}`);
            }
            try {
                return await deployUnrealProjects.deployVolumeCopyPodStacks(projectId, (0, shared_2.getConfigurationUnrealProjectVersion)({
                    organizationId: unrealProject.organizationId,
                    authorUserId: unrealProjectVersion.authorUserId,
                    unrealProjectVersionId,
                    unrealProjectId,
                }), unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion);
            }
            catch (e) {
                await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-failed-to-create" });
                throw e;
            }
        }
        case "builder-retrying": {
            const maximumBuilderRetries = 3;
            try {
                await deployUnrealProjects.deleteBuilderPodStack(unrealProjectVersionId);
            }
            catch (e) {
                return console.error(`Failed to delete builder pod stack: ${unrealProjectId}/${unrealProjectVersionId}`);
            }
            if (unrealProjectVersion.builderRetries != undefined && unrealProjectVersion.builderRetries >= maximumBuilderRetries) {
                console.error(`Exceeded builder retry threshold of ${maximumBuilderRetries}: ${unrealProjectId}/${unrealProjectVersionId}`);
                return await deployUnrealProjects.updateUnrealProjectVersionState({
                    unrealProjectId,
                    unrealProjectVersionId,
                    state: "builder-failed",
                });
            }
            console.error(`Retrying unreal project version: ${unrealProjectId}/${unrealProjectVersionId}`);
            return await deployUnrealProjects.updateUnrealProjectVersionState({
                unrealProjectId,
                unrealProjectVersionId,
                state: "upload-complete",
                incrementBuilderRetries: true,
                lastPingFromBuilder: admin.firestore.FieldValue.delete(),
            });
        }
        // case "timed-out-creating-build-pod":
        case "builder-pod-failed-to-create":
        case "failed-missing-unreal-project":
        case "builder-failed":
        case "odyssey-plugin-version-invalid":
        case "builder-downloading-project-version-failed":
        case "builder-finding-project-file-failed":
        case "upload-invalid": {
            const buildLogUrl = await exportBuilderLogs(unrealProjectVersionId, unrealProjectVersion, unrealProjectId, unrealProject, projectId, "build");
            const systemLogUrl = await exportBuilderLogs(unrealProjectVersionId, unrealProjectVersion, unrealProjectId, unrealProject, projectId, "system");
            await deployUnrealProjects.deleteBuilderPodStack(unrealProjectVersionId);
            return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: unrealProjectVersion.state, buildLogUrl, systemLogUrl });
            // TODO: Delete uploaded project zip. Although might be worth waiting N days in case the failure was caused by system
        }
        case "volume-copy-failed":
        case "volume-copy-pods-failed":
        case "volume-copy-pods-failed-to-create":
        case "volume-copy-pods-timed-out-creating": {
            if (volumeRegions === undefined) {
                console.error("Volume regions not set");
                return;
            }
            const state = unrealProjectVersion.state;
            if (state == undefined) {
                console.error("Seemingly impossible condition in case - unreal project version `state` is undefined");
                return;
            }
            const buildLogs = async () => {
                const buildLogUrl = await exportBuilderLogs(unrealProjectVersionId, unrealProjectVersion, unrealProjectId, unrealProject, projectId, "build");
                const systemLogUrl = await exportBuilderLogs(unrealProjectVersionId, unrealProjectVersion, unrealProjectId, unrealProject, projectId, "system");
                return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state, buildLogUrl, systemLogUrl });
            };
            const result = await Promise.allSettled([
                deployUnrealProjects.deleteVolumeCopyPodStack(unrealProjectVersionId, volumeRegions),
                deployUnrealProjects.deleteVolumeCopyPvcs(unrealProjectVersionId, volumeRegions),
                buildLogs,
            ]);
            if (result[2].status == "rejected") {
                console.error(result[2].reason);
                console.error(`Failed to export build logs for unreal project version ${unrealProjectVersionId}`);
            }
            return;
        }
        case "volume-copy-pvcs-failed": {
            if (volumeRegions === undefined) {
                console.error("Volume regions not set");
                return;
            }
            const state = unrealProjectVersion.state;
            if (state == undefined) {
                console.error("Seemingly impossible condition in case - unreal project version `state` is undefined");
                return;
            }
            return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-retrying" });
        }
        case "volume-copy-complete": {
            if (volumeRegions === undefined) {
                console.error("Volume regions not set");
                return false;
            }
            // Delete current volume copy pod stack
            await deployUnrealProjects.deleteVolumeCopyPodStack(unrealProjectVersionId, volumeRegions);
            const bridgeTemplates = (_a = (await (0, firestore_1.getBridgeSpaceTemplates)(unrealProjectId))) === null || _a === void 0 ? void 0 : _a.flatMap((templateDoc) => {
                const [templateRef, template] = templateDoc;
                if (templateRef === undefined || template === undefined)
                    return [];
                return [{ templateRef, template }];
            });
            const bridgeTemplateCount = bridgeTemplates == undefined ? 0 : bridgeTemplates.length;
            console.debug(`Got ${bridgeTemplateCount} templates for unreal project ${unrealProjectId}`);
            const spaceTemplate = await ensureBridgeSpaceTemplateExists(bridgeTemplates !== null && bridgeTemplates !== void 0 ? bridgeTemplates : [], { unrealProjectId: unrealProjectId, unrealProject: unrealProject, unrealProjectVersion: unrealProjectVersion });
            const derivedSpaceDocs = (_c = (await (0, firestore_1.getDerivedSpacesWithSpaceTemplate)((_b = spaceTemplate.doc) === null || _b === void 0 ? void 0 : _b.id))) === null || _c === void 0 ? void 0 : _c.flatMap(([doc, space]) => {
                if (doc == undefined || space == undefined)
                    return [];
                return [{
                        doc,
                        space,
                    }];
            });
            console.debug(`Found ${derivedSpaceDocs != undefined ? derivedSpaceDocs.length : 0} space docs derived from ${(_d = spaceTemplate.doc) === null || _d === void 0 ? void 0 : _d.ref.path}`);
            // TODO: create settings space item and space tempalte items
            const bridgeSettingsTemplateItem = await (0, shared_2.createUpdateBridgeToolkitSettingsTemplateItem)((_e = spaceTemplate.doc) === null || _e === void 0 ? void 0 : _e.ref, unrealProjectVersion);
            if (bridgeSettingsTemplateItem === undefined) {
                console.log(`No BridgeToolkitSettings space item templated for space template ${(_f = spaceTemplate.doc) === null || _f === void 0 ? void 0 : _f.id}`);
            }
            else {
                if (derivedSpaceDocs !== undefined && derivedSpaceDocs.length > 0) {
                    await Promise.all(derivedSpaceDocs.map(async (spaceDoc) => {
                        return await (0, shared_2.createUpdateBridgeToolkitSettingsItem)(spaceDoc.doc.ref, bridgeSettingsTemplateItem);
                    }));
                }
            }
            const configuratorTemplateItems = await (0, shared_2.createConfiguratorTemplateItems)((_g = spaceTemplate.doc) === null || _g === void 0 ? void 0 : _g.ref, unrealProjectVersion);
            if (configuratorTemplateItems !== undefined && configuratorTemplateItems.length > 0) {
                console.log(`Configurator templated for unreal project ${unrealProjectId} with ${configuratorTemplateItems.length} items`);
                try {
                    console.log("Cleaning up old configurator item templates");
                    await (0, firestore_1.deleteOldConfiguratorSpaceTemplateItems)((_h = spaceTemplate.doc) === null || _h === void 0 ? void 0 : _h.id, configuratorTemplateItems.map((item) => item.itemTemplateId));
                }
                catch (e) {
                    console.error(`Failed to clean up old configurator item templates: ${e}`);
                }
                // NOTE: this is replicated in an onWrite handler for the Configurator SpaceTemplateItems in ./cms.ts
                if (derivedSpaceDocs !== undefined && derivedSpaceDocs.length > 0) {
                    console.log("Derived spaces found");
                    derivedSpaceDocs.forEach(async (spaceDoc) => {
                        const configuratorItems = await (0, shared_2.createUpdateConfiguratorItems)(spaceDoc.doc.ref, configuratorTemplateItems);
                        if (configuratorItems === undefined) {
                            // Error logging is handled in function
                        }
                        else if (configuratorItems.length <= 0) {
                            console.log(`No configurator items created for ${spaceDoc.doc.id}`);
                        }
                        else {
                            console.log(`Created ${configuratorItems.length} configurator items`);
                        }
                    });
                }
                else {
                    console.log(`There are no spaces derived from space template ${(_j = spaceTemplate.doc) === null || _j === void 0 ? void 0 : _j.id}`);
                }
            }
            else {
                console.log(`No configurator items created for space template ${(_k = spaceTemplate.doc) === null || _k === void 0 ? void 0 : _k.id}`);
            }
            // Get all unreal project versions for the current project
            const unrealProjectVersionDocs = (await (0, firestore_1.getUnrealProjectVersionsRef)(unrealProjectId)
                .where("state", "==", "volume-copy-complete")
                .orderBy("created", "desc")
                .get()).docs;
            // Remove the last two versions
            const unrealProjectVersionDocsToExpire = unrealProjectVersionDocs.slice(2);
            return await Promise.allSettled([
                // Cycle through the rest and trigger volume-copy-expiring
                ...unrealProjectVersionDocsToExpire.map((version) => deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId: version.id, state: "volume-copy-expiring" })),
            ]);
        }
        case "volume-copy-retrying": {
            const maximumVolumeCopyRetries = 3;
            try {
                if (volumeRegions !== undefined)
                    await deployUnrealProjects.deleteVolumeCopyPvcs(unrealProjectVersionId, volumeRegions);
                if (volumeRegions !== undefined)
                    await deployUnrealProjects.deleteVolumeCopyPodStack(unrealProjectVersionId, volumeRegions);
            }
            catch (e) {
                return console.error(`Failed to delete volume copy pvc and/or pod stacks: ${unrealProjectId}/${unrealProjectVersionId}`);
            }
            if (unrealProjectVersion.volumeCopyRetries != undefined && unrealProjectVersion.volumeCopyRetries >= maximumVolumeCopyRetries) {
                console.error(`Exceeded volume copy retry threshold of ${maximumVolumeCopyRetries}: ${unrealProjectId}/${unrealProjectVersionId}`);
                return await deployUnrealProjects.updateUnrealProjectVersionState({
                    unrealProjectId,
                    unrealProjectVersionId,
                    state: "volume-copy-failed",
                });
            }
            console.error(`Retrying unreal project version: ${unrealProjectId}/${unrealProjectVersionId}`);
            return await deployUnrealProjects.updateUnrealProjectVersionState({
                unrealProjectId,
                unrealProjectVersionId,
                state: unrealProjectVersion.selfPackaged == true ? "package-validator-complete" : "builder-upload-complete",
                incrementVolumeCopyRetries: true,
                lastPingFromVolumeCopyRegion: admin.firestore.FieldValue.delete(),
            });
        }
        case "volume-copy-expiring":
            if (volumeRegions === undefined) {
                console.error("Volume regions not set");
                return;
            }
            await deployUnrealProjects.deleteVolumeCopyPvcs(unrealProjectVersionId, volumeRegions);
            return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "volume-copy-expired" });
        case "volume-copy-expired":
            console.debug(`Unreal project version expired: ${unrealProjectVersionId}`);
            return;
        case "expiring": {
            const validateUrl = async (fieldPath, url) => {
                if (url === undefined)
                    return undefined;
                const exists = await checkUploadedFileExists(url);
                if (exists)
                    return undefined;
                return { fieldPath, url };
            };
            const expiredArtifacts = (await Promise.all([
                await validateUrl("downloadUrl", unrealProjectVersion.downloadUrl),
                await validateUrl("packageArchiveUrl", unrealProjectVersion.packageArchiveUrl),
                await validateUrl("symbolsArchiveUrl", unrealProjectVersion.symbolsArchiveUrl),
            ].map(async (artifact) => {
                if (artifact === undefined) {
                    console.warn("Artifact is being skipped");
                    return undefined;
                }
                const bucketName = artifact.url.split("/")[2];
                console.log(`Deleting ${unrealProjectVersionRef.path} - ${artifact.fieldPath}: ${artifact.url}`);
                const deletionRequest = await (0, googleStorage_1.deleteArtifact)(bucketName, artifact.url.replace(`gs://${bucketName}/`, ""));
                if (deletionRequest === undefined || deletionRequest.statusCode < 200 || (deletionRequest.statusCode > 299 && deletionRequest.statusCode !== 404)) {
                    console.warn(`Deletion failed: ${deletionRequest}`);
                    return undefined;
                }
                return artifact.fieldPath;
            }))).flatMap((artifact) => {
                // Strip failed and skipped deletions
                if (artifact === undefined)
                    return [];
                return artifact;
            });
            if (volumeRegions !== undefined)
                await deployUnrealProjects.deleteVolumeCopyPvcs(unrealProjectVersionId, volumeRegions);
            return await deployUnrealProjects.updateUnrealProjectVersionState({ unrealProjectId, unrealProjectVersionId, state: "expired", expiredArtifacts });
        }
        default:
            return console.error(`Unhandled unreal project version state ${unrealProjectVersion.state}. Doing nothing.`);
    }
});
exports.retryStuckUnrealProjectVersions = 
// Every 5 minutes
// Find UPVs stuck in provisioning states for > 5 minutes and restart them
functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async (context) => {
    const stuckStates = ["builder-pod-waiting-for-ready", "package-validator-pod-waiting-for-ready", "volume-copy-pods-waiting-for-ready", "volume-copy-pvcs-creating", "volume-copy-region-copying"];
    const upvs = (await admin.firestore().collectionGroup("unrealProjectVersions").where("state", "in", stuckStates).get()).docs;
    console.debug(`Found ${upvs.length} unreal project versions in waiting states`);
    const fiveMinutesAgoMillis = new Date(context.timestamp).valueOf() - 60 * 5 * 1000;
    const fifteenMinutesAgoMillis = new Date(context.timestamp).valueOf() - 60 * 15 * 1000;
    const twentyFourHoursAgo = new Date(context.timestamp).valueOf() - 60 * 60 * 24 * 1000;
    const upvsToReset = upvs.flatMap((upvDoc) => {
        var _a;
        if (upvDoc.exists != true)
            return [];
        const upv = upvDoc.data();
        const lastStateChange = (_a = upv.stateChanges) === null || _a === void 0 ? void 0 : _a.reverse()[0];
        const isStuck = lastStateChange != undefined &&
            lastStateChange.state == upv.state &&
            upv.created.toMillis() >= twentyFourHoursAgo &&
            (lastStateChange.timestamp.toMillis() <= fiveMinutesAgoMillis || upv.updated.toMillis() <= fiveMinutesAgoMillis) &&
            (lastStateChange.state != "volume-copy-region-copying" || lastStateChange.timestamp.toMillis() <= fifteenMinutesAgoMillis);
        if (isStuck == false)
            return [];
        const resetStateOperation = (() => {
            switch (upv.state) {
                case "builder-pod-waiting-for-ready": return { builderRetries: admin.firestore.FieldValue.increment(1), state: "builder-retrying" };
                case "package-validator-pod-waiting-for-ready": return { packageValidatorRetries: admin.firestore.FieldValue.increment(1), state: "package-validator-retrying" };
                case "volume-copy-region-copying":
                case "volume-copy-pods-waiting-for-ready":
                case "volume-copy-pvcs-creating": return { volumeCopyRetries: admin.firestore.FieldValue.increment(1), state: "volume-copy-retrying" };
                default: return undefined;
            }
        })();
        if (resetStateOperation == undefined)
            return [];
        return { doc: upvDoc, unrealProjectVersion: upv, stateToResetTo: resetStateOperation };
    });
    console.debug(`Found ${upvsToReset.length} stuck unreal project versions`);
    await Promise.all(upvsToReset.map(async (upvToReset) => {
        try {
            console.error(`Resetting upv: ${upvToReset.doc.ref.path} to ${upvToReset.stateToResetTo}`);
            await upvToReset.doc.ref.update({
                state: upvToReset.stateToResetTo.state,
                volumeCopyRetries: upvToReset.stateToResetTo.volumeCopyRetries,
                packageValidatorRetries: upvToReset.stateToResetTo.packageValidatorRetries,
                builderRetries: upvToReset.stateToResetTo.builderRetries,
                updated: admin.firestore.Timestamp.now(),
            });
            return true;
        }
        catch (e) {
            console.error(`Failed to reset upv: ${upvToReset.doc.ref.path}`, e);
            return false;
        }
    }));
});
exports.cleanUpOldGCSFilesForUnrealProjectVersions = functions
    .runWith(shared_1.customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async (context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    const upvsToExpire = await (0, shared_2.getAllExpirableUnrealProjectVersions)();
    if (upvsToExpire.length === 0) {
        console.log("No UPVs to expire");
        return null;
    }
    console.log(`Found ${upvsToExpire.length} UPVs to expire`);
    return await (0, shared_2.expireUnrealProjectVersions)(upvsToExpire);
});
exports.updateUnrealProjectVersion = functions
    .runWith(shared_1.customRunWith)
    .pubsub.topic("updateUnrealProjectVersion")
    .onPublish(async (message, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(message));
    const payload = message.json;
    if (!payload.unrealProjectId || !payload.unrealProjectVersionId) {
        console.error("Missing required fields in payload");
        return null;
    }
    if (payload.source !== undefined) {
        console.debug(`Ping from ${payload.source}`);
        switch (payload.source) {
            case "package-validator": {
                return await (0, firestore_1.getUnrealProjectVersionRef)(payload.unrealProjectId, payload.unrealProjectVersionId).update({
                    lastPingFromBuilder: admin.firestore.Timestamp.now()
                });
            }
            case "volume-copy": {
                return await (0, firestore_1.getUnrealProjectVersionRef)(payload.unrealProjectId, payload.unrealProjectVersionId).update({
                    lastPingFromVolumeCopyRegion: admin.firestore.Timestamp.now()
                });
            }
            default: {
                console.warn(`Unknown source: ${payload.source}`);
                return null;
            }
        }
    }
    return null;
});
// When CICD finishes building a new plugin version, it hits this
exports.publishUnrealPluginVersion = functions
    .runWith(shared_1.customRunWith)
    .pubsub.topic("publishUnrealPluginVersion")
    .onPublish(async (data, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(data));
    const payload = data.json;
    if (payload.id == null || payload.id == undefined || payload.id.length < 1) {
        throw new Error("Must specify id");
    }
    if (payload.timestamp == null || payload.timestamp == undefined || payload.timestamp.length < 1) {
        throw new Error("Must specify timestamp");
    }
    if (payload.status == null || payload.status == undefined || !docTypes_1.UNREAL_PLUGIN_VERSION_STATE.includes(payload.status)) {
        throw new Error("Must specify a valid status");
    }
    if (payload.url == null || payload.url == undefined || payload.url.length < 1) {
        throw new Error("Must specify url");
    }
    if (payload.sha256Sum == null || payload.sha256Sum == undefined || payload.sha256Sum.length < 1) {
        throw new Error("Must specify sha256Sum");
    }
    if (payload.unzippedSizeMb == null || payload.unzippedSizeMb == undefined || isNaN(payload.unzippedSizeMb)) {
        throw new Error("Must specify unzippedSizeMb as a number");
    }
    if (payload.zippedSizeMb == null || payload.zippedSizeMb == undefined || isNaN(payload.unzippedSizeMb)) {
        throw new Error("Must specify zippedSizeMb as a number");
    }
    if (payload.toolkitUrl == null || payload.toolkitUrl == undefined || payload.toolkitUrl.length < 1) {
        throw new Error("Must specify toolkitUrl");
    }
    if (payload.toolkitSha256Sum == null || payload.toolkitSha256Sum == undefined || payload.toolkitSha256Sum.length < 1) {
        throw new Error("Must specify toolkitSha256Sum");
    }
    if (payload.toolkitUnzippedSizeMb == null || payload.toolkitUnzippedSizeMb == undefined || isNaN(payload.toolkitUnzippedSizeMb)) {
        throw new Error("Must specify toolkitUnzippedSizeMb as a number");
    }
    if (payload.toolkitZippedSizeMb == null || payload.toolkitZippedSizeMb == undefined || isNaN(payload.toolkitUnzippedSizeMb)) {
        throw new Error("Must specify toolkitZippedSizeMb as a number");
    }
    if (payload.regions == null || payload.regions == undefined || payload.regions.length < 1) {
        throw new Error("Must specify 'regions' with at least one region");
    }
    const unrealEngineVersion = (() => {
        if (payload.unrealEngineVersion == null || payload.unrealEngineVersion == undefined || !docTypes_1.SUPPORTED_UNREAL_ENGINE_VERSION.map((v) => String(v)).includes(payload.unrealEngineVersion)) {
            // HACK: Default unreal engine version
            return defaultUnrealEngineVersion;
        }
        return payload.unrealEngineVersion;
    })();
    const regions = (0, misc_1.convertSpaceSeparatedStringToArray)(payload.regions);
    if (regions.length < 1) {
        throw new Error("Must specify 'regions' with at least one region in space separated format. E.g. 'ORD1 LGA1 LAS1'");
    }
    const timestamp = new Date(Date.parse(payload.timestamp));
    const pluginVersion = {
        updated: admin.firestore.Timestamp.now(),
        created: admin.firestore.Timestamp.fromDate(timestamp),
        unrealEngineVersion,
        name: payload.id,
        url: payload.url,
        sha256Sum: payload.sha256Sum,
        zippedSizeMb: payload.zippedSizeMb,
        unzippedSizeMb: payload.unzippedSizeMb,
        toolkitUrl: payload.toolkitUrl,
        toolkitSha256Sum: payload.toolkitSha256Sum,
        toolkitZippedSizeMb: payload.toolkitZippedSizeMb,
        toolkitUnzippedSizeMb: payload.toolkitUnzippedSizeMb,
        status: payload.status,
        regions,
        dependencyPlugins: {},
    };
    return await (0, firestore_1.getUnrealPluginVersionRef)(payload.id).create(pluginVersion);
});
exports.expireUnrealProjectVersionsSchedule = functions
    .runWith(shared_1.customRunWithWarm)
    .pubsub.schedule("0 0 * * *")
    .timeZone("UTC")
    .onRun(async () => {
    const upvsToExpire = await (0, shared_2.getAllExpirableUnrealProjectVersions)();
    return await (0, shared_2.expireUnrealProjectVersions)(upvsToExpire);
});
async function expireUnrealProjectVersions(upvsToExpire) {
    try {
        const batch = admin.firestore().batch();
        const expiredArtifacts = [];
        const now = admin.firestore.Timestamp.now();
        for (const upv of upvsToExpire) {
            const ref = (0, firestore_1.getUnrealProjectVersionRef)(upv.ref.parent.parent.id, upv.ref.id);
            const stateChange = {
                timestamp: now,
                state: "expired"
            };
            batch.update(ref, {
                state: "expired",
                stateChanges: admin.firestore.FieldValue.arrayUnion(stateChange),
                expiredArtifacts: admin.firestore.FieldValue.arrayUnion(...expiredArtifacts)
            });
        }
        await batch.commit();
        return { success: true };
    }
    catch (error) {
        console.error("Error expiring unreal project versions:", error);
        return { success: false };
    }
}
exports.expireUnrealProjectVersions = expireUnrealProjectVersions;
async function getUnrealProject(unrealProjectId) {
    const unrealProjectRef = (0, firestore_1.getUnrealProjectsRef)().doc(unrealProjectId);
    const unrealProjectDoc = await unrealProjectRef.get();
    const unrealProject = unrealProjectDoc.data();
    return [unrealProjectDoc, unrealProject];
}
async function getUnrealProjectVersion(unrealProjectId, unrealProjectVersionId) {
    const unrealProjectVersionRef = (0, firestore_1.getUnrealProjectVersionRef)(unrealProjectId, unrealProjectVersionId);
    const unrealProjectVersionDoc = await unrealProjectVersionRef.get();
    const unrealProjectVersion = unrealProjectVersionDoc.data();
    return [unrealProjectVersionDoc, unrealProjectVersion];
}
async function _getLatestUnrealProjectVersion(unrealProjectId) {
    try {
        let query = unrealProjectId ?
            (0, firestore_1.getUnrealProjectVersionsRef)(unrealProjectId).withConverter({
                toFirestore: (data) => data,
                fromFirestore: (snap) => snap.data()
            }) :
            (0, firestore_1.getUnrealProjectVersionsCollectionGroup)().withConverter({
                toFirestore: (data) => data,
                fromFirestore: (snap) => snap.data()
            });
        query = query.orderBy("created", "desc").limit(1);
        const snapshot = await query.get();
        if (snapshot.empty)
            return undefined;
        const doc = snapshot.docs[0];
        return [doc, doc.data()];
    }
    catch (error) {
        console.error("Error getting latest unreal project version:", error);
        return undefined;
    }
}
exports._getLatestUnrealProjectVersion = _getLatestUnrealProjectVersion;
async function _getSpecifiedUnrealProjectVersion(unrealProjectId, unrealProjectVersionId) {
    try {
        const docRef = (0, firestore_1.getUnrealProjectVersionRef)(unrealProjectId, unrealProjectVersionId).withConverter({
            toFirestore: (data) => data,
            fromFirestore: (snap) => snap.data()
        });
        const doc = await docRef.get();
        if (!doc.exists)
            return undefined;
        return [doc, doc.data()];
    }
    catch (error) {
        console.error("Error getting specified unreal project version:", error);
        return undefined;
    }
}
exports._getSpecifiedUnrealProjectVersion = _getSpecifiedUnrealProjectVersion;
async function _validateUrl(fieldPath, url) {
    if (url === undefined)
        return undefined;
    const exists = await checkUploadedFileExists(url);
    if (exists)
        return undefined;
    const bucketName = url.split("/")[2];
    return { fieldPath, url, bucketName };
}
exports._validateUrl = _validateUrl;
// @ts-ignore - Node.js 16 compatibility: allow function redeclaration
async function buildLogTailQuery(data) {
    var _a;
    // Get the earliest instance the unreal project version was changed to "builder-building" since the given start time
    // Currently only the UE build logs are being exported
    const tailableStateChanges = (_a = data.unrealProjectVersion.stateChanges) === null || _a === void 0 ? void 0 : _a.filter((state) => state.state === "builder-building").filter((state) => state.timestamp.toDate().getTime() > data.startTime.getTime()).sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
    const tailableStateChange = tailableStateChanges ? tailableStateChanges.length <= 0 ? data.unrealProjectVersion.created : tailableStateChanges[0].timestamp : data.unrealProjectVersion.created;
    const tailableDate = tailableStateChange.toDate();
    const firebaseProjectId = (0, firebase_1.getFirebaseProjectId)();
    // TODO: the log line formatting should be moved to the fluentd config
    const query = `
  SELECT
    CONCAT("[", time, "] ", rawmessage) AS log_message
  FROM
    \`${firebaseProjectId}.logging.unreal_project_version_build_logs\`
  WHERE
    organization_id = @organization_id
  AND
    unreal_project_version_id = @project_version_id
  AND
    source_path = "/logs/build/Log.txt"
  AND
    time >= @start_time_bq
  ORDER BY time ${data.orderBy.toUpperCase()}
  LIMIT @limit_amount OFFSET @offset_amount
  `;
    const params = {
        organization_id: data.organizationId,
        project_version_id: data.unrealProjectVersionId,
        start_time_bq: bigquery_1.BigQuery.timestamp(tailableDate),
        limit_amount: data.limit,
        offset_amount: data.offset,
    };
    return {
        query,
        params,
        projectId: firebaseProjectId,
        useLegacySql: false,
    };
}
exports.buildLogTailQuery = buildLogTailQuery;
// @ts-ignore - Node.js 16 compatibility: allow function redeclaration
async function buildLogLastLinesQuery(data) {
    const firebaseProjectId = (0, firebase_1.getFirebaseProjectId)();
    // TODO: the log line formatting should be moved to the fluentd config
    const query = `
  SELECT
    log_message
  FROM (
    SELECT
      CONCAT("[", time, "] ", rawmessage) AS log_message,
      time
    FROM
      \`${firebaseProjectId}.logging.unreal_project_version_build_logs\`
    WHERE
      organization_id = @organization_id
    AND
      unreal_project_version_id = @project_version_id
    AND
      source_path = "/logs/build/Log.txt"
    AND
      time <= @end_time_bq
    ORDER BY time DESC
    LIMIT @limit_amount
  ) ORDER BY time ASC
  `;
    const params = {
        organization_id: data.organizationId,
        project_version_id: data.unrealProjectVersionId,
        end_time_bq: bigquery_1.BigQuery.timestamp(new Date()),
        limit_amount: data.limit,
    };
    return {
        query,
        params,
        projectId: firebaseProjectId,
        useLegacySql: false,
    };
}
exports.buildLogLastLinesQuery = buildLogLastLinesQuery;
// @ts-ignore - Node.js 16 compatibility: allow Promise type mismatch
async function deployPackageValidatorPod(projectId, unrealProjectVersion, unrealProjectId, unrealProject, unrealProjectVersionId, pluginVersionId, pluginVersion) {
    // TODO: implement
    return true;
}
// @ts-ignore - Node.js 16 compatibility: allow Promise type mismatch
async function deployBuilderPod(projectId, unrealProjectVersion, unrealProjectId, unrealProject, unrealProjectVersionId, pluginVersionId, pluginVersion) {
    // TODO: implement
    return true;
}
// @ts-ignore - Node.js 16 compatibility: allow Promise type mismatch
async function deployVolumeCopyPodStacks(projectId, unrealProjectVersion, unrealProjectId, unrealProject, unrealProjectVersionId) {
    // TODO: implement
    return true;
}
// @ts-ignore - Node.js 16 compatibility: allow missing second argument
async function checkUploadedFileExists(url) {
    // TODO: implement
    return true;
}
// @ts-ignore - Node.js 16 compatibility: allow function redeclaration
async function expireUnrealProjectVersions(upvsToExpire) {
    try {
        const batch = admin.firestore().batch();
        const expiredArtifacts = [];
        const now = admin.firestore.Timestamp.now();
        for (const upv of upvsToExpire) {
            const ref = (0, firestore_1.getUnrealProjectVersionRef)(upv.ref.parent.parent.id, upv.ref.id);
            const stateChange = {
                timestamp: now,
                state: "expired"
            };
            batch.update(ref, {
                state: "expired",
                stateChanges: admin.firestore.FieldValue.arrayUnion(stateChange),
                expiredArtifacts: admin.firestore.FieldValue.arrayUnion(...expiredArtifacts)
            });
        }
        await batch.commit();
        return { success: true };
    }
    catch (error) {
        console.error("Error expiring unreal project versions:", error);
        return { success: false };
    }
}
exports.expireUnrealProjectVersions = expireUnrealProjectVersions;
// @ts-ignore - Node.js 16 compatibility: allow function redeclaration
async function getUnrealProject(unrealProjectId) {
    const unrealProjectRef = (0, firestore_1.getUnrealProjectsRef)().doc(unrealProjectId);
    const unrealProjectDoc = await unrealProjectRef.get();
    const unrealProject = unrealProjectDoc.data();
    return [unrealProjectDoc, unrealProject];
}
// @ts-ignore - Node.js 16 compatibility: allow function redeclaration
async function getUnrealProjectVersion(unrealProjectId, unrealProjectVersionId) {
    const unrealProjectVersionRef = (0, firestore_1.getUnrealProjectVersionRef)(unrealProjectId, unrealProjectVersionId);
    const unrealProjectVersionDoc = await unrealProjectVersionRef.get();
    const unrealProjectVersion = unrealProjectVersionDoc.data();
    return [unrealProjectVersionDoc, unrealProjectVersion];
}
exports.getAllUnrealProjects = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    console.log("Request data from organization:");
    console.log(JSON.stringify(data));
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, context.auth.uid);
    if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not in organization");
    }
    const unrealProjects = await (0, firestore_1.getUnrealProjectsRef)(data.organizationId).get();
    const unrealProjectsWithVersions = await Promise.all(unrealProjects.docs.map(async (unrealProjectDoc) => {
        const unrealProject = unrealProjectDoc.data();
        const unrealProjectVersions = await (0, firestore_1.getUnrealProjectVersionsRef)(data.organizationId, unrealProjectDoc.id).get();
        return Object.assign(Object.assign({ id: unrealProjectDoc.id }, unrealProject), { versions: unrealProjectVersions.docs.map((unrealProjectVersionDoc) => {
                const unrealProjectVersion = unrealProjectVersionDoc.data();
                return Object.assign({ id: unrealProjectVersionDoc.id }, unrealProjectVersion);
            }) });
    }));
    return {
        unrealProjects: unrealProjectsWithVersions,
    };
});
//# sourceMappingURL=unrealProjects.js.map