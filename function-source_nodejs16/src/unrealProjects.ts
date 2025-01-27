import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {BigQuery} from "@google-cloud/bigquery";
import {NewUnrealProjectRequestData, NewUnrealProjectResponseData, NewUnrealProjectVersionRequestData, NewUnrealProjectVersionResponseData, NotifyUnrealProjectVersionUploadedRequestData, UnrealPluginVersionResponseData, UnrealProjectWithVersionsRequestData, UnrealProjectsWithVersionsResponseData, UnrealProjectResponseData, UnrealProjectVersionResponseData, GetUnrealProjectVersionRequestData, UnrealProjectVersionBuildLogRequestData, UnrealProjectVersionBuildLogResponseData, UnrealProjectLatestBuildLogDownloadRequestData, UnrealProjectLatestBuildLogDownloadResponseData, UserBridgeCliLogRequestData, NewWebUploadedUnrealProjectAndVersionRequestData, NewWebUploadedUnrealProjectAndVersionResponseData} from "./lib/httpTypes";
import {getUnrealPluginVersionsRef, getUnrealProjectVersion, getUnrealPluginVersion, getUnrealProject, getUnrealProjectsRef, getUnrealProjectVersionRef, unrealProjectVersionWildcardPath, unrealProjectWildcardPath, getUnrealPluginVersionRef, getUnrealProjectVersionsRef, getSpaceTemplatesRef, getBridgeSpaceTemplates, deleteOldConfiguratorSpaceTemplateItems, getDerivedSpacesWithSpaceTemplate, getUnrealProjectVersionsCollectionGroup} from "./lib/documents/firestore";
import {BridgeToolkitFileSettings, SupportedUnrealEngineVersion, SUPPORTED_UNREAL_ENGINE_VERSION, UnrealPluginVersion, UnrealPluginVersionState, UnrealProject, UnrealProjectVersion, UnrealProjectVersionState, UnrealProjectVersionStateChange, UNREAL_PLUGIN_VERSION_STATE, UNREAL_PROJECT_VERSION_STATE} from "./lib/docTypes";
import {checkUploadedFileExists, createSignedDownloadUrl, createSignedUploadUrl, deleteArtifact} from "./lib/googleStorage";
import {customRunWith, customRunWithWarm} from "./shared";
import {getUserOrgRole} from "./lib/organizations";
import * as deployUnrealProjects from "./lib/unrealProjects/deploy-standard";
import {getFirebaseProjectId} from "./lib/firebase";
import * as shortUuid from "short-uuid";
import {convertSpaceSeparatedStringToArray} from "./lib/misc";
import {ChangeType} from "@newgameplus/firestore-bigquery-change-tracker";
import {getChangeType} from "./lib/bigQueryExport/util";
import {BridgeSpaceTemplate, SpaceTemplate} from "./lib/cmsDocTypes";
import {createUpdateConfiguratorItems, createConfiguratorTemplateItems, createUpdateBridgeToolkitSettingsTemplateItem, createUpdateBridgeToolkitSettingsItem, getUnrealProjectName, getConfigurationUnrealProjectVersion, getAllExpirableUnrealProjectVersions, getLatestUnrealProjectVersion, expireUnrealProjectVersions} from "./lib/unrealProjects/shared";

function generateProjectVersionDestinationName(organizationId: string, unrealProjectId: string, unrealProjectVersionId: string, selfPackaged = false) {
  const suffix = selfPackaged ? "-packaged" : "";
  return `${organizationId}/${unrealProjectId}/${unrealProjectVersionId}${suffix}.zip`;
}

const defaultUnrealEngineVersion = "5.2.1";

export const addUserBridgeCliLogs =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: UserBridgeCliLogRequestData[], context) => {
      const userId = context.auth?.uid;
      if (userId === undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      try {
        const bigQueryRows = data.map((log) => {
          return {
            user_id: userId,
            timestamp: BigQuery.timestamp(log.timestamp),
            bridge_cli_version: log.bridgeCliVersion,
            log_level: log.logLevel,
            raw_message: log.rawMessage,
            organization_id: log.organizationId,
            unreal_project_id: log.unrealProjectId,
            unreal_project_version_id: log.unrealProjectVersionId,
            raw_metadata: log.rawMetadata,
          };
        });

        const bigQuery = new BigQuery();
        const project = await bigQuery.getProjectId();
        const dataset = "logging";
        const table = "user_bridge_cli_logs";

        console.log(`Inserting ${data.length} records into ${project}.${dataset}.${table}...`);

        await bigQuery
          .dataset(dataset)
          .table(table)
          .insert(bigQueryRows);

        return;
      } catch (e: any) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
      }
    });

export const getLatestUnrealPluginVersion =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (_: any, context) => {
      try {
        if (context.auth?.uid == undefined) {
          throw new functions.https.HttpsError("permission-denied", "User not logged in");
        }
        const latestUnrealPluginVersion = await getLatestPluginVersion();
        if (latestUnrealPluginVersion == undefined) {
          throw new functions.https.HttpsError("internal", "Couldn't resolve latest compatible plugin version");
        }
        const unrealPluginVersion = latestUnrealPluginVersion.unrealPluginVersion;
        console.debug({latestPluginVersion: unrealPluginVersion});
        // Get bucket name from
        const bucketName = functions.config().unrealpluginversion.bucketname;
        // const reg = /gs:\/\//;
        // const pluginUrl = latestPluginVersion.url.replace(reg, "");
        // TODO: handle nested filePath
        const filePath = unrealPluginVersion.toolkitUrl.replace(/.*\//, "");
        console.debug({filePath});
        const downloadUrl = await createSignedDownloadUrl(bucketName, filePath);
        if (downloadUrl == undefined || downloadUrl == null) {
          throw new functions.https.HttpsError("internal", "Download not available");
        }
        console.debug({downloadUrl});
        const response: UnrealPluginVersionResponseData = {
          id: latestUnrealPluginVersion.doc.id,
          downloadUrl: downloadUrl,
          ...unrealPluginVersion,
        };
        return response;
      } catch (e: any) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
      }
    });

export const getAllUnrealProjects =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: UnrealProjectWithVersionsRequestData, context) => {
      console.log("Request data from organization:");
      console.log(JSON.stringify(data));
      if (context.auth?.uid == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      const userOrgRole = await getUserOrgRole(data.organizationId, context.auth.uid);
      if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of organization");
      }
      const projectQueryResults = await getUnrealProjectsRef()
        .where("organizationId", "==", data.organizationId)
        .orderBy("updated", "desc").get();
      console.log(projectQueryResults);
      const projectDocs = projectQueryResults.docs;
      console.log(projectDocs);
      if (projectDocs == undefined || projectDocs.length < 1) {
        // return empty list/map if none are found
        return {};
      }
      const projectsMap = await Promise.all(projectDocs.flatMap(async (pd) => {
        try {
          const project = pd.data() as UnrealProject;
          console.log("Project to map:");
          console.log({project});

          const projectVersions = (await pd.ref.collection("unrealProjectVersions")
            .orderBy("created", "desc")
            .limit(1).get());
          const latestProjectVersionDoc = projectVersions.docs.pop();
          const latestProjectVersionResponse: UnrealProjectVersionResponseData | undefined = latestProjectVersionDoc ?
            {
              id: latestProjectVersionDoc.id,
              ...(latestProjectVersionDoc.data() as UnrealProjectVersion),
            } :
            undefined;
          console.log("Project version to map:");
          console.log({latestProjectVersionResponse});

          const projectMapEntry: UnrealProjectResponseData = {
            id: pd.id,
            currentVersion: latestProjectVersionResponse,
            ...project,
          };
          return projectMapEntry;
        } catch (e: any) {
          console.error({e});
          throw new functions.https.HttpsError("unknown", "Document could not be retrieved");
        }
      }));

      console.log("Project map values:");
      console.log({projectsMap});
      const response: UnrealProjectsWithVersionsResponseData = projectsMap.reduce((map, proj) => {
        map[proj.id] = proj;
        return map;
      }, {});
      return response;
    });

