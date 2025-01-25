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
exports.formatServerConfigMapName = exports.formatGameServerName = exports.resolveKubeConfig = exports.coreweaveGameServerClusterCredentials = exports.resolveGkeGameserverClusterInfo = exports.gameServerNameBase = void 0;
const functions = __importStar(require("firebase-functions"));
const k8s = __importStar(require("@kubernetes/client-node"));
const clusterConfig_1 = require("../kubernetes/clusterConfig");
const gkeAuth_1 = require("../gcloud/gkeAuth");
const firestore_1 = require("../documents/firestore");
const firebase_1 = require("../firebase");
exports.gameServerNameBase = "odyssey-server";
function resolveGkeGameserverClusterInfo() {
    const gkeClusterInfo = {
        projectId: functions.config().gkegameserverclusterinfo.projectid,
        clusterId: functions.config().gkegameserverclusterinfo.clusterid,
    };
    try {
        gkeClusterInfo.region = functions.config().gkegameserverclusterinfo.region;
    }
    catch (e) {
        console.log("Function config `gkegameserverclusterinfo.region` not defined");
    }
    try {
        gkeClusterInfo.zone = functions.config().gkegameserverclusterinfo.zone;
    }
    catch (e) {
        console.log("Function config `gkegameserverclusterinfo.zone` not defined");
    }
    return gkeClusterInfo;
}
exports.resolveGkeGameserverClusterInfo = resolveGkeGameserverClusterInfo;
exports.coreweaveGameServerClusterCredentials = {
    accessToken: functions.config().coreweavegameserverclustercredentials.accesstoken,
    certificateAuthority: functions.config().coreweavegameserverclustercredentials.certificateauthority,
    server: functions.config().coreweavegameserverclustercredentials.server,
    namespace: functions.config().coreweavegameserverclustercredentials.namespace,
};
async function resolveKubeConfig(workloadClusterProvider) {
    async function getKc() {
        if (workloadClusterProvider == "gke") {
            const kc = new k8s.KubeConfig();
            await (0, gkeAuth_1.loadGcpKubeConfig)(kc, resolveGkeGameserverClusterInfo());
            return kc;
        }
        else {
            const kc = (0, clusterConfig_1.createKubeConfig)(exports.coreweaveGameServerClusterCredentials);
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
function formatGameServerName(roomId) {
    return (exports.gameServerNameBase + "-" + roomId.toLowerCase()).slice(0, 63);
}
exports.formatGameServerName = formatGameServerName;
function formatServerConfigMapName(projectId) {
    const envName = (0, firebase_1.projectToEnvName)(projectId);
    if (envName == undefined)
        return undefined;
    return "odyssey-server-" + envName;
}
exports.formatServerConfigMapName = formatServerConfigMapName;
//# sourceMappingURL=shared.js.map