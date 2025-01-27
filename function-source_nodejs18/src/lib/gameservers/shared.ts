import {GkeClusterInfo} from "../gcloud/containerClusters";
import * as functions from "firebase-functions";
import * as k8s from "@kubernetes/client-node";
import {ClusterCredentials, createKubeConfig} from "../kubernetes/clusterConfig";
import {loadGcpKubeConfig} from "../gcloud/gkeAuth";
import {ClusterProvider} from "../systemDocTypes";
import {getWorkloadClusterProviderConfiguration} from "../documents/firestore";
import {projectToEnvName} from "../firebase";

export const gameServerNameBase = "odyssey-server";

export function resolveGkeGameserverClusterInfo() : GkeClusterInfo {
  const gkeClusterInfo : GkeClusterInfo = {
    projectId: functions.config().gkegameserverclusterinfo.projectid,
    clusterId: functions.config().gkegameserverclusterinfo.clusterid,
  };

  try {
    gkeClusterInfo.region = functions.config().gkegameserverclusterinfo.region;
  } catch (e) {
    console.log("Function config `gkegameserverclusterinfo.region` not defined");
  }

  try {
    gkeClusterInfo.zone = functions.config().gkegameserverclusterinfo.zone;
  } catch (e) {
    console.log("Function config `gkegameserverclusterinfo.zone` not defined");
  }

  return gkeClusterInfo;
}

export const coreweaveGameServerClusterCredentials : ClusterCredentials = {
  accessToken: functions.config().coreweavegameserverclustercredentials.accesstoken,
  certificateAuthority: functions.config().coreweavegameserverclustercredentials.certificateauthority,
  server: functions.config().coreweavegameserverclustercredentials.server,
  namespace: functions.config().coreweavegameserverclustercredentials.namespace,
};

export async function resolveKubeConfig(workloadClusterProvider: ClusterProvider) : Promise<k8s.KubeConfig> {
  async function getKc() {
    if (workloadClusterProvider == "gke") {
      const kc = new k8s.KubeConfig();
      await loadGcpKubeConfig(kc, resolveGkeGameserverClusterInfo());
      return kc;
    } else {
      const kc = createKubeConfig(coreweaveGameServerClusterCredentials);
      return kc;
    }
  }
  const kc = await getKc();
  const [, clustProviderConfiguration] = await getWorkloadClusterProviderConfiguration(workloadClusterProvider);
  if (clustProviderConfiguration != undefined && clustProviderConfiguration.httpsProxy != undefined && clustProviderConfiguration.httpsProxy != "") {
    console.debug("Applying https proxy: ", clustProviderConfiguration.httpsProxy);
    process.env.HTTPS_PROXY = clustProviderConfiguration.httpsProxy;
  }
  return kc;
}

export function formatGameServerName(roomId: string) : string {
  return (gameServerNameBase + "-" + roomId.toLowerCase()).slice(0, 63);
}

export function formatServerConfigMapName(projectId: string) {
  const envName = projectToEnvName(projectId);
  if (envName == undefined) return undefined;
  return "odyssey-server-" + envName;
}
