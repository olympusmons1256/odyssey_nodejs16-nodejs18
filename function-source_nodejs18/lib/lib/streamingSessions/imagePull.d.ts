import * as k8s from "@kubernetes/client-node";
import { ConfigurationOdysseyClientPod, ClusterProvider } from "../systemDocTypes";
export declare type DeployNodeImagePullDaemonSetResult = ["created" | "updated", k8s.V1DaemonSet];
export declare function deployNodeImagePullDaemonSet(configuration: ConfigurationOdysseyClientPod, workloadClusterProvider: ClusterProvider): Promise<DeployNodeImagePullDaemonSetResult | undefined>;
