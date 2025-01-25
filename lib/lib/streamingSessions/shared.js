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
exports.formatJobName = exports.formatClientConfigMapName = exports.formatSessionName = exports.resolveKubeConfig = exports.coreweaveStreamingSessionClusterCredentials = exports.resolveGkeStreamingSessionClusterInfo = exports.imagePullJobNameBase = exports.serviceNameBase = void 0;
const gkeAuth_1 = require("../gcloud/gkeAuth");
const clusterConfig_1 = require("../kubernetes/clusterConfig");
const k8s = __importStar(require("@kubernetes/client-node"));
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("../documents/firestore");
const firebase_1 = require("../firebase");
exports.serviceNameBase = "odyssey-client";
exports.imagePullJobNameBase = "odyssey-client-image-pull-job";
function resolveGkeStreamingSessionClusterInfo() {
    const gkeClusterInfo = {
        projectId: functions.config().gkestreamingsessionclusterinfo.projectid,
        clusterId: functions.config().gkestreamingsessionclusterinfo.clusterid,
    };
    try {
        gkeClusterInfo.region = functions.config().gkestreamingsessionclusterinfo.region;
    }
    catch (e) {
        console.log("Function config `gkestreamingsessionclusterinfo.region` not defined");
    }
    try {
        gkeClusterInfo.zone = functions.config().gkestreamingsessionclusterinfo.zone;
    }
    catch (e) {
        console.log("Function config `gkestreamingsessionclusterinfo.zone` not defined");
    }
    return gkeClusterInfo;
}
exports.resolveGkeStreamingSessionClusterInfo = resolveGkeStreamingSessionClusterInfo;
exports.coreweaveStreamingSessionClusterCredentials = {
    accessToken: functions.config().coreweavestreamingsessionclustercredentials.accesstoken,
    certificateAuthority: functions.config().coreweavestreamingsessionclustercredentials.certificateauthority,
    server: functions.config().coreweavestreamingsessionclustercredentials.server,
    namespace: functions.config().coreweavestreamingsessionclustercredentials.namespace,
};
async function resolveKubeConfig(workloadClusterProvider) {
    async function getKc() {
        if (workloadClusterProvider == "gke") {
            const kc = new k8s.KubeConfig();
            await (0, gkeAuth_1.loadGcpKubeConfig)(kc, resolveGkeStreamingSessionClusterInfo());
            return kc;
        }
        else {
            const kc = (0, clusterConfig_1.createKubeConfig)(exports.coreweaveStreamingSessionClusterCredentials);
            return kc;
        }
    }
    const kc = await getKc();
    const [, clustProviderConfiguration] = await (0, firestore_1.getWorkloadClusterProviderConfiguration)(workloadClusterProvider);
    if (clustProviderConfiguration != undefined && clustProviderConfiguration.httpsProxy != undefined && clustProviderConfiguration.httpsProxy != "") {
        console.debug("Applying https proxy: ", clustProviderConfiguration.httpsProxy);
        process.env.HTTPS_PROXY = clustProviderConfiguration.httpsProxy;
    }
    return kc;
}
exports.resolveKubeConfig = resolveKubeConfig;
function formatSessionName(userId, deploymentId) {
    return (exports.serviceNameBase + "-" + userId.toLowerCase() + "-" + deploymentId.toLowerCase()).slice(0, 63);
}
exports.formatSessionName = formatSessionName;
function formatClientConfigMapName(projectId) {
    const envName = (0, firebase_1.projectToEnvName)(projectId);
    if (envName == undefined)
        return undefined;
    return "odyssey-client-" + envName;
}
exports.formatClientConfigMapName = formatClientConfigMapName;
function formatJobName(imageId) {
    return (exports.imagePullJobNameBase + "-" + imageId.toLowerCase());
}
exports.formatJobName = formatJobName;
//# sourceMappingURL=shared.js.map