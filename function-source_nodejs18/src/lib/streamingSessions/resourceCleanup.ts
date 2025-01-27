import * as k8s from "@kubernetes/client-node";
import * as admin from "firebase-admin";
import {resolveKubeConfig} from "./shared";
import {getDeployment, getDevice, getParticipant, getParticipantBrowserStateUpdateWebRtc, getParticipantRef} from "../../lib/documents/firestore";
import {deletePodStack} from "./deploy-standard";
import {getFirebaseProjectId} from "../firebase";
import {checkWebRtcStateOnline} from ".";

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

  const [participantDoc, participant] = await getParticipant(
    resourceInfo.organizationId,
    resourceInfo.roomId,
    resourceInfo.participantId,
  );

  const [deviceDoc, device] = await getDevice(
    resourceInfo.userId,
    resourceInfo.deviceId,
  );

  const participantBrowserStateUpdateWebRtc = await getParticipantBrowserStateUpdateWebRtc(
    resourceInfo.organizationId,
    resourceInfo.roomId,
    resourceInfo.participantId,
  );
  const [, webRtcState] = participantBrowserStateUpdateWebRtc;

  const webRtcOnline = checkWebRtcStateOnline(participantBrowserStateUpdateWebRtc, deviceTimeout);

  if (!webRtcOnline) console.debug(`Browser WebRtc state not online: ${resourceInfo.name}`, webRtcState);

  if (participant != undefined && participant.bot) {
    console.debug("Participant is a bot, skipping: ", resourceInfo.name);
    return undefined;
  }

  if (deploymentDoc != undefined && deploymentDoc.exists == false) {
    console.debug("Deployment doc no longer exists: ", resourceInfo.name);
    return resourceInfo;
  }

  if (deployment != undefined && deployment.state in ["deprovisioning", "deprovisioned"] && deployment.updated.seconds < deploymentTimeout) {
    console.debug("Deployment has been deprovisioning or deprovisioned for > 5 minutes: ", resourceInfo.name);
    return resourceInfo;
  }

  if (participantDoc != undefined && participantDoc.exists == false) {
    console.debug("Participant doc no longer exists: ", resourceInfo.name);
    return resourceInfo;
  }

  if (deviceDoc != undefined && deviceDoc.exists == false && !webRtcOnline) {
    console.debug("Device doc no longer exists: ", resourceInfo.name);
    return resourceInfo;
  }

  if (device != undefined && device.state == "offline" && device.lastChanged.seconds < deviceTimeout && !webRtcOnline) {
    console.debug("Device has been offline for > 1 minute: ", resourceInfo.name);
    return resourceInfo;
  }
  return undefined;
}

export async function cleanupCoreweave() {
  const fiveMinutesAgo = admin.firestore.Timestamp.now().seconds - 300;
  const oneMinuteAgo = admin.firestore.Timestamp.now().seconds - 60;
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
    console.debug("Deleting resource stack: ", resourceInfo.name);
    await deletePodStack(resourceInfo.userId, resourceInfo.deploymentId, "coreweave");
    console.debug("Deleting participant: ", resourceInfo.name);
    await getParticipantRef(resourceInfo.organizationId, resourceInfo.roomId, resourceInfo.participantId).delete();
    return;
  });

  const deleted = await Promise.all(deleteAll);
  console.debug(`Resources deleted: ${deleted.length}`);
}
