"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateImagePullDaemonset = exports.templateStreamingSessionIngress = exports.templateStreamingSessionIngressGke = exports.templateStreamingSessionService = exports.templateStreamingSessionPod = exports.templateStreamingSessionConfigMap = void 0;
const yaml = __importStar(require("js-yaml"));
const shared_1 = require("./shared");
const client_node_1 = require("@kubernetes/client-node");
const misc_1 = require("../misc");
const shared_2 = require("../unrealProjects/shared");
function coreweavePreferredTerms(coreweaveWorkloadResourceRequests) {
    return coreweaveWorkloadResourceRequests.map((gpuRequest) => {
        const term = new client_node_1.V1PreferredSchedulingTerm();
        term.weight = gpuRequest.weight;
        term.preference = new client_node_1.V1NodeSelectorTerm();
        const requirement = new client_node_1.V1NodeSelectorRequirement();
        requirement.key = "gpu.nvidia.com/class";
        requirement.operator = "In";
        requirement.values = [gpuRequest.gpu];
        term.preference.matchExpressions = [requirement];
        return term;
    });
}
function templateStreamingSessionConfigMap(projectId, organizationId, spaceId, roomId, userId, deviceId, deploymentId, iceServers, configMapCustomYaml) {
    const configMap = yaml.loadAll(configMapCustomYaml)[0];
    if (configMap.metadata == undefined) {
        configMap.metadata = new Object();
    }
    const sessionName = (0, shared_1.formatSessionName)(userId, deploymentId);
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
exports.templateStreamingSessionConfigMap = templateStreamingSessionConfigMap;
function templateStreamingSessionPod(projectId, disableAuth = false, workloadClusterProvider, configuration, organizationId, spaceId, roomId, serverAddress, levelId, userId, deviceId, deploymentId, customToken, podYaml, gpuWeights, region, resolvedSpaceUnrealProjectVersion) {
    var _a, _b;
    const pod = yaml.loadAll(podYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(pod));
    const supportsMultiplayer = (_b = (_a = resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersion.bridgeToolkitFileSettings) === null || _a === void 0 ? void 0 : _a.supportsMultiplayer) !== null && _b !== void 0 ? _b : false;
    const sessionName = (0, shared_1.formatSessionName)(userId, deploymentId);
    const useCustomUnrealProject = resolvedSpaceUnrealProjectVersion != undefined;
    const customProjectName = (useCustomUnrealProject) ? (0, shared_2.getUnrealProjectName)(resolvedSpaceUnrealProjectVersion.unrealProject, resolvedSpaceUnrealProjectVersion.unrealProjectVersion) : undefined;
    if (useCustomUnrealProject && customProjectName === undefined) {
        throw new Error("Custom project name undefined");
    }
    const projectName = (customProjectName !== undefined) ? customProjectName :
        (configuration.unrealProjectName != undefined) ? configuration.unrealProjectName : "OdysseyArt";
    const unrealProjectId = ((resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectId) == undefined) ? "" : resolvedSpaceUnrealProjectVersion.unrealProjectId;
    const unrealProjectVersionId = ((resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersionId) == undefined) ? "" : resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersionId;
    const buildPluginVersionId = ((resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersion.pluginVersionId) == undefined) ? "" : resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersion.pluginVersionId;
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
        }
        else {
            pod.spec.nodeSelector = {
                "cloud.google.com/gke-accelerator": "nvidia-tesla-t4",
            };
        }
    }
    if (workloadClusterProvider == "coreweave") {
        if ((pod.spec.affinity != undefined) &&
            (pod.spec.affinity.nodeAffinity != undefined)) {
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
                                const regionSelector = {
                                    key: "topology.kubernetes.io/region",
                                    operator: "In",
                                    values: [region],
                                };
                                term.matchExpressions.push(regionSelector);
                            }
                        }
                        if (configuration.extraNodeSelectorMatchExpressions != undefined && Object.keys(configuration.extraNodeSelectorMatchExpressions).length > 0) {
                            const expressions = Object.entries(configuration.extraNodeSelectorMatchExpressions).map(([key, values]) => {
                                const selector = {
                                    key,
                                    operator: "In",
                                    values,
                                };
                                return selector;
                            });
                            if (term.matchExpressions == undefined)
                                term.matchExpressions = [];
                            expressions.forEach((e) => { var _a; return (_a = term.matchExpressions) === null || _a === void 0 ? void 0 : _a.push(e); });
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
        if (configuration.unrealImageId == undefined)
            return "LinuxNoEditor";
        const match = configuration.unrealImageId.match(/.*-UE([0-9]+).*/);
        const ueMajorVersion = (match != null && match.length > 1) ? match[1] : "5";
        return (ueMajorVersion == "4") ? "LinuxNoEditor" : "Linux";
    })();
    if (pod.spec.volumes != undefined) {
        if (workloadClusterProvider == "coreweave" && configuration.unrealMountContent == true && configuration.unrealMountImageId != undefined && configuration.unrealImageId != undefined) {
            console.debug("Using volume mount for content of version: ", configuration.unrealImageId);
            const claimName = (useCustomUnrealProject) ?
                (0, shared_2.formatUnrealProjectVersionClaimName)(resolvedSpaceUnrealProjectVersion.unrealProjectVersionId, region) :
                (0, misc_1.formatVolumeName)(projectName, configuration.unrealImageId, region);
            const volumeClaim = {
                readOnly: true,
                claimName,
            };
            const contentMount = {
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
                    volume.configMap.name = (0, shared_1.formatClientConfigMapName)(projectId);
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
        }
        else {
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
        var _a;
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
                const logMount = {
                    name: "logs",
                    mountPath: "/home/ue4/project/" + projectName + "/Saved/Logs",
                    subPath: "logs/unreal",
                };
                const odysseyArtContentMounts = [
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
                const contentMounts = [
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
                const thirdPersonTemplateContentMounts = [
                    {
                        name: "odyssey-content",
                        mountPath: "/home/ue4/project",
                        subPath: subPathPrefix,
                    },
                ];
                container.volumeMounts = (container.volumeMounts != undefined) ? container.volumeMounts : [];
                if (projectName == "ThirdPersonTemplate") {
                    container.volumeMounts.push(...thirdPersonTemplateContentMounts);
                }
                else {
                    container.volumeMounts.push(logMount);
                    if (!useCustomUnrealProject)
                        container.volumeMounts.push(...odysseyArtContentMounts);
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
            container.volumeMounts = (_a = container.volumeMounts) === null || _a === void 0 ? void 0 : _a.flatMap((mount) => (mount.name == "logs") ? [] : [mount]);
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
                        envEntry.value = (0, misc_1.inEmulatorEnv)().toString();
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
                    }
                    else {
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
exports.templateStreamingSessionPod = templateStreamingSessionPod;
function templateStreamingSessionService(projectId, organizationId, spaceId, roomId, userId, deviceId, deploymentId, serviceYaml) {
    const service = yaml.loadAll(serviceYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(service));
    const sessionName = (0, shared_1.formatSessionName)(userId, deploymentId);
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
exports.templateStreamingSessionService = templateStreamingSessionService;
function setIngressMetadata(projectId, ingress, sessionName, organizationId, spaceId, roomId, userId, deviceId, deploymentId, region) {
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
function templateStreamingSessionIngressGke(projectId, organizationId, spaceId, roomId, userId, deviceId, deploymentId, ingressYaml) {
    const ingress = yaml.loadAll(ingressYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(ingress));
    const sessionName = (0, shared_1.formatSessionName)(userId, deploymentId);
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
        var _a;
        if (projectId == "ngp-odyssey-prod") {
            rule.host = (_a = rule.host) === null || _a === void 0 ? void 0 : _a.replace("odyssey-client-dev", "odyssey-client");
        }
        if (rule.http != undefined) {
            rule.http.paths.map((path) => {
                if (path.path) {
                    path.path = path.path.replace("session-id", sessionName);
                }
                const backend = {
                    service: {
                        name: sessionName,
                        port: {
                            number: 80
                        }
                    }
                };
                path.backend = backend;
                return path;
            });
        }
        return rule;
    });
    console.log("YAML after");
    console.log(yaml.dump(ingress));
    return ingress;
}
exports.templateStreamingSessionIngressGke = templateStreamingSessionIngressGke;
function templateStreamingSessionIngress(projectId, namespace, region, organizationId, spaceId, roomId, userId, deviceId, deploymentId, ingressYaml) {
    const ingress = yaml.loadAll(ingressYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(ingress));
    const sessionName = (0, shared_1.formatSessionName)(userId, deploymentId);
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
                .replace(shared_1.serviceNameBase, sessionName)
                .replace("ewr1", region)
                .replace("tenant-newgame", namespace)
                .toLowerCase();
        }
        if (entry.hosts != undefined) {
            entry.hosts = entry.hosts.map((host) => {
                return host
                    .replace(shared_1.serviceNameBase, sessionName)
                    .replace("tenant-newgame", namespace)
                    .replace("ewr1", region)
                    .toLowerCase();
            });
        }
        return entry;
    });
    ingress.spec.rules.map((rule) => {
        if (rule.host != undefined) {
            rule.host = rule.host.replace(shared_1.serviceNameBase, sessionName);
            rule.host = rule.host
                .replace("ewr1", region)
                .replace("tenant-newgame", namespace)
                .toLowerCase();
        }
        if (rule.http != undefined) {
            rule.http.paths.map((path) => {
                const backend = {
                    service: {
                        name: sessionName,
                        port: {
                            number: 80
                        }
                    }
                };
                path.backend = backend;
                return path;
            });
        }
        return rule;
    });
    console.log("YAML after");
    console.log(yaml.dump(ingress));
    return ingress;
}
exports.templateStreamingSessionIngress = templateStreamingSessionIngress;
function templateImagePullDaemonset(daemonsetYaml, configuration) {
    var _a, _b;
    const daemonset = yaml.loadAll(daemonsetYaml)[0];
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
    (_b = (_a = daemonset.spec) === null || _a === void 0 ? void 0 : _a.template.spec) === null || _b === void 0 ? void 0 : _b.containers.map((container) => {
        if (container.name == "unreal") {
            container.image = configuration.unrealImageRepo + ":" + configuration.unrealImageId;
        }
        return container;
    });
    console.log("YAML after");
    console.log(yaml.dump(daemonset));
    return daemonset;
}
exports.templateImagePullDaemonset = templateImagePullDaemonset;
//# sourceMappingURL=yaml-standard.js.map