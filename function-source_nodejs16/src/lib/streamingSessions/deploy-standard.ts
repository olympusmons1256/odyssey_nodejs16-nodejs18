import * as k8s from "@kubernetes/client-node";

import {readFile, inEmulatorEnv, logHttpResponse, sleep} from "../misc";

import * as resourceYaml from "./yaml-standard";
import {serviceNameBase, formatSessionName, resolveKubeConfig} from "./shared";
import {ConfigurationOdysseyClientPod, ClusterProvider} from "../systemDocTypes";
import {DeploymentState, DeploymentStateChange, DeploymentStateUpdate, ParticipantState, ParticipantStateChange, ParticipantStateUpdate} from "../docTypes";
import * as admin from "firebase-admin";
import {getPodStatus, podStatusToPodState} from "../kubernetes/shared";
import {getDeployment, getParticipant, getWorkloadClusterProviderConfiguration} from "../documents/firestore";
import {getTwilioIceServers} from "../twilio";
import {IceServer} from "../twilio/shared";
import {resolveGpuRegions} from "../coreweave/availability";
import {ResolvedSpaceUnrealProjectVersion} from "../unrealProjects/shared";

const podYamlFile = "./" + serviceNameBase + "-pod" + ".yaml";
const configMapCustomYamlFile = "./" + serviceNameBase + "-configmap-custom" + ".yaml";
const serviceYamlFile = "./" + serviceNameBase + "-service" + ".yaml";

export async function updateDeploymentState(
  organizationId : string,
  roomId: string,
  participantId : string,
  deploymentId : string,
  newState: DeploymentState,
  signallingUrl?: string,
  nodeName?: string,
  region?: string,
) {
  const now = admin.firestore.Timestamp.now();
  const newStateChangeEntry : DeploymentStateChange = {state: newState, timestamp: now};
  const stateUpdate : DeploymentStateUpdate = {
    state: newState,
    stateChanges: admin.firestore.FieldValue.arrayUnion(newStateChangeEntry),
    updated: now,
    signallingUrl,
    nodeName,
    region,
  };

  const [deploymentDoc] = await getDeployment(organizationId, roomId, participantId, deploymentId);

  if (deploymentDoc == undefined) {
    console.error("Deployment doc undefined");
    return undefined;
  }

  console.debug(`Updating deployment ${deploymentDoc.ref.path} with changes: `, stateUpdate);
  try {
    return await deploymentDoc.ref.update(stateUpdate);
  } catch (e) {
    console.error("Failed to update deployment state", e);
    return undefined;
  }
}

export async function updateParticipantState(
  organizationId : string,
  roomId: string,
  participantId : string,
  newState?: ParticipantState,
  latestDeploymentState?: DeploymentState,
  signallingUrl?: string,
  winnerDeploymentId?: string,
) {
  const now = admin.firestore.Timestamp.now();
  const stateUpdate : ParticipantStateUpdate = {
    state: newState,
    updated: now,
    latestDeploymentState,
    signallingUrl,
    winnerDeploymentId,
  };

  if (newState != undefined) {
    const newStateChangeEntry : ParticipantStateChange = {state: newState, timestamp: now};
    stateUpdate.stateChanges = admin.firestore.FieldValue.arrayUnion(newStateChangeEntry);
  }
  const [participantDoc] = await getParticipant(organizationId, roomId, participantId);

  if (participantDoc == undefined) {
    console.error("Participant doc undefined");
    return undefined;
  }

  console.debug(`Updating participant ${participantDoc.ref.path} with changes: `, stateUpdate);
  try {
    return await participantDoc.ref.update(stateUpdate);
  } catch (e) {
    console.error("Failed to update participant state", e);
    return undefined;
  }
}