export const getSpecificUnrealProjectVersion =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: GetUnrealProjectVersionRequestData, context) => {
      console.log("Request data from organization:");
      console.log(JSON.stringify(data));
      if (context.auth?.uid == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      const userOrgRole = await getUserOrgRole(data.organizationId, context.auth.uid);
      if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of the specified organization");
      }
      if (data.unrealProjectVersionId === "latest") {
        // find and return latest project version
        const latestProjectVersionQueryResult = (await getUnrealProjectVersionsRef(data.unrealProjectId)
          .orderBy("created", "desc")
          .limit(1).get());
        const latestProjectVersionDoc = latestProjectVersionQueryResult.docs.pop();
        if (latestProjectVersionDoc == undefined) {
          throw new functions.https.HttpsError("internal", "Couldn't resolve latest compatible project version");
        }
        const latestProjectVersion = latestProjectVersionDoc.data() as UnrealProjectVersion;
        const response: UnrealProjectVersionResponseData = {
          id: latestProjectVersionDoc?.id,
          ...latestProjectVersion,
        };
        return response;
      } else {
        // find and return version using passed version id
        const [unrealProjectVersionDoc, unrealProjectVersion] = await getUnrealProjectVersion(data.unrealProjectId, data.unrealProjectVersionId);
        if (unrealProjectVersionDoc?.id == undefined || unrealProjectVersion == undefined) {
          throw new functions.https.HttpsError("not-found", "Unreal project version could not be found");
        }
        const response: UnrealProjectVersionResponseData = {
          id: unrealProjectVersionDoc?.id,
          ...unrealProjectVersion,
        };
        return response;
      }
    });

export const getUnrealProjectLatestBuildLogDownloadUrl =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: UnrealProjectLatestBuildLogDownloadRequestData, context) => {
      console.log("Document data:");
      console.log(JSON.stringify(data));
      if (context.auth?.uid == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      const userOrgRole = await getUserOrgRole(data.organizationId, context.auth.uid);
      if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of the specified organization");
      }
      const [unrealProjectDoc, unrealProject] = await getUnrealProject(data.unrealProjectId);
      if (unrealProjectDoc?.id == undefined || unrealProject == undefined) {
        throw new functions.https.HttpsError("not-found", "Unreal project could not be found");
      }

      const getLatestUnrealProjectVersion = async () => {
        const projectVersions = (await unrealProjectDoc.ref.collection("unrealProjectVersions")
          .orderBy("created", "desc")
          .limit(1).get());
        const unrealProjectVersionDoc = projectVersions.docs.pop();
        const unrealProjectVersion = unrealProjectVersionDoc?.data() as UnrealProjectVersion | undefined;
        if (unrealProjectVersionDoc?.id == undefined || unrealProjectVersion == undefined) {
          throw new functions.https.HttpsError("not-found", "Unreal project version could not be found");
        }
        return unrealProjectVersion;
      };
      const getSpecifiedUnrealProjectVersion = async (unrealProjectVersionId: string) => {
        const [unrealProjectVersionDoc, unrealProjectVersion] = await getUnrealProjectVersion(data.unrealProjectId, unrealProjectVersionId);
        if (unrealProjectVersionDoc?.id == undefined || unrealProjectVersion == undefined) {
          throw new functions.https.HttpsError("not-found", "Unreal project version could not be found");
        }
        return unrealProjectVersion;
      };

      const unrealProjectVersion = data.unrealProjectVersionId ?
        await getSpecifiedUnrealProjectVersion(data.unrealProjectVersionId) :
        await getLatestUnrealProjectVersion();

      if (unrealProjectVersion.buildLogUrls === undefined || unrealProjectVersion.buildLogUrls.length <= 0) {
        console.debug(`No build logs available for project: ${data.unrealProjectId}, version: ${unrealProjectDoc.id}`);
        const response: UnrealProjectLatestBuildLogDownloadResponseData = {
          downloadUrl: undefined,
        };
        return response;
      }
      const latestBuildLog = unrealProjectVersion.buildLogUrls.pop();
      const bucketName = functions.config().unrealprojectversionuploads.bucketname;
      const downloadableUrl = latestBuildLog ? await createSignedDownloadUrl(bucketName, latestBuildLog.replace(`gs://${bucketName}/`, "")) : undefined;
      const response: UnrealProjectLatestBuildLogDownloadResponseData = {
        downloadUrl: downloadableUrl,
      };
      return response;
    });

function buildLogTailQuery(data: { unrealProjectVersionId: string, unrealProjectVersion: UnrealProjectVersion, organizationId: string, startTime: Date, limit: number, offset: number, orderBy: "asc" | "desc"}) {
  // Get the earliest instance the unreal project version was changed to "builder-building" since the given start time
  // Currently only the UE build logs are being exported
  const tailableStateChanges = data.unrealProjectVersion.stateChanges
        ?.filter((sc) => sc.state === "builder-building" && sc.timestamp.toMillis() >= new Date(data.startTime).getUTCMilliseconds());
  const tailableStateChange = tailableStateChanges ? tailableStateChanges.length <= 0 ? data.unrealProjectVersion.created : tailableStateChanges[0].timestamp : data.unrealProjectVersion.created;
  const tailableDate = tailableStateChange.toDate();
  const firebaseProjectId = getFirebaseProjectId();
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
    start_time_bq: BigQuery.timestamp(tailableDate),
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

function buildLogLastLinesQuery(data: { unrealProjectVersionId: string, unrealProjectVersion: UnrealProjectVersion, organizationId: string, limit: number}) {
  const firebaseProjectId = getFirebaseProjectId();
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
    end_time_bq: BigQuery.timestamp(new Date()),
    limit_amount: data.limit,
  };

  return {
    query,
    params,
    projectId: firebaseProjectId,
    useLegacySql: false,
  };
}

export const getUnrealProjectVersionBuildLogs =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: UnrealProjectVersionBuildLogRequestData, context) => {
      console.log("Document data:");
      console.log(JSON.stringify(data));
      if (context.auth?.uid == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      const userOrgRole = await getUserOrgRole(data.organizationId, context.auth.uid);
      if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of the specified organization");
      }
      const [unrealProjectDoc, unrealProject] = await getUnrealProject(data.unrealProjectId);
      if (unrealProjectDoc?.id == undefined || unrealProject == undefined) {
        throw new functions.https.HttpsError("not-found", "Unreal project could not be found");
      }
      const [unrealProjectVersionDoc, unrealProjectVersion] = await getUnrealProjectVersion(data.unrealProjectId, data.unrealProjectVersionId);
      if (unrealProjectVersionDoc?.id == undefined || unrealProjectVersion == undefined) {
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
        buildLogTailQuery({
          unrealProjectVersionId: data.unrealProjectVersionId,
          unrealProjectVersion: unrealProjectVersion,
          organizationId: data.organizationId,
          limit: data.limit,
          startTime: data.tailData.startTime,
          offset: data.tailData.offset,
          orderBy: data.tailData.orderBy,
        }) :
        // Error Mode
        buildLogLastLinesQuery({
          unrealProjectVersionId: data.unrealProjectVersionId,
          unrealProjectVersion: unrealProjectVersion,
          organizationId: data.organizationId,
          limit: data.limit,
        });
      const bigQuery = new BigQuery();
      const [job] = await bigQuery.createQueryJob(query);
      const result = await job.getQueryResults();
      const [rows] = result;

      const response: UnrealProjectVersionBuildLogResponseData = {
        lastIndex: data.tailData ? data.tailData.offset + rows.length : rows.length,
        logMessages: rows.map((row) => row.log_message),
      };
      return response;
    });

