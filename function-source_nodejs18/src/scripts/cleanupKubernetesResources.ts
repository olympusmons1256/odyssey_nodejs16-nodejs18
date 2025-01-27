import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import * as k8s from "@kubernetes/client-node";
import {resolveKubeConfig} from "../lib/streamingSessions/shared";
import {getDeployment, getDevice, getParticipant} from "../lib/documents/firestore";
import {deletePodStack} from "../lib/streamingSessions/deploy-standard";
import {getFirebaseProjectId} from "../lib/firebase";

interface ResourceInfo {
  name: string
  organizationId: string,
  roomId: string,
  userId: string,
  deviceId: string,
  participantId: string,
  deploymentId: string,
  firebaseProjectId: string,
}

function getResourceInfo(resource: k8s.V1Pod | k8s.V1Service | k8s.V1Ingress | k8s.V1ConfigMap): ResourceInfo | undefined {
  if (resource.metadata == undefined || resource.metadata.labels == undefined || resource.metadata.name == undefined) {
    console.debug("Pod missing one of metadata, labels or name: ", resource);
    return undefined;
  } else {
    const nameMatch = resource.metadata.name.match(RegExp("odyssey-client-[0-9a-z]+-[0-9a-z]+"));
    if (nameMatch == null || nameMatch.length < 1) {
      console.debug("Pod name doesn't match expected format for an odyssey client: ", resource.metadata.name);
      return undefined;
    }
    if (
      resource.metadata.labels.organizationId == undefined ||
      resource.metadata.labels.roomId == undefined ||
      resource.metadata.labels.userId == undefined ||
      resource.metadata.labels.deviceId == undefined ||
      resource.metadata.labels.deploymentId == undefined ||
      resource.metadata.labels.firebaseProjectId == undefined
    ) {
      console.error("Pod missing a necessary label: ", resource.metadata.name);
      return undefined;
    } else {
      return {
        organizationId: resource.metadata.labels.organizationId,
        roomId: resource.metadata.labels.roomId,
        userId: resource.metadata.labels.userId,
        deviceId: resource.metadata.labels.deviceId,
        participantId: resource.metadata.labels.userId + ":" + resource.metadata.labels.deviceId,
        deploymentId: resource.metadata.labels.deploymentId,
        name: resource.metadata.name,
        firebaseProjectId: resource.metadata.labels.firebaseProjectId,
      };
    }
  }
}

async function checkResourceShouldBeDeleted(resourceInfo: ResourceInfo, deploymentTimeout: number, deviceTimeout: number): Promise<ResourceInfo | undefined> {
  const [deploymentDoc, deployment] = await getDeployment(
    resourceInfo.organizationId,
    resourceInfo.roomId,
    resourceInfo.participantId,
    resourceInfo.deploymentId,
  );

  if (deploymentDoc == undefined || deploymentDoc.exists == false) {
    console.debug("Deployment doc mising: ", resourceInfo.name);
    return resourceInfo;
  }
  if (deployment == undefined) {
    console.debug("Deployment data mising: ", resourceInfo.name);
    return resourceInfo;
  }
  if (deployment.state == "deprovisioning" && deployment.updated.seconds < deploymentTimeout) {
    console.debug("Deployment has been deprovisioning for > 5 minutes: ", resourceInfo.name);
    return resourceInfo;
  }

  const [participantDoc, participant] = await getParticipant(
    resourceInfo.organizationId,
    resourceInfo.roomId,
    resourceInfo.participantId,
  );

  if (participantDoc == undefined || participantDoc.exists == false) {
    console.debug("Participant doc mising: ", resourceInfo.name);
    return resourceInfo;
  }
  if (participant == undefined) {
    console.debug("Participant data mising: ", resourceInfo.name);
    return resourceInfo;
  }

  const [deviceDoc, device] = await getDevice(
    resourceInfo.userId,
    resourceInfo.deviceId,
  );

  if (deviceDoc == undefined || deviceDoc.exists == false) {
    console.debug("Device doc mising: ", resourceInfo.name);
    return resourceInfo;
  }
  if (device == undefined) {
    console.debug("Device data mising: ", resourceInfo.name);
    return resourceInfo;
  }
  if (device.state == "offline" && device.lastChanged.seconds < deviceTimeout) {
    console.debug("Device has been offline for > 1 minute: ", resourceInfo.name);
    return resourceInfo;
  }
  return undefined;
}

export async function cleanupCoreweave() {
  const now = new Date().getTime();
  const fiveMinutesAgo = now - 300;
  const oneMinuteAgo = now - 60;
  const kc = await resolveKubeConfig("coreweave");
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const networkingClient = kc.makeApiClient(k8s.NetworkingV1Api);
  const firebaseProjectId = getFirebaseProjectId();

  const pods = (await coreClient.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, `app=odyssey-client,firebaseProjectId=${firebaseProjectId}`)).body.items;
  const ingresses = (await networkingClient.listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, `app=odyssey-client,firebaseProjectId=${firebaseProjectId}`)).body.items;
  const configmaps = (await coreClient.listNamespacedConfigMap(namespace, undefined, undefined, undefined, undefined, `app=odyssey-client,firebaseProjectId=${firebaseProjectId}`)).body.items;
  const services = (await coreClient.listNamespacedService(namespace, undefined, undefined, undefined, undefined, `app=odyssey-client,firebaseProjectId=${firebaseProjectId}`)).body.items;

  const resources = Array.from(new Set([...pods, ...ingresses, ...configmaps, ...services]).values());

  console.debug(`Found ${resources.length} resources`);

  const resourceInfos =
      resources.map((resource) => getResourceInfo(resource))
        .flatMap((resourceInfo) => (resourceInfo == undefined) ? [] : [resourceInfo]);
  console.debug(`Got info for ${resourceInfos.length} resources`);

  const resourcesToDelete =
    (await Promise.all(
      resourceInfos.map(async (resourceInfo) => await checkResourceShouldBeDeleted(resourceInfo, fiveMinutesAgo, oneMinuteAgo))
    ))
      .flatMap((p) => (p == undefined) ? [] : p);
  console.debug(`Resources to delete: ${resourcesToDelete.length}`);

  const deleteAll = resourcesToDelete.map(async (resourceInfo) => {
    const result = await deletePodStack(resourceInfo.userId, resourceInfo.deploymentId, "coreweave");
    return (result) ? console.debug("Deleted resource stack: ", resourceInfo.name) : console.debug("Failed to delete resource stack: ", resourceInfo.name);
  });

  const deleted = await Promise.all(deleteAll);
  console.debug(`Resources deleted: ${deleted.length}`);
}

cleanupCoreweave();
