import {Cluster, Context, KubeConfig, User} from "@kubernetes/client-node";

export interface ClusterCredentials {
  server: string,
  certificateAuthority: string,
  accessToken: string,
  namespace?: string,
}

export function createKubeConfig(clusterCredentials : ClusterCredentials) : KubeConfig {
  const user : User = {
    name: "a",
    token: clusterCredentials.accessToken,
  };
  const cluster : Cluster = {
    name: "a",
    caData: clusterCredentials.certificateAuthority,
    server: clusterCredentials.server,
    skipTLSVerify: false,
  };
  function createContext() : Context {
    if (clusterCredentials.namespace !== undefined) {
      return {
        cluster: "a",
        name: "a",
        user: "a",
        namespace: clusterCredentials.namespace,
      };
    } else {
      return {
        cluster: "a",
        name: "a",
        user: "a",
      };
    }
  }
  const kc = new KubeConfig();
  kc.loadFromClusterAndUser(cluster, user);
  kc.addContext(createContext());
  kc.setCurrentContext("a");
  kc.contexts.splice(0, 1);
  return kc;
}