export const createNewUnrealProject =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: NewUnrealProjectRequestData, context) => {
      console.log("Document data:");
      console.log(JSON.stringify(data));
      if (context.auth?.uid == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      const userOrgRole = await getUserOrgRole(data.organizationId, context.auth.uid);
      if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of organization");
      }

      const now = admin.firestore.Timestamp.now();
      const unrealProject : UnrealProject = {
        organizationId: data.organizationId,
        name: data.name,
        updated: now,
        created: now,
      };
      const result = await getUnrealProjectsRef().add(unrealProject);
      const response : NewUnrealProjectResponseData = {
        id: result.id,
        ...unrealProject,
      };
      return response;
    });

export const createNewUnrealProjectVersion =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: NewUnrealProjectVersionRequestData, context) => {
      console.log("Document data:");
      console.log(JSON.stringify(data));

      const userId = context.auth?.uid;
      if (userId == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      const userOrgRole = await getUserOrgRole(data.organizationId, userId);
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
        const unrealProjectVersionId = shortUuid().new().toString();
        const unrealProjectVersionRef = getUnrealProjectVersionRef(data.unrealProjectId, unrealProjectVersionId);

        const bucketName = functions.config().unrealprojectversionuploads.bucketname;
        const destinationName = generateProjectVersionDestinationName(data.organizationId, data.unrealProjectId, unrealProjectVersionId);
        const downloadUrl = "gs://" + bucketName + "/" + destinationName;
        const uploadUrl = await createSignedUploadUrl(bucketName, destinationName);
        if (uploadUrl == undefined) {
          throw new functions.https.HttpsError("internal", "Upload not available");
        }
        const now = admin.firestore.Timestamp.now();
        const unrealProjectVersion : UnrealProjectVersion = {
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
        const response : NewUnrealProjectVersionResponseData = {
          id: unrealProjectVersionId,
          ...unrealProjectVersion,
        };
        return response;
      } catch (e: any) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "An unknown internal error occurred");
      }
    });

export const newWebUploadedUnrealProjectAndVersion =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: NewWebUploadedUnrealProjectAndVersionRequestData, context) => {
      console.log("Document data:");
      console.log(JSON.stringify(data));

      const userId = context.auth?.uid;
      if (userId == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }

      const organizationId = data.organizationId;
      if (organizationId == null || organizationId == undefined || organizationId.length < 1) {
        throw new Error("Must specify valid organizationId");
      }

      const userOrgRole = await getUserOrgRole(organizationId, userId);
      if (userOrgRole == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not a member of organization");
      }

      const latestUnrealPluginVersion = await getLatestPluginVersion();
      if (latestUnrealPluginVersion == undefined) {
        console.error("Failed to find the latest unreal plugin version");
        throw new functions.https.HttpsError("internal", "An internal error occurred");
      }

      try {
        const existingUnrealProjectId = async (unrealProjectId: string) => {
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
            await unrealProjectDoc.ref.update({displayName: data.unrealProjectDisplayName, updated: admin.firestore.Timestamp.now()});
            return unrealProjectId;
          } catch (e: any) {
            console.error("An error occurred updating existing unreal project");
            console.dir(e);
            throw new functions.https.HttpsError("internal", "An internal error occurred");
          }
        };

        const newUnrealProjectId = async () => {
          const unrealProject: UnrealProject = {
            organizationId,
            displayName: data.unrealProjectDisplayName,
            created: admin.firestore.Timestamp.now(),
            updated: admin.firestore.Timestamp.now(),
          };
          return (await getUnrealProjectsRef().add(unrealProject)).id;
        };

        const unrealProjectId = data.unrealProjectId !== undefined ?
          await existingUnrealProjectId(data.unrealProjectId) :
          await newUnrealProjectId();

        const unrealProjectVersionId = shortUuid().new().toString();
        const firebaseProject = getFirebaseProjectId();
        const destinationName = generateProjectVersionDestinationName(data.organizationId, unrealProjectId, unrealProjectVersionId);
        const storageFilePath = `unrealProjects/${destinationName}`;
        const bucket = `${firebaseProject}.appspot.com`;
        const uploadUrl = `https://storage.googleapis.com/${bucket}/${storageFilePath}`;
        const downloadUrl = `gs://${bucket}/${storageFilePath}`;
        const target = data.target || "Development";
        const unrealEngineVersion = defaultUnrealEngineVersion;
        const unrealProjectVersion: UnrealProjectVersion = {
          levelName: "",
          levelFilePath: "",
          selfPackaged: data.selfPackaged,
          uploadUrl,
          target,
          downloadUrl,
          created: admin.firestore.Timestamp.now(),
          updated: admin.firestore.Timestamp.now(),
          authorUserId: userId,
          uploader: "webClient",
          unrealEngineVersion,
          state: "new",
          pluginVersionId: latestUnrealPluginVersion.doc.id,
        };

        await getUnrealProjectVersionRef(unrealProjectId, unrealProjectVersionId).create(unrealProjectVersion);

        const response: NewWebUploadedUnrealProjectAndVersionResponseData = {
          uploadUrl,
          unrealProjectVersionId,
          unrealEngineVersion,
          target,
          organizationId,
          unrealProjectId,
        };
        return response;
      } catch (e: any) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "An unknown internal error occurred");
      }
    });

export const notifyUnrealProjectVersionUploaded =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: NotifyUnrealProjectVersionUploadedRequestData, context) => {
      console.log("Document data:");
      console.log(JSON.stringify(data));

      if (context.auth?.uid == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      const userOrgRole = await getUserOrgRole(data.organizationId, context.auth.uid);
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
          const updatePayload : { updated: admin.firestore.Timestamp, state: UnrealProjectVersionState} = {
            state: "upload-failed",
            updated: now,
          };
          await unrealProjectVersionDoc.ref.update(updatePayload);
          return;
        }
        const bucketName = (() => {
          if (unrealProjectVersion.uploader == "webClient") {
            const firebaseProject = getFirebaseProjectId();
            return `${firebaseProject}.appspot.com`;
          } else {
            return functions.config().unrealprojectversionuploads.bucketname as string;
          }
        })();
        const destinationName = generateProjectVersionDestinationName(data.organizationId, data.unrealProjectId, unrealProjectVersionDoc.id);
        const storageFilePath = (() => {
          if (unrealProjectVersion.uploader == "webClient") return "unrealProjects/" + destinationName;
          return destinationName;
        })();
        const exists = await checkUploadedFileExists(bucketName, storageFilePath);
        if (!exists) {
          const updatePayload : { updated: admin.firestore.Timestamp, state: UnrealProjectVersionState} = {
            state: "upload-invalid",
            updated: now,
          };
          await unrealProjectVersionDoc.ref.update(updatePayload);
          throw new functions.https.HttpsError("not-found", "Uploaded file does not exist");
        }
        const updatePayload : { updated: admin.firestore.Timestamp, state: UnrealProjectVersionState, uploadSha256Sum?: string } = {
          state: "upload-complete",
          updated: now,
          uploadSha256Sum: data.sha256Sum,
        };
        await unrealProjectVersionDoc.ref.update(updatePayload);
        return;
      } catch (e: any) {
        throw new functions.https.HttpsError("internal", "Failed to update unreal project version");
      }
    });

