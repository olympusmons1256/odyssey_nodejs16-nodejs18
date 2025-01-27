import { ClusterCredentials } from "../kubernetes/clusterConfig";
import * as k8s from "@kubernetes/client-node";
import { GkeClusterInfo } from "../gcloud/containerClusters";
import { ClusterProvider } from "../systemDocTypes";
export declare const serviceNameBase = "odyssey-client";
export declare const imagePullJobNameBase = "odyssey-client-image-pull-job";
export declare function resolveGkeStreamingSessionClusterInfo(): GkeClusterInfo;
export declare const coreweaveStreamingSessionClusterCredentials: ClusterCredentials;
export declare function resolveKubeConfig(workloadClusterProvider: ClusterProvider): Promise<k8s.KubeConfig>;
export interface SignallingUrlResult {
    signallingUrl: string;
    took?: number;
}
export declare function formatSessionName(userId: string, deploymentId: string): string;
export declare function formatClientConfigMapName(projectId: string): string | undefined;
export declare function formatJobName(imageId: string): string;
