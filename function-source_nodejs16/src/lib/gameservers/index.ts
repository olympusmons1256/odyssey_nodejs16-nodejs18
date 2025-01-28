import * as deployStandard from "./deploy-standard";
import {ConfigurationOdysseyServer} from "../systemDocTypes";
import {Room} from "../docTypes";
import * as admin from "firebase-admin";
import {getFirebaseProjectId} from "../firebase";
import {sleep} from "../misc";
import {getBillingPublic, getOdysseyServerRef, getOrganizationOdysseyServerRef, getRoom, getRoomConfigurationOdysseyServerRef, getRoomRef, getSpace, getSpaceConfigurationOdysseyServerRef} from "../documents/firestore";
import {getConfigurationOdysseyClientPod} from "../streamingSessions";
import {resolveGpuRegions} from "../coreweave/availability";
import {ResolvedSpaceUnrealProjectVersion, resolveSpaceUnrealProjectVersion} from "../unrealProjects/shared";

export async function getConfigurationOdysseyServer(organizationId?: string, spaceId?: string, shardOfRoomId?: string, roomId?: string) : Promise<ConfigurationOdysseyServer | undefined> {
  async function getConfiguration(configurationDocPath: string) : Promise<ConfigurationOdysseyServer | undefined> {
    const configurationDoc = await admin.firestore().doc(configurationDocPath).get();
    if (configurationDoc.exists) {
      return configurationDoc.data() as ConfigurationOdysseyServer;
    } else {
      return undefined;
    }
  }

  const configurationSources : string[] = [];
  configurationSources.push(getOdysseyServerRef().path);
  if (organizationId != undefined) {
    configurationSources.push(getOrganizationOdysseyServerRef(organizationId).path);
  }
  if (organizationId != undefined && spaceId != undefined ) {
    configurationSources.push(getSpaceConfigurationOdysseyServerRef(organizationId, spaceId).path);
  }
  if (organizationId != undefined && shardOfRoomId != undefined ) {
    configurationSources.push(getRoomConfigurationOdysseyServerRef(organizationId, shardOfRoomId).path);
  }
  if (organizationId != undefined && roomId != undefined ) {
    configurationSources.push(getRoomConfigurationOdysseyServerRef(organizationId, roomId).path);
  }

  return await configurationSources.reduce<Promise<ConfigurationOdysseyServer | undefined>>(async (acc, docPath) => {
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


export async function waitAndProvision(startTime: number, organizationId: string, roomId: string) : Promise<FirebaseFirestore.WriteResult | undefined> {
  await sleep(2000);
  console.debug("Waiting for 2 seconds before getting room");
  const [, room] = await getRoom(organizationId, roomId);
  const elapsedSeconds = ((Date.now() - startTime) / 1000);
  if (room == undefined) {
    console.debug(`Seconds elapsed: ${elapsedSeconds}, room undefined, waiting for 2 more seconds`);
    return await waitAndDeprovision(startTime, organizationId, roomId);
  } else if (
    room.state == undefined ||
    room.state == "deprovisioned" ||
    room.state == "failed-deprovisioning" ||
    room.state == "timed-out-deprovisioning" ||
    room.state == "pod-deleted"
  ) {
    console.debug("Updating room state to provisioning");
    return await deployStandard.updateRoomState(organizationId, roomId, "provisioning");
  } else if (
    room.state == "provisioning" ||
    room.state == "pod-ready" ||
    room.state == "pod-containersReady" ||
    room.state == "pod-initialized" ||
    room.state == "pod-creating" ||
    room.state == "pod-pending" ||
    room.state == "pod-scheduled" ||
    room.state == "pod-unschedulable") {
    console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, already provisioning or provisioned`);
    return;
  } else if (elapsedSeconds >= 200) {
    console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, timed out`);
    return;
  } else {
    console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, waiting for 2 more seconds`);
    return await waitAndProvision(startTime, organizationId, roomId);
  }
}

export async function waitAndDeprovision(startTime: number, organizationId: string, roomId: string) : Promise<FirebaseFirestore.WriteResult | undefined> {
  console.debug("Waiting for 2 seconds before getting room");
  await sleep(2000);

  const [, room] = await getRoom(organizationId, roomId);
  const elapsedSeconds = ((Date.now() - startTime) / 1000);
  if (room == undefined) {
    console.debug(`Seconds elapsed: ${elapsedSeconds}, room undefined, waiting for 2 more seconds`);
    return await waitAndDeprovision(startTime, organizationId, roomId);
  } else if (
    elapsedSeconds >= 200 ||
    room.state == undefined ||
    room.state == "pod-ready" ||
    room.state == "failed-deprovisioning" ||
    room.state == "failed-provisioning" ||
    room.state == "timed-out-deprovisioning" ||
    room.state == "timed-out-provisioning" ||
    room.state == "pod-deleted" ||
    room.state == "pod-failed"
  ) {
    console.debug("Updating room state to deprovisioning");
    return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioning");
  } else if (room.state == "deprovisioned" || room.state == "deprovisioning") {
    console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, done`);
    return;
  } else {
    console.debug(`Seconds elapsed: ${elapsedSeconds}, room state: ${room.state}, waiting for 2 more seconds`);
    return await waitAndDeprovision(startTime, organizationId, roomId);
  }
}

export async function newGameServer(
  projectId: string,
  organizationId : string,
  spaceId: string,
  roomId : string,
  graphicsBenchmark: number,
  resolvedSpaceUnrealProjectVersion: ResolvedSpaceUnrealProjectVersion,
  levelId: string | undefined,
  shardOfRoomId: string | undefined,
) {
  const configuration = await getConfigurationOdysseyServer(organizationId, spaceId, shardOfRoomId, roomId);
  if (configuration == undefined) {
    throw new Error("configuration is undefined");
  }
  const clientConfiguration = await getConfigurationOdysseyClientPod(organizationId, spaceId, shardOfRoomId, roomId);
  const unrealProjectVersionRegions = resolvedSpaceUnrealProjectVersion?.unrealProjectVersion.volumeRegions || [];
  const gpuRegions = await resolveGpuRegions(clientConfiguration, graphicsBenchmark, unrealProjectVersionRegions);
  const region = gpuRegions[0].region;
  return await deployStandard.deployGameServerPodStack(projectId, configuration, region, organizationId, spaceId, roomId, resolvedSpaceUnrealProjectVersion, levelId);
}

export async function deleteGameServer(
  organizationId : string,
  roomId: string,
) {
  const configuration = await getConfigurationOdysseyServer(organizationId, roomId);
  if (configuration == undefined) {
    throw new Error("configuration is undefined");
  }

  return await deployStandard.deleteGameServerPodStack(roomId, configuration.workloadClusterProvider);
}

export async function onUpdateRoomState(organizationId: string, roomId: string, room: Room) {
  console.debug("Waiting for 3 seconds before getting latest room state");
  await sleep(3000);
  const [roomLatestRef, roomLatest] = await getRoom(organizationId, roomId);
  if (roomLatestRef == undefined || roomLatest == undefined) {
    return console.error("Latest room undefined");
  }
  if (roomLatest.spaceId == undefined) {
    return console.error("Room spaceId is undefined");
  }
  const [, space] = await getSpace(organizationId, roomLatest.spaceId);
  if (space == undefined) {
    return console.error("Space is undefined");
  }

  if (roomLatest.state == room.state) {
    console.debug("Room stat still matches latest");
    switch (room.state) {
      case "provisioning": {
        const [, billingPublic] = await getBillingPublic(organizationId);
        if (billingPublic != undefined && billingPublic.aggregateBillingState == "inactive") {
          console.log(`Room provisioning rejected by billing: ${getRoomRef(organizationId, roomId).path}`);
          return await deployStandard.updateRoomState(organizationId, roomId, "failed-provisioning", admin.firestore.FieldValue.delete(), undefined, 0, undefined, true);
        }

        const resolvedUnrealProjectVersion = await resolveSpaceUnrealProjectVersion(space);
        if (resolvedUnrealProjectVersion == "not-found") {
          console.error(`Failed to find unreal project version ${space.unrealProject?.unrealProjectId}/${space.unrealProject?.unrealProjectVersionId}`);
          return await deployStandard.updateRoomState(organizationId, roomId, "failed-provisioning", admin.firestore.FieldValue.delete(), undefined, 0);
        }
        const projectId = getFirebaseProjectId();
        if (roomLatest.spaceId == undefined) {
          console.error("Room spaceId is undefined");
          return await deployStandard.updateRoomState(organizationId, roomId, "failed-provisioning", admin.firestore.FieldValue.delete(), undefined, 0);
        }
        return await newGameServer(projectId, organizationId, roomLatest.spaceId, roomId, (roomLatest.graphicsBenchmark != undefined) ? roomLatest.graphicsBenchmark : 5, resolvedUnrealProjectVersion, roomLatest.levelId, roomLatest.shardOf);
      }
      case "deprovisioning": {
        const deleteResult = await deleteGameServer(organizationId, roomId);
        if (deleteResult) {
          return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioned", admin.firestore.FieldValue.delete(), undefined, 0);
        } else {
          return await deployStandard.updateRoomState(organizationId, roomId, "failed-deprovisioning", undefined, undefined, admin.firestore.FieldValue.increment(1));
        }
      }
      case "failed-provisioning": {
        if (room.provisioningFailures != undefined && room.provisioningFailures > 2) {
          console.warn("Too many failed provisioning attempts, deprovisioning");
          return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioning");
        }
        console.debug("Updating room state back to provisioning");
        return await deployStandard.updateRoomState(organizationId, roomId, "provisioning", undefined, (room.provisioningFailures == undefined) ? 1 : room.provisioningFailures + 1);
      }
      case "failed-deprovisioning": {
        if (room.deprovisioningFailures != undefined && room.deprovisioningFailures > 2) {
          console.warn("Too many failed deprovisioning attempts, giving up");
          return;
        }
        console.debug("Updating room state back to deprovisioning");
        return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioning");
      }
      case "timed-out-provisioning": {
        return await deployStandard.updateRoomState(organizationId, roomId, "deprovisioning");
      }
      default: {
        return;
      }
    }
  } else {
    console.debug("Room state has been updated since the start of this execution. Stopping here.");
    return;
  }
}

export async function billingFeatureShardingEnabled(organizationId: string, triggerDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
  const [, billingPublic] = await getBillingPublic(organizationId);
  if (billingPublic == undefined) {
    console.error(`Unable to get billing/public for document: ${triggerDoc.ref.path}`);
    return false;
  }

  if (billingPublic.aggregateBillingState != "active") {
    console.warn(`Sharding feature disabled because aggregateBillingState != active: ${triggerDoc.ref.path}`);
    return false;
  }

  if (billingPublic.features.sharding != true) {
    console.warn(`Sharding feature disabled because it is not included in subscription features: ${triggerDoc.ref.path}`);
    return false;
  }
  return true;
}
