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
exports.deployNodeImagePullDaemonSet = void 0;
const k8s = __importStar(require("@kubernetes/client-node"));
const misc_1 = require("../misc");
const shared_1 = require("./shared");
const resourceYaml = __importStar(require("./yaml-standard"));
const nodeImagePullDaemonSetName = "odyssey-client-node-image-pull";
const nodeImagePullDaemonSetYamlFile = "./" + nodeImagePullDaemonSetName + "-daemonset" + ".yaml";
async function deployNodeImagePullDaemonSet(configuration, workloadClusterProvider) {
    const kc = await (0, shared_1.resolveKubeConfig)(workloadClusterProvider);
    const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
    const coreClient = kc.makeApiClient(k8s.AppsV1Api);
    const objectClient = kc.makeApiClient(k8s.KubernetesObjectApi);
    const daemonsetYaml = await (0, misc_1.readFile)(nodeImagePullDaemonSetYamlFile);
    const daemonset = resourceYaml.templateImagePullDaemonset(daemonsetYaml, configuration);
    const daemonsetObject = daemonset;
    if (daemonset.metadata == undefined || daemonset.metadata.name == undefined || daemonset.spec == undefined) {
        console.error("daemonset metadata, spec or name undefined");
        return undefined;
    }
    const existingDaemonSet = await objectClient.read({
        metadata: {
            name: daemonset.metadata.name,
            namespace: namespace
        }
    })
        .catch((e) => {
        console.error(e);
        return undefined;
    });
    if (existingDaemonSet != undefined && existingDaemonSet.response.statusCode != undefined && existingDaemonSet.response.statusCode == 200) {
        const patchedResult = await objectClient.patch(daemonsetObject)
            .catch((e) => {
            console.error(e);
            return undefined;
        });
        return (patchedResult == undefined) ? undefined : ["updated", patchedResult.body];
    }
    else {
        const createdResult = await coreClient.createNamespacedDaemonSet(namespace, daemonset)
            .catch((e) => {
            console.error(e);
            return undefined;
        });
        return (createdResult == undefined) ? undefined : ["created", createdResult.body];
    }
}
exports.deployNodeImagePullDaemonSet = deployNodeImagePullDaemonSet;
//# sourceMappingURL=imagePull.js.map