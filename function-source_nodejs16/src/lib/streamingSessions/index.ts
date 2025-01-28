import * as admin from "firebase-admin";
import * as deployStandard from "./deploy-standard";
import {BrowserStateUpdateWebRtc, Deployment, DeploymentState, Participant, PodStackState} from "../docTypes";
import {ClusterProvider, ClusterProviders, ConfigurationOdysseyClientPod} from "../systemDocTypes";
import {addDeployment, getDeployment, GetFirestoreDocResult, getOdysseyClientPodRef, getOrganizationOdysseyClientPodRef, getOrganizationUserConfigurationOdysseyClientPodRef, getParticipant, getParticipantRef, getPodStackStatesRef, getRoomConfigurationOdysseyClientPodRef, getSpaceConfigurationOdysseyClientPodRef, getUserConfigurationOdysseyClientPodRef} from "../documents/firestore";
import {ResolvedSpaceUnrealProjectVersion} from "../unrealProjects/shared";

export function checkWebRtcStateOnline(result: GetFirestoreDocResult<BrowserStateUpdateWebRtc>, deviceTimeout: number) {
  const [webRtcStateDoc, webRtcState] = result;
  return (
    webRtcStateDoc != undefined &&
    webRtcStateDoc.exists == true &&
    webRtcState != undefined &&
    webRtcState.updated != undefined &&
    webRtcState.updated.seconds > deviceTimeout &&
    webRtcState.state != undefined &&
    webRtcState.state != null &&
    ["new", "checking", "connected", "completed", "disconnected"].includes(webRtcState.state)
  );
}

export type ParticipantUpdate = Omit<Participant, "stateChanges"> & { stateChanges: admin.firestore.FieldValue };

export async function updateParticipant(
  participant: ParticipantUpdate,
  organizationId: string,
  roomId: string,
  participantId: string,
) : Promise<FirebaseFirestore.WriteResult> {
  console.log("Updating participant...");
  return await getParticipantRef(organizationId, roomId, participantId).update(participant);
}

export async function getConfigurationOdysseyClientPod(organizationId? : string, spaceId?: string, shardOfRoomId?: string, roomId?: string, userId? : string) : Promise<ConfigurationOdysseyClientPod | undefined> {
  async function getConfiguration(configurationDocPath: string) : Promise<ConfigurationOdysseyClientPod | undefined> {
    const configurationDoc = await admin.firestore()
      .doc(configurationDocPath).get();
    if (configurationDoc.exists) {
      return configurationDoc.data() as ConfigurationOdysseyClientPod;
    } else {
      return undefined;
    }
  }

  const configurationSources : string[] = [];
  const systemConfigurationRef = getOdysseyClientPodRef();
  configurationSources.push(systemConfigurationRef.path);
  if (organizationId != undefined) {
    const organizationConfigurationRef = getOrganizationOdysseyClientPodRef(organizationId);
    configurationSources.push(organizationConfigurationRef.path);
  }
  if (organizationId != undefined && spaceId != undefined ) {
    const spaceConfigurationRef = getSpaceConfigurationOdysseyClientPodRef(organizationId, spaceId);
    configurationSources.push(spaceConfigurationRef.path);
  }
  if (organizationId != undefined && shardOfRoomId != undefined ) {
    const shardOfRoomConfigurationRef = getRoomConfigurationOdysseyClientPodRef(organizationId, shardOfRoomId);
    configurationSources.push(shardOfRoomConfigurationRef.path);
  }
  if (organizationId != undefined && roomId != undefined ) {
    const roomConfigurationRef = getRoomConfigurationOdysseyClientPodRef(organizationId, roomId);
    configurationSources.push(roomConfigurationRef.path);
  }
  if (organizationId != undefined && userId != undefined ) {
    const userConfigurationRef = getOrganizationUserConfigurationOdysseyClientPodRef(organizationId, userId);
    configurationSources.push(userConfigurationRef.path);
  }
  if (userId != undefined ) {
    const userConfigurationRef = getUserConfigurationOdysseyClientPodRef(userId);
    configurationSources.push(userConfigurationRef.path);
  }

  return await configurationSources.reduce<Promise<ConfigurationOdysseyClientPod | undefined>>(async (acc, docPath) => {
    const result = await getConfiguration(docPath);
    if (result == undefined) {
      console.log(`Configuration document ${docPath} doesn't exist`);
      return await acc;
    } else {
      const accResolved = await acc;
      if (accResolved == undefined) {
        console.log(`Setting configuration from ${docPath}`);
        return result;
      } else {
        console.log(`Merging configuration from ${docPath} with existing`);
        return {...accResolved, ...result};
      }
    }
  }, Promise.resolve(undefined));
}

