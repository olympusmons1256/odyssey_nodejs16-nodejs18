"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKubeConfig = void 0;
const client_node_1 = require("@kubernetes/client-node");
function createKubeConfig(clusterCredentials) {
    const user = {
        name: "a",
        token: clusterCredentials.accessToken,
    };
    const cluster = {
        name: "a",
        caData: clusterCredentials.certificateAuthority,
        server: clusterCredentials.server,
        skipTLSVerify: false,
    };
    function createContext() {
        if (clusterCredentials.namespace !== undefined) {
            return {
                cluster: "a",
                name: "a",
                user: "a",
                namespace: clusterCredentials.namespace,
            };
        }
        else {
            return {
                cluster: "a",
                name: "a",
                user: "a",
            };
        }
    }
    const kc = new client_node_1.KubeConfig();
    kc.loadFromClusterAndUser(cluster, user);
    kc.addContext(createContext());
    kc.setCurrentContext("a");
    kc.contexts.splice(0, 1);
    return kc;
}
exports.createKubeConfig = createKubeConfig;
//# sourceMappingURL=clusterConfig.js.map