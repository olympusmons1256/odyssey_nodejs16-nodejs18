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
exports.templateUnrealProjectVersionPvc = exports.templateUnrealProjectVersionVolumeCopyPod = exports.templateUnrealProjectVersionPackageValidatorPod = exports.templateUnrealProjectVersionBuildPod = void 0;
const yaml = __importStar(require("js-yaml"));
const shared_1 = require("./shared");
function templateUnrealProjectVersionBuildPod(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, unrealPluginVersionId, unrealPluginVersion, region, builderImageRepo, builderImageId, podYaml) {
    const pod = yaml.loadAll(podYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(pod));
    if (pod.spec == undefined) {
        console.error("pod.spec is undefined");
        return undefined;
    }
    if (pod.metadata == undefined) {
        console.error("pod.metadata is undefined");
        return undefined;
    }
    const podName = (0, shared_1.formatUnrealProjectVersionBuildPodName)(unrealProjectVersionId);
    const sharedDdcClaimName = (0, shared_1.formatSharedDdcClaimName)(region);
    const pluginVersionClaimName = (0, shared_1.formatPluginVersionClaimName)(unrealPluginVersionId, region);
    const projectName = (0, shared_1.getUnrealProjectName)(unrealProject, unrealProjectVersion);
    if (projectName === undefined) {
        console.warn("Project name does not exist");
    }
    pod.metadata.name = podName;
    if (pod.metadata.labels != undefined) {
        pod.metadata.labels.name = podName;
        pod.metadata.labels.organizationId = unrealProject.organizationId;
        pod.metadata.labels.firebaseProjectId = firebaseProjectId;
        if (projectName !== undefined)
            pod.metadata.labels.unrealProjectName = projectName;
        pod.metadata.labels.unrealProjectId = unrealProjectId;
        pod.metadata.labels.unrealProjectVersionId = unrealProjectVersionId;
        pod.metadata.labels.unrealPluginVersionId = unrealPluginVersionId;
        pod.metadata.labels.target = unrealProjectVersion.target;
        pod.metadata.labels.region = region;
    }
    if ((pod.spec == undefined) ||
        (pod.spec.affinity == undefined) ||
        (pod.spec.affinity.nodeAffinity == undefined) ||
        (pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution == undefined)) {
        console.error("pod.spec.affinity.nodeAffinity (or a parent object) is undefined");
        return undefined;
    }
    pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.map((term) => {
        if (term.matchExpressions != undefined) {
            term.matchExpressions.map((matchExpression) => {
                if (matchExpression.key == "topology.kubernetes.io/region") {
                    matchExpression.values = [region];
                }
                return matchExpression;
            });
        }
        return term;
    });
    if ((pod.spec.volumes == undefined) ||
        (pod.spec.volumes.length < 1)) {
        console.error("pod.spec.volumes is undefined or empty");
        return undefined;
    }
    pod.spec.volumes.map((volume) => {
        if (volume.name == "shared-ddc") {
            if (volume.persistentVolumeClaim != undefined) {
                volume.persistentVolumeClaim.readOnly = false;
                volume.persistentVolumeClaim.claimName = sharedDdcClaimName;
            }
        }
        if (volume.name == "plugin-version") {
            if (volume.persistentVolumeClaim != undefined) {
                volume.persistentVolumeClaim.readOnly = true;
                volume.persistentVolumeClaim.claimName = pluginVersionClaimName;
            }
        }
        if (volume.name == "unreal-project-version-builder-configmap") {
            if (volume.configMap != undefined) {
                volume.configMap.name = (0, shared_1.formatBuilderConfigMapName)(firebaseProjectId);
            }
        }
        return volume;
    });
    pod.spec.containers.map((container) => {
        if (container.name == "unreal-project-version-builder") {
            if (container.image != undefined) {
                if (builderImageRepo != undefined && builderImageId != undefined) {
                    const image = builderImageRepo + ":" + builderImageId;
                    console.debug(`Using builder container image from configuration: ${image}`);
                    container.image = image;
                }
                else {
                    container.image = container.image.replace(/:.*/, ":" + unrealPluginVersion.unrealEngineVersion);
                }
            }
            if (unrealProjectVersion.sleepLoopOnFailure == true && container.command != undefined)
                container.command.push("|| sleep infinity");
            if (container.env) {
                container.env.map((envEntry) => {
                    if (envEntry.name == "FIREBASE_PROJECT_ID") {
                        envEntry.value = firebaseProjectId;
                    }
                    if (envEntry.name == "ORGANIZATION_ID") {
                        envEntry.value = unrealProject.organizationId;
                    }
                    if (projectName != undefined && envEntry.name == "UNREAL_PROJECT_NAME") {
                        envEntry.value = projectName;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_ID") {
                        envEntry.value = unrealProjectId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_ID") {
                        envEntry.value = unrealProjectVersionId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_UPLOAD_URL") {
                        envEntry.value = unrealProjectVersion.uploadUrl;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_UPLOAD_SHA256SUM") {
                        envEntry.value = unrealProjectVersion.uploadSha256Sum;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_DOWNLOAD_URL") {
                        envEntry.value = unrealProjectVersion.downloadUrl;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_ID") {
                        envEntry.value = unrealPluginVersionId;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_TOOLKIT_URL") {
                        envEntry.value = unrealPluginVersion.toolkitUrl;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_TOOLKIT_SHA256SUM") {
                        envEntry.value = unrealPluginVersion.toolkitSha256Sum;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_URL") {
                        envEntry.value = unrealPluginVersion.url;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_SHA256SUM") {
                        envEntry.value = unrealPluginVersion.sha256Sum;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_TOOLKIT_URL") {
                        envEntry.value = unrealPluginVersion.toolkitUrl;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_TOOLKIT_SHA256SUM") {
                        envEntry.value = unrealPluginVersion.toolkitSha256Sum;
                    }
                    if (envEntry.name == "UE_VERSION" && unrealPluginVersion.unrealEngineVersion != undefined) {
                        envEntry.value = unrealPluginVersion.unrealEngineVersion;
                    }
                    if (envEntry.name == "TARGET") {
                        envEntry.value = unrealProjectVersion.target;
                    }
                    if (envEntry.name == "LEVEL_NAME") {
                        envEntry.value = unrealProjectVersion.levelName;
                    }
                    if (envEntry.name == "LEVEL_FILE_PATH") {
                        envEntry.value = unrealProjectVersion.levelFilePath;
                    }
                    if (envEntry.name == "REGION") {
                        envEntry.value = region;
                    }
                    if (envEntry.name == "UPLOADER" && unrealProjectVersion.uploader != undefined) {
                        envEntry.value = unrealProjectVersion.uploader;
                    }
                    return envEntry;
                });
            }
        }
        if (container.name == "fluentd") {
            if (container.env) {
                container.env.map((envEntry) => {
                    if (envEntry.name == "FIREBASE_PROJECT_ID") {
                        envEntry.value = firebaseProjectId;
                    }
                    if (envEntry.name == "ORGANIZATION_ID") {
                        envEntry.value = unrealProject.organizationId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_NAME") {
                        envEntry.value = unrealProject.name;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_ID") {
                        envEntry.value = unrealProjectId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_ID") {
                        envEntry.value = unrealProjectVersionId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_UPLOAD_URL") {
                        envEntry.value = unrealProjectVersion.uploadUrl;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_UPLOAD_SHA256SUM") {
                        envEntry.value = unrealProjectVersion.uploadSha256Sum;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_DOWNLOAD_URL") {
                        envEntry.value = unrealProjectVersion.downloadUrl;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_ID") {
                        envEntry.value = unrealPluginVersionId;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_URL") {
                        envEntry.value = unrealPluginVersion.url;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_SHA256SUM") {
                        envEntry.value = unrealPluginVersion.sha256Sum;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_TOOLKIT_URL") {
                        envEntry.value = unrealPluginVersion.toolkitUrl;
                    }
                    if (envEntry.name == "UNREAL_PLUGIN_VERSION_TOOLKIT_SHA256SUM") {
                        envEntry.value = unrealPluginVersion.toolkitSha256Sum;
                    }
                    if (envEntry.name == "TARGET") {
                        envEntry.value = unrealProjectVersion.target;
                    }
                    if (envEntry.name == "LEVEL_NAME") {
                        envEntry.value = unrealProjectVersion.levelName;
                    }
                    if (envEntry.name == "LEVEL_FILE_PATH") {
                        envEntry.value = unrealProjectVersion.levelFilePath;
                    }
                    if (envEntry.name == "REGION") {
                        envEntry.value = region;
                    }
                    if (envEntry.name == "UPLOADER" && unrealProjectVersion.uploader != undefined) {
                        envEntry.value = unrealProjectVersion.uploader;
                    }
                    return envEntry;
                });
            }
        }
        return container;
    });
    console.log("YAML after");
    console.log(yaml.dump(pod));
    return pod;
}
exports.templateUnrealProjectVersionBuildPod = templateUnrealProjectVersionBuildPod;
function templateUnrealProjectVersionPackageValidatorPod(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, region, packageValidatorImageRepo, packageValidatorImageId, podYaml) {
    var _a;
    const pod = yaml.loadAll(podYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(pod));
    if (pod.spec == undefined) {
        console.error("pod.spec is undefined");
        return undefined;
    }
    if (pod.metadata == undefined) {
        console.error("pod.metadata is undefined");
        return undefined;
    }
    const podName = (0, shared_1.formatUnrealProjectVersionPackageValidatorPodName)(unrealProjectVersionId);
    const projectName = (0, shared_1.getUnrealProjectName)(unrealProject, unrealProjectVersion);
    if (projectName === undefined) {
        console.warn("Couldn't resolve project name");
    }
    pod.metadata.name = podName;
    if (pod.metadata.labels != undefined) {
        pod.metadata.labels.name = podName;
        pod.metadata.labels.organizationId = unrealProject.organizationId;
        pod.metadata.labels.firebaseProjectId = firebaseProjectId;
        if (projectName != undefined)
            pod.metadata.labels.unrealProjectName = projectName;
        pod.metadata.labels.unrealProjectId = unrealProjectId;
        pod.metadata.labels.unrealProjectVersionId = unrealProjectVersionId;
        pod.metadata.labels.target = unrealProjectVersion.target;
        pod.metadata.labels.region = region;
    }
    if ((pod.spec == undefined) ||
        (pod.spec.affinity == undefined) ||
        (pod.spec.affinity.nodeAffinity == undefined) ||
        (pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution == undefined)) {
        console.error("pod.spec.affinity.nodeAffinity (or a parent object) is undefined");
        return undefined;
    }
    pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.map((term) => {
        if (term.matchExpressions != undefined) {
            term.matchExpressions.map((matchExpression) => {
                if (matchExpression.key == "topology.kubernetes.io/region") {
                    matchExpression.values = [region];
                }
                return matchExpression;
            });
        }
        return term;
    });
    if (((_a = pod.spec) === null || _a === void 0 ? void 0 : _a.volumes) != undefined) {
        pod.spec.volumes.map((volume) => {
            if (volume.name == "unreal-project-version-package-validator-configmap") {
                if (volume.configMap != undefined) {
                    volume.configMap.name = (0, shared_1.formatPackageValidatorConfigMapName)(firebaseProjectId);
                }
            }
            return volume;
        });
    }
    pod.spec.containers.map((container) => {
        if (container.name == "package-validator") {
            if (container.image != undefined) {
                if (packageValidatorImageRepo != undefined && packageValidatorImageId != undefined) {
                    const image = packageValidatorImageRepo + ":" + packageValidatorImageId;
                    console.debug(`Using builder container image from configuration: ${image}`);
                    container.image = image;
                }
                else {
                    container.image = container.image.replace(/:.*/, ":" + "5.2.1");
                }
            }
            if (unrealProjectVersion.sleepLoopOnFailure == true && container.command != undefined)
                container.command.push("|| while true ; do sleep 60 ; done");
            if (container.env) {
                container.env.map((envEntry) => {
                    if (envEntry.name == "FIREBASE_PROJECT_ID") {
                        envEntry.value = firebaseProjectId;
                    }
                    if (envEntry.name == "ORGANIZATION_ID") {
                        envEntry.value = unrealProject.organizationId;
                    }
                    if (projectName != undefined && envEntry.name == "UNREAL_PROJECT_NAME") {
                        envEntry.value = projectName;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_ID") {
                        envEntry.value = unrealProjectId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_ID") {
                        envEntry.value = unrealProjectVersionId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_DOWNLOAD_URL") {
                        envEntry.value = unrealProjectVersion.downloadUrl;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_UPLOAD_SHA256SUM" && unrealProjectVersion.uploadSha256Sum != undefined) {
                        envEntry.value = unrealProjectVersion.uploadSha256Sum;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_PACKAGE_ARCHIVE_URL" && unrealProjectVersion.packageArchiveUrl != undefined) {
                        envEntry.value = unrealProjectVersion.packageArchiveUrl;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_PACKAGE_ARCHIVE_SHA256SUM" && unrealProjectVersion.packageArchiveSha256Sum != undefined) {
                        envEntry.value = unrealProjectVersion.packageArchiveSha256Sum;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_SELF_PACKAGED") {
                        envEntry.value = unrealProjectVersion.selfPackaged ? "true" : "false";
                    }
                    if (envEntry.name == "VOLUME_SIZE_GB" && unrealProjectVersion.volumeSizeGb != undefined) {
                        envEntry.value = String(unrealProjectVersion.volumeSizeGb);
                    }
                    if (envEntry.name == "REGION") {
                        envEntry.value = region;
                    }
                    return envEntry;
                });
            }
        }
        return container;
    });
    console.log("YAML after");
    console.log(yaml.dump(pod));
    return pod;
}
exports.templateUnrealProjectVersionPackageValidatorPod = templateUnrealProjectVersionPackageValidatorPod;
function templateUnrealProjectVersionVolumeCopyPod(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, region, volumeCopyImageRepo, volumeCopyImageId, podYaml) {
    const pod = yaml.loadAll(podYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(pod));
    if (pod.spec == undefined) {
        console.error("pod.spec is undefined");
        return undefined;
    }
    if (pod.metadata == undefined) {
        console.error("pod.metadata is undefined");
        return undefined;
    }
    const podName = (0, shared_1.formatUnrealProjectVersionVolumeCopyPodName)(unrealProjectVersionId, region);
    const pvcClaimName = (0, shared_1.formatUnrealProjectVersionClaimName)(unrealProjectVersionId, region);
    const projectName = (0, shared_1.getUnrealProjectName)(unrealProject, unrealProjectVersion);
    if (projectName === undefined) {
        console.log("Project name does not exist");
        return undefined;
    }
    pod.metadata.name = podName;
    if (pod.metadata.labels != undefined) {
        pod.metadata.labels.name = podName;
        pod.metadata.labels.organizationId = unrealProject.organizationId;
        pod.metadata.labels.firebaseProjectId = firebaseProjectId;
        pod.metadata.labels.unrealProjectName = projectName;
        pod.metadata.labels.unrealProjectId = unrealProjectId;
        pod.metadata.labels.unrealProjectVersionId = unrealProjectVersionId;
        pod.metadata.labels.target = unrealProjectVersion.target;
        pod.metadata.labels.region = region;
    }
    if ((pod.spec == undefined) ||
        (pod.spec.affinity == undefined) ||
        (pod.spec.affinity.nodeAffinity == undefined) ||
        (pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution == undefined)) {
        console.error("pod.spec.affinity.nodeAffinity (or a parent object) is undefined");
        return undefined;
    }
    pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.map((term) => {
        if (term.matchExpressions != undefined) {
            term.matchExpressions.map((matchExpression) => {
                if (matchExpression.key == "topology.kubernetes.io/region") {
                    matchExpression.values = [region];
                }
                return matchExpression;
            });
        }
        return term;
    });
    if ((pod.spec.volumes == undefined) ||
        (pod.spec.volumes.length < 1)) {
        console.error("pod.spec.volumes is undefined or empty");
        return undefined;
    }
    pod.spec.volumes.map((volume) => {
        if (volume.name == "unreal-project-version-content") {
            if (volume.persistentVolumeClaim != undefined) {
                volume.persistentVolumeClaim.readOnly = false;
                volume.persistentVolumeClaim.claimName = pvcClaimName;
            }
        }
        if (volume.name == "unreal-project-version-volume-copy-configmap") {
            if (volume.configMap != undefined) {
                volume.configMap.name = (0, shared_1.formatVolumeCopyConfigMapName)(firebaseProjectId);
            }
        }
        return volume;
    });
    pod.spec.containers.map((container) => {
        if (container.name == "copier") {
            if (container.image != undefined) {
                if (volumeCopyImageRepo != undefined && volumeCopyImageId != undefined) {
                    const image = volumeCopyImageRepo + ":" + volumeCopyImageId;
                    console.debug(`Using builder container image from configuration: ${image}`);
                    container.image = image;
                }
                else {
                    container.image = container.image.replace(/:.*/, ":" + "5.2.1");
                }
            }
            if (unrealProjectVersion.sleepLoopOnFailure == true && container.command != undefined)
                container.command.push("|| while true ; do sleep 60 ; done");
            if (container.env) {
                container.env.map((envEntry) => {
                    if (envEntry.name == "FIREBASE_PROJECT_ID") {
                        envEntry.value = firebaseProjectId;
                    }
                    if (envEntry.name == "ORGANIZATION_ID") {
                        envEntry.value = unrealProject.organizationId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_NAME") {
                        envEntry.value = projectName;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_ID") {
                        envEntry.value = unrealProjectId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_ID") {
                        envEntry.value = unrealProjectVersionId;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_PACKAGE_DOWNLOAD_URL") {
                        envEntry.value = unrealProjectVersion.packageArchiveUrl;
                    }
                    if (envEntry.name == "UNREAL_PROJECT_VERSION_PACKAGE_SHA256SUM") {
                        envEntry.value = unrealProjectVersion.packageArchiveSha256Sum;
                    }
                    if (envEntry.name == "TARGET") {
                        envEntry.value = unrealProjectVersion.target;
                    }
                    if (envEntry.name == "LEVEL_NAME") {
                        envEntry.value = unrealProjectVersion.levelName;
                    }
                    if (envEntry.name == "LEVEL_FILE_PATH") {
                        envEntry.value = unrealProjectVersion.levelFilePath;
                    }
                    if (envEntry.name == "REGION") {
                        envEntry.value = region;
                    }
                    if (envEntry.name == "PROJECT_DIR") {
                        envEntry.value = unrealProjectVersion.unrealProjectDirectoryPath;
                    }
                    return envEntry;
                });
            }
        }
        return container;
    });
    console.log("YAML after");
    console.log(yaml.dump(pod));
    return pod;
}
exports.templateUnrealProjectVersionVolumeCopyPod = templateUnrealProjectVersionVolumeCopyPod;
function templateUnrealProjectVersionPvc(firebaseProjectId, unrealProjectId, unrealProject, unrealProjectVersionId, unrealProjectVersion, region, configuration, pvcYaml) {
    const pvc = yaml.loadAll(pvcYaml)[0];
    console.log("YAML before");
    console.log(yaml.dump(pvc));
    if (pvc.spec == undefined) {
        console.error("pvc.spec is undefined");
        return undefined;
    }
    if (pvc.metadata == undefined) {
        console.error("pvc.metadata is undefined");
        return undefined;
    }
    if (unrealProjectVersion.volumeSizeGb == undefined) {
        console.error("Unreal project version has no volumeSizeGb field:", unrealProjectVersionId);
        return undefined;
    }
    const pvcName = (0, shared_1.formatUnrealProjectVersionClaimName)(unrealProjectVersionId, region);
    const projectName = (0, shared_1.getUnrealProjectName)(unrealProject, unrealProjectVersion);
    if (projectName === undefined) {
        console.log("Project name does not exist");
        return undefined;
    }
    pvc.metadata.name = pvcName;
    if (pvc.metadata.labels != undefined) {
        pvc.metadata.labels.name = pvcName;
        pvc.metadata.labels.organizationId = unrealProject.organizationId;
        pvc.metadata.labels.firebaseProjectId = firebaseProjectId;
        pvc.metadata.labels.unrealProjectName = projectName;
        pvc.metadata.labels.unrealProjectVolumeSizeGb = unrealProjectVersion.volumeSizeGb.toString();
        pvc.metadata.labels.unrealProjectId = unrealProjectId;
        pvc.metadata.labels.unrealProjectVersionId = unrealProjectVersionId;
        pvc.metadata.labels.region = region;
    }
    if (pvc.spec == undefined) {
        console.error("pvc.spec (or a parent object) is undefined");
        return undefined;
    }
    const nvmeTier = (() => {
        switch (configuration === null || configuration === void 0 ? void 0 : configuration.volumeCopyNvmeTier) {
            case "premium": {
                if (configuration.volumeCopyRegionSupportedNvmeTiers != undefined &&
                    configuration.volumeCopyRegionSupportedNvmeTiers[region.toUpperCase()] != undefined &&
                    configuration.volumeCopyRegionSupportedNvmeTiers[region.toUpperCase()].includes("premium") === true) {
                    return "vast";
                }
                console.debug(`Region ${region} doesn't support requested tier 'premium'. Defaulting to 'standard'`);
                return "nvme";
            }
            case "standard":
            case undefined: return "nvme";
        }
    })();
    pvc.spec.storageClassName = ("shared-" + nvmeTier + "-" + region).toLowerCase();
    pvc.spec.resources = {
        requests: {
            storage: unrealProjectVersion.volumeSizeGb.toString() + "G",
        },
    };
    console.log("YAML after");
    console.log(yaml.dump(pvc));
    return pvc;
}
exports.templateUnrealProjectVersionPvc = templateUnrealProjectVersionPvc;
//# sourceMappingURL=yaml-standard.js.map