export async function watchConfigMapUntilReady(kc : k8s.KubeConfig, configMapName: string, timeout: number) {
  const startTime = new Date().getTime();
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const coreClient = kc.makeApiClient(k8s.CoreV1Api);

  async function checkConfigMapReady() : Promise<"failed-provisioning" | "timed-out-provisioning" | "ready"> {
    await sleep(2000);
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (elapsedSeconds >= 60) {
      console.error("Timed out waiting for configmap to be ready");
      return "timed-out-provisioning";
    } else if (Date.now() >= (timeout - 60)) {
      console.error("Timed out waiting for configmap to be ready. Not enough time left for pod");
      return "timed-out-provisioning";
    } else {
      try {
        await logHttpResponse(coreClient.readNamespacedConfigMap(configMapName, namespace));
        return "ready";
      } catch (e: any) {
        if (e.response.statusCode == 404) {
          return checkConfigMapReady();
        }
        return "failed-provisioning";
      }
    }
  }

  return checkConfigMapReady();
}

export async function watchPodUntilReady(organizationId: string, roomId: string, participantId: string, deploymentId: string, kc : k8s.KubeConfig, podName : string, signallingUrl: string) {
  const startTime = new Date().getTime();
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const coreClient = kc.makeApiClient(k8s.CoreV1Api);

  async function checkContainersReady(lastDeploymentState: DeploymentState, numberFailed: number) : Promise<FirebaseFirestore.WriteResult|undefined> {
    await sleep(2000);
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (elapsedSeconds >= 240) {
      return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "timed-out-provisioning");
    } else if (numberFailed >= 3) {
      console.log("Failed to get pod status 3 times, marking deployment provisioning as failed");
      return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "failed-provisioning");
    } else {
      try {
        const pod = (await coreClient.readNamespacedPod(podName, namespace)).body;
        const podStatus = getPodStatus(pod);
        console.log("Pod status:", podStatus);
        if (podStatus != undefined) {
          const deploymentState = podStatusToPodState(podStatus);
          if (podStatus == "ready") {
            return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, deploymentState, signallingUrl, pod.spec?.nodeName);
          } else {
            if (deploymentState != lastDeploymentState) {
              await updateDeploymentState(organizationId, roomId, participantId, deploymentId, deploymentState, undefined, pod.spec?.nodeName);
            }
            if (elapsedSeconds > 120) {
              console.warn(`Pod not ready after ${elapsedSeconds} seconds. Printing pod status`);
              console.debug(pod.status);
            }
            return await checkContainersReady(deploymentState, numberFailed);
          }
        } else {
          return await checkContainersReady(lastDeploymentState, numberFailed + 1);
        }
      } catch (e : any) {
        console.warn("Error fetching pod: ", podName);
        if (e.response.statusCode == 404) {
          console.warn("Pod doesn't exist: 404");
          return await checkContainersReady(lastDeploymentState, numberFailed + 1);
        } else {
          console.warn(e);
        }
      }
      console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for 2 more before checking again...`);
      return await checkContainersReady(lastDeploymentState, numberFailed);
    }
  }

  return await checkContainersReady("new", 0);
}

async function resolveIceServers(configuration: ConfigurationOdysseyClientPod) {
  const defaultGoogleIceServers : IceServer[] = [{
    urls: "stun:stun.l.google.com:19302",
  }];
  try {
    if (configuration.iceServersProvider == undefined || configuration.iceServersProvider == "twilio") {
      console.debug("Using twilio ICE servers");
      return await getTwilioIceServers();
    } else if (configuration.iceServersProvider == "manual" && configuration.iceServers != undefined && configuration.iceServers.length > 0) {
      console.debug("Using manually configured ICE servers");
      return configuration.iceServers;
    } else {
      console.debug("Using default Google ICE servers");
      return defaultGoogleIceServers;
    }
  } catch (e: any) {
    console.error("Failed to retrieve ICE servers, defaulting to Google ICE servers");
    return defaultGoogleIceServers;
  }
}

export async function deployPodstack(
  projectId: string,
  configuration : ConfigurationOdysseyClientPod,
  workloadClusterProvider : ClusterProvider,
  organizationId : string,
  spaceId: string,
  roomId : string,
  participantId: string,
  deploymentId: string,
  serverAddress: string | undefined,
  levelId: string | undefined,
  userId: string,
  deviceId: string,
  customToken: string,
  graphicsBenchmark: number,
  resolvedSpaceUnrealProjectVersion: ResolvedSpaceUnrealProjectVersion,
  serverRegion?: string
) {
  const startTime = new Date().getTime();
  const timeout = (startTime / 1000) + 200;
  console.debug("Set timeout to: ", timeout);
  const kc = await resolveKubeConfig(workloadClusterProvider);

  const resolveIngressYamlFile = () => {
    if (workloadClusterProvider == "gke") {
      return "./" + serviceNameBase + "-ingress" + "-gke" + ".yaml";
    } else if (workloadClusterProvider == "coreweave") {
      return "./" + serviceNameBase + "-ingress" + ".yaml";
    } else {
      throw new Error("Unsupported cluster provider");
    }
  };

  const podYaml = await readFile(podYamlFile);
  const configMapCustomYaml = await readFile(configMapCustomYamlFile);
  const serviceYaml = await readFile(serviceYamlFile);
  const ingressYaml = await readFile(resolveIngressYamlFile());
  const iceServers = await resolveIceServers(configuration);
  const unrealProjectVersionRegions = resolvedSpaceUnrealProjectVersion?.unrealProjectVersion.volumeRegions || [];
  const gpuRegions = await resolveGpuRegions(configuration, graphicsBenchmark, unrealProjectVersionRegions, serverRegion);
  const region = gpuRegions[0].region;

  const configMap = resourceYaml.templateStreamingSessionConfigMap(projectId, organizationId, spaceId, roomId, userId, deviceId, deploymentId, iceServers, configMapCustomYaml);
  const pod = resourceYaml.templateStreamingSessionPod(projectId, inEmulatorEnv(), workloadClusterProvider, configuration, organizationId, spaceId, roomId, serverAddress, levelId, userId, deviceId, deploymentId, customToken, podYaml, gpuRegions, region, resolvedSpaceUnrealProjectVersion);
  const service = resourceYaml.templateStreamingSessionService(projectId, organizationId, spaceId, roomId, userId, deviceId, deploymentId, serviceYaml);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  if (configMap.metadata?.name == undefined) {
    throw new Error("ConfigMap metadata.name undefined");
  }

  function templateIngress() {
    if (workloadClusterProvider == "gke") {
      return resourceYaml.templateStreamingSessionIngressGke(projectId, organizationId, spaceId, roomId, userId, deviceId, deploymentId, ingressYaml);
    } else if (workloadClusterProvider == "coreweave") {
      return resourceYaml.templateStreamingSessionIngress(projectId, namespace, region, organizationId, spaceId, roomId, userId, deviceId, deploymentId, ingressYaml);
    } else {
      throw new Error("Unsupported cluster provider");
    }
  }
  const ingress = templateIngress();

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const networkingClient = kc.makeApiClient(k8s.NetworkingV1Api);
  const extensionsClient = kc.makeApiClient(k8s.ExtensionsV1beta1Api);

  console.debug("Updating deployment state to `provisioning`");
  await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "provisioning", undefined, undefined, region);

  console.debug("Creating configMap");
  const createConfigMapResponse = await logHttpResponse(coreClient.createNamespacedConfigMap(namespace, configMap));
  if (createConfigMapResponse.response.statusCode == 201) {
    console.debug("Created ConfigMap");
  } else if (createConfigMapResponse.response.statusCode == 200 || createConfigMapResponse.response.statusCode == 202) {
    console.debug(`Create ConfigMap got response code ${createConfigMapResponse.response.statusCode}, checking it exists before continuing`);
    const checkConfigMapResult = await watchConfigMapUntilReady(kc, configMap.metadata?.name, timeout);
    if (checkConfigMapResult != "ready") {
      console.error("Failed to createConfigMap: ", checkConfigMapResult);
      return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, checkConfigMapResult);
    }
  } else {
    console.error("Failed to createConfigMap: ", createConfigMapResponse.response.statusCode);
    return await updateDeploymentState(organizationId, roomId, participantId, deploymentId, "failed-provisioning");
  }
  console.debug("Creating pod");
  const createPodResponse = await logHttpResponse(coreClient.createNamespacedPod(namespace, pod));
  const createdPodName = createPodResponse.body.metadata?.name;
  console.debug("Creating service");
  const createServiceResponse = await logHttpResponse(coreClient.createNamespacedService(namespace, service));
  const createdServiceName = createServiceResponse.body.metadata?.name;
  async function createIngress() {
    if (workloadClusterProvider == "gke") {
      return (await logHttpResponse(networkingClient.createNamespacedIngress(namespace, ingress))).body.metadata?.name;
    } else if (workloadClusterProvider == "coreweave") {
      return (await logHttpResponse(extensionsClient.createNamespacedIngress(namespace, ingress))).body.metadata?.name;
    } else {
      throw new Error("Unsupported cluster provider");
    }
  }

  console.debug("Creating ingress");
  const createdIngressName = await createIngress();

  const [, clustProviderConfiguration] = await getWorkloadClusterProviderConfiguration(workloadClusterProvider);

  function formatSignallingUrl(host : string) {
    if (workloadClusterProvider == "gke") {
      return "https://" + host + "/" + ingress.metadata?.name;
    } else {
      if (clustProviderConfiguration?.staticSignallingProxy != undefined && clustProviderConfiguration?.staticSignallingProxy != "") {
        return clustProviderConfiguration?.staticSignallingProxy + "/" + host.replace(new RegExp("(.*?)\\.(.*)"), "$1/$2");
      } else {
        return "https://" + host;
      }
    }
  }

  if (ingress.spec == undefined || ingress.spec.rules == undefined || ingress.spec.rules[0].host == undefined) {
    throw new Error("Ingress spec has no host rules");
  }

  const signallingUrl = formatSignallingUrl(ingress.spec.rules[0].host);

  if (createdPodName == undefined) {
    throw new Error("Failed to create pod");
  }

  if (createdServiceName == undefined) {
    throw new Error("Failed to create service");
  }

  if (createdIngressName == undefined) {
    throw new Error("Failed to create ingress");
  }


  return await watchPodUntilReady(organizationId, roomId, participantId, deploymentId, kc, createdPodName, signallingUrl);
}

export async function deletePodStack(userId: string, deploymentId : string, workloadClusterProvider: ClusterProvider) : Promise<boolean> {
  const kc = await resolveKubeConfig(workloadClusterProvider);

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const networkingClient = kc.makeApiClient(k8s.NetworkingV1Api);
  const extensionsClient = kc.makeApiClient(k8s.NetworkingV1beta1Api);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const sessionName = formatSessionName(userId, deploymentId);


  const deleted : ("pod" | "configmap" | "service" | "ingress")[] = [];

  try {
    console.debug("Deleting pod: ", sessionName);
    const podDelete = await logHttpResponse(coreClient.deleteNamespacedPod(sessionName, namespace, undefined, undefined, 15));
    const podDeleted = podDelete.response.statusCode;
    console.debug("Delete pod response status code: ", podDelete.response.statusCode);
    console.debug("Delete pod response status message: ", podDelete.response.statusMessage);
    if (podDeleted != undefined && podDeleted >= 200 && podDeleted < 300) {
      console.debug("Deleted pod successfully");
      deleted.push("pod");
    } else {
      console.error("Failed to delete pod");
    }
  } catch (e: any) {
    if (e.response.statusCode == 404) {
      console.debug("Doesn't exist");
      deleted.push("pod");
    } else {
      console.error("Failed to delete configMap");
    }
  }

  console.debug("Deleting configMap: ", sessionName);
  try {
    const configMapDelete = await logHttpResponse(coreClient.deleteNamespacedConfigMap(sessionName, namespace, undefined, undefined, 15));
    const configMapDeleted = configMapDelete.response.statusCode;
    console.debug("Delete configMap response status code: ", configMapDelete.response.statusCode);
    console.debug("Delete configMap response status message: ", configMapDelete.response.statusMessage);
    if (configMapDeleted != undefined && configMapDeleted >= 200 && configMapDeleted < 300) {
      console.debug("Deleted configMap successfully");
      deleted.push("configmap");
    } else {
      console.error("Failed to delete configMap");
    }
  } catch (e: any) {
    if (e.response.statusCode == 404) {
      console.debug("Doesn't exist");
      deleted.push("configmap");
    } else {
      console.error("Failed to delete configMap");
    }
  }

  try {
    console.debug("Deleting service: ", sessionName);
    const serviceDelete = await logHttpResponse(coreClient.deleteNamespacedService(sessionName, namespace, undefined, undefined, 15));
    const serviceDeleted = serviceDelete.response.statusCode;
    console.debug("Delete service response status code: ", serviceDelete.response.statusCode);
    console.debug("Delete service response status message: ", serviceDelete.response.statusMessage);
    if (serviceDeleted != undefined && serviceDeleted >= 200 && serviceDeleted < 300) {
      console.debug("Deleted service successfully");
      deleted.push("service");
    } else {
      console.error("Failed to delete service");
    }
  } catch (e: any) {
    if (e.response.statusCode == 404) {
      console.debug("Doesn't exist");
      deleted.push("service");
    } else {
      console.error("Failed to delete configMap");
    }
  }

  console.debug("Deleting ingress: ", sessionName);
  async function deleteIngress() {
    if (workloadClusterProvider == "gke") {
      return (await logHttpResponse(networkingClient.deleteNamespacedIngress(sessionName, namespace, undefined, undefined, 15)));
    } else {
      return (await logHttpResponse(extensionsClient.deleteNamespacedIngress(sessionName, namespace, undefined, undefined, 15)));
    }
  }

  try {
    const ingressDelete = await deleteIngress();
    const ingressDeleted = ingressDelete.response.statusCode;
    console.debug("Delete ingress response status code: ", ingressDelete.response.statusCode);
    console.debug("Delete ingress response status message: ", ingressDelete.response.statusMessage);
    if (ingressDeleted != undefined && ingressDeleted >= 200 && ingressDeleted < 300) {
      console.debug("Deleted ingress successfully");
      deleted.push("ingress");
    } else {
      console.error("Failed to delete ingress");
    }
  } catch (e: any) {
    if (e.response.statusCode == 404) {
      console.debug("Doesn't exist");
      deleted.push("ingress");
    } else {
      console.error("Failed to delete configMap");
    }
  }

  if (deleted.includes("pod") && deleted.includes("configmap") && deleted.includes("service") && deleted.includes("ingress")) {
    return true;
  } else {
    return false;
  }
}

export async function collectPodStackStates(userId: string, deploymentId : string, workloadClusterProvider: ClusterProvider) {
  const kc = await resolveKubeConfig(workloadClusterProvider);

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const networkingClient = kc.makeApiClient(k8s.NetworkingV1Api);
  const extensionsClient = kc.makeApiClient(k8s.NetworkingV1beta1Api);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const sessionName = formatSessionName(userId, deploymentId);

  console.debug("Getting pod events: ", sessionName);
  const events = await (async () => {
    try {
      return (await coreClient.listNamespacedEvent(namespace, undefined, undefined, undefined, "involvedObject.name=" + sessionName)).body;
    } catch (e: any) {
      console.error("Failed to get events");
      console.error(e);
      return undefined;
    }
  })();
  const pod = await (async () => {
    try {
      return (await coreClient.readNamespacedPod(sessionName, namespace)).body;
    } catch (e: any) {
      console.error("Failed to get pod");
      console.error(e);
      return undefined;
    }
  })();
  const configMap = await (async () => {
    try {
      return (await coreClient.readNamespacedConfigMap(sessionName, namespace)).body;
    } catch (e: any) {
      console.error("Failed to get configMap");
      console.error(e);
      return undefined;
    }
  })();
  const service = await (async () => {
    try {
      return (await coreClient.readNamespacedService(sessionName, namespace)).body;
    } catch (e: any) {
      console.error("Failed to get service");
      console.error(e);
      return undefined;
    }
  })();
  const ingress = await (async () => {
    try {
      if (workloadClusterProvider == "gke") {
        return (await networkingClient.readNamespacedIngress(sessionName, namespace)).body;
      } else {
        return (await extensionsClient.readNamespacedIngress(sessionName, namespace)).body;
      }
    } catch (e: any) {
      console.error("Failed to get ingress");
      console.error(e);
      return undefined;
    }
  })();

  const all = await Promise.all([events, pod, configMap, service, ingress]);
  return {events: all[0], pod: all[1], configMap: all[2], service: all[3], ingress: all[4]};
}
