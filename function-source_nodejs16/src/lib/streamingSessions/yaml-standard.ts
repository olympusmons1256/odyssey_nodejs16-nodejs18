import * as yaml from "js-yaml";
import {ClusterProvider, ConfigurationOdysseyClientPod, CoreweaveWorkloadResourceRequest} from "../systemDocTypes";
import {formatClientConfigMapName, formatSessionName, serviceNameBase} from "./shared";
import * as k8s from "@kubernetes/client-node";
import {ExtensionsV1beta1Ingress, V1ConfigMap, V1Ingress, V1IngressServiceBackend, V1NodeSelectorRequirement, V1NodeSelectorTerm, V1Pod, V1PreferredSchedulingTerm} from "@kubernetes/client-node";
import {formatVolumeName, inEmulatorEnv} from "../misc";
import {IceServer} from "../twilio/shared";
import {formatUnrealProjectVersionClaimName, getUnrealProjectName, ResolvedSpaceUnrealProjectVersion} from "../unrealProjects/shared";

function coreweavePreferredTerms(coreweaveWorkloadResourceRequests: CoreweaveWorkloadResourceRequest[]) {
  return coreweaveWorkloadResourceRequests.map((gpuRequest) => {
    const term = new V1PreferredSchedulingTerm();
    term.weight = gpuRequest.weight;
    term.preference = new V1NodeSelectorTerm();
    const requirement = new V1NodeSelectorRequirement();
    requirement.key = "gpu.nvidia.com/class";
    requirement.operator = "In";
    requirement.values = [gpuRequest.gpu];
    term.preference.matchExpressions = [requirement];
    return term;
  });
}

export function templateStreamingSessionConfigMap(projectId: string, organizationId: string, spaceId: string, roomId: string, userId: string, deviceId: string, deploymentId: string, iceServers: IceServer[], configMapCustomYaml: string) {
  const configMap = yaml.loadAll(configMapCustomYaml)[0] as V1ConfigMap;

  if (configMap.metadata == undefined) {
    configMap.metadata = new k8s.V1ObjectMeta();
  }

  const sessionName = formatSessionName(userId, deploymentId);
  configMap.metadata.name = sessionName;

  if (configMap.metadata.labels == undefined) {
    configMap.metadata.labels = {};
  }

  configMap.metadata.labels.name = sessionName;
  configMap.metadata.labels.organizationId = organizationId;
  configMap.metadata.labels.roomId = roomId;
  configMap.metadata.labels.spaceId = spaceId;
  configMap.metadata.labels.userId = userId;
  configMap.metadata.labels.deviceId = deviceId;
  configMap.metadata.labels.deploymentId = deploymentId;
  configMap.metadata.labels.firebaseProjectId = projectId;

  console.debug("ConfigMap Custom YAML before");
  console.debug(yaml.dump(configMap));

  if (configMap.data != undefined) {
    if (configMap.data["config.json"] != undefined) {
      const config = JSON.parse(configMap.data["config.json"]);
      const peerConnectionOptions = JSON.parse(config["peerConnectionOptions"]);
      peerConnectionOptions["iceServers"] = iceServers;
      config["peerConnectionOptions"] = JSON.stringify(peerConnectionOptions);
      configMap.data["config.json"] = JSON.stringify(config);
    }
  }

  console.debug("ConfigMap Custom YAML after");
  console.debug(yaml.dump(configMap));
  return configMap;
}

