import * as admin from "firebase-admin";
import * as k8s from "@kubernetes/client-node";

import {readFile, sleep} from "../misc";
import * as resourceYaml from "./yaml-standard";
import {resolveKubeConfig} from "../streamingSessions/shared";
import {UnrealPluginVersion, UnrealProject, UnrealProjectVersion, UnrealProjectVersionState} from "../docTypes";
import {getUnrealProjectVersion} from "../documents/firestore";
import {getPodStatus} from "../kubernetes/shared";
import {formatUnrealProjectVersionBuildPodName, formatUnrealProjectVersionClaimName, formatUnrealProjectVersionPackageValidatorPodName, formatUnrealProjectVersionVolumeCopyPodName} from "./shared";
import {ConfigurationUnrealProjectVersion} from "../systemDocTypes";
import {IncomingMessage} from "http";

const buildPodYamlFile = "./unreal-project-version-build-pod.yaml";
const volumeCopyPodYamlFile = "./unreal-project-version-volume-copy-pod.yaml";
const packageValidatorPodYamlFile = "./unreal-project-version-package-validator-pod.yaml";
const pvcYamlFile = "./unreal-project-version-pvc.yaml";

export async function updateUnrealProjectVersionState(options: {
  unrealProjectId: string,
  unrealProjectVersionId: string,
  state: UnrealProjectVersionState,
  lastPingFromBuilder?: admin.firestore.Timestamp | admin.firestore.FieldValue,
  lastPingFromVolumeCopyRegion?: admin.firestore.Timestamp | admin.firestore.FieldValue,
  packageArchiveUrl?: string,
  packageArchiveSha256Sum?: string,
  symbolsArchiveUrl?: string,
  symbolsArchiveSha256Sum?: string,
  region?: string,
  volumeSizeGb?: number,
  volumeRegions?: string[],
  buildRegion?: string,
  buildLogUrl?: string,
  systemLogUrl?: string,
  incrementBuilderRetries?: boolean,
  incrementPackageValidatorRetries?: boolean,
  incrementVolumeCopyRetries?: boolean,
  expiredArtifacts?: string[],
}) {
  const now = admin.firestore.Timestamp.now();
  const stateUpdate = {
    state: options.state,
    volumeCopyRegionsComplete: (options.state === "volume-copy-expiring") ? admin.firestore.FieldValue.delete() :
      (options.state === "volume-copy-region-complete") ? admin.firestore.FieldValue.arrayUnion(options.region) : undefined,
    volumeCopyRegionsFailed: (options.state === "volume-copy-expiring") ? admin.firestore.FieldValue.delete() :
      (options.state === "volume-copy-region-failed") ? admin.firestore.FieldValue.arrayUnion(options.region) : undefined,
    updated: now,
    lastPingFromBuilder: options.lastPingFromBuilder,
    lastPingFromVolumeCopyRegion: options.lastPingFromVolumeCopyRegion,
    packageArchiveUrl: options.packageArchiveUrl,
    packageArchiveSha256Sum: options.packageArchiveSha256Sum,
    symbolsArchiveUrl: options.symbolsArchiveUrl,
    symbolsArchiveSha256Sum: options.symbolsArchiveSha256Sum,
    volumeSizeGb: options.volumeSizeGb,
    volumeRegions: options.volumeRegions,
    expiredArtifacts: options.expiredArtifacts,
    buildRegion: options.buildRegion,
    buildLogUrls: options.buildLogUrl ? admin.firestore.FieldValue.arrayUnion(options.buildLogUrl) : undefined,
    systemLogUrls: options.systemLogUrl ? admin.firestore.FieldValue.arrayUnion(options.systemLogUrl) : undefined,
  };

  const [unrealProjectVersionDoc] = await getUnrealProjectVersion(options.unrealProjectId, options.unrealProjectVersionId);

  if (unrealProjectVersionDoc == undefined) {
    console.error("unrealProjectVersionDoc doc undefined");
    return undefined;
  }

  console.debug(`Updating unrealProjectVersion ${unrealProjectVersionDoc.ref.path} with changes: `, stateUpdate);
  try {
    return await unrealProjectVersionDoc.ref.update(stateUpdate);
  } catch (e) {
    console.error("Failed to update unrealProjectVersion state", e);
    return undefined;
  }
}

