import * as container from "@google-cloud/container";
import {Cluster, KubeConfig, User} from "@kubernetes/client-node";
import {constructRequest, GkeClusterInfo} from "../gcloud/containerClusters";
import {ClusterCredentials} from "../kubernetes/types";

async function getCredentials(clusterInfo: GkeClusterInfo, client : container.ClusterManagerClient) : Promise<ClusterCredentials> {
  const accessToken = await client.auth.getAccessToken();

  const request = constructRequest(clusterInfo);
  const [response] = await client.getCluster(request);
  if (response.endpoint == undefined || response.endpoint == null) {
    throw Error("Missing response.endpoint");
  } else if (response.masterAuth == undefined || response.masterAuth == null || response.masterAuth.clusterCaCertificate == undefined || response.masterAuth.clusterCaCertificate == null) {
    throw Error("Missing response.masterAuth.clusterCaCertificate");
  } else if (accessToken == undefined || accessToken == null) {
    throw Error("Missing accessToken");
  } else {
    return {
      endpoint: response.endpoint,
      certificateAuthority: response.masterAuth.clusterCaCertificate,
      accessToken: accessToken,
    };
  }
}

function loadKubeConfig(kubeConfig: KubeConfig, credentials : ClusterCredentials) : void {
  const user : User = {
    name: "a",
    token: credentials.accessToken,
  };
  const cluster : Cluster = {
    name: "a",
    caData: credentials.certificateAuthority,
    server: "https://" + credentials.endpoint,
    skipTLSVerify: false,
  };
  return kubeConfig.loadFromClusterAndUser(cluster, user);
}

export async function loadGcpKubeConfig(kubeConfig: KubeConfig, gkeClusterInfo : GkeClusterInfo) : Promise<ClusterCredentials> {
  const client = new container.v1.ClusterManagerClient({});
  const credentials = await getCredentials(gkeClusterInfo, client);
  loadKubeConfig(kubeConfig, credentials);
  return credentials;
}
