import * as functions from "firebase-functions";
import {BigQuery} from "@google-cloud/bigquery";
import {getFirebaseProjectId} from "./lib/firebase";
import {customRunWithWarm} from "./shared";
import {SpaceRuntimeLogData, SpaceRuntimeLogsRequestData, SpaceRuntimeLogsResponseData} from "./lib/httpTypes";
import {getUserOrgRole} from "./lib/organizations";
import {getDerivedSpacesWithUnrealProject, getUnrealProject, spaceWildcardPath} from "./lib/documents/firestore";
import {OrgSpace} from "./lib/cmsDocTypes";
import {UnrealProject} from "./lib/docTypes";


interface LogQueryArguments {
  organizationId: string,
  spaceId: string,
  roomId: string | undefined,
  startTime: Date | undefined,
  endTime: Date | undefined,
  limit: number | undefined,
  offset: number | undefined,
  order: "ASC" | "DESC" | undefined,
}

function runtimeLogsQuery(data: LogQueryArguments) {
  const firebaseProjectId = getFirebaseProjectId();
  const targetPod = "ue4ClientPod";
  const yesterday = function() {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return now;
  }();
  const roomId = data.roomId !== undefined ? `AND room_id = ${data.roomId}` : "";
  const startTime = data.startTime !== undefined && !isNaN(data.startTime.getUTCMilliseconds()) ?
    BigQuery.timestamp(data.startTime.getUTCMilliseconds()) :
    data.endTime !== undefined && !isNaN(data.endTime.getUTCMilliseconds()) ? // If the endTime is valid, don't render the default startTime
      "" : BigQuery.timestamp(yesterday.getUTCMilliseconds());
  const endTime = data.endTime !== undefined && !isNaN(data.endTime.getUTCMilliseconds()) ?
    `AND time < TIMESTAMP("${BigQuery.timestamp(data.endTime.getUTCMilliseconds())}")` : "";
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

const getRuntimeLogs =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: SpaceRuntimeLogsRequestData, context): Promise<SpaceRuntimeLogsResponseData> => {
      console.log("Document data:");
      console.log(JSON.stringify(data));
      if (context.auth?.uid === undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      const userOrgRole = await getUserOrgRole(data.organizationId, context.auth.uid);
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

      const bigQuery = new BigQuery();
      const [job] = await bigQuery.createQueryJob(query);
      const result = await job.getQueryResults();
      const [rows] = result;

      const response = rows.flatMap((row) => {
        if (row.rawmessage === undefined) return [];
        return {
          time: row.time as Date,
          phase: row.phase,
          module: row.module,
          message: row.message,
          rawmessage: row.rawmessage,
        } as SpaceRuntimeLogData;
      });

      return {
        lastIndex: data.offset !== undefined ? data.offset + rows.length : rows.length,
        data: response,
      };
    });

async function updateUnrealProjectSpaceCount(unrealProjectId: string, existingSpace?: {spaceId: string, action: "add" | "delete"}) {
  try {
    const [unrealProjectDoc, unrealProject] = await getUnrealProject(unrealProjectId);
    if (unrealProjectDoc === undefined || unrealProject === undefined) {
      console.error("Unreal project does not exist");
      return "project-not-exist";
    }
    console.dir(unrealProject);

    const derivedSpaces = await getDerivedSpacesWithUnrealProject(unrealProjectId);
    const validDerivedSpaceIds = derivedSpaces !== undefined ? derivedSpaces.flatMap(([spaceDoc, space]) => {
      if (spaceDoc === undefined || space === undefined) return [];
      if (existingSpace !== undefined && existingSpace.action === "delete" && spaceDoc.id === existingSpace.spaceId) return [];
      return [spaceDoc.id];
    }) : [];
    const derivedSpaceIds = existingSpace !== undefined && existingSpace.action === "add" && !validDerivedSpaceIds.includes(existingSpace.spaceId) ?
      [...validDerivedSpaceIds, existingSpace.spaceId] : validDerivedSpaceIds;

    if (derivedSpaceIds.length <= 0) {
      console.debug(`No spaces attributed to unreal project: ${unrealProjectId}`);
      const updatedUnrealProject : UnrealProject = {
        ...unrealProject,
        spaceCount: 0,
      };
      return unrealProjectDoc.ref.update(updatedUnrealProject);
    }

    console.debug(`${derivedSpaceIds.length} spaces attributed to unreal project: ${unrealProjectId}`);
    console.dir(derivedSpaceIds);
    const updatedUnrealProject : UnrealProject = {
      ...unrealProject,
      spaceCount: derivedSpaceIds.length,
    };
    return unrealProjectDoc.ref.update(updatedUnrealProject);
  } catch (e: any) {
    console.error(`An error occured updating unreal project ${unrealProjectId}'s space count`);
    console.dir(e);
    return "update-failed";
  }
}

const onSpaceWrite =
  functions
    .firestore
    .document(spaceWildcardPath())
    .onWrite(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));

      const previousState = change.before.data();
      console.debug("Document data before:");
      console.debug(JSON.stringify(previousState));

      const currentState = change.after.data();
      console.debug("Document data after:");
      console.debug(JSON.stringify(currentState));
      const spaceId : string = context.params.spaceId;

      if (previousState === undefined && currentState === undefined) {
        // Should not be possible, but exit if it does occur
        console.error("No state available");
        return;
      }

      if (previousState !== undefined && currentState !== undefined) {
        console.debug("Space is being updated");
        const previousSpace = previousState as OrgSpace;
        const currentSpace = currentState as OrgSpace;
        const previousUnrealProjectId = previousSpace.unrealProject?.unrealProjectId;
        const currentUnrealProjectId = currentSpace.unrealProject?.unrealProjectId;
        if (previousUnrealProjectId === currentUnrealProjectId) return;

        console.debug(`Space is being changed from Unreal Project: ${previousUnrealProjectId} to Unreal Project: ${currentUnrealProjectId}`);
        const unrealProjectUpdateResults = await Promise.all([
          previousUnrealProjectId !== undefined ? updateUnrealProjectSpaceCount(previousUnrealProjectId, {spaceId, action: "delete"}) : undefined,
          currentUnrealProjectId !== undefined ? updateUnrealProjectSpaceCount(currentUnrealProjectId, {spaceId, action: "add"}) : undefined,
        ]);
        return unrealProjectUpdateResults.flatMap((result) => {
          if (result === undefined) return [];
          if (result === "project-not-exist") throw new functions.https.HttpsError("not-found", "Unreal Project not found");
          if (result === "update-failed") throw new functions.https.HttpsError("internal", "Unreal Project failed to be updated");
          return [result];
        });
      }

      if (previousState !== undefined && currentState === undefined) {
        console.debug("Space is being deleted");
        const space = previousState as OrgSpace;
        const unrealProjectId = space.unrealProject?.unrealProjectId;
        if (unrealProjectId === undefined) return;
        const unrealProjectUpdateResult = await updateUnrealProjectSpaceCount(unrealProjectId, {spaceId, action: "delete"});
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
        const space = currentState as OrgSpace;
        const unrealProjectId = space.unrealProject?.unrealProjectId;
        if (unrealProjectId === undefined) return;
        const unrealProjectUpdateResult = await updateUnrealProjectSpaceCount(unrealProjectId, {spaceId, action: "add"});
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

export const reads = {
  getRuntimeLogs,
};

export const writes = {
  onSpaceWrite,
};
