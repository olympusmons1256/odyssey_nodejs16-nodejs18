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
exports.writes = exports.reads = void 0;
const functions = __importStar(require("firebase-functions"));
const bigquery_1 = require("@google-cloud/bigquery");
const shared_1 = require("./shared");
const firebase_1 = require("./lib/firebase");
const firestore_1 = require("./lib/documents/firestore");
const organizations_1 = require("./lib/organizations");
const utils_1 = require("./lib/utils");
function runtimeLogsQuery(data) {
    const firebaseProjectId = (0, firebase_1.getFirebaseProjectId)();
    const targetPod = "ue4ClientPod";
    const yesterday = function () {
        const now = new Date();
        now.setDate(now.getDate() - 1);
        return now;
    }();
    const roomId = data.roomId !== undefined ? `AND room_id = ${data.roomId}` : "";
    const startTime = data.startTime !== undefined && !isNaN(data.startTime.getUTCMilliseconds()) ?
        bigquery_1.BigQuery.timestamp(data.startTime.getUTCMilliseconds()) :
        data.endTime !== undefined && !isNaN(data.endTime.getUTCMilliseconds()) ? // If the endTime is valid, don't render the default startTime
            "" : bigquery_1.BigQuery.timestamp(yesterday.getUTCMilliseconds());
    const endTime = data.endTime !== undefined && !isNaN(data.endTime.getUTCMilliseconds()) ?
        `AND time < TIMESTAMP("${bigquery_1.BigQuery.timestamp(data.endTime.getUTCMilliseconds())}")` : "";
    const order = data.order !== undefined ? data.order.toUpperCase() : "DESC";
    const limit = data.limit !== undefined && data.limit > 0 && Number.isInteger(data.limit) ? data.limit : 1000;
    const offset = data.offset !== undefined && data.offset > 0 && Number.isInteger(data.offset) ? data.offset : 0;
    const query = `
  SELECT
    time,
    ue4phase as phase,
    ue4module as module,
    message,
    rawmessage
  FROM
    \`${firebaseProjectId}.logging.${targetPod}\`
  WHERE organization_id = @organization_id
  AND space_id = @space_id
  AND NOT firebase_emulator
  AND time > TIMESTAMP(@start_time)
  ${endTime}
  ${roomId}
  ORDER BY time ${order}
  LIMIT @limit_amount OFFSET @offset_amount
  `;
    const params = {
        organization_id: data.organizationId,
        space_id: data.spaceId,
        start_time: startTime,
        limit_amount: limit,
        offset_amount: offset,
    };
    return {
        query,
        params,
        projectId: firebaseProjectId,
        useLegacySql: false,
    };
}
const getRuntimeLogs = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data, context) => {
    var _a;
    console.log("Document data:");
    console.log(JSON.stringify(data));
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) === undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
    }
    const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, context.auth.uid);
    if (userOrgRole === undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of organization");
    }
    const query = runtimeLogsQuery({
        organizationId: data.organizationId,
        spaceId: data.spaceId,
        roomId: data.roomId,
        startTime: data.startTime,
        endTime: data.endTime,
        limit: data.limit,
        offset: data.offset,
        order: data.order,
    });
    console.debug(`Query: ${JSON.stringify(query)}`);
    const bigQuery = new bigquery_1.BigQuery();
    const [job] = await bigQuery.createQueryJob(query);
    const result = await job.getQueryResults();
    const [rows] = result;
    const response = rows.flatMap((row) => {
        if (row.rawmessage === undefined)
            return [];
        return {
            time: row.time,
            phase: row.phase,
            module: row.module,
            message: row.message,
            rawmessage: row.rawmessage,
        };
    });
    return {
        lastIndex: data.offset !== undefined ? data.offset + rows.length : rows.length,
        data: response,
    };
});
async function updateUnrealProjectSpaceCount(unrealProjectId, existingSpace) {
    try {
        const [unrealProjectDoc, unrealProject] = await (0, firestore_1.getUnrealProject)(unrealProjectId);
        if (unrealProjectDoc === undefined || unrealProject === undefined) {
            console.error("Unreal project does not exist");
            return "project-not-exist";
        }
        console.dir(unrealProject);
        const derivedSpaces = await (0, firestore_1.getDerivedSpacesWithUnrealProject)(unrealProjectId);
        const validDerivedSpaceIds = derivedSpaces !== undefined ? derivedSpaces.flatMap(([spaceDoc, space]) => {
            if (spaceDoc === undefined || space === undefined)
                return [];
            if (existingSpace !== undefined && existingSpace.action === "delete" && spaceDoc.id === existingSpace.spaceId)
                return [];
            return [spaceDoc.id];
        }) : [];
        const derivedSpaceIds = existingSpace !== undefined && existingSpace.action === "add" && !validDerivedSpaceIds.includes(existingSpace.spaceId) ?
            [...validDerivedSpaceIds, existingSpace.spaceId] : validDerivedSpaceIds;
        if (derivedSpaceIds.length <= 0) {
            console.debug(`No spaces attributed to unreal project: ${unrealProjectId}`);
            const updatedUnrealProject = Object.assign(Object.assign({}, unrealProject), { spaceCount: 0 });
            return unrealProjectDoc.ref.update((0, utils_1.toFirestoreUpdateData)(updatedUnrealProject));
        }
        console.debug(`${derivedSpaceIds.length} spaces attributed to unreal project: ${unrealProjectId}`);
        console.dir(derivedSpaceIds);
        const updatedUnrealProject = Object.assign(Object.assign({}, unrealProject), { spaceCount: derivedSpaceIds.length });
        return unrealProjectDoc.ref.update((0, utils_1.toFirestoreUpdateData)(updatedUnrealProject));
    }
    catch (e) {
        console.error(`An error occured updating unreal project ${unrealProjectId}'s space count`);
        console.dir(e);
        return "update-failed";
    }
}
const onSpaceWrite = functions
    .firestore
    .document((0, firestore_1.spaceWildcardPath)())
    .onWrite(async (change, context) => {
    var _a, _b, _c, _d;
    console.log("Document context:");
    console.log(JSON.stringify(context));
    const previousState = change.before.data();
    console.debug("Document data before:");
    console.debug(JSON.stringify(previousState));
    const currentState = change.after.data();
    console.debug("Document data after:");
    console.debug(JSON.stringify(currentState));
    const spaceId = context.params.spaceId;
    if (previousState === undefined && currentState === undefined) {
        // Should not be possible, but exit if it does occur
        console.error("No state available");
        return;
    }
    if (previousState !== undefined && currentState !== undefined) {
        console.debug("Space is being updated");
        const previousSpace = previousState;
        const currentSpace = currentState;
        const previousUnrealProjectId = (_a = previousSpace.unrealProject) === null || _a === void 0 ? void 0 : _a.unrealProjectId;
        const currentUnrealProjectId = (_b = currentSpace.unrealProject) === null || _b === void 0 ? void 0 : _b.unrealProjectId;
        if (previousUnrealProjectId === currentUnrealProjectId)
            return;
        console.debug(`Space is being changed from Unreal Project: ${previousUnrealProjectId} to Unreal Project: ${currentUnrealProjectId}`);
        const unrealProjectUpdateResults = await Promise.all([
            previousUnrealProjectId !== undefined ? updateUnrealProjectSpaceCount(previousUnrealProjectId, { spaceId, action: "delete" }) : undefined,
            currentUnrealProjectId !== undefined ? updateUnrealProjectSpaceCount(currentUnrealProjectId, { spaceId, action: "add" }) : undefined,
        ]);
        return unrealProjectUpdateResults.flatMap((result) => {
            if (result === undefined)
                return [];
            if (result === "project-not-exist")
                throw new functions.https.HttpsError("not-found", "Unreal Project not found");
            if (result === "update-failed")
                throw new functions.https.HttpsError("internal", "Unreal Project failed to be updated");
            return [result];
        });
    }
    if (previousState !== undefined && currentState === undefined) {
        console.debug("Space is being deleted");
        const space = previousState;
        const unrealProjectId = (_c = space.unrealProject) === null || _c === void 0 ? void 0 : _c.unrealProjectId;
        if (unrealProjectId === undefined)
            return;
        const unrealProjectUpdateResult = await updateUnrealProjectSpaceCount(unrealProjectId, { spaceId, action: "delete" });
        if (unrealProjectUpdateResult === "project-not-exist") {
            throw new functions.https.HttpsError("not-found", "Unreal Project not found");
        }
        if (unrealProjectUpdateResult === "update-failed") {
            throw new functions.https.HttpsError("internal", "Unreal Project failed to be updated");
        }
        return unrealProjectUpdateResult;
    }
    if (previousState === undefined && currentState !== undefined) {
        console.debug("Space is being created");
        const space = currentState;
        const unrealProjectId = (_d = space.unrealProject) === null || _d === void 0 ? void 0 : _d.unrealProjectId;
        if (unrealProjectId === undefined)
            return;
        const unrealProjectUpdateResult = await updateUnrealProjectSpaceCount(unrealProjectId, { spaceId, action: "add" });
        if (unrealProjectUpdateResult === "project-not-exist") {
            throw new functions.https.HttpsError("not-found", "Unreal Project not found");
        }
        if (unrealProjectUpdateResult === "update-failed") {
            throw new functions.https.HttpsError("internal", "Unreal Project failed to be updated");
        }
        return unrealProjectUpdateResult;
    }
    return;
});
exports.reads = {
    getRuntimeLogs,
};
exports.writes = {
    onSpaceWrite,
};
//# sourceMappingURL=spaces.js.map