function getLastTailableTimeFromBuildStates(unrealProjectVersion: UnrealProjectVersion, defaultTime: FirebaseFirestore.Timestamp): FirebaseFirestore.Timestamp {
  const buildingStartTimes = unrealProjectVersion.stateChanges
    ?.filter((state) => state.state === "builder-building")
    .map((state) => state.timestamp)
    .sort();
  const lastTailableDate = buildingStartTimes !== undefined ?
    buildingStartTimes[buildingStartTimes.length - 1] :
    defaultTime;
  return lastTailableDate;
}

type LogSource = "system" | "build"

function toSourcePath(source: LogSource) {
  switch (source) {
    case "build":
      return "/logs/build/Log.txt";
    case "system":
      return "/logs/entrypoint/entrypoint.log";
  }
}

async function exportBuilderLogs(unrealProjectVersionId: string,
  unrealProjectVersion: UnrealProjectVersion,
  unrealProjectId: string,
  unrealProject: UnrealProject,
  projectId: string,
  source: LogSource,
  startTime: FirebaseFirestore.Timestamp = getLastTailableTimeFromBuildStates(unrealProjectVersion, unrealProjectVersion.created),
) {
  try {
    const bucketName = functions.config().unrealprojectversionuploads.bucketname;
    const googleCloudStoragePrefix = `gs://${bucketName}/${unrealProject.organizationId}/${unrealProjectId}/${unrealProjectVersionId}-${source}-${startTime.seconds}-`;
    const googleCloudStorageUri = `${googleCloudStoragePrefix}*.log`;

    // TODO: the log line formatting should be moved to the fluentd config
    const query = `
    EXPORT DATA
      OPTIONS(
        uri=@gcloud_storage_uri,
        format='JSON',
        overwrite=true
      ) AS

    SELECT DISTINCT
      CONCAT("[", time, "] ", rawmessage) AS log_message,
      time
    FROM
      \`${projectId}.logging.unreal_project_version_build_logs\`
    WHERE
      organization_id = @organization_id
    AND
      unreal_project_version_id = @project_version_id
    AND
      source_path = @source_path
    AND
      time >= @start_time_bq
    ORDER BY time
    `;
    const params = {
      organization_id: unrealProject.organizationId,
      project_version_id: unrealProjectVersionId,
      start_time_bq: BigQuery.timestamp(startTime.seconds),
      gcloud_storage_uri: googleCloudStorageUri,
      source_path: toSourcePath(source),
    };
    console.debug(`Exporting build log data for: ${unrealProjectVersionId} from ${JSON.stringify(startTime)}`);
    const bigQuery = new BigQuery();
    const [job] = await bigQuery.createQueryJob({
      query,
      params,
      projectId: projectId,
      useLegacySql: false,
    });
    console.debug(`BigQuery Job: ${JSON.stringify(job)}`);
    await job.getQueryResults();
    const googleCloudStorageFile = `${googleCloudStoragePrefix}000000000000.log`;
    return googleCloudStorageFile;
  } catch (e: any) {
    console.error(e);
    return undefined;
  }
}

async function ensureBridgeSpaceTemplateExists(existingTemplates: {
  templateRef: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  template: BridgeSpaceTemplate,
}[], newTemplate: {unrealProject: UnrealProject, unrealProjectId: string, unrealProjectVersion: UnrealProjectVersion}) {
  if (existingTemplates.length === 1) return existingTemplates[0];
  if (existingTemplates.length > 1) {
    console.warn(`There are ${existingTemplates.length} templates for unreal project: ${existingTemplates[0].template.unrealProject.unrealProjectId}`);
    return existingTemplates.sort((template1, template2) => (template1.template.created?.toMillis() ?? 0) - (template2.template.created?.toMillis() ?? 0))[0];
  }

  const projectName = getUnrealProjectName(newTemplate.unrealProject, newTemplate.unrealProjectVersion) || "";
  // Create new template
  const templateContents: BridgeSpaceTemplate = {
    type: "Bridge",
    public: false,
    hasSpaceItems: true,
    description: projectName,
    orgOwner: [newTemplate.unrealProject.organizationId],
    name: projectName,
    thumb: newTemplate.unrealProject.thumb || newTemplate.unrealProjectVersion.thumb || "",
    unrealProject: {
      unrealProjectId: newTemplate.unrealProjectId,
      unrealProjectVersionId: "latest",
    },
  };
  const templateRef = await (await getSpaceTemplatesRef().add(templateContents)).get();
  console.debug(`Space template created for unreal project ${newTemplate}`);
  return {templateRef, template: templateContents};
}

async function getLatestPluginVersion(unrealEngineVersion?: string) {
  try {
    const baseQuery = getUnrealPluginVersionsRef()
      .where("status", "in", ["supported", "supported-5.2"]);
    const withVersionFilter = unrealEngineVersion == undefined ? baseQuery : baseQuery.where("unrealEngineVersion", "==", unrealEngineVersion);
    const latestPluginVersionQueryResult = (await withVersionFilter
      .orderBy("created", "desc")
      .limit(1).get());
    return latestPluginVersionQueryResult.docs.map((doc) => {
      return {doc, unrealPluginVersion: doc.data() as UnrealPluginVersion};
    }).pop();
  } catch (e: any) {
    console.error(e);
    console.error("Failed to get latest unreal plugin version");
    return undefined;
  }
}

export const onUpdateUnrealProjectMetadata =
  // onWrite() of unreal project
  // update any metadata to space template
  functions
    .runWith({...customRunWithWarm, timeoutSeconds: 540})
    .firestore
    .document(unrealProjectWildcardPath())
    .onWrite(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      const changeType = getChangeType(change);
      if (changeType == ChangeType.DELETE || changeType == ChangeType.IMPORT) {
        console.debug(`Unreal project document ${changeType} does nothing.`);
        return;
      }
      const unrealProjectId: string = context.params.unrealProjectId;
      const unrealProject = change.after.data() as UnrealProject;
      const bridgeSpaceTemplates = await getBridgeSpaceTemplates(unrealProjectId);

      if (bridgeSpaceTemplates === undefined) {
        console.debug("Unreal project has no space templates to update.");
        return;
      }

      await Promise.all(bridgeSpaceTemplates.flatMap((template) => {
        const [templateDoc, templateData] = template;
        const updatedData = {} as SpaceTemplate;
        if (unrealProject?.displayName != undefined && templateData?.name !== unrealProject?.displayName) updatedData.name = unrealProject.displayName;
        if (unrealProject?.thumb != undefined && templateData?.thumb !== unrealProject?.thumb) updatedData.thumb = unrealProject.thumb;
        return templateDoc?.ref.set(updatedData, {merge: true});
      }));
    });

