export declare type PodStatus = "ready" | "containersReady" | "scheduled" | "initialized" | "pending" | "failed" | "unschedulable";
export declare type PodState = "pod-pending" | "pod-unschedulable" | "pod-scheduled" | "pod-creating" | "pod-initialized" | "pod-containersReady" | "pod-ready" | "pod-failed" | "pod-deleted";
export interface ClusterCredentials {
    endpoint: string;
    certificateAuthority: string;
    accessToken: string;
}
