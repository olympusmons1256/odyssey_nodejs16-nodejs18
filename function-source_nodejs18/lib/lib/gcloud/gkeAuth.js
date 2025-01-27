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
exports.loadGcpKubeConfig = void 0;
const container = __importStar(require("@google-cloud/container"));
const containerClusters_1 = require("../gcloud/containerClusters");
async function getCredentials(clusterInfo, client) {
    const accessToken = await client.auth.getAccessToken();
    const request = (0, containerClusters_1.constructRequest)(clusterInfo);
    const [response] = await client.getCluster(request);
    if (response.endpoint == undefined || response.endpoint == null) {
        throw Error("Missing response.endpoint");
    }
    else if (response.masterAuth == undefined || response.masterAuth == null || response.masterAuth.clusterCaCertificate == undefined || response.masterAuth.clusterCaCertificate == null) {
        throw Error("Missing response.masterAuth.clusterCaCertificate");
    }
    else if (accessToken == undefined || accessToken == null) {
        throw Error("Missing accessToken");
    }
    else {
        return {
            endpoint: response.endpoint,
            certificateAuthority: response.masterAuth.clusterCaCertificate,
            accessToken: accessToken,
        };
    }
}
function loadKubeConfig(kubeConfig, credentials) {
    const user = {
        name: "a",
        token: credentials.accessToken,
    };
    const cluster = {
        name: "a",
        caData: credentials.certificateAuthority,
        server: "https://" + credentials.endpoint,
        skipTLSVerify: false,
    };
    return kubeConfig.loadFromClusterAndUser(cluster, user);
}
async function loadGcpKubeConfig(kubeConfig, gkeClusterInfo) {
    const client = new container.v1.ClusterManagerClient({});
    const credentials = await getCredentials(gkeClusterInfo, client);
    loadKubeConfig(kubeConfig, credentials);
    return credentials;
}
exports.loadGcpKubeConfig = loadGcpKubeConfig;
//# sourceMappingURL=gkeAuth.js.map