export function createNewDeployment(
  userId : string,
  deviceId : string,
  attempts : number,
  workloadClusterProvider : ClusterProvider,
) : Deployment {
  const now = admin.firestore.Timestamp.now();
  return {
    workloadClusterProvider: workloadClusterProvider,
    created: now,
    updated: now,
    attempts,
    deviceId,
    userId,
    state: "new",
    stateChanges: [{state: "new", timestamp: now}],
  };
}

export function orderOfDeploymentState(deploymentState: DeploymentState) {
  switch (deploymentState) {
    case "new": {return 1;}
    case "provisioning": {return 2;}
    case "failed-provisioning": {return 3;}
    case "timed-out-provisioning": {return 4;}
    case "pod-pending": {return 5;}
    case "pod-unschedulable": {return 6;}
    case "pod-scheduled": {return 7;}
    case "pod-creating": {return 8;}
    case "pod-initialized": {return 9;}
    case "pod-failed": {return 10;}
    case "pod-ready": {return 11;}
    case "pod-deleted": {return 0;}
    case "deprovisioning": {return 0;}
    case "failed-deprovisioning": {return 0;}
    case "timed-out-deprovisioning": {return 0;}
    case "deprovisioned": {return 0;}
    default: {return 0;}
  }
}

export async function deprovisionDeployment(
  organizationId : string,
  roomId: string,
  participantId: string,
  deploymentId: string,
) {
  const [, deployment] = await getDeployment(organizationId, roomId, participantId, deploymentId);

  const dontReplaceStates : DeploymentState[] = ["deprovisioning", "deprovisioned"];

  if (deployment == undefined) {
    throw new Error("Deployment undefined");
  }

  console.debug("Latest deployment:", deployment);
  if (deployment.state in dontReplaceStates) {
    console.warn("Deployment state already deprovisioning or deprovisioned, not updating");
    return;
  }
  return await deployStandard.updateDeploymentState(organizationId, roomId, participantId, deploymentId, "deprovisioning");
}
export async function replaceAndDeprovisionDeployment(
  organizationId : string,
  roomId: string,
  participantId: string,
  deploymentId: string,
  userId : string,
  deviceId : string,
  attempts: number,
  workloadClusterProvider : ClusterProvider,
) {
  const [, latestDeployment] = await getDeployment(organizationId, roomId, participantId, deploymentId);

  if (latestDeployment == undefined) {
    console.error("latestDeployment undefined");
    return;
  }

  if (latestDeployment.state != "failed-provisioning") {
    console.warn(`Deployment has changed state from failed-provisioning, not replacing or removing: ${deploymentId}`);
    return;
  }

  // Deprovision failed deployment
  await (async () => {
    try {
      await deprovisionDeployment(organizationId, roomId, participantId, deploymentId);
    } catch (e: any) {
      console.error(e);
      console.error(`Failed to deprovision deployment ${deploymentId}`);
    }
  })();

  const [latestParticipantDoc, latestParticipant] = await getParticipant(organizationId, roomId, participantId);

  if (latestParticipantDoc == undefined || latestParticipant == undefined) {
    console.warn("latestParticipant undefined");
    return;
  }

  if (!latestParticipantDoc.exists) {
    console.warn("Participant no longer exists, not replacing.");
    return;
  }

  if (latestParticipant.state == "ready-deployment") {
    console.warn("Participant has ready deployment, not replacing.");
    return;
  }

  if (latestDeployment.state != "failed-provisioning" && latestDeployment.state != "failed-before-provisioning") {
    console.warn("Deployment has changed state from failed-provisioning or failed-before-provisioning, not replacing.");
    return;
  }

  if (attempts > 3) {
    console.log(`Reached maximum number of deployment attempts: ${attempts}, not replacing`);
    return;
  }

  const replacementDeployment = createNewDeployment(userId, deviceId, attempts, workloadClusterProvider);

  // Create replacement deployment
  const addDeploymentResult = await (async () => {
    try {
      return (await addDeployment(organizationId, roomId, participantId, replacementDeployment)).id;
    } catch (e: any) {
      console.error(e);
      console.error(`Failed to replace failed deployment ${deploymentId}`);
      return false;
    }
  })();

  return addDeploymentResult;
}

