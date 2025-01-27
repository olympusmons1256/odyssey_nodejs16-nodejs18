"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUnrealPluginVersionPvcs = exports.formatUnrealPluginVersionClaimName = void 0;
const k8s = __importStar(require("@kubernetes/client-node"));
const shared_1 = require("../streamingSessions/shared");
function formatUnrealPluginVersionClaimName(unrealPluginVersionId, region) {
    return ("plugin-version-" + unrealPluginVersionId + "-" + region).toLowerCase();
}
exports.formatUnrealPluginVersionClaimName = formatUnrealPluginVersionClaimName;
async function deleteUnrealPluginVersionPvcs(unrealPluginVersionId, regions) {
    const kc = await (0, shared_1.resolveKubeConfig)("coreweave");
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const pvcDeleteResults = await Promise.all(regions.map(async (region) => {
        const pvcName = formatUnrealPluginVersionClaimName(unrealPluginVersionId, region);
        try {
            console.debug("Deleting pvc: ", pvcName);
            const pvcDelete = await coreClient.deleteNamespacedPersistentVolumeClaim(pvcName, namespace, undefined, undefined, 15);
            const pvcDeleted = pvcDelete.response.statusCode;
            console.debug("Delete pvc response status code: ", pvcDelete.response.statusCode);
            console.debug("Delete pvc response status message: ", pvcDelete.response.statusMessage);
            if (pvcDeleted != undefined && pvcDeleted >= 200 && pvcDeleted < 300) {
                console.debug("Deleted pvc successfully");
                return true;
            }
        }
        catch (e) {
            console.error(e);
        }
        console.error("Failed to delete pvc");
        return false;
    }));
    const successfullyDeletedPvcs = pvcDeleteResults.reduce((acc, r) => (acc == false) ? false : r, true);
    return successfullyDeletedPvcs;
}
exports.deleteUnrealPluginVersionPvcs = deleteUnrealPluginVersionPvcs;
//# sourceMappingURL=deploy-standard.js.map