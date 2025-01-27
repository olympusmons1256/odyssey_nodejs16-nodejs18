import * as k8s from "@kubernetes/client-node";
import * as admin from "firebase-admin";

import {readFile, logHttpResponse, sleep, K8sResponse} from "../misc";
import {ClusterProvider, ConfigurationOdysseyServer} from "../systemDocTypes";
import {RoomState, RoomStateUpdate} from "../docTypes";
import {getPodStatus, podStatusToPodState} from "../kubernetes/shared";

import * as resourceYaml from "./yaml-standard";
import {formatGameServerName, gameServerNameBase, resolveKubeConfig} from "./shared";
import {getRoomRef, getStateChangeRef} from "../documents/firestore";
import {ResolvedSpaceUnrealProjectVersion} from "../unrealProjects/shared";

const podYamlFile = "./" + gameServerNameBase + "-pod" + ".yaml";
const serviceYamlFile = "./" + gameServerNameBase + "-service" + ".yaml";

export async function updateRoomState(
  organizationId : string,
  roomId : string,
  newState?: RoomState,
  serverAddress?: string | admin.firestore.FieldValue,
  provisioningFailures?: number,
  deprovisioningFailures?: number | admin.firestore.FieldValue,
  region?: string,
  rejectedByBilling?: boolean
) {
  const now = admin.firestore.Timestamp.now();
  const stateUpdate : RoomStateUpdate = {
    state: newState,
    updated: now,
    serverAddress,
    provisioningFailures,
    deprovisioningFailures,
    region,
    rejectedByBilling,
  };

  const roomRef = getRoomRef(organizationId, roomId);

  console.debug(`Updating room ${roomRef.path} with changes: `, stateUpdate);
  const result = await roomRef.update(stateUpdate);
  if (newState != undefined) {
    const newStateChangeEntry : RoomStateUpdate = {state: newState, updated: now};
    const stateChangeId = now.toDate().toISOString() + "-" + newState;
    const stateChangeRef = getStateChangeRef(organizationId, roomId, stateChangeId);
    console.debug(`Add room state change ${stateChangeRef.path} with: `, newStateChangeEntry);
    return await stateChangeRef.set(newStateChangeEntry);
  }
  return result;
}

