import * as container from "@google-cloud/container";
import { GkeAccelerator } from "../systemDocTypes";
export interface GkeClusterInfo {
    projectId: string;
    region?: string;
    zone?: string;
    clusterId: string;
}
export declare function constructRequest(clusterInfo: GkeClusterInfo): GkeClusterInfo | {
    name: string;
};
export declare function setGkeNodePoolNodeCount(gkeClusterInfo: GkeClusterInfo, nodeCountExpected: number, gkeAccelerator: GkeAccelerator): Promise<[container.protos.google.container.v1.IOperation, container.protos.google.container.v1.ISetNodePoolAutoscalingRequest | undefined, {} | undefined][] | undefined>;