export function templateStreamingSessionPod(
  projectId: string,
  disableAuth = false,
  workloadClusterProvider: ClusterProvider,
  configuration : ConfigurationOdysseyClientPod,
  organizationId: string,
  spaceId: string,
  roomId: string,
  serverAddress: string | undefined,
  levelId : string | undefined,
  userId: string,
  deviceId: string,
  deploymentId: string,
  customToken: string,
  podYaml: string,
  gpuWeights: CoreweaveWorkloadResourceRequest[],
  region: string,
  resolvedSpaceUnrealProjectVersion: ResolvedSpaceUnrealProjectVersion,
): V1Pod {
  const pod = yaml.loadAll(podYaml)[0] as V1Pod;

  console.log("YAML before");
  console.log(yaml.dump(pod));

  const supportsMultiplayer = resolvedSpaceUnrealProjectVersion?.unrealProjectVersion.bridgeToolkitFileSettings?.supportsMultiplayer ?? false;

  const sessionName = formatSessionName(userId, deploymentId);
  const useCustomUnrealProject = resolvedSpaceUnrealProjectVersion != undefined;
  const customProjectName = (useCustomUnrealProject) ? getUnrealProjectName(resolvedSpaceUnrealProjectVersion.unrealProject, resolvedSpaceUnrealProjectVersion.unrealProjectVersion) : undefined;

  if (useCustomUnrealProject && customProjectName === undefined) {
    throw new Error("Custom project name undefined");
  }

  const projectName = (customProjectName !== undefined) ? customProjectName :
    (configuration.unrealProjectName != undefined) ? configuration.unrealProjectName : "OdysseyArt";
  const unrealProjectId = (resolvedSpaceUnrealProjectVersion?.unrealProjectId == undefined) ? "" : resolvedSpaceUnrealProjectVersion.unrealProjectId;
  const unrealProjectVersionId = (resolvedSpaceUnrealProjectVersion?.unrealProjectVersionId == undefined) ? "" : resolvedSpaceUnrealProjectVersion?.unrealProjectVersionId;
  const buildPluginVersionId = (resolvedSpaceUnrealProjectVersion?.unrealProjectVersion.pluginVersionId == undefined) ? "" : resolvedSpaceUnrealProjectVersion?.unrealProjectVersion.pluginVersionId;

  if (pod.metadata != undefined) {
    pod.metadata.name = sessionName;
    if (pod.metadata.labels != undefined) {
      pod.metadata.labels.name = sessionName;
      pod.metadata.labels.organizationId = organizationId;
      pod.metadata.labels.spaceId = spaceId;
      pod.metadata.labels.roomId = roomId;
      pod.metadata.labels.userId = userId;
      pod.metadata.labels.deviceId = deviceId;
      pod.metadata.labels.deploymentId = deploymentId;
      pod.metadata.labels.firebaseProjectId = projectId;
      pod.metadata.labels.unrealProjectName = projectName;
      pod.metadata.labels.region = region;
      pod.metadata.labels.unrealProjectId = unrealProjectId;
      pod.metadata.labels.unrealProjectVersionId = unrealProjectVersionId;
      pod.metadata.labels.buildPluginVersionId = buildPluginVersionId;
    }
  }

  if (pod.spec == undefined) {
    throw new Error("pod spec undefined");
  }

  if (workloadClusterProvider == undefined) {
    throw new Error("workloadClusterProvider is undefined");
  }

  if (workloadClusterProvider == "gke") {
    delete pod.spec.affinity;
    delete pod.spec.tolerations;
    delete pod.spec.schedulerName;
    if (configuration.unrealGkeAccelerator != undefined) {
      pod.spec.nodeSelector = {
        "cloud.google.com/gke-accelerator": configuration.unrealGkeAccelerator,
      };
    } else {
      pod.spec.nodeSelector = {
        "cloud.google.com/gke-accelerator": "nvidia-tesla-t4",
      };
    }
  }

  if (workloadClusterProvider == "coreweave") {
    if (
      (pod.spec.affinity != undefined) &&
      (pod.spec.affinity.nodeAffinity != undefined)
    ) {
      // Set preferredDuringSchedulingIgnoredDuringExecution with weights from configuration.unrealGpus
      pod.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution = coreweavePreferredTerms(gpuWeights);
      if (pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution != undefined) {
        pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.map((term) => {
          if (term.matchExpressions != undefined) {
            term.matchExpressions.map((matchExpression) => {
              if (matchExpression.key == "gpu.nvidia.com/class") {
                matchExpression.values = gpuWeights.map((v) => v.gpu);
              }
              if (gpuWeights.length > 0 && matchExpression.key == "topology.kubernetes.io/region") {
                matchExpression.values = [region];
              }
              return matchExpression;
            });
            if (gpuWeights.length > 0) {
              const existingTopology = term.matchExpressions.find((matchExpression) => matchExpression.key == "topology.kubernetes.io/region");
              if (existingTopology == undefined) {
                const regionSelector : V1NodeSelectorRequirement = {
                  key: "topology.kubernetes.io/region",
                  operator: "In",
                  values: [region],
                };
                term.matchExpressions.push(regionSelector);
              }
            }
            if (configuration.extraNodeSelectorMatchExpressions != undefined && Object.keys(configuration.extraNodeSelectorMatchExpressions).length > 0) {
              const expressions = Object.entries(configuration.extraNodeSelectorMatchExpressions).map(([key, values]) => {
                const selector : V1NodeSelectorRequirement = {
                  key,
                  operator: "In",
                  values,
                };
                return selector;
              });
              if (term.matchExpressions == undefined) term.matchExpressions = [];
              expressions.forEach((e) => term.matchExpressions?.push(e));
            }
          }
          return term;
        });
      }
    }
  }

  // Remove logs volume on non-coreweave clusters
  if (workloadClusterProvider != "coreweave" && pod.spec.volumes != undefined) {
    pod.spec.volumes = pod.spec.volumes.flatMap((mount) => (mount.name == "logs") ? [] : [mount]);
  }

  const contentVolumeContainsBoth = configuration.unrealMountContainsClientAndServer != undefined && configuration.unrealMountContainsClientAndServer;

  const linuxClientDir = (() => {
    if (configuration.unrealImageId == undefined) return "LinuxNoEditor";
    const match = configuration.unrealImageId.match(/.*-UE([0-9]+).*/);
    const ueMajorVersion = (match != null && match.length > 1) ? match[1] : "5";
    return (ueMajorVersion == "4") ? "LinuxNoEditor" : "Linux";
  })();

  if (pod.spec.volumes != undefined) {
    if (workloadClusterProvider == "coreweave" && configuration.unrealMountContent == true && configuration.unrealMountImageId != undefined && configuration.unrealImageId != undefined) {
      console.debug("Using volume mount for content of version: ", configuration.unrealImageId);
      const claimName = (useCustomUnrealProject) ?
        formatUnrealProjectVersionClaimName(resolvedSpaceUnrealProjectVersion.unrealProjectVersionId, region) :
        formatVolumeName(projectName, configuration.unrealImageId, region);
      const volumeClaim : k8s.V1PersistentVolumeClaimVolumeSource = {
        readOnly: true,
        claimName,
      };
      const contentMount : k8s.V1Volume = {
        name: "odyssey-content",
        persistentVolumeClaim: volumeClaim,
      };
      pod.spec.volumes = [contentMount, ...pod.spec.volumes];
    }
    pod.spec.volumes = pod.spec.volumes.map((volume) => {
      if (volume.secret != undefined && volume.secret.secretName != undefined && (volume.name == "bigquery-writer-serviceaccount" || volume.name == "firebase-write-serviceaccount")) {
        volume.secret.secretName = volume.secret.secretName + "-" + projectId;
      }
      if (volume.name == "odyssey-client-custom") {
        if (volume.configMap != undefined) {
          volume.configMap.name = sessionName;
        }
      }
      if (volume.name == "config-volume") {
        if (volume.configMap != undefined) {
          volume.configMap.name = formatClientConfigMapName(projectId);
        }
      }
      return volume;
    });
  }

  // Set config-volume to pixelstreamingdemo when image repo is set to gcr.io/ngp-odyssey/pixelstreamingdemo
  if (configuration.unrealImageRepo == "gcr.io/ngp-odyssey/pixelstreamingdemo" && pod.spec.volumes != undefined) {
    if (configuration.unrealImageId == "4.25") {
      console.debug("Using pixelstreamingdemo4.25 config-volume");
      pod.spec.volumes = pod.spec.volumes.map((mount) => {
        if (mount.name == "config-volume" && mount.configMap != undefined) {
          mount.configMap.name = "pixelstreamingdemo4.25";
        }
        return mount;
      });
    } else {
      console.debug("Using pixelstreamingdemo config-volume");
      pod.spec.volumes = pod.spec.volumes.map((mount) => {
        if (mount.name == "config-volume" && mount.configMap != undefined) {
          mount.configMap.name = "pixelstreamingdemo";
        }
        return mount;
      });
    }
  }

  pod.spec.containers = pod.spec.containers.map((container) => {
    if (container.name == "signallingproxy") {
      if (container.env) {
        container.env.map((envEntry) => {
          if (disableAuth && envEntry.name == "DISABLE_AUTH") {
            envEntry.value = "true";
          }
          return envEntry;
        });
      }
    }
    if (container.name == "unreal") {
      if (configuration.unrealMountContent == true && configuration.unrealMountImageId != undefined && configuration.unrealImageId != undefined) {
        const subPathPrefix = (contentVolumeContainsBoth) ? `${linuxClientDir}/` : "";
        const logMount : k8s.V1VolumeMount = {
          name: "logs",
          mountPath: "/home/ue4/project/" + projectName + "/Saved/Logs",
          subPath: "logs/unreal",
        };
        const odysseyArtContentMounts : k8s.V1VolumeMount[] = [
          {
            name: "odyssey-content",
            mountPath: "/home/ue4/project/" + projectName + "/Content/Data",
            subPath: subPathPrefix + projectName + "/Content/Data",
          },
          {
            name: "odyssey-content",
            mountPath: "/home/ue4/project/" + projectName + "/Content/Movies",
            subPath: subPathPrefix + projectName + "/Content/Movies",
          },
          {
            name: "odyssey-content",
            mountPath: "/home/ue4/project/" + projectName + "/Content/" + projectName,
            subPath: subPathPrefix + projectName + "/Content/" + projectName,
          },
        ];
        const contentMounts : k8s.V1VolumeMount[] = [
          {
            name: "odyssey-content",
            mountPath: "/home/ue4/project/" + projectName + "/Content",
            subPath: subPathPrefix + projectName + "/Content",
          },
          {
            name: "odyssey-content",
            mountPath: "/home/ue4/project/" + projectName + ".sh",
            subPath: subPathPrefix + projectName + ".sh",
          },
          {
            name: "odyssey-content",
            mountPath: "/home/ue4/project/" + projectName + "/Binaries/",
            subPath: subPathPrefix + projectName + "/Binaries/",
          },
          {
            name: "odyssey-content",
            mountPath: "/home/ue4/project/Engine",
            subPath: subPathPrefix + "Engine/",
          },
        ];
        const thirdPersonTemplateContentMounts : k8s.V1VolumeMount[] = [
          {
            name: "odyssey-content",
            mountPath: "/home/ue4/project",
            subPath: subPathPrefix,
          },
        ];
        container.volumeMounts = (container.volumeMounts != undefined) ? container.volumeMounts : [];
        if (projectName == "ThirdPersonTemplate") {
          container.volumeMounts.push(...thirdPersonTemplateContentMounts);
        } else {
          container.volumeMounts.push(logMount);
          if (!useCustomUnrealProject) container.volumeMounts.push(...odysseyArtContentMounts);
          container.volumeMounts.push(...contentMounts);
        }
      }
      if (container.env) {
        container.env.map((envEntry) => {
          if (envEntry.name == "BASE_CLI_ARGS") {
            if (configuration != undefined && configuration.unrealBaseCliArgs != undefined && configuration.unrealBaseCliArgs != "" && configuration.unrealBaseCliArgs != null) {
              envEntry.value = configuration.unrealBaseCliArgs;
            }
          }
          if (envEntry.name == "OVERRIDE_CLI_ARGS") {
            if (configuration != undefined && configuration.unrealOverrideCliArgs != undefined && configuration.unrealOverrideCliArgs != "" && configuration.unrealOverrideCliArgs != null) {
              envEntry.value = configuration.unrealOverrideCliArgs;
              envEntry.value = (disableAuth) ? envEntry.value + " -IgnoreFirebase" : envEntry.value;
            }
          }
          return envEntry;
        });
      }
    }
    if (workloadClusterProvider != "coreweave") {
      // Remove logs mount on non-coreweave clusters
      container.volumeMounts = container.volumeMounts?.flatMap((mount) => (mount.name == "logs") ? [] : [mount]);
    }
    if (container.name == "unreal" || container.name == "signallingproxy" || container.name == "fluentd" || container.name == "firebase-bridge") {
      if (container.env) {
        container.env.map((envEntry) => {
          if (configuration.firebaseApiKey != undefined) {
            if (envEntry.name == "FIREBASE_API_KEY") {
              envEntry.value = configuration.firebaseApiKey;
            }
          }
          if (envEntry.name == "FIREBASE_PROJECT_ID") {
            envEntry.value = projectId;
          }
          if (levelId != undefined && envEntry.name == "ENVIRONMENT_MAP") {
            envEntry.value = levelId.toString();
          }
          if (envEntry.name == "ORGANIZATION_ID") {
            envEntry.value = organizationId;
          }
          if (envEntry.name == "DEPLOYMENT_ID") {
            envEntry.value = deploymentId;
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
          if (envEntry.name == "SERVER_ADDRESS" && disableAuth && serverAddress != undefined) {
            envEntry.value = serverAddress;
          }
          if (envEntry.name == "USER_ID") {
            envEntry.value = userId;
          }
          if (envEntry.name == "USERS_COLLECTION_PATH") {
            if (configuration.usersCollectionPath == "root") {
              envEntry.value = "/users";
            }
          }
          if (envEntry.name == "DEVICE_ID") {
            envEntry.value = deviceId;
          }
          if (envEntry.name == "CUSTOM_TOKEN") {
            envEntry.value = customToken;
          }
          return envEntry;
        });
      }
    }
    return container;
  }).map((container) => {
    if (configuration != undefined) {
      if (container.name == "signallingwebserver") {
        if (configuration.signallingWebServerImageRepo != undefined && configuration.signallingWebServerImageId != undefined) {
          container.image = `${configuration.signallingWebServerImageRepo}:${configuration.signallingWebServerImageId}`;
        }
        return container;
      }
      if (container.name == "firebase-bridge") {
        if (configuration.firebaseBridgeImageId != undefined && configuration.firebaseBridgeImageRepo != undefined && container.resources != undefined && container.resources.requests != undefined) {
          container.image = configuration.firebaseBridgeImageRepo + ":" + configuration.firebaseBridgeImageId;
        }
      }
      if (container.name == "unreal") {
        // Set unreal image repo:tag
        const formatImage = () => {
          if (workloadClusterProvider == "coreweave" && configuration.unrealMountContent == true && configuration.unrealMountImageId != undefined && configuration.unrealImageId != undefined) {
            console.debug("Using unrealMountImageId: ", configuration.unrealMountImageId);
            return configuration.unrealMountImageRepo + ":" + configuration.unrealMountImageId;
          } else {
            return configuration.unrealImageRepo + ":" + configuration.unrealImageId;
          }
        };
        container.image = formatImage();
        if (container.resources != undefined && container.resources.requests != undefined) {
          container.resources.requests.cpu = `${configuration.unrealCpuM}m`;
          container.resources.requests.memory = `${configuration.unrealMemoryMb}Mi`;
        }
        if (container.resources != undefined && container.resources.limits != undefined) {
          container.resources.limits.cpu = `${configuration.unrealCpuM}m`;
          container.resources.limits.memory = `${configuration.unrealMemoryMb}Mi`;
        }
      }
    }
    return container;
  }).flatMap((container) => {
    // HACK: Don't run firebase-bridge container if in multiplayer mode
    if (supportsMultiplayer == true && container.name == "firebase-bridge") {
      console.debug("Multiplayer mode, disabling firebase-bridge container");
      return [];
    }
    return [container];
  });
  console.log("YAML after");
  console.log(yaml.dump(pod));
  return pod;
}

export function templateStreamingSessionService(projectId: string, organizationId: string, spaceId: string, roomId: string, userId: string, deviceId: string, deploymentId: string, serviceYaml: string): any {
  const service : any = yaml.loadAll(serviceYaml)[0];

  console.log("YAML before");
  console.log(yaml.dump(service));

  const sessionName = formatSessionName(userId, deploymentId);

  if (service.metadata != undefined) {
    service.metadata.name = sessionName;
    if (service.metadata.labels != undefined) {
      service.metadata.labels.name = sessionName;
      service.metadata.labels.organizationId = organizationId;
      service.metadata.labels.spaceId = spaceId;
      service.metadata.labels.roomId = roomId;
      service.metadata.labels.userId = userId;
      service.metadata.labels.deviceId = deviceId;
      service.metadata.labels.deploymentId = deploymentId;
      service.metadata.labels.firebaseProjectId = projectId;
    }
  }

  service.spec.selector.name = sessionName;

  console.log("YAML after");
  console.log(yaml.dump(service));
  return service;
}


function setIngressMetadata(projectId: string, ingress: any, sessionName : string, organizationId: string, spaceId: string, roomId: string, userId: string, deviceId: string, deploymentId: string, region: string) {
  if (ingress.metadata != undefined) {
    ingress.metadata.name = sessionName;
    if (ingress.metadata.labels != undefined) {
      ingress.metadata.labels.name = sessionName;
      ingress.metadata.labels.organizationId = organizationId;
      ingress.metadata.labels.roomId = roomId;
      ingress.metadata.labels.spaceId = spaceId;
      ingress.metadata.labels.userId = userId;
      ingress.metadata.labels.deviceId = deviceId;
      ingress.metadata.labels.deploymentId = deploymentId;
      ingress.metadata.labels.firebaseProjectId = projectId;
      ingress.metadata.labels.region = region;
    }
  }
  return ingress;
}

export function templateStreamingSessionIngressGke(projectId: string, organizationId: string, spaceId: string, roomId: string, userId: string, deviceId: string, deploymentId: string, ingressYaml: string): ExtensionsV1beta1Ingress {
  const ingress = yaml.loadAll(ingressYaml)[0] as V1Ingress;

  console.log("YAML before");
  console.log(yaml.dump(ingress));

  const sessionName = formatSessionName(userId, deploymentId);
  setIngressMetadata(projectId, ingress, sessionName, organizationId, spaceId, roomId, userId, deviceId, deploymentId, "");

  if (ingress.spec == undefined) {
    throw new Error("ingress spec is undefined");
  }

  if (ingress.spec.tls == undefined) {
    throw new Error("ingress spec tls is undefined");
  }

  if (ingress.spec.rules == undefined) {
    throw new Error("ingress spec rules is undefined");
  }

  if (projectId == "ngp-odyssey-prod") {
    ingress.spec.tls.map((entry) => {
      if (entry.secretName != undefined) {
        entry.secretName = entry.secretName.replace("odyssey-client-dev", "odyssey-client");
      }
      if (entry.hosts != undefined) {
        entry.hosts = entry.hosts.map((host) => {
          return host.replace("odyssey-client-dev", "odyssey-client");
        });
      }
      return entry;
    });
  }

  ingress.spec.rules.map((rule) => {
    if (projectId == "ngp-odyssey-prod") {
      rule.host = rule.host?.replace("odyssey-client-dev", "odyssey-client");
    }
    if (rule.http != undefined) {
      rule.http.paths.map((path) => {
        const backend : V1IngressServiceBackend = {
          name: sessionName,
          port: {number: 80},
        };
        path.backend.service = backend;
        path.path = path.path?.replace("session-id", sessionName);
        return path;
      });
    }
    return rule;
  });

  console.log("YAML after");
  console.log(yaml.dump(ingress));
  return ingress;
}

export function templateStreamingSessionIngress(projectId: string, namespace: string, region: string, organizationId: string, spaceId: string, roomId: string, userId: string, deviceId: string, deploymentId: string, ingressYaml: string): ExtensionsV1beta1Ingress {
  const ingress = yaml.loadAll(ingressYaml)[0] as ExtensionsV1beta1Ingress;

  console.log("YAML before");
  console.log(yaml.dump(ingress));

  const sessionName = formatSessionName(userId, deploymentId);

  if (ingress.metadata == undefined) {
    throw Error("ingress metadata is undefined");
  }

  setIngressMetadata(projectId, ingress, sessionName, organizationId, spaceId, roomId, userId, deviceId, deploymentId, region);

  ingress.metadata.namespace = namespace;

  if (ingress.spec == undefined) {
    throw Error("ingress spec is undefined");
  }

  if (ingress.spec.tls == undefined) {
    throw Error("ingress spec tls is undefined");
  }

  if (ingress.spec.rules == undefined) {
    throw Error("ingress spec rules is undefined");
  }

  ingress.spec.tls.map((entry) => {
    if (entry.secretName != undefined) {
      entry.secretName = entry.secretName
        .replace(serviceNameBase, sessionName)
        .replace("ewr1", region)
        .replace("tenant-newgame", namespace)
        .toLowerCase();
    }
    if (entry.hosts != undefined) {
      entry.hosts = entry.hosts.map((host) => {
        return host
          .replace(serviceNameBase, sessionName)
          .replace("tenant-newgame", namespace)
          .replace("ewr1", region)
          .toLowerCase();
      });
    }
    return entry;
  });

  ingress.spec.rules.map((rule) => {
    if (rule.host != undefined) {
      rule.host = rule.host.replace(serviceNameBase, sessionName);
      rule.host = rule.host
        .replace("ewr1", region)
        .replace("tenant-newgame", namespace)
        .toLowerCase();
    }
    if (rule.http != undefined) {
      rule.http.paths.map((path) => {
        path.backend.serviceName = sessionName;
        path.backend.servicePort = (80 as any);
        return path;
      });
    }
    return rule;
  });

  console.log("YAML after");
  console.log(yaml.dump(ingress));
  return ingress;
}

export function templateImagePullDaemonset(daemonsetYaml: string, configuration: ConfigurationOdysseyClientPod): k8s.V1DaemonSet {
  const daemonset = yaml.loadAll(daemonsetYaml)[0] as k8s.V1DaemonSet;

  console.log("YAML before");
  console.log(yaml.dump(daemonset));


  if (configuration.unrealImageRepo === undefined) {
    throw new Error("configuration.unrealImageRepo undefined");
  }

  if (configuration.unrealImageId === undefined) {
    throw new Error("configuration.unrealImageId undefined");
  }

  if (daemonset.metadata === undefined) {
    throw new Error("Daemonset metadata undefined");
  }

  if (daemonset.spec === undefined) {
    throw new Error("Daemonset spec undefined");
  }

  if (daemonset.spec.template.spec == undefined) {
    throw new Error("Daemonset spec template spec is undefined");
  }

  if (daemonset.spec.template.metadata === undefined) {
    throw new Error("Daemonset spec template metadata undefined");
  }

  if (daemonset.spec.template.metadata.labels === undefined) {
    throw new Error("Daemonset spec template metadata labels undefined");
  }

  daemonset.spec.template.metadata.labels.imageId = configuration.unrealImageId;

  daemonset.spec?.template.spec?.containers.map((container) => {
    if (container.name == "unreal") {
      container.image = configuration.unrealImageRepo + ":" + configuration.unrealImageId;
    }
    return container;
  });

  console.log("YAML after");
  console.log(yaml.dump(daemonset));
  return daemonset;
}
