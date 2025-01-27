import * as admin from "firebase-admin";
import * as k8s from "@kubernetes/client-node";
import { UnrealPluginVersion, UnrealProject, UnrealProjectVersion, UnrealProjectVersionState } from "../docTypes";
import { ConfigurationUnrealProjectVersion } from "../systemDocTypes";
export declare function updateUnrealProjectVersionState(options: {
    unrealProjectId: string;
    unrealProjectVersionId: string;
    state: UnrealProjectVersionState;
    lastPingFromBuilder?: admin.firestore.Timestamp | admin.firestore.FieldValue;
    lastPingFromVolumeCopyRegion?: admin.firestore.Timestamp | admin.firestore.FieldValue;
    packageArchiveUrl?: string;
    packageArchiveSha256Sum?: string;
    symbolsArchiveUrl?: string;
    symbolsArchiveSha256Sum?: string;
    region?: string;
    volumeSizeGb?: number;
    volumeRegions?: string[];
    buildRegion?: string;
    buildLogUrl?: string;
    systemLogUrl?: string;
    incrementBuilderRetries?: boolean;
    incrementPackageValidatorRetries?: boolean;
    incrementVolumeCopyRetries?: boolean;
    expiredArtifacts?: string[];
}): Promise<FirebaseFirestore.WriteResult | undefined>;
interface WatchPodUntilReadyOptions {
    unrealProjectId: string;
    unrealProjectVersionId: string;
    kc: k8s.KubeConfig;
    podName: string;
    unrealProjectVersionState: UnrealProjectVersionState;
    timeoutSeconds?: number;
}
export declare function watchPodUntilReady({ unrealProjectId, unrealProjectVersionId, kc, podName, unrealProjectVersionState, timeoutSeconds, }: WatchPodUntilReadyOptions): Promise<void | FirebaseFirestore.WriteResult | undefined>;
export declare function deployBuilderPod(firebaseProjectId: string, configuration: ConfigurationUnrealProjectVersion | undefined, unrealProjectId: string, unrealProject: UnrealProject, unrealProjectVersionId: string, unrealProjectVersion: UnrealProjectVersion, unrealPluginVersionId: string, unrealPluginVersion: UnrealPluginVersion): Promise<undefined>;
export declare function deployPackageValidatorPod(firebaseProjectId: string, configuration: ConfigurationUnrealProjectVersion | undefined, unrealProjectId: string, unrealProject: UnrealProject, unrealProjectVersionId: string, unrealProjectVersion: UnrealProjectVersion): Promise<{
    name: string;
    result: "failed" | "timed-out" | "ready" | "failed-create";
} | undefined>;
export declare function deleteBuilderPodStack(unrealProjectVersionId: string): Promise<boolean>;
export declare function deletePackageValidatorPodStack(unrealProjectVersionId: string): Promise<boolean>;
interface WatchUntilReadyOptions {
    kc: k8s.KubeConfig;
    name: string;
    timeoutSeconds?: number;
}
export declare function watchVolumeCopyPodUntilReady({ kc, name, timeoutSeconds, }: WatchUntilReadyOptions): Promise<{
    name: string;
    result: "failed" | "failed-create" | "ready" | "timed-out";
}>;
export declare function watchVolumeCopyPvcUntilReady({ kc, name, timeoutSeconds, }: WatchUntilReadyOptions): Promise<{
    name: string;
    result: "failed" | "bound" | "timed-out";
}>;
export declare function watchPackageValidatorPodUntilReady({ kc, name, timeoutSeconds, }: WatchUntilReadyOptions): Promise<{
    name: string;
    result: "failed" | "failed-create" | "ready" | "timed-out";
}>;
export declare function deployVolumeCopyPodStacks(firebaseProjectId: string, configuration: ConfigurationUnrealProjectVersion | undefined, unrealProjectId: string, unrealProject: UnrealProject, unrealProjectVersionId: string, unrealProjectVersion: UnrealProjectVersion): Promise<FirebaseFirestore.WriteResult | undefined>;
export declare function deleteVolumeCopyPodStack(unrealProjectVersionId: string, regions: string[]): Promise<boolean>;
export declare function deleteVolumeCopyPvcs(unrealProjectVersionId: string, regions: string[]): Promise<boolean>;
export {};