interface WatchPodUntilReadyOptions {
  unrealProjectId: string
  unrealProjectVersionId: string
  kc: k8s.KubeConfig
  podName: string
  unrealProjectVersionState: UnrealProjectVersionState
  timeoutSeconds?: number
}

export async function watchPodUntilReady({
  unrealProjectId,
  unrealProjectVersionId,
  kc,
  podName,
  unrealProjectVersionState,
  timeoutSeconds = 240,
}: WatchPodUntilReadyOptions) {
  const startTime = new Date().getTime();
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const checkIntervalMilliseconds = 2000;

  async function checkContainersReady(lastUnrealProjectVersionState: UnrealProjectVersionState, numberFailed: number) : Promise<void|FirebaseFirestore.WriteResult|undefined> {
    await sleep(checkIntervalMilliseconds);
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (elapsedSeconds >= timeoutSeconds) {
      return console.debug(`Timeout exceeded after ${elapsedSeconds} seconds of waiting for containers ready`);
    }
    if (numberFailed >= 3) {
      console.log("Failed to get pod status 3 times, marking unrealProjectVersion provisioning as failed");
      return await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "builder-pod-failed-to-create"});
    }
    try {
      const pod = (await coreClient.readNamespacedPod(podName, namespace)).body;
      const podStatus = getPodStatus(pod);
      console.log("Pod status:", podStatus);
      if (podStatus == "ready") {
        return await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "builder-pod-ready"});
      }
      if (podStatus == "failed") {
        return await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "builder-pod-failed"});
      }
    } catch (e : any) {
      console.warn(`Error statusCode: ${e.response.statusCode} fetching pod: ${podName}`);
      return await checkContainersReady(lastUnrealProjectVersionState, numberFailed + 1);
    }
    console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for ${checkIntervalMilliseconds / 1000} seconds before checking again...`);
    return await checkContainersReady(lastUnrealProjectVersionState, numberFailed);
  }

  return await checkContainersReady(unrealProjectVersionState, 0);
}

export async function deployBuilderPod(
  firebaseProjectId: string,
  configuration: ConfigurationUnrealProjectVersion | undefined,
  unrealProjectId: string,
  unrealProject: UnrealProject,
  unrealProjectVersionId: string,
  unrealProjectVersion: UnrealProjectVersion,
  unrealPluginVersionId: string,
  unrealPluginVersion: UnrealPluginVersion,
) {
  const state = "builder-pod-creating";
  await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state});

  const kc = await resolveKubeConfig("coreweave");
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const podYaml = await readFile(buildPodYamlFile);
  // TODO: Setup UnrealProjectVersionBuild configuration system
  if (configuration?.builderValidRegions == undefined) {
    console.error("Failed to resolve valid builder region(s)");
    return undefined;
  }

  const region = configuration?.builderValidRegions[Math.floor(Math.random()*configuration.builderValidRegions.length)];

  const pod = resourceYaml.templateUnrealProjectVersionBuildPod(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, unrealPluginVersionId, unrealPluginVersion, region, configuration.builderImageRepo, configuration.builderImageId, podYaml);

  if (pod == undefined) {
    console.error("Failed to template pod for unrealProjectVersionId: ", unrealProjectVersionId);
    return undefined;
  }
  if (pod.metadata?.name == undefined) {
    console.error("Template pod is missing metadata.name for unrealProjectVersionId: ", unrealProjectVersionId);
    return undefined;
  }

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);

  console.debug("Creating kubernetes pod");
  const createPodResult = await coreClient.createNamespacedPod(namespace, pod)
    .then((pod) => {
      return {
        podName: pod.body.metadata?.name,
        error: undefined,
      };
    })
    .catch((e) => {
      return {
        podName: undefined,
        error: {
          statusCode: e.response.statusCode,
          statusMessage: e.response.statusMessage,
        },
      };
    });
  if (createPodResult.error != undefined) {
    console.error("Failed to create pod over kubernetes API");
    console.error(createPodResult);
    return undefined;
  }
  if (createPodResult.podName == undefined) {
    console.error("Created pod has no name");
    console.error(createPodResult);
    return undefined;
  }

  await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "builder-pod-waiting-for-ready", buildRegion: region});
  await watchPodUntilReady({unrealProjectId, unrealProjectVersionId, kc, podName: createPodResult.podName, unrealProjectVersionState: state});
  return;
}

export async function deployPackageValidatorPod(
  firebaseProjectId: string,
  configuration: ConfigurationUnrealProjectVersion | undefined,
  unrealProjectId: string,
  unrealProject: UnrealProject,
  unrealProjectVersionId: string,
  unrealProjectVersion: UnrealProjectVersion,
) {
  const state = "package-validator-pod-creating";
  await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state});

  const kc = await resolveKubeConfig("coreweave");
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const podYaml = await readFile(packageValidatorPodYamlFile);

  if (configuration?.packageValidatorValidRegions == undefined) {
    console.error("Failed to resolve valid packageValidator region(s) ");
    return undefined;
  }

  const region = configuration?.packageValidatorValidRegions[Math.floor(Math.random()*configuration.packageValidatorValidRegions.length)];

  const pod = resourceYaml.templateUnrealProjectVersionPackageValidatorPod(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, region, configuration?.packageValidatorImageRepo, configuration?.packageValidatorImageId, podYaml);

  if (pod == undefined) {
    console.error("Failed to template pod for unrealProjectVersionId: ", unrealProjectVersionId);
    return undefined;
  }
  if (pod.metadata?.name == undefined) {
    console.error("Template pod is missing metadata.name for unrealProjectVersionId: ", unrealProjectVersionId);
    return undefined;
  }

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);

  console.debug("Creating kubernetes pod");
  const createPodResult = await coreClient.createNamespacedPod(namespace, pod)
    .then((pod) => {
      return {
        podName: pod.body.metadata?.name,
        error: undefined,
      };
    })
    .catch((e) => {
      return {
        podName: undefined,
        error: {
          statusCode: e.response.statusCode,
          statusMessage: e.response.statusMessage,
        },
      };
    });
  if (createPodResult.error != undefined) {
    console.error("Failed to create pod over kubernetes API");
    console.error(createPodResult);
    return undefined;
  }
  if (createPodResult.podName == undefined) {
    console.error("Created pod has no name");
    console.error(createPodResult);
    return undefined;
  }

  await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "package-validator-pod-waiting-for-ready", buildRegion: region});
  return await watchPackageValidatorPodUntilReady({kc, name: createPodResult.podName});
}

type PodStatus =
| "pod-terminating"
| "pod-pending"
| "pod-running"
| "pod-does-not-exist"
| "unknown";

function podDetailsToStatus(pod: { response: IncomingMessage; body: k8s.V1Pod; }): PodStatus {
  const podBodyPhase = pod.body.status?.phase;
  if (podBodyPhase !== undefined && (podBodyPhase === "Succeeded" || podBodyPhase === "Failed")) return "pod-terminating";
  if (podBodyPhase !== undefined && podBodyPhase === "Pending") return "pod-pending";
  if (podBodyPhase !== undefined && podBodyPhase === "Running") return "pod-running";

  const podRequestStatusCode = pod.response.statusCode;
  if (podRequestStatusCode !== undefined && (podRequestStatusCode < 200 || podRequestStatusCode >= 300)) return "pod-does-not-exist";

  console.error("Unknown pod response");
  console.error(pod);
  return "unknown";
}

async function waitUntilNotTerminating(client: k8s.CoreV1Api, podName: string, namespace: string, backoff = 1): Promise<PodStatus> {
  if (backoff > 3) return "unknown";
  console.debug("Checking for existing pod: ", podName);
  const existingPod = await client.readNamespacedPod(podName, namespace);
  const existingPodStatus = podDetailsToStatus(existingPod);
  if (existingPodStatus !== "pod-terminating") return existingPodStatus;

  await sleep(500*backoff);
  return await waitUntilNotTerminating(client, podName, namespace, backoff++);
}

export async function deleteBuilderPodStack(unrealProjectVersionId: string) : Promise<boolean> {
  const kc = await resolveKubeConfig("coreweave");

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const podName = formatUnrealProjectVersionBuildPodName(unrealProjectVersionId);

  try {
    const existingPodStatus = await waitUntilNotTerminating(coreClient, podName, namespace);
    console.debug("Current pod status: ", existingPodStatus);
    if (existingPodStatus === "pod-does-not-exist") {
      console.debug("Pod does not exist, skipping deletion");
      return true;
    }
    console.debug("Deleting pod: ", podName);
    const podDelete = await coreClient.deleteNamespacedPod(podName, namespace, undefined, undefined, 15);
    const podDeleted = podDelete.response.statusCode;
    console.debug("Delete pod response status code: ", podDelete.response.statusCode);
    console.debug("Delete pod response status message: ", podDelete.response.statusMessage);
    if (podDeleted != undefined && podDeleted >= 200 && podDeleted < 300) {
      console.debug("Deleted pod successfully");
      return true;
    }
  } catch (e: any) {
    console.error(e);
  }
  console.error("Failed to delete pod");
  return false;
}

export async function deletePackageValidatorPodStack(unrealProjectVersionId: string) : Promise<boolean> {
  const kc = await resolveKubeConfig("coreweave");

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const podName = formatUnrealProjectVersionPackageValidatorPodName(unrealProjectVersionId);

  try {
    console.debug("Deleting pod: ", podName);
    const podDelete = await coreClient.deleteNamespacedPod(podName, namespace, undefined, undefined, 15);
    const podDeleted = podDelete.response.statusCode;
    console.debug("Delete pod response status code: ", podDelete.response.statusCode);
    console.debug("Delete pod response status message: ", podDelete.response.statusMessage);
    if (podDeleted != undefined && podDeleted >= 200 && podDeleted < 300) {
      console.debug("Deleted pod successfully");
      return true;
    }
  } catch (e: any) {
    console.error(e);
  }
  console.error("Failed to delete pod");
  return false;
}

interface WatchUntilReadyOptions {
  kc: k8s.KubeConfig
  name: string
  timeoutSeconds?: number
}

export async function watchVolumeCopyPodUntilReady({
  kc,
  name,
  timeoutSeconds = 240,
}: WatchUntilReadyOptions) {
  const startTime = new Date().getTime();
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const checkIntervalMilliseconds = 2000;

  async function checkContainersReady(numberFailed: number) : Promise<{ name: string, result: "failed" | "failed-create" | "ready" | "timed-out"}> {
    await sleep(checkIntervalMilliseconds);
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (elapsedSeconds >= timeoutSeconds) {
      return {name, result: "timed-out"};
    }
    if (numberFailed >= 3) {
      console.log("Failed to get pod status 3 times, marking unrealProjectVersion provisioning as failed");
      return {name, result: "failed-create"};
    }
    try {
      const pod = (await coreClient.readNamespacedPod(name, namespace)).body;
      const podStatus = getPodStatus(pod);
      console.log("Pod status:", podStatus);
      if (podStatus == "ready") {
        return {name, result: "ready"};
      }
      if (podStatus == "failed") {
        return {name, result: "failed"};
      }
    } catch (e : any) {
      console.warn(`Error statusCode: ${e.response.statusCode} fetching pod: ${name}`);
      return await checkContainersReady(numberFailed + 1);
    }
    console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for ${checkIntervalMilliseconds / 1000} seconds before checking again...`);
    return await checkContainersReady(numberFailed);
  }

  return await checkContainersReady(0);
}

