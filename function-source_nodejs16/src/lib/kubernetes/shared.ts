import * as k8s from "@kubernetes/client-node";
import {PodStatus, PodState} from "./types";

export function getPodStatus(pod : k8s.V1Pod) : PodStatus | undefined {
  if (pod.status === undefined) {
    console.log("Pod status is undefined");
    return undefined;
  }
  const isReady = pod.status.conditions?.flatMap((condition) => (condition.type === "Ready" && condition.status === "True") ? [condition] : []).length;
  const isScheduled = pod.status.conditions?.flatMap((condition) => (condition.type === "PodScheduled" && condition.status === "True") ? [condition] : []).length;
  const isUnschedulable = pod.status.conditions?.flatMap((condition) => (condition.type === "PodScheduled" && condition.status === "False" && condition.reason === "Unschedulable") ? [condition] : []).length;
  const isInitialized = pod.status.conditions?.flatMap((condition) => (condition.type === "Initialized" && condition.status === "True") ? [condition] : []).length;
  const isContainersReady = pod.status.conditions?.flatMap((condition) => (condition.type === "ContainersReady" && condition.status === "True") ? [condition] : []).length;

  if (isReady === 1) {
    return "ready";
  } else if (isContainersReady === 1) {
    return "containersReady";
  } else if (isScheduled === 1) {
    return "scheduled";
  } else if (isInitialized === 1) {
    return "initialized";
  } else if (isUnschedulable === 1) {
    return "unschedulable";
  } else if (pod.status.phase === "Pending") {
    return "pending";
  } else if (pod.status.phase === "Failed") {
    return "failed";
  } else {
    console.log("No matching conditions, assuming undefined");
    return undefined;
  }
}

export function podStatusToPodState(podStatus : PodStatus) : PodState {
  switch (podStatus) {
    case "containersReady": {return "pod-containersReady";}
    case "initialized": {return "pod-initialized";}
    case "ready": {return "pod-ready";}
    case "scheduled": {return "pod-scheduled";}
    case "pending": {return "pod-pending";}
    case "unschedulable": {return "pod-unschedulable";}
    case "failed": {return "pod-failed";}
  }
}