export const onUpdateUnrealProjectVersion =
  // onWrite() of unreal project version
  // Build the unreal project version or whatever
  functions
    .runWith({...customRunWithWarm, timeoutSeconds: 540})
    .firestore
    .document(unrealProjectVersionWildcardPath())
    .onWrite(async (change, context) => {
      const projectId = getFirebaseProjectId();
      console.log("Document context:");
      console.log(JSON.stringify(context));
      const changeType = getChangeType(change);
      if (changeType == ChangeType.DELETE || changeType == ChangeType.IMPORT) {
        console.debug(`Unreal project version document ${changeType} does nothing.`);
        return;
      }
      console.log("Document data:");
      console.log(JSON.stringify(change.after.data()));
      const unrealProjectId: string = context.params.unrealProjectId;
      const unrealProjectVersionId: string = context.params.unrealProjectVersionId;
      const unrealProjectVersion = change.after.data() as UnrealProjectVersion;
      const unrealProjectVersionBefore = (changeType == ChangeType.UPDATE) ? change.before.data() as UnrealProjectVersion : undefined;

      const [, unrealProject] = await getUnrealProject(unrealProjectId);
      if (unrealProject === undefined) {
        await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "failed-missing-unreal-project"});
        return console.error("UnrealProject is undefined");
      }

      const unrealPluginVersion = await (async () => {
        if (unrealProjectVersion.pluginVersionId == undefined) return undefined;
        const [, unrealPluginVersion] = await getUnrealPluginVersion(unrealProjectVersion.pluginVersionId);
        return unrealPluginVersion;
      })();

      const unrealEngineVersion: SupportedUnrealEngineVersion = (() => {
        if (unrealProjectVersion.unrealEngineVersion != undefined) return unrealProjectVersion.unrealEngineVersion;
        if (unrealPluginVersion?.unrealEngineVersion != undefined) return unrealPluginVersion.unrealEngineVersion;
        console.warn(`UnrealPluginVersion is ${defaultUnrealEngineVersion}`);
        return defaultUnrealEngineVersion;
      })();
      const volumeRegions = unrealProjectVersion.volumeRegions;
      const volumeRegionsComplete = unrealProjectVersion.volumeCopyRegionsComplete;

      if (unrealProjectVersion.state == undefined || (unrealProjectVersion.state != "volume-copy-region-complete" && unrealProjectVersionBefore?.state == unrealProjectVersion.state)) {
        return console.debug("State did not change. Skipping");
      }

      const unrealProjectVersionRef = getUnrealProjectVersionRef(unrealProjectId, unrealProjectVersionId);

      if (unrealProjectVersionBefore?.state != unrealProjectVersion.state && unrealProjectVersion.state != undefined) {
        const newStateChangeEntry : UnrealProjectVersionStateChange = {state: unrealProjectVersion.state, timestamp: admin.firestore.Timestamp.now()};
        console.debug(`Appending unrealProjectVersion state ${unrealProjectVersion.state} to ${unrealProjectVersionRef.path}`);
        await unrealProjectVersionRef.update({
          stateChanges: admin.firestore.FieldValue.arrayUnion(newStateChangeEntry),
        });
      }

      const configuration = await getConfigurationUnrealProjectVersion({
        organizationId: unrealProject.organizationId,
        authorUserId: unrealProjectVersion.authorUserId,
        unrealProjectVersionId,
        unrealProjectId,
      });

      const unrealProjectVersionPath = unrealProjectVersionRef.path;
      switch (unrealProjectVersion.state) {
        // Volume copy complete
        case "volume-copy-region-complete": {
          if (
            volumeRegions != undefined &&
            volumeRegionsComplete != undefined &&
            volumeRegions.length > 0 &&
            volumeRegionsComplete.length == volumeRegions.length
          ) {
            if (volumeRegionsComplete.filter((i) => volumeRegions.includes(i)).length == volumeRegions.length) {
              console.debug("All volumeRegions have completed copying");
              const buildLogUrl = await exportBuilderLogs(unrealProjectVersionId, unrealProjectVersion, unrealProjectId, unrealProject, projectId, "build");
              const systemLogUrl = await exportBuilderLogs(unrealProjectVersionId, unrealProjectVersion, unrealProjectId, unrealProject, projectId, "system");

              return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-complete", buildLogUrl, systemLogUrl});
            } else {
              console.debug("Not all volumeRegions have completed copying");
            }
          }
          break;
        }
        // Document change states -> Document phase states
        case "builder-update-unreal-project-name":
        case "builder-settings-uploaded": {
          // Informational states
          return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "builder-building"});
        }
        case "package-validator-updating-project-path":
        case "package-validator-updating-unreal-project-name": {
          return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "package-validator-validating"});
        }
        //
        case "builder-pod-waiting-for-ready": {
          if (unrealProjectVersion.lastPingFromBuilder != undefined) {
            return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "builder-pod-ready"});
          }
          break;
        }
        case "volume-copy-pods-waiting-for-ready": {
          if (unrealProjectVersion.lastPingFromVolumeCopyRegion != undefined) {
            return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-region-copying"});
          }
          break;
        }
        case "package-validator-required": {
          if (unrealProjectVersion.bridgeToolkitFileSettings == undefined) {
            console.debug(`Setting default bridgeToolkitFileSettings: ${unrealProjectVersionPath}`);
            const defaultBridgeToolkitFileSettings : BridgeToolkitFileSettings = {
              levels: {},
              supportsMultiplayer: false,
              customCharacterClass: true,
              configurator: false,
            };
            await getUnrealProjectVersionRef(unrealProjectId, unrealProjectVersionId).update({bridgeToolkitFileSettings: defaultBridgeToolkitFileSettings});
          }
          try {
            const deployResult = await deployUnrealProjects.deployPackageValidatorPod(projectId, configuration, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion);
            switch (deployResult?.result) {
              case undefined: {
                console.error(`Deploy result ${deployResult?.result}: ${unrealProjectVersionPath}`);
                return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "package-validator-failed"});
              }
              case "failed": {
                console.error(`Deploy result ${deployResult?.result}: ${unrealProjectVersionPath}`);
                return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "package-validator-failed"});
              }
              case "failed-create": {
                console.error(`Deploy result ${deployResult?.result}: ${unrealProjectVersionPath}`);
                return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "package-validator-pod-failed-to-create"});
              }
            }
          } catch (e: any) {
            console.error("Failed to deploy package validator pod");
            console.error(e);
            return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "package-validator-failed"});
          }
          break;
        }
        case "upload-complete": {
          if (unrealProjectVersion.selfPackaged === true) {
            console.debug(`Self packaged upload. Package validation required: ${getUnrealProjectVersionRef(unrealProjectId, unrealProjectVersionId).path}`);
            return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "package-validator-required"});
          }
          const latestPluginVersion = await getLatestPluginVersion(unrealEngineVersion);
          if (latestPluginVersion == undefined) {
            throw new Error("Couldn't resolve latest compatible plugin version");
          }
          try {
            const resolvedUnrealPluginVersion = latestPluginVersion.unrealPluginVersion;
            return await deployUnrealProjects.deployBuilderPod(projectId, configuration, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, latestPluginVersion.doc.id, resolvedUnrealPluginVersion);
          } catch (e: any) {
            console.error("Failed to deploy builder pod");
            console.error(e);
            return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "builder-pod-failed-to-create"});
          }
        }
        case "package-validator-complete": {
          try {
            await deployUnrealProjects.deletePackageValidatorPodStack(unrealProjectVersionId);
          } catch (e:any) {
            console.error(`Failed to delete package validator pod stack: ${unrealProjectId}/${unrealProjectVersionId}`);
          }
          try {
            return await deployUnrealProjects.deployVolumeCopyPodStacks(projectId, configuration, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion);
          } catch (e: any) {
            await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-failed-to-create"});
            throw e;
          }
        }
        case "package-validator-failed": {
          try {
            await deployUnrealProjects.deletePackageValidatorPodStack(unrealProjectVersionId);
          } catch (e:any) {
            console.error(`Failed to delete package validator pod stack: ${unrealProjectId}/${unrealProjectVersionId}`);
          }
          break;
        }
        case "package-validator-retrying": {
          const maximumPackageValidatorRetries = 3;
          try {
            await deployUnrealProjects.deletePackageValidatorPodStack(unrealProjectVersionId);
          } catch (e: any) {
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
          } catch (e:any) {
            console.error(`Failed to delete builder pod stack: ${unrealProjectId}/${unrealProjectVersionId}`);
          }
          try {
            return await deployUnrealProjects.deployVolumeCopyPodStacks(projectId, configuration, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion);
          } catch (e: any) {
            await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-failed-to-create"});
            throw e;
          }
        }
        case "builder-retrying": {
          const maximumBuilderRetries = 3;
          try {
            await deployUnrealProjects.deleteBuilderPodStack(unrealProjectVersionId);
          } catch (e: any) {
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

          return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: unrealProjectVersion.state, buildLogUrl, systemLogUrl});
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
            return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state, buildLogUrl, systemLogUrl});
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

          return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-retrying"});
        }
        case "volume-copy-complete": {
          if (volumeRegions === undefined) {
            console.error("Volume regions not set");
            return;
          }

          // Delete current volume copy pod stack
          await deployUnrealProjects.deleteVolumeCopyPodStack(unrealProjectVersionId, volumeRegions);

          const bridgeTemplates = (await getBridgeSpaceTemplates(unrealProjectId))?.flatMap((templateDoc) => {
            const [templateRef, template] = templateDoc;
            if (templateRef === undefined || template === undefined) return [];
            return [{templateRef, template}];
          });
          const bridgeTemplateCount = bridgeTemplates == undefined ? 0 : bridgeTemplates.length;

          console.debug(`Got ${bridgeTemplateCount} templates for unreal project ${unrealProjectId}`);

          const spaceTemplate = await ensureBridgeSpaceTemplateExists(bridgeTemplates ?? [], {unrealProjectId: unrealProjectId, unrealProject: unrealProject, unrealProjectVersion: unrealProjectVersion});

          const derivedSpaceDocs = (await getDerivedSpacesWithSpaceTemplate(spaceTemplate.templateRef.id))?.flatMap(([doc, space]) => {
            if (doc == undefined || space == undefined) return [];
            return [{
              doc,
              space,
            }];
          });
          console.debug(`Found ${derivedSpaceDocs != undefined ? derivedSpaceDocs.length : 0} space docs derived from ${spaceTemplate.templateRef.ref.path}`);

          // TODO: create settings space item and space tempalte items
          const bridgeSettingsTemplateItem = await createUpdateBridgeToolkitSettingsTemplateItem(spaceTemplate.templateRef.ref, unrealProjectVersion);
          if (bridgeSettingsTemplateItem === undefined) {
            console.log(`No BridgeToolkitSettings space item templated for space template ${spaceTemplate.templateRef.id}`);
          } else {
            if (derivedSpaceDocs !== undefined && derivedSpaceDocs.length > 0) {
              await Promise.all(derivedSpaceDocs.map(async (spaceDoc) => {
                return await createUpdateBridgeToolkitSettingsItem(spaceDoc.doc.ref, bridgeSettingsTemplateItem);
              }));
            }
          }

          const configuratorTemplateItems = await createConfiguratorTemplateItems(spaceTemplate.templateRef.ref, unrealProjectVersion);
          if (configuratorTemplateItems !== undefined && configuratorTemplateItems.length > 0) {
            console.log(`Configurator templated for unreal project ${unrealProjectId} with ${configuratorTemplateItems.length} items`);
            try {
              console.log("Cleaning up old configurator item templates");
              await deleteOldConfiguratorSpaceTemplateItems(spaceTemplate.templateRef.id, configuratorTemplateItems.map((item) => item.itemTemplateId));
            } catch (e: any) {
              console.error(`Failed to clean up old configurator item templates: ${e}`);
            }

            // NOTE: this is replicated in an onWrite handler for the Configurator SpaceTemplateItems in ./cms.ts
            if (derivedSpaceDocs !== undefined && derivedSpaceDocs.length > 0) {
              console.log("Derived spaces found");
              derivedSpaceDocs.forEach(async (spaceDoc) => {
                const configuratorItems = await createUpdateConfiguratorItems(spaceDoc.doc.ref, configuratorTemplateItems);
                if (configuratorItems === undefined) {
                  // Error logging is handled in function
                } else if (configuratorItems.length <= 0 ) {
                  console.log(`No configurator items created for ${spaceDoc.doc.id}`);
                } else {
                  console.log(`Created ${configuratorItems.length} configurator items`);
                }
              });
            } else {
              console.log(`There are no spaces derived from space template ${spaceTemplate.templateRef.id}`);
            }
          } else {
            console.log(`No configurator items created for space template ${spaceTemplate.templateRef.id}`);
          }

          // Get all unreal project versions for the current project
          const unrealProjectVersionDocs = (await getUnrealProjectVersionsRef(unrealProjectId)
            .where("state", "==", "volume-copy-complete")
            .orderBy("created", "desc")
            .get()).docs;
          // Remove the last two versions
          const unrealProjectVersionDocsToExpire = unrealProjectVersionDocs.slice(2);

          return await Promise.allSettled([
            // Cycle through the rest and trigger volume-copy-expiring
            ...unrealProjectVersionDocsToExpire.map((version) => deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId: version.id, state: "volume-copy-expiring"})),
          ]);
        }
        case "volume-copy-retrying": {
          const maximumVolumeCopyRetries = 3;
          try {
            if (volumeRegions !== undefined) await deployUnrealProjects.deleteVolumeCopyPvcs(unrealProjectVersionId, volumeRegions);
            if (volumeRegions !== undefined) await deployUnrealProjects.deleteVolumeCopyPodStack(unrealProjectVersionId, volumeRegions);
          } catch (e: any) {
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
          return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-expired"});
        case "volume-copy-expired":
          console.debug(`Unreal project version expired: ${unrealProjectVersionId}`);
          return;
        case "expiring": {
          const validateUrl = async (fieldPath: "downloadUrl" | "packageArchiveUrl" | "symbolsArchiveUrl", url?: string) => {
            if (url === undefined) {
              console.warn(`${fieldPath} is empty`);
              return undefined;
            }
            // Skip prod deletion of dev artifacts
            if (getFirebaseProjectId() === "ngp-odyssey-prod" && (
              url.startsWith("gs://ngp-odyssey-dev.appspot.com") ||
              url.startsWith("gs://ngp-odyssey-testing.appspot.com") ||
              url.startsWith("gs://odyssey-unreal-project-versions-dev")
            )) {
              console.warn(`${fieldPath} contains a 'dev' or 'testing' url: ${url}. Deletion is not permitted on ${unrealProjectVersionRef.path}`);
              return undefined;
            }

            const fieldCopies = await getUnrealProjectVersionsCollectionGroup([{fieldPath, opStr: "==", value: url}]);
            if (fieldCopies === undefined) {
              // This should not be possible - since the current UPV references the url
              console.warn(`No instances of ${url} were found`);
              return undefined;
            }
            const activeUPVs = fieldCopies.flatMap(([, upv]) => upv?.state !== undefined && upv.state === "volume-copy-complete" ? [upv] : []);
            if (activeUPVs.length >= 1) {
              console.warn(`Atleast 1 active project version shares the given artifact: ${url}. Deletion is not permitted on ${unrealProjectVersionRef.path}`);
              console.warn(activeUPVs);
              return undefined;
            }

            return {fieldPath, url};
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
            const bucketName = (() => {
              const firebaseProjectId = getFirebaseProjectId();
              const gcsBucket = functions.config().unrealprojectversionuploads.bucketname as string;
              if (artifact.url.startsWith(`gs://${firebaseProjectId}.appspot.com`)) return `${firebaseProjectId}.appspot.com`;
              if (artifact.url.startsWith(`gs://${gcsBucket}`)) return gcsBucket;
              console.warn(`Artifact is in an unsupported bucket: ${artifact.url}. Inspect ${unrealProjectVersionRef.path} to manually delete artifact`);
              return undefined;
            })();
            if (bucketName === undefined) return undefined;
            console.log(`Deleting ${unrealProjectVersionRef.path} - ${artifact.fieldPath}: ${artifact.url}`);
            const deletionRequest = await deleteArtifact(bucketName, artifact.url.replace(`gs://${bucketName}/`, ""));
            if (deletionRequest === undefined || deletionRequest.statusCode < 200 || (deletionRequest.statusCode > 299 && deletionRequest.statusCode !== 404)) {
              console.warn(`Deletion failed: ${deletionRequest}`);
              return undefined;
            }
            return artifact.fieldPath;
          }))).flatMap((artifact) => {
            // Strip failed and skipped deletions
            if (artifact === undefined) return [];
            return artifact;
          });

          if (volumeRegions !== undefined) await deployUnrealProjects.deleteVolumeCopyPvcs(unrealProjectVersionId, volumeRegions);

          return await deployUnrealProjects.updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "expired", expiredArtifacts});
        }
        default:
          return console.error(`Unhandled unreal project version state ${unrealProjectVersion.state}. Doing nothing.`);
      }
    });