export async function waitUntilServiceReady(kc : k8s.KubeConfig, serviceName : string) {
  const startTime = new Date().getTime();
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const coreClient = kc.makeApiClient(k8s.CoreV1Api);

  async function getServiceExternalIp(serviceName: string) : Promise<"error" | "external-ip-missing" | string> {
    try {
      const service = await coreClient.readNamespacedService(serviceName, namespace);
      const externalIps = service.body.status?.loadBalancer?.ingress?.flatMap((ingress) => {
        return (ingress.ip != undefined) ? [ingress.ip] : [];
      });
      const externalIp = externalIps?.pop();
      if (externalIp == undefined) {
        console.warn("Service missing external IP address");
        return "external-ip-missing";
      } else {
        return externalIp + ":" + 7777;
      }
    } catch (e : any) {
      console.warn("Hit error resolving service external IP");
      console.error(e);
      return "error";
    }
  }

  async function checkService(attempts = 0) : Promise<string | "failed" | "timed-out"> {
    if (attempts > 0) {
      await sleep(2000);
    }
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (elapsedSeconds >= 240) {
      return "timed-out";
    } else if (attempts >= 3) {
      return "failed";
    } else {
      const externalIp = await getServiceExternalIp(serviceName);
      if (externalIp == "error") {
        return "failed";
      } else if (externalIp == "external-ip-missing") {
        console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for 2 more before checking service again...`);
        return await checkService(attempts+=1);
      } else {
        return externalIp;
      }
    }
  }

  return await checkService();
}

export async function watchPodUntilReady(kc : k8s.KubeConfig, organizationId: string, roomId: string, workloadClusterProvider: ClusterProvider, podName : string) {
  const startTime = new Date().getTime();
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const coreClient = kc.makeApiClient(k8s.CoreV1Api);

  async function getPodNodeExternalIP(nodeName: string) : Promise<"error" | "external-ip-missing" | string> {
    try {
      const node = await coreClient.readNode(nodeName);
      const externalIps = node.body.status?.addresses?.flatMap((address) => {
        return (address.type == "ExternalIP") ? [address.address] : [];
      });
      const externalIp = externalIps?.pop();
      if (externalIp == undefined) {
        console.warn("Pod missing ExternalIP address");
        return "external-ip-missing";
      } else {
        return externalIp + ":" + 7777;
      }
    } catch (e : any) {
      console.warn("Hit error resolving node external address");
      console.error(e);
      return "error";
    }
  }

  async function getExternalIp(nodeName: string) : Promise<"error" | "external-ip-missing" | string | undefined> {
    if (workloadClusterProvider == "gke") {
      return await getPodNodeExternalIP(nodeName);
    } else {
      console.debug("Provider doesn't support node ExternalIP");
      return undefined;
    }
  }

  async function checkContainersReady(lastRoomState: RoomState, numberFailed: number) : Promise<[RoomState, string | undefined]> {
    await sleep(2000);
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (elapsedSeconds >= 240) {
      return ["timed-out-provisioning", undefined];
    } else if (numberFailed >= 3) {
      console.log("Failed to get pod status 3 times, marking room provisioning as failed");
      return ["failed-provisioning", undefined];
    } else {
      try {
        const pod = (await coreClient.readNamespacedPod(podName, namespace)).body;
        const podStatus = getPodStatus(pod);
        console.log("Pod status:", podStatus);
        if (podStatus != undefined) {
          const roomState = podStatusToPodState(podStatus);
          if (roomState == "pod-ready") {
            const nodeName = pod.spec?.nodeName;
            if (nodeName == undefined) {
              console.warn("Pod ready but no node name present. Strange...");
              return await checkContainersReady(roomState, numberFailed + 1);
            } else {
              const externalIp = await getExternalIp(nodeName);
              console.debug("ExternalIP: ", externalIp);
              if (externalIp == "error" || externalIp == "external-ip-missing") {
                return await checkContainersReady(roomState, numberFailed + 1);
              } else {
                return [roomState, externalIp];
              }
            }
          } else {
            if (roomState != lastRoomState) {
              await updateRoomState(organizationId, roomId, roomState);
            }
            if (elapsedSeconds > 120) {
              console.warn(`Pod not ready after ${elapsedSeconds} seconds. Printing pod status`);
              console.debug(pod.status);
            }
            return await checkContainersReady(roomState, numberFailed);
          }
        } else {
          return await checkContainersReady(lastRoomState, numberFailed + 1);
        }
      } catch (e : any) {
        console.warn("Error fetching pod: ", podName);
        if (e.response.statusCode == 404) {
          console.warn("Pod doesn't exist: 404");
          return await checkContainersReady(lastRoomState, numberFailed + 1);
        } else {
          console.warn(e);
        }
      }
      console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for 2 more before checking again...`);
      return await checkContainersReady(lastRoomState, numberFailed);
    }
  }

  return await checkContainersReady("provisioning", 0);
}

