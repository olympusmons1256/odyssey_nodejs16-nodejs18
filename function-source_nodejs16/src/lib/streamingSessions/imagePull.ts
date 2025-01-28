import * as k8s from "@kubernetes/client-node";

import {readFile} from "../misc";
import {resolveKubeConfig} from "./shared";
import * as resourceYaml from "./yaml-standard";
import {ConfigurationOdysseyClientPod, ClusterProvider} from "../systemDocTypes";

const nodeImagePullDaemonSetName = "odyssey-client-node-image-pull";
const nodeImagePullDaemonSetYamlFile = "./" + nodeImagePullDaemonSetName + "-daemonset" + ".yaml";

export type DeployNodeImagePullDaemonSetResult = ["created" | "updated", k8s.V1DaemonSet]

export async function deployNodeImagePullDaemonSet(configuration : ConfigurationOdysseyClientPod, workloadClusterProvider: ClusterProvider) : Promise<DeployNodeImagePullDaemonSetResult | undefined> {
  const kc = await resolveKubeConfig(workloadClusterProvider);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const coreClient = kc.makeApiClient(k8s.AppsV1Api);
  const objectClient = kc.makeApiClient(k8s.KubernetesObjectApi);

  const daemonsetYaml = await readFile(nodeImagePullDaemonSetYamlFile);
  const daemonset = resourceYaml.templateImagePullDaemonset(daemonsetYaml, configuration);
  const daemonsetObject = daemonset as k8s.KubernetesObject;

  if (daemonset.metadata == undefined || daemonset.metadata.name == undefined || daemonset.spec == undefined) {
    console.error("daemonset metadata, spec or name undefined");
    return undefined;
  }

  const existingDaemonSet = await objectClient.read(daemonsetObject)
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
    return (patchedResult == undefined) ? undefined : ["created", patchedResult.body];
  } else {
    const createdResult = await coreClient.createNamespacedDaemonSet(namespace, daemonset)
      .catch((e) => {
        console.error(e);
        return undefined;
      });
    return (createdResult == undefined) ? undefined : ["created", createdResult.body];
  }
}
