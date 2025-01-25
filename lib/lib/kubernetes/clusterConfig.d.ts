import { KubeConfig } from "@kubernetes/client-node";
export interface ClusterCredentials {
    server: string;
    certificateAuthority: string;
    accessToken: string;
    namespace?: string;
}
export declare function createKubeConfig(clusterCredentials: ClusterCredentials): KubeConfig;