export async function createNewDeployments(
  organizationId : string,
  spaceId: string,
  roomId: string,
  participantId: string,
  userId : string,
  deviceId : string,
  shardOfRoomId?: string,
) {
  const configuration = await getConfigurationOdysseyClientPod(organizationId, spaceId, shardOfRoomId, roomId, userId);
  if (configuration == undefined) {
    throw new Error("Unable to resolve configuration");
  }

  if (configuration.workloadClusterProviders == undefined) {
    throw (new Error("Configuration has no workloadClusterProviders"));
  }

  console.log(configuration);

  const deployments = configuration.workloadClusterProviders
    .reduce<ClusterProviders>((unique, item) => {
    // Remove any duplicate providers
    return unique.includes(item) ? unique : [...unique, item];
  }, [])
    .map((clusterProvider) => createNewDeployment(userId, deviceId, 1, clusterProvider))
    .map((deployment) => {
      return addDeployment(organizationId, roomId, participantId, deployment);
    });

  return deployments;
}

export async function deployStreamingSession(
  projectId: string,
  deployment : Deployment,
  organizationId : string,
  spaceId : string,
  shardOfRoomId: string | undefined,
  roomId: string,
  participantId: string,
  deploymentId: string,
  serverAddress: string | undefined,
  levelId: string | undefined,
  userId : string,
  deviceId : string,
  graphicsBenchmark : number,
  resolvedSpaceUnrealProjectVersion: ResolvedSpaceUnrealProjectVersion,
  serverRegion?: string,
) {
  const configuration = await getConfigurationOdysseyClientPod(organizationId, spaceId, shardOfRoomId, roomId, userId);
  if (configuration == undefined) {
    throw new Error("Unable to resolve configuration");
  }

  const customToken = await admin.auth().createCustomToken(userId);

  return await deployStandard.deployPodstack(projectId, configuration, deployment.workloadClusterProvider, organizationId, spaceId, roomId, participantId, deploymentId, serverAddress, levelId, userId, deviceId, customToken, graphicsBenchmark, resolvedSpaceUnrealProjectVersion, serverRegion);
}

export async function collectDeploymentPodStackState(
  organizationId: string,
  roomId: string,
  participantId: string,
  deploymentId: string,
  userId : string,
  workloadClusterProvider: ClusterProvider,
  deploymentState: DeploymentState
) {
  console.debug("Collecting and saving pod stack state");
  try {
    const podStack = await deployStandard.collectPodStackStates(userId, deploymentId, workloadClusterProvider);
    const podStackState : PodStackState = {
      deploymentState,
      timestamp: admin.firestore.Timestamp.now(),
      eventsJson: podStack.events && JSON.stringify(podStack.events),
      podJson: podStack.pod && JSON.stringify(podStack.pod),
      configMapJson: podStack.configMap && JSON.stringify(podStack.configMap),
      serviceJson: podStack.service && JSON.stringify(podStack.service),
      ingressJson: podStack.ingress && JSON.stringify(podStack.ingress),
    };
    const result = await getPodStackStatesRef(organizationId, roomId, participantId, deploymentId).add(podStackState);
    return result.id;
  } catch (e: any) {
    console.error("Error collecting and/or adding pod stack state");
    console.error(e);
  }
}
