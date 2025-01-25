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
exports.templateService = exports.templatePod = void 0;
const yaml = __importStar(require("js-yaml"));
const misc_1 = require("../misc");
const shared_1 = require("./shared");
const shared_2 = require("../unrealProjects/shared");
function templatePod(projectId, configuration, region, organizationId, spaceId, roomId, levelId, resolvedSpaceUnrealProjectVersion, gameServerYaml) {
    const pod = yaml.loadAll(gameServerYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(pod));
    if (pod.spec == undefined) {
        console.log("Pod spec is undefined");
        return undefined;
    }
    const gameServerName = (0, shared_1.formatGameServerName)(roomId);
    const useCustomUnrealProject = resolvedSpaceUnrealProjectVersion != undefined;
    const customProjectName = (useCustomUnrealProject) ? (0, shared_2.getUnrealProjectName)(resolvedSpaceUnrealProjectVersion.unrealProject, resolvedSpaceUnrealProjectVersion.unrealProjectVersion) : undefined;
    if (useCustomUnrealProject && customProjectName === undefined) {
        console.log("Custom project name does not exist");
        return undefined;
    }
    const projectName = (customProjectName !== undefined) ? customProjectName :
        (configuration.unrealProjectName != undefined) ? configuration.unrealProjectName : "OdysseyArt";
    const unrealProjectId = ((resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectId) == undefined) ? "" : resolvedSpaceUnrealProjectVersion.unrealProjectId;
    const unrealProjectVersionId = ((resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersionId) == undefined) ? "" : resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersionId;
    const buildPluginVersionId = ((resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersion.pluginVersionId) == undefined) ? "" : resolvedSpaceUnrealProjectVersion === null || resolvedSpaceUnrealProjectVersion === void 0 ? void 0 : resolvedSpaceUnrealProjectVersion.unrealProjectVersion.pluginVersionId;
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
        if ((pod.spec.affinity != undefined) &&
            (pod.spec.affinity.nodeAffinity != undefined)) {
            // Set preferredDuringSchedulingIgnoredDuringExecution for region
            if (pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution != undefined) {
                pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.map((term) => {
                    if (term.matchExpressions != undefined) {
                        const regionSelector = {
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
        var _a;
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
                    const logMounts = {
                        name: "logs",
                        mountPath: "/home/ue4/project/" + projectName + "/Saved/Logs",
                        subPath: "logs/unreal",
                    };
                    const contentMounts = [
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
            }
            else {
                // Remove logs mount on non-coreweave clusters
                container.volumeMounts = (_a = container.volumeMounts) === null || _a === void 0 ? void 0 : _a.flatMap((mount) => (mount.name == "logs") ? [] : [mount]);
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
                    }
                    else {
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
                    mount.configMap.name = (0, shared_1.formatServerConfigMapName)(projectId);
                }
            }
            return mount;
        });
    }
    if (pod.spec.volumes != undefined && configuration.workloadClusterProvider == "coreweave" && configuration.unrealMountContent == true && configuration.unrealMountImageId != undefined && configuration.unrealImageId != undefined) {
        console.debug("Using volume mount for content of version: ", configuration.unrealImageId);
        const claimName = (useCustomUnrealProject) ?
            (0, shared_2.formatUnrealProjectVersionClaimName)(resolvedSpaceUnrealProjectVersion.unrealProjectVersionId, region) :
            (0, misc_1.formatVolumeName)(projectName, configuration.unrealImageId, region);
        const volumeClaim = {
            readOnly: false,
            claimName,
        };
        const contentMount = {
            name: "odyssey-content",
            persistentVolumeClaim: volumeClaim,
        };
        pod.spec.volumes = [contentMount, ...pod.spec.volumes];
    }
    console.log("YAML after");
    console.log(yaml.dump(pod));
    return pod;
}
exports.templatePod = templatePod;
function templateService(projectId, configuration, region, organizationId, spaceId, roomId, serviceYaml) {
    var _a, _b;
    const service = yaml.loadAll(serviceYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(service));
    const gameServerName = (0, shared_1.formatGameServerName)(roomId);
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
    if (configuration.workloadClusterProvider == "coreweave" &&
        ((_a = service.metadata) === null || _a === void 0 ? void 0 : _a.annotations) != undefined) {
        service.metadata.annotations["metallb.universe.tf/address-pool"] = service.metadata.annotations["metallb.universe.tf/address-pool"].replace("ord1", region.toLowerCase());
    }
    if (((_b = service.spec) === null || _b === void 0 ? void 0 : _b.selector) != undefined) {
        service.spec.selector.name = gameServerName;
    }
    console.log("YAML after");
    console.log(yaml.dump(service));
    return service;
}
exports.templateService = templateService;
//# sourceMappingURL=yaml-standard.js.map