export const retryStuckUnrealProjectVersions =
  // Every 5 minutes
  // Find UPVs stuck in provisioning states for > 5 minutes and restart them
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async (context) => {
      const stuckStates : UnrealProjectVersionState[] = ["builder-pod-waiting-for-ready", "package-validator-pod-waiting-for-ready", "volume-copy-pods-waiting-for-ready", "volume-copy-pvcs-creating", "volume-copy-region-copying"];
      const upvs = (await admin.firestore().collectionGroup("unrealProjectVersions").where("state", "in", stuckStates).get()).docs;
      console.debug(`Found ${upvs.length} unreal project versions in waiting states`);
      const fiveMinutesAgoMillis = new Date(context.timestamp).valueOf() - 60 * 5 * 1000;
      const fifteenMinutesAgoMillis = new Date(context.timestamp).valueOf() - 60 * 15 * 1000;
      const twentyFourHoursAgo = new Date(context.timestamp).valueOf() - 60 * 60 * 24 * 1000;
      const upvsToReset = upvs.flatMap((upvDoc) => {
        if (upvDoc.exists != true) return [];
        const upv = upvDoc.data() as UnrealProjectVersion;
        const lastStateChange = upv.stateChanges?.reverse()[0];
        const isStuck = lastStateChange != undefined &&
          lastStateChange.state == upv.state &&
          upv.created.toMillis() >= twentyFourHoursAgo &&
          (lastStateChange.timestamp.toMillis() <= fiveMinutesAgoMillis || upv.updated.toMillis() <= fiveMinutesAgoMillis) &&
          (lastStateChange.state != "volume-copy-region-copying" || lastStateChange.timestamp.toMillis() <= fifteenMinutesAgoMillis);
        if (isStuck == false) return [];
        const resetStateOperation = (() => {
          switch (upv.state) {
            case "builder-pod-waiting-for-ready": return {builderRetries: admin.firestore.FieldValue.increment(1), state: "builder-retrying"};
            case "package-validator-pod-waiting-for-ready": return {packageValidatorRetries: admin.firestore.FieldValue.increment(1), state: "package-validator-retrying"};
            case "volume-copy-region-copying":
            case "volume-copy-pvcs-bound":
            case "volume-copy-pods-waiting-for-ready":
            case "volume-copy-pvcs-creating": return {volumeCopyRetries: admin.firestore.FieldValue.increment(1), state: "volume-copy-retrying"};
            default: return undefined;
          }
        })();
        if (resetStateOperation == undefined) return [];
        return {doc: upvDoc, unrealProjectVersion: upv, stateToResetTo: resetStateOperation};
      });
      console.debug(`Found ${upvsToReset.length} stuck unreal project versions`);
      await Promise.all(upvsToReset.map(async (upvToReset) => {
        try {
          console.error(`Resetting upv: ${upvToReset.doc.ref.path} to ${upvToReset.stateToResetTo}`);
          return await upvToReset.doc.ref.update({
            state: upvToReset.stateToResetTo.state,
            volumeCopyRetries: upvToReset.stateToResetTo.volumeCopyRetries,
            packageValidatorRetries: upvToReset.stateToResetTo.packageValidatorRetries,
            builderRetries: upvToReset.stateToResetTo.builderRetries,
            updated: admin.firestore.Timestamp.now(),
          });
        } catch (e: any) {
          console.error(`Failed to reset upv: ${upvToReset.doc.ref.path} to ${upvToReset.stateToResetTo}`);
        }
      }));
    });