export async function deployGameServerPodStack(projectId: string, configuration: ConfigurationOdysseyServer, region: string, organizationId: string, spaceId: string, roomId: string, resolvedSpaceUnrealProjectVersion: ResolvedSpaceUnrealProjectVersion, levelId: string | undefined) {
  const kc = await resolveKubeConfig(configuration.workloadClusterProvider);

  const podYaml = await readFile(podYamlFile);
  const pod = resourceYaml.templatePod(projectId, configuration, region, organizationId, spaceId, roomId, levelId, resolvedSpaceUnrealProjectVersion, podYaml);
  const serviceYaml = await readFile(serviceYamlFile);
  const service = resourceYaml.templateService(projectId, configuration, region, organizationId, spaceId, roomId, serviceYaml);

  if (pod == undefined) {
    console.log("Templated pod undefined");
    return undefined;
  }

  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const coreClient = kc.makeApiClient(k8s.CoreV1Api);

  async function tryCreatePod(pod: k8s.V1Pod, startTime: number) : Promise<[RoomState, string | undefined] | undefined> {
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (pod.metadata == undefined || pod.metadata.name == undefined) {
      console.log("Pod missing metadata.name");
      return ["failed-provisioning", undefined];
    }
    const podName = pod.metadata.name;
    if (elapsedSeconds >= 200) {
      console.log("Timed out");
      return ["timed-out-provisioning", undefined];
    }
    return await logHttpResponse(coreClient.createNamespacedPod(namespace, pod))
      .then(async () => {
        return await watchPodUntilReady(kc, organizationId, roomId, configuration.workloadClusterProvider, podName);
      })
      .catch(async (e: any) => {
        console.log(`Failure code ${e.response.statusCode}, message: `, e.response.body.message);
        if (e.response.statusCode == 409) {
          if ((e.response.body.message as string).includes("object is being deleted")) {
            console.log("Existing pod being deleted, waiting 2 seconds then trying again");
            await sleep(2000);
            return await tryCreatePod(pod, startTime);
          } else {
            console.log("Pod already exists");
            return await watchPodUntilReady(kc, organizationId, roomId, configuration.workloadClusterProvider, podName);
          }
        } else {
          return ["failed-provisioning", undefined] as [RoomState, string | undefined];
        }
      });
  }

  async function tryCreateService() {
    if (configuration.workloadClusterProvider == "coreweave") {
      const serviceName = service.metadata?.name;
      if (serviceName == undefined) {
        console.error("Service name undefined");
        return "failed";
      }
      try {
        await logHttpResponse(coreClient.createNamespacedService(namespace, service));
        ["failed-provisioning", undefined] as [RoomState, string | undefined];
        return await waitUntilServiceReady(kc, serviceName);
      } catch (e: any) {
        console.log(`Failure code ${e.response.statusCode}, message: `, e.response.body.message);
        if (e.response.statusCode == 409) {
          console.log("Service already exists");
          return await waitUntilServiceReady(kc, serviceName);
        } else {
          console.log("Error creating service");
          console.log(e);
          return "failed";
        }
      }
    } else {
      console.log("Provider doesn't need service");
      return undefined;
    }
  }

  console.log("Creating service...");
  const createServiceResult = tryCreateService();
  console.log("Creating pod...");
  const createPodResult = await tryCreatePod(pod, new Date().getTime());
  console.debug("createPodResult: ", createPodResult);
  if (createPodResult == undefined) {
    console.error("Pod result undefined");
    return await updateRoomState(organizationId, roomId, "failed-provisioning", undefined, undefined, undefined, region);
  }
  const [roomState, nodeServerAddress] = createPodResult;
  const serviceServerAddress = await createServiceResult;
  const serverAddress = (configuration.workloadClusterProvider == "gke") ? nodeServerAddress : serviceServerAddress;
  if (roomState == "pod-ready") {
    if (serverAddress == undefined) {
      console.warn("Server address undefined should not be possible");
      return undefined;
    } else if (serverAddress == "failed") {
      console.error("Server address failed");
      return await updateRoomState(organizationId, roomId, "failed-provisioning", undefined, undefined, undefined, region);
    } else if (serverAddress == "timed-out") {
      console.error("Server address timed out");
      return await updateRoomState(organizationId, roomId, "timed-out-provisioning", undefined, undefined, undefined, region);
    } else {
      return await updateRoomState(organizationId, roomId, roomState, serverAddress, 0, undefined, region);
    }
  } else {
    console.warn("Pod is not ready after create/wait. Something strange is going on with the room provisioning/state");
    return await updateRoomState(organizationId, roomId, roomState, undefined, undefined, undefined, region);
  }
}

export async function deleteGameServerPodStack(roomId : string, workloadClusterProvider: ClusterProvider) : Promise<boolean> {
  const kc = await resolveKubeConfig(workloadClusterProvider);

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const gameServerName = formatGameServerName(roomId);

  async function deletePod() {
    console.log("Deleting pod: ", gameServerName);
    const podDelete = await logHttpResponse(coreClient.deleteNamespacedPod(gameServerName, namespace, undefined, undefined, 15))
      .catch((e: any) => {
        if (e.response.statusCode != undefined) {
          return e as K8sResponse;
        } else {
          console.error(e);
          return {response: {statusCode: 0, statusMessage: "Exception"}} as K8sResponse;
        }
      });
    const podDeleted = podDelete.response.statusCode;
    console.log("Delete pod response status code: ", podDelete.response.statusCode);
    console.log("Delete pod response status message: ", podDelete.response.statusMessage);
    if (podDeleted != undefined && ((podDeleted >= 200 && podDeleted < 300) || podDeleted == 404) ) {
      console.log("Deleted pod successfully");
      return true;
    } else {
      console.log("Failed to delete pod");
      return false;
    }
  }

  async function deleteService() {
    if (workloadClusterProvider == "coreweave") {
      console.log("Deleting service: ", gameServerName);
      const serviceDelete = await logHttpResponse(coreClient.deleteNamespacedService(gameServerName, namespace, undefined, undefined, 15))
        .catch((e: any) => {
          if (e.response.statusCode != undefined) {
            return e as K8sResponse;
          } else {
            console.error(e);
            return {response: {statusCode: 0, statusMessage: "Exception"}} as K8sResponse;
          }
        });
      const serviceDeleted = serviceDelete.response.statusCode;
      console.log("Delete service response status code: ", serviceDelete.response.statusCode);
      console.log("Delete service response status message: ", serviceDelete.response.statusMessage);
      if (serviceDeleted != undefined && ((serviceDeleted >= 200 && serviceDeleted < 300) || serviceDeleted == 404) ) {
        console.log("Deleted service successfully");
        return true;
      } else {
        console.log("Failed to delete service");
        return false;
      }
    } else {
      return true;
    }
  }

  return (await deletePod() && await deleteService());
}