export async function watchVolumeCopyPvcUntilReady({
  kc,
  name,
  timeoutSeconds = 240,
}: WatchUntilReadyOptions) {
  const startTime = new Date().getTime();
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const checkIntervalMilliseconds = 2000;

  async function checkPvcReady(numberFailed: number) : Promise<{ name: string, result: "failed" | "bound" | "timed-out"}> {
    await sleep(checkIntervalMilliseconds);
    const elapsedSeconds = ((Date.now() - startTime) / 1000);
    if (elapsedSeconds >= timeoutSeconds) {
      return {name, result: "timed-out"};
    }
    if (numberFailed >= 3) {
      console.warn("Failed to get pvc status 3 times, marking unrealProjectVersion provisioning as failed");
      return {name, result: "failed"};
    }
    try {
      const pvc = (await coreClient.readNamespacedPersistentVolumeClaim(name, namespace)).body;
      const pvcStatus = pvc.status?.phase;
      console.debug("Pvc status:", pvcStatus);
      if (pvcStatus == "Bound") {
        return {name, result: "bound"};
      }
      if (pvcStatus == "Failed") {
        return {name, result: "failed"};
      }
      if (pvcStatus == "Pending" && elapsedSeconds >= 60) {
        console.warn("PVC is still pending after > 60 seconds:", name);
        console.debug({pvc});
      }
    } catch (e : any) {
      console.warn(`Error statusCode: ${e.response.statusCode} fetching pvc: ${name}`);
      return await checkPvcReady(numberFailed + 1);
    }
    console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for ${checkIntervalMilliseconds / 1000} seconds before checking again...`);
    return await checkPvcReady(numberFailed);
  }

  return await checkPvcReady(0);
}

export async function watchPackageValidatorPodUntilReady({
  kc,
  name,
  timeoutSeconds = 240,
}: WatchUntilReadyOptions): Promise<boolean> {
  const startTime = new Date().getTime();
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";
  const client = kc.makeApiClient(k8s.CoreV1Api);
  const checkIntervalMilliseconds = 5000;
  let elapsedSeconds = ((Date.now() - startTime) / 1000);

  async function checkContainersReady(numberFailed: number): Promise<boolean> {
    if (elapsedSeconds >= timeoutSeconds) {
      console.error(`Pod ${name} did not become ready within ${timeoutSeconds} seconds`);
      return false;
    }

    const podStatus = await waitUntilNotTerminating(client, name, namespace, 1);
    if (podStatus === "pod-terminating") {
      console.error(`Pod ${name} did not become ready within ${timeoutSeconds} seconds`);
      return false;
    }
    if (podStatus === "pod-pending") {
      console.log(`Pod ${name} is pending`);
      await sleep(checkIntervalMilliseconds);
      elapsedSeconds = ((Date.now() - startTime) / 1000);
      return await checkContainersReady(numberFailed);
    }
    if (podStatus === "pod-running") {
      console.log(`Pod ${name} is running`);
      const pod = (await client.readNamespacedPod(name, namespace)).body;
      if (pod.status?.containerStatuses?.every((status) => status.state?.running !== undefined)) {
        console.log(`Pod ${name} is ready`);
        return true;
      }
      await sleep(checkIntervalMilliseconds);
      elapsedSeconds = ((Date.now() - startTime) / 1000);
      return await checkContainersReady(numberFailed);
    }
    if (podStatus === "pod-does-not-exist") {
      console.error(`Pod ${name} does not exist`);
      return false;
    }
    if (podStatus === "unknown") {
      console.error(`Unknown pod status for ${name}`);
      return false;
    }

    console.log(`We've waited for ${elapsedSeconds} seconds. Waiting for ${checkIntervalMilliseconds / 1000} seconds before checking again...`);
    return await checkContainersReady(numberFailed + 1);
  }

  return await checkContainersReady(0);
}