export const cleanUpOldGCSFilesForUnrealProjectVersions =
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
      const upvsToExpire = await getAllExpirableUnrealProjectVersions();

      if (upvsToExpire.length < 1) {
        console.log("No Unreal Project Versions to expire");
        return;
      }

      const dedupedUPIds = [...new Set(upvsToExpire.flatMap(([upvDoc]) => {
        if (upvDoc?.ref.parent.parent?.id === undefined) return [];
        return [upvDoc.ref.parent.parent.id];
      }))];

      const latestUPVsListed = (await Promise.all(dedupedUPIds.map(async (upId) => {
        const latestUPV = await getLatestUnrealProjectVersion(upId);
        if (latestUPV === undefined) return undefined;
        return latestUPV;
      }))).flatMap((upv) => upv === undefined ? [] : [upv]);

      const nonLatestUPVs = (await Promise.all(upvsToExpire.flatMap(async (upvResult) => {
        const [upvDoc] = upvResult;
        if (upvDoc === undefined) return undefined;
        const isLatestUPV = latestUPVsListed.filter((upv) => upv.doc.id === upvDoc.id).length > 0;
        if (isLatestUPV === false) return upvResult;
        return undefined;
      }))).flatMap((upv) => upv === undefined ? [] : [upv]);

      if (nonLatestUPVs.length < 1) {
        console.log("No Unreal Project Versions to expire");
        return;
      }

      console.log("Expiring Unreal Project Versions...");
      nonLatestUPVs.forEach(([upvDoc, upv]) => {
        if (upvDoc === undefined || upv === undefined) return;
        console.log({
          documentPath: upvDoc.ref.path,
          created: upv.created.toDate().toISOString(),
          state: upv.state,
        });
      });

      return await expireUnrealProjectVersions(nonLatestUPVs);
    });

