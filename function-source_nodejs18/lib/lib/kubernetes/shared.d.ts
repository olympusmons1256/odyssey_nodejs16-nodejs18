import * as k8s from "@kubernetes/client-node";
import { PodStatus, PodState } from "./types";
export declare function getPodStatus(pod: k8s.V1Pod): PodStatus | undefined;
export declare function podStatusToPodState(podStatus: PodStatus): PodState;
