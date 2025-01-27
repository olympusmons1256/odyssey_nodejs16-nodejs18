import { KubeConfig } from "@kubernetes/client-node";
import { GkeClusterInfo } from "../gcloud/containerClusters";
import { ClusterCredentials } from "../kubernetes/types";
export declare function loadGcpKubeConfig(kubeConfig: KubeConfig, gkeClusterInfo: GkeClusterInfo): Promise<ClusterCredentials>;