export interface UpdateUnrealProjectVersionPayload {
  organizationId?: string
  region?: string
  unrealProjectId?: string
  unrealProjectVersionId?: string
  source?: "builder" | "volume-copy-region" | "package-validator"
  state?: UnrealProjectVersionState
  packageArchiveUrl?: string
  packageArchiveSha256Sum?: string
  symbolsArchiveUrl?: string
  symbolsArchiveSha256Sum?: string
  volumeSizeGb?: number
  settingsUpload?: BridgeToolkitFileSettings
  unrealProjectName?: string
  unrealProjectDirectoryPath?: string
}

// onPublish to updateUnrealProjectVersion topic
// Update the unrealProjectVersion, optionally with a valid state
export const updateUnrealProjectVersion =
  functions
    .runWith(customRunWith)
    .pubsub.topic("updateUnrealProjectVersion")
    .onPublish(async (data, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(data));
      const payload = data.json as UpdateUnrealProjectVersionPayload;
      if (payload.organizationId == null || payload.organizationId == undefined) {
        throw new Error("Must specify organizationId");
      }
      if (payload.unrealProjectId == null || payload.unrealProjectId == undefined) {
        throw new Error("Must specify unrealProjectId");
      }
      if (payload.unrealProjectVersionId == null || payload.unrealProjectId == undefined) {
        throw new Error("Must specify unrealProjectVersionId");
      }

      if (payload.state != undefined && payload.state != null) {
        if (!UNREAL_PROJECT_VERSION_STATE.includes(payload.state)) {
          throw new Error("Invalid unreal project version state");
        }
        if (["volume-copy-region-copying", "volume-copy-region-failed", "volume-copy-region-complete"].includes(payload.state)) {
          if (payload.region == undefined) throw new Error("Region must be specified for volume-copy-region updates");
        }
        if (payload.state == "builder-upload-complete") {
          if (payload.packageArchiveUrl == undefined) throw new Error("Must specify packageArchiveUrl");
          if (payload.packageArchiveSha256Sum == undefined) throw new Error("Must specify packageArchiveSha256sum");
          if (payload.symbolsArchiveUrl == undefined) throw new Error("Must specify symbolsArchiveUrl");
          if (payload.symbolsArchiveSha256Sum == undefined) throw new Error("Must specify symbolsArchiveSha256sum");
          if (payload.volumeSizeGb == undefined) throw new Error("Must specify volumeSizeGb");
        }
        if (payload.state === "builder-settings-uploaded") {
          if (payload.settingsUpload === undefined) throw new Error("Must specify Odyssey settings file contents");
          await getUnrealProjectVersionRef(payload.unrealProjectId, payload.unrealProjectVersionId).update({
            bridgeToolkitFileSettings: payload.settingsUpload,
          });
        }
        if (payload.state === "builder-update-unreal-project-name" || payload.state === "package-validator-updating-unreal-project-name") {
          if (payload.unrealProjectName === undefined) throw new Error("Must specify unreal project name");
          await getUnrealProjectVersionRef(payload.unrealProjectId, payload.unrealProjectVersionId).update({
            name: payload.unrealProjectName,
          });
        }
        if (payload.state === "package-validator-updating-project-path") {
          await getUnrealProjectVersionRef(payload.unrealProjectId, payload.unrealProjectVersionId).update({
            unrealProjectDirectoryPath: payload.unrealProjectDirectoryPath,
          });
        }
        return await deployUnrealProjects.updateUnrealProjectVersionState({
          unrealProjectId: payload.unrealProjectId,
          unrealProjectVersionId: payload.unrealProjectVersionId,
          packageArchiveSha256Sum: payload.packageArchiveSha256Sum,
          symbolsArchiveSha256Sum: payload.symbolsArchiveSha256Sum,
          packageArchiveUrl: payload.packageArchiveUrl,
          symbolsArchiveUrl: payload.symbolsArchiveUrl,
          state: payload.state,
          region: payload.region,
          volumeSizeGb: payload.volumeSizeGb,
          lastPingFromBuilder: (payload.source == "builder") ? admin.firestore.Timestamp.now() : undefined,
          lastPingFromVolumeCopyRegion: (payload.source == "volume-copy-region") ? admin.firestore.Timestamp.now() : undefined,
        });
      }

      if (payload.source != undefined) {
        console.debug(`Ping from ${payload.source}`);
        switch (payload.source) {
          case "package-validator": {
            return await getUnrealProjectVersionRef(payload.unrealProjectId, payload.unrealProjectVersionId).update({
              lastPingFromPackageValidator: admin.firestore.Timestamp.now(),
            });
          }
          case "builder": {
            return await getUnrealProjectVersionRef(payload.unrealProjectId, payload.unrealProjectVersionId).update({
              lastPingFromBuilder: admin.firestore.Timestamp.now(),
            });
          }
          case "volume-copy-region": {
            return await getUnrealProjectVersionRef(payload.unrealProjectId, payload.unrealProjectVersionId).update({
              lastPingFromVolumeCopyRegion: admin.firestore.Timestamp.now(),
            });
          }
        }
      }
    });

/* TODO: Cleanup/checker jobs
* Build pods which never reached ready state
* Volume copy pods which never reached ready state
* Build pods which haven't contacted for > 5 minutes
* Volume copy pods which haven't contacted for > 5 minutes
* Build pods which haven't completed after 24 hours
* Volume copy pods which haven't completed after 60 minutes
*/

export interface PublishUnrealPluginVersionPayload {
  id?: string
  timestamp?: string
  status?: UnrealPluginVersionState
  unrealEngineVersion?: string
  url?: string
  sha256Sum?: string
  unzippedSizeMb?: number
  zippedSizeMb?: number
  toolkitUrl?: string
  toolkitSha256Sum?: string
  toolkitUnzippedSizeMb?: number
  toolkitZippedSizeMb?: number
  regions?: string
}

// When CICD finishes building a new plugin version, it hits this
export const publishUnrealPluginVersion =
  functions
    .runWith(customRunWith)
    .pubsub.topic("publishUnrealPluginVersion")
    .onPublish(async (data, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(data));
      const payload = data.json as PublishUnrealPluginVersionPayload;
      if (payload.id == null || payload.id == undefined || payload.id.length < 1) {
        throw new Error("Must specify id");
      }
      if (payload.timestamp == null || payload.timestamp == undefined || payload.timestamp.length < 1) {
        throw new Error("Must specify timestamp");
      }
      if (payload.status == null || payload.status == undefined || !UNREAL_PLUGIN_VERSION_STATE.includes(payload.status)) {
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
        if (payload.unrealEngineVersion == null || payload.unrealEngineVersion == undefined || !SUPPORTED_UNREAL_ENGINE_VERSION.map((v) => String(v)).includes(payload.unrealEngineVersion)) {
          // HACK: Default unreal engine version
          return defaultUnrealEngineVersion;
        }
        return payload.unrealEngineVersion as SupportedUnrealEngineVersion;
      })();

      const regions = convertSpaceSeparatedStringToArray(payload.regions);
      if (regions.length < 1) {
        throw new Error("Must specify 'regions' with at least one region in space separated format. E.g. 'ORD1 LGA1 LAS1'");
      }

      const timestamp = new Date(Date.parse(payload.timestamp));

      const pluginVersion : UnrealPluginVersion = {
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

      return await getUnrealPluginVersionRef(payload.id).create(pluginVersion);
    });
