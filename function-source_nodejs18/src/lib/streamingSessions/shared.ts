import {loadGcpKubeConfig} from "../gcloud/gkeAuth";
import {ClusterCredentials, createKubeConfig} from "../kubernetes/clusterConfig";
import * as k8s from "@kubernetes/client-node";
import * as functions from "firebase-functions";
import {GkeClusterInfo} from "../gcloud/containerClusters";
import {ClusterProvider} from "../systemDocTypes";
import {getWorkloadClusterProviderConfiguration} from "../documents/firestore";
import {projectToEnvName} from "../firebase";
export const serviceNameBase = "odyssey-client";
export const imagePullJobNameBase = "odyssey-client-image-pull-job";

export function resolveGkeStreamingSessionClusterInfo() : GkeClusterInfo {
  const gkeClusterInfo : GkeClusterInfo = {
    projectId: functions.config().gkestreamingsessionclusterinfo.projectid,
    clusterId: functions.config().gkestreamingsessionclusterinfo.clusterid,
  };

  try {
    gkeClusterInfo.region = functions.config().gkestreamingsessionclusterinfo.region;
  } catch (e) {
    console.log("Function config `gkestreamingsessionclusterinfo.region` not defined");
  }

  try {
    gkeClusterInfo.zone = functions.config().gkestreamingsessionclusterinfo.zone;
  } catch (e) {
    console.log("Function config `gkestreamingsessionclusterinfo.zone` not defined");
  }

  return gkeClusterInfo;
}

export const coreweaveStreamingSessionClusterCredentials : ClusterCredentials = {
  accessToken: functions.config().coreweavestreamingsessionclustercredentials.accesstoken,
  certificateAuthority: functions.config().coreweavestreamingsessionclustercredentials.certificateauthority,
  server: functions.config().coreweavestreamingsessionclustercredentials.server,
  namespace: functions.config().coreweavestreamingsessionclustercredentials.namespace,
};

export async function resolveKubeConfig(workloadClusterProvider: ClusterProvider) : Promise<k8s.KubeConfig> {
  async function getKc() {
    if (workloadClusterProvider == "gke") {
      const kc = new k8s.KubeConfig();
      await loadGcpKubeConfig(kc, resolveGkeStreamingSessionClusterInfo());
      return kc;
    } else {
      const kc = createKubeConfig(coreweaveStreamingSessionClusterCredentials);
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

export interface SignallingUrlResult {
  signallingUrl: string
  took?: number
}

export function formatSessionName(userId: string, deploymentId: string) : string {
  return (serviceNameBase + "-" + userId.toLowerCase() + "-" + deploymentId.toLowerCase()).slice(0, 63);
}

export function formatClientConfigMapName(projectId: string) {
  const envName = projectToEnvName(projectId);
  if (envName == undefined) return undefined;
  return "odyssey-client-" + envName;
}

export function formatJobName(imageId: string) : string {
  return (imagePullJobNameBase + "-" + imageId.toLowerCase());
}
