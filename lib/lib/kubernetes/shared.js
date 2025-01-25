"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.podStatusToPodState = exports.getPodStatus = void 0;
function getPodStatus(pod) {
    var _a, _b, _c, _d, _e;
    if (pod.status === undefined) {
        console.log("Pod status is undefined");
        return undefined;
    }
    const isReady = (_a = pod.status.conditions) === null || _a === void 0 ? void 0 : _a.flatMap((condition) => (condition.type === "Ready" && condition.status === "True") ? [condition] : []).length;
    const isScheduled = (_b = pod.status.conditions) === null || _b === void 0 ? void 0 : _b.flatMap((condition) => (condition.type === "PodScheduled" && condition.status === "True") ? [condition] : []).length;
    const isUnschedulable = (_c = pod.status.conditions) === null || _c === void 0 ? void 0 : _c.flatMap((condition) => (condition.type === "PodScheduled" && condition.status === "False" && condition.reason === "Unschedulable") ? [condition] : []).length;
    const isInitialized = (_d = pod.status.conditions) === null || _d === void 0 ? void 0 : _d.flatMap((condition) => (condition.type === "Initialized" && condition.status === "True") ? [condition] : []).length;
    const isContainersReady = (_e = pod.status.conditions) === null || _e === void 0 ? void 0 : _e.flatMap((condition) => (condition.type === "ContainersReady" && condition.status === "True") ? [condition] : []).length;
    if (isReady === 1) {
        return "ready";
    }
    else if (isContainersReady === 1) {
        return "containersReady";
    }
    else if (isScheduled === 1) {
        return "scheduled";
    }
    else if (isInitialized === 1) {
        return "initialized";
    }
    else if (isUnschedulable === 1) {
        return "unschedulable";
    }
    else if (pod.status.phase === "Pending") {
        return "pending";
    }
    else if (pod.status.phase === "Failed") {
        return "failed";
    }
    else {
        console.log("No matching conditions, assuming undefined");
        return undefined;
    }
}
exports.getPodStatus = getPodStatus;
function podStatusToPodState(podStatus) {
    switch (podStatus) {
        case "containersReady": {
            return "pod-containersReady";
        }
        case "initialized": {
            return "pod-initialized";
        }
        case "ready": {
            return "pod-ready";
        }
        case "scheduled": {
            return "pod-scheduled";
        }
        case "pending": {
            return "pod-pending";
        }
        case "unschedulable": {
            return "pod-unschedulable";
        }
        case "failed": {
            return "pod-failed";
        }
    }
}
exports.podStatusToPodState = podStatusToPodState;
//# sourceMappingURL=shared.js.map