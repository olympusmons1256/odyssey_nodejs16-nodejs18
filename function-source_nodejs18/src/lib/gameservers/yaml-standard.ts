import {V1NodeSelectorRequirement, V1Pod, V1Service} from "@kubernetes/client-node";
import * as yaml from "js-yaml";
import * as k8s from "@kubernetes/client-node";
import {formatVolumeName, inEmulatorEnv} from "../misc";
import {ConfigurationOdysseyServer} from "../systemDocTypes";
import {formatGameServerName, formatServerConfigMapName} from "./shared";
import {formatUnrealProjectVersionClaimName, getUnrealProjectName, ResolvedSpaceUnrealProjectVersion} from "../unrealProjects/shared";

export function templatePod(
  projectId: string,
  configuration : ConfigurationOdysseyServer,
  region: string,
  organizationId: string,
  spaceId: string,
  roomId: string,
  levelId: string | undefined,
  resolvedSpaceUnrealProjectVersion: ResolvedSpaceUnrealProjectVersion,
  gameServerYaml: string,
) {
  const pod : V1Pod = yaml.loadAll(gameServerYaml)[0] as V1Pod;

  console.log("YAML before");
  console.log(yaml.dump(pod));

  if (pod.spec == undefined) {
    console.log("Pod spec is undefined");
    return undefined;
  }

  const gameServerName = formatGameServerName(roomId);
  const useCustomUnrealProject = resolvedSpaceUnrealProjectVersion != undefined;
  const customProjectName = (useCustomUnrealProject) ? getUnrealProjectName(resolvedSpaceUnrealProjectVersion.unrealProject, resolvedSpaceUnrealProjectVersion.unrealProjectVersion) : undefined;

  if (useCustomUnrealProject && customProjectName === undefined) {
    console.log("Custom project name does not exist");
    return undefined;
  }

  const projectName = (customProjectName !== undefined) ? customProjectName :
    (configuration.unrealProjectName != undefined) ? configuration.unrealProjectName : "OdysseyArt";
  const unrealProjectId = (resolvedSpaceUnrealProjectVersion?.unrealProjectId == undefined) ? "" : resolvedSpaceUnrealProjectVersion.unrealProjectId;
  const unrealProjectVersionId = (resolvedSpaceUnrealProjectVersion?.unrealProjectVersionId == undefined) ? "" : resolvedSpaceUnrealProjectVersion?.unrealProjectVersionId;
  const buildPluginVersionId = (resolvedSpaceUnrealProjectVersion?.unrealProjectVersion.pluginVersionId == undefined) ? "" : resolvedSpaceUnrealProjectVersion?.unrealProjectVersion.pluginVersionId;

  if (pod.metadata != undefined) {
    pod.metadata.name = gameServerName;
    if (pod.metadata.labels != undefined) {
      pod.metadata.labels.name = gameServerName;
      pod.metadata.labels.organizationId = organizationId;
      pod.metadata.labels.roomId = roomId;
      pod.metadata.labels.spaceId = spaceId;
      pod.metadata.labels.firebaseProjectId = projectId;
      pod.metadata.labels.unrealProjectName = projectName;
      pod.metadata.labels.region = region;
      pod.metadata.labels.unrealProjectId = unrealProjectId;
      pod.metadata.labels.unrealProjectVersionId = unrealProjectVersionId;
      pod.metadata.labels.buildPluginVersionId = buildPluginVersionId;
    }
  }

  if (configuration.workloadClusterProvider == "coreweave") {
    if (
      (pod.spec.affinity != undefined) &&
      (pod.spec.affinity.nodeAffinity != undefined)
    ) {
      // Set preferredDuringSchedulingIgnoredDuringExecution for region
      if (pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution != undefined) {
        pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.map((term) => {
          if (term.matchExpressions != undefined) {
            const regionSelector : V1NodeSelectorRequirement = {
              key: "topology.kubernetes.io/region",
              operator: "In",
              values: [region],
            };
            term.matchExpressions = [regionSelector];
          }
          return term;
        });
      }
    }
  }

  const contentVolumeContainsBoth = configuration.unrealMountContainsClientAndServer != undefined && configuration.unrealMountContainsClientAndServer;

  pod.spec.containers = pod.spec.containers.map((container) => {
    if (container.name == "unreal") {
      if (configuration.workloadClusterProvider == "coreweave" && container.ports != undefined) {
        container.ports = container.ports.map((port) => {
          delete port.hostPort;
          return port;
        });
      }
      if (configuration.workloadClusterProvider == "coreweave") {
        if (configuration.unrealMountContent == true && configuration.unrealMountImageId != undefined && configuration.unrealImageId != undefined) {
          const subPathPrefix = (contentVolumeContainsBoth) ? "LinuxServer/" : "";
          const logMounts : k8s.V1VolumeMount = {
            name: "logs",
            mountPath: "/home/ue4/project/" + projectName + "/Saved/Logs",
            subPath: "logs/unreal",
          };
          const contentMounts : k8s.V1VolumeMount[] = [
            {
              name: "odyssey-content",
              mountPath: "/home/ue4/project",
              subPath: subPathPrefix,
            },
          ];
          const existingMounts = (container.volumeMounts != undefined) ? [...container.volumeMounts, logMounts] : [logMounts];
          container.volumeMounts = existingMounts;
          container.volumeMounts.push(...contentMounts);
        }
      } else {
      // Remove logs mount on non-coreweave clusters
        container.volumeMounts = container.volumeMounts?.flatMap((mount) => (mount.name == "logs") ? [] : [mount]);
      }
    }
    if (container.env != undefined) {
      container.env = container.env.map((envEntry) => {
        if (configuration.firebaseApiKey != undefined) {
          if (envEntry.name == "FIREBASE_API_KEY") {
            envEntry.value = configuration.firebaseApiKey;
          }
        }
        if (envEntry.name == "FIREBASE_PROJECT_ID") {
          envEntry.value = projectId;
        }
        if (envEntry.name == "ORGANIZATION_ID") {
          envEntry.value = organizationId;
        }
        if (levelId != undefined && envEntry.name == "ENVIRONMENT_MAP") {
          envEntry.value = levelId.toString();
        }
        if (envEntry.name == "ROOM_ID") {
          envEntry.value = roomId;
        }
        if (envEntry.name == "SPACE_ID") {
          envEntry.value = spaceId;
        }
        if (envEntry.name == "FIREBASE_EMULATOR") {
          envEntry.value = inEmulatorEnv().toString();
        }
        if (envEntry.name == "ODYSSEY_UE4_VERSION") {
          envEntry.value = configuration.unrealImageId;
        }
        if (envEntry.name == "UNREAL_PROJECT_ID") {
          envEntry.value = unrealProjectId;
        }
        if (envEntry.name == "UNREAL_PROJECT_VERSION_ID") {
          envEntry.value = unrealProjectVersionId;
        }
        if (envEntry.name == "BUILD_PLUGIN_VERSION_ID") {
          envEntry.value = buildPluginVersionId;
        }
        if (envEntry.name == "BASE_CLI_ARGS") {
          if (configuration != undefined && configuration.unrealBaseCliArgs != undefined && configuration.unrealBaseCliArgs != "" && configuration.unrealBaseCliArgs != null) {
            envEntry.value = configuration.unrealBaseCliArgs;
          }
        }
        if (envEntry.name == "OVERRIDE_CLI_ARGS") {
          if (configuration != undefined && configuration.unrealOverrideCliArgs != undefined && configuration.unrealOverrideCliArgs != "" && configuration.unrealOverrideCliArgs != null) {
            envEntry.value = configuration.unrealOverrideCliArgs;
          }
        }
        return envEntry;
      });
    }
    return container;
  }).map((container) => {
    if (configuration != undefined && container.resources != undefined && container.resources.requests != undefined) {
      if (container.name == "firebase-bridge") {
        if (configuration.firebaseBridgeImageId != undefined && configuration.firebaseBridgeImageRepo != undefined) {
          container.image = configuration.firebaseBridgeImageRepo + ":" + configuration.firebaseBridgeImageId;
        }
      }
      if (container.name == "unreal") {
        const formatImage = () => {
          if (configuration.workloadClusterProvider == "coreweave" && configuration.unrealMountContent == true && configuration.unrealMountImageId != undefined && configuration.unrealImageId != undefined) {
            console.debug("Using unrealMountImageId: ", configuration.unrealMountImageId);
            return configuration.unrealMountImageRepo + ":" + configuration.unrealMountImageId;
          } else {
            return configuration.unrealImageRepo + ":" + configuration.unrealImageId;
          }
        };
        container.image = formatImage();
        container.resources.requests.cpu = `${configuration.unrealCpuM}m`;
        container.resources.requests.memory = `${configuration.unrealMemoryMb}Mi`;
        if (container.resources.limits != undefined) {
          container.resources.limits.cpu = `${configuration.unrealCpuM}m`;
          container.resources.limits.memory = `${configuration.unrealMemoryMb}Mi`;
        }
      }
    }
    return container;
  });
  // Remove logs volume on non-coreweave clusters
  if (configuration.workloadClusterProvider != "coreweave" && pod.spec.volumes != undefined) {
    pod.spec.volumes = pod.spec.volumes.flatMap((mount) => (mount.name == "logs") ? [] : [mount]);
  }
  if (pod.spec.volumes != undefined && configuration.workloadClusterProvider == "coreweave") {
    pod.spec.volumes = pod.spec.volumes.map((mount) => {
      if (mount.secret != undefined && mount.secret.secretName != undefined && (mount.name == "bigquery-writer-serviceaccount" || mount.name == "firebase-write-serviceaccount")) {
        mount.secret.secretName = mount.secret.secretName + "-" + projectId;
      }
      if (mount.name == "config-volume") {
        if (mount.configMap != undefined) {
          mount.configMap.name = formatServerConfigMapName(projectId);
        }
      }
      return mount;
    });
  }
  if (pod.spec.volumes != undefined && configuration.workloadClusterProvider == "coreweave" && configuration.unrealMountContent == true && configuration.unrealMountImageId != undefined && configuration.unrealImageId != undefined) {
    console.debug("Using volume mount for content of version: ", configuration.unrealImageId);
    const claimName = (useCustomUnrealProject) ?
      formatUnrealProjectVersionClaimName(resolvedSpaceUnrealProjectVersion.unrealProjectVersionId, region) :
      formatVolumeName(projectName, configuration.unrealImageId, region);
    const volumeClaim : k8s.V1PersistentVolumeClaimVolumeSource = {
      readOnly: false,
      claimName,
    };
    const contentMount : k8s.V1Volume = {
      name: "odyssey-content",
      persistentVolumeClaim: volumeClaim,
    };
    pod.spec.volumes = [contentMount, ...pod.spec.volumes];
  }

  console.log("YAML after");
  console.log(yaml.dump(pod));
  return pod;
}

export function templateService(projectId: string, configuration: ConfigurationOdysseyServer, region: string, organizationId: string, spaceId:string, roomId: string, serviceYaml: string): V1Service {
  const service : V1Service = yaml.loadAll(serviceYaml)[0] as V1Service;

  console.log("YAML before");
  console.log(yaml.dump(service));

  const gameServerName = formatGameServerName(roomId);

  if (service.metadata != undefined) {
    service.metadata.name = gameServerName;
    if (service.metadata.labels != undefined) {
      service.metadata.labels.name = gameServerName;
      service.metadata.labels.organizationId = organizationId;
      service.metadata.labels.spaceId = spaceId;
      service.metadata.labels.roomId = roomId;
      service.metadata.labels.firebaseProjectId = projectId;
      service.metadata.labels.region = region;
    }
  }

  if (
    configuration.workloadClusterProvider == "coreweave" &&
    service.metadata?.annotations != undefined
  ) {
    service.metadata.annotations["metallb.universe.tf/address-pool"] = service.metadata.annotations["metallb.universe.tf/address-pool"].replace("ord1", region.toLowerCase());
  }

  if (service.spec?.selector != undefined) {
    service.spec.selector.name = gameServerName;
  }

  console.log("YAML after");
  console.log(yaml.dump(service));
  return service;
}