export async function deployVolumeCopyPodStacks(
  firebaseProjectId: string,
  configuration: ConfigurationUnrealProjectVersion | undefined,
  unrealProjectId: string,
  unrealProject: UnrealProject,
  unrealProjectVersionId: string,
  unrealProjectVersion: UnrealProjectVersion,
) {
  if (unrealProjectVersion.packageArchiveUrl == undefined) {
    console.error("Package archive URL is undefined");
    return false;
  }
  if (unrealProjectVersion.packageArchiveSha256Sum == undefined) {
    console.error("unrealProjectVersion.packageArchiveSha256Sum == undefined");
    return false;
  }
  const state : UnrealProjectVersionState = "volume-copy-pvcs-creating";
  await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state});


  const kc = await resolveKubeConfig("coreweave");
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const podYaml = await readFile(volumeCopyPodYamlFile);
  const pvcYaml = await readFile(pvcYamlFile);
  // TODO: Setup UnrealProjectVersionVolumeCopy configuration system
  const regions = configuration?.volumeCopyToRegions;
  if (regions == undefined) {
    console.error("Failed to resolve valid regions");
    return false;
  }
  await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state, volumeRegions: regions});

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);

  if (unrealProjectVersion.volumeSizeGb == undefined) {
    console.error("Unreal project version has no volumeSizeGb field:", unrealProjectVersionId);
    return false;
  }

  const createdPvcs = await Promise.all(regions.map(async (region) => {
    const pvc = resourceYaml.templateUnrealProjectVersionPvc(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, region, configuration, pvcYaml);
    if (pvc == undefined) {
      console.error(`Failed to template pvc ${unrealProjectVersionId}-${region}`);
      return {region};
    }
    if (pvc.metadata?.name == undefined) {
      console.error(`Pvc is missing metadata.name for ${unrealProjectVersionId}-${region}`);
      return {region};
    }

    console.debug("Creating kubernetes pvc");
    const createPvcResult = await coreClient.createNamespacedPersistentVolumeClaim(namespace, pvc)
      .then((pvc) => {
        return {
          pvcName: pvc.body.metadata?.name,
          error: undefined,
        };
      })
      .catch((e) => {
        return {
          pvcName: undefined,
          error: {
            statusCode: e.response.statusCode,
            statusMessage: e.response.statusMessage,
          },
        };
      });
    if (createPvcResult.error != undefined) {
      console.error("Failed to create pvc over kubernetes API");
      console.error(createPvcResult);
      return {region};
    }
    if (createPvcResult.pvcName == undefined) {
      console.error("Created pvc has no name");
      console.error(createPvcResult);
      return {region};
    }

    return {region, pvcName: createPvcResult.pvcName};
  }));

  if (createdPvcs.filter((r) => r.pvcName == undefined).length > 0) {
    console.error(`Error: At least one created pvc for ${unrealProjectId}/${unrealProjectVersionId} is undefined`);
    return await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-pvcs-failed"});
  }

  await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-pvcs-creating"});

  const pvcsBound = await Promise.all(createdPvcs.map(async (createdPvc) => {
    if (createdPvc.pvcName == undefined) return undefined;
    return await watchVolumeCopyPvcUntilReady({kc, name: createdPvc.pvcName});
  }));

  if (pvcsBound.filter((pvc) => pvc == undefined || pvc.result != "bound").length > 0) {
    console.error(`Error: At least one pvc is not bound for ${unrealProjectId}/${unrealProjectVersionId}`);
    return await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-pvcs-failed"});
  }

  await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-pvcs-bound"});

  const createdPods = await Promise.all(regions.map(async (region) => {
    const pod = resourceYaml.templateUnrealProjectVersionVolumeCopyPod(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, region, configuration?.volumeCopyImageRepo, configuration?.volumeCopyImageId, podYaml);
    if (pod == undefined) {
      console.error(`Failed to template volume copy pod ${unrealProjectVersionId}-${region}`);
      return {region};
    }
    if (pod.metadata?.name == undefined) {
      console.error("Volume copy pod is missing metadata.name for unrealProjectVersionId: ", unrealProjectVersionId);
      return {region};
    }

    console.debug("Creating kubernetes pod");
    const createPodResult = await coreClient.createNamespacedPod(namespace, pod)
      .then((pod) => {
        return {
          podName: pod.body.metadata?.name,
          error: undefined,
        };
      })
      .catch((e) => {
        return {
          podName: undefined,
          error: {
            statusCode: e.response.statusCode,
            statusMessage: e.response.statusMessage,
          },
        };
      });
    if (createPodResult.error != undefined) {
      console.error("Failed to create pod over kubernetes API");
      console.error(createPodResult);
      return {region};
    }
    if (createPodResult.podName == undefined) {
      console.error("Created pod has no name");
      console.error(createPodResult);
      return {region};
    }

    return {region, podName: createPodResult.podName};
  }));

  if (createdPods.filter((r) => r.podName == undefined).length > 0) {
    return await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-failed-to-create"});
  }

  await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-waiting-for-ready"});

  const podsReady = await Promise.all(createdPods.map(async (createdPod) => {
    if (createdPod.podName == undefined) {
      console.error("podName is undefined");
      console.debug({createdPod});
      return undefined;
    }
    return await watchVolumeCopyPodUntilReady({kc, name: createdPod.podName});
  }));

  const failedPods = podsReady.filter((pod) => pod == undefined || pod.result == "failed" || pod.result == "failed-create");
  console.debug({failedPods});

  if (failedPods.length > 0) {
    return await updateUnrealProjectVersionState({unrealProjectId, unrealProjectVersionId, state: "volume-copy-pods-failed"});
  }
  return true;
}

