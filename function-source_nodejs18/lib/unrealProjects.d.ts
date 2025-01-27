import * as functions from "firebase-functions";
import { BridgeToolkitFileSettings, UnrealPluginVersionState, UnrealProjectVersionState } from "./lib/docTypes";
export declare const addUserBridgeCliLogs: functions.HttpsFunction & functions.Runnable<any>;
export declare const getLatestUnrealPluginVersion: functions.HttpsFunction & functions.Runnable<any>;
export declare const getAllUnrealProjects: functions.HttpsFunction & functions.Runnable<any>;
export declare const getSpecificUnrealProjectVersion: functions.HttpsFunction & functions.Runnable<any>;
export declare const getUnrealProjectLatestBuildLogDownloadUrl: functions.HttpsFunction & functions.Runnable<any>;
export declare const getUnrealProjectVersionBuildLogs: functions.HttpsFunction & functions.Runnable<any>;
export declare const createNewUnrealProject: functions.HttpsFunction & functions.Runnable<any>;
export declare const createNewUnrealProjectVersion: functions.HttpsFunction & functions.Runnable<any>;
export declare const newWebUploadedUnrealProjectAndVersion: functions.HttpsFunction & functions.Runnable<any>;
export declare const notifyUnrealProjectVersionUploaded: functions.HttpsFunction & functions.Runnable<any>;
export declare const onUpdateUnrealProjectMetadata: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
export declare const onUpdateUnrealProjectVersion: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
export declare const retryStuckUnrealProjectVersions: functions.CloudFunction<unknown>;
export declare const cleanUpOldGCSFilesForUnrealProjectVersions: functions.CloudFunction<unknown>;
export interface UpdateUnrealProjectVersionPayload {
    organizationId?: string;
    region?: string;
    unrealProjectId?: string;
    unrealProjectVersionId?: string;
    source?: "builder" | "volume-copy-region" | "package-validator";
    state?: UnrealProjectVersionState;
    packageArchiveUrl?: string;
    packageArchiveSha256Sum?: string;
    symbolsArchiveUrl?: string;
    symbolsArchiveSha256Sum?: string;
    volumeSizeGb?: number;
    settingsUpload?: BridgeToolkitFileSettings;
    unrealProjectName?: string;
    unrealProjectDirectoryPath?: string;
}
export declare const updateUnrealProjectVersion: functions.CloudFunction<functions.pubsub.Message>;
export interface PublishUnrealPluginVersionPayload {
    id?: string;
    timestamp?: string;
    status?: UnrealPluginVersionState;
    unrealEngineVersion?: string;
    url?: string;
    sha256Sum?: string;
    unzippedSizeMb?: number;
    zippedSizeMb?: number;
    toolkitUrl?: string;
    toolkitSha256Sum?: string;
    toolkitUnzippedSizeMb?: number;
    toolkitZippedSizeMb?: number;
    regions?: string;
}
export declare const publishUnrealPluginVersion: functions.CloudFunction<functions.pubsub.Message>;