// TODO: Develop the deletion side of volume-copy
export async function deleteVolumeCopyPodStack(unrealProjectVersionId: string, regions: string[]) : Promise<boolean> {
  const kc = await resolveKubeConfig("coreweave");

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const podDeleteResults = await Promise.all(regions.map(async (region) => {
    const podName = formatUnrealProjectVersionVolumeCopyPodName(unrealProjectVersionId, region);

    try {
      console.debug("Deleting pod: ", podName);
      const podDelete = await coreClient.deleteNamespacedPod(podName, namespace, undefined, undefined, 15);
      const podDeleted = podDelete.response.statusCode;
      console.debug("Delete pod response status code: ", podDelete.response.statusCode);
      console.debug("Delete pod response status message: ", podDelete.response.statusMessage);
      if (podDeleted != undefined && podDeleted >= 200 && podDeleted < 300) {
        console.debug("Deleted pod successfully");
        return true;
      }
    } catch (e: any) {
      console.error(e);
    }
    console.error("Failed to delete pod");
    return false;
  }));
  const successfullyDeletedPods = podDeleteResults.reduce<boolean>((acc, r) => (acc == false) ? false : r, true);
  return successfullyDeletedPods;
}

export async function deleteVolumeCopyPvcs(unrealProjectVersionId: string, regions: string[]) : Promise<boolean> {
  const kc = await resolveKubeConfig("coreweave");

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const pvcDeleteResults = await Promise.all(regions.map(async (region) => {
    const pvcName = formatUnrealProjectVersionClaimName(unrealProjectVersionId, region);

    try {
      console.debug("Deleting pvc: ", pvcName);
      const pvcDelete = await coreClient.deleteNamespacedPersistentVolumeClaim(pvcName, namespace, undefined, undefined, 15);
      const pvcDeleted = pvcDelete.response.statusCode;
      console.debug("Delete pvc response status code: ", pvcDelete.response.statusCode);
      console.debug("Delete pvc response status message: ", pvcDelete.response.statusMessage);
      if (pvcDeleted != undefined && pvcDeleted >= 200 && pvcDeleted < 300) {
        console.debug("Deleted pvc successfully");
        return true;
      }
    } catch (e: any) {
      console.error(e);
    }
    console.error("Failed to delete pvc");
    return false;
  }));
  const successfullyDeletedPvcs = pvcDeleteResults.reduce<boolean>((acc, r) => (acc == false) ? false : r, true);
  return successfullyDeletedPvcs;
}
