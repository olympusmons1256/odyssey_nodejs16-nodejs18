import * as firebaseAdmin from "firebase-admin";
import {UnrealProjectVersionNvmeTier, UnrealProjectVersionRegionSupportedNvmeTiers} from "./docTypes";
import {IceServer} from "./twilio/shared";

export type ClusterProvider = "gke" | "coreweave"
// TODO: Convert back to set
export type ClusterProviders = ClusterProvider[]
export type GkeAccelerator = "nvidia-tesla-t4" | "nvidia-tesla-p100" | "nvidia-tesla-a100" | "nvidia-tesla-p4" | "nvidia-tesla-v100" | "nvidia-tesla-k80"

export interface GkeAcceleratorNodePoolConfiguration {
  accelerator: GkeAccelerator,
  minNodeCount?: number
}

export type CoreweaveCpuAvailability = "high" | "low" | "medium" | "none"

export interface ClusterProviderConfiguration {
  minNodeCounts?: GkeAcceleratorNodePoolConfiguration[]
  updated?: firebaseAdmin.firestore.Timestamp
  httpsProxy?: string
  staticSignallingProxy?: string
}

export type CoreweaveValidGpus = {
  [key: string]: CoreweaveValidGpu
}

export type ExtraNodeSelectorMatchExpressions = {
  [key: string]: string[]
}

export interface CoreweaveWorkloadResourceRequest {
  gpu: string
  region: string
  weight: number
}

export interface CoreweaveWorkloadResourceRequestAvailable extends CoreweaveWorkloadResourceRequest {
  available: number
}

export interface CoreweaveValidGpu {
  benchmark: number,
  cost: number,
}

export interface CoreweaveGpuAffinity {
  gpu: string,
  weight: number,
}

export interface CoreweaveRegionsAvailability {
  timestamp: firebaseAdmin.firestore.Timestamp
  // Stringified CoreweaveRegionAvailability[]
  data: string
}
export type CoreweaveRegionsAvailabilityResponseData = CoreweaveRegionAvailability[]
export interface CoreweaveRegionAvailability {
  slug: string
  compute: {
    gpu: {
      [key: string]: {
        all: {
          available: number
        }
      }
    },
    cpu: {
      [key: string]: {
        availability: CoreweaveCpuAvailability
      }
    }
  }
}

export interface ConfigurationOdysseyClientPod {
  firebaseApiKey?: string
  unrealImageId?: string
  unrealImageRepo?: string
  unrealCpuM?: number
  unrealGpus?: CoreweaveGpuAffinity[]
  unrealGkeAccelerator? : GkeAccelerator
  unrealMemoryMb?: number
  unrealBaseCliArgs?: string
  unrealOverrideCliArgs?: string
  unrealMountContent?: boolean
  unrealMountImageRepo?: string
  unrealMountImageId?: string
  unrealMountContainsClientAndServer?: boolean
  signallingWebServerImageRepo?: string
  signallingWebServerImageId?: string
  unrealProjectName?: string
  usersCollectionPath?: "root" | "organization",
  firebaseBridgeImageId?: string
  firebaseBridgeImageRepo?: string
  workloadClusterProviders?: ClusterProviders
  workloadRegion?: string
  iceServersProvider?: "twilio" | "manual"
  iceServers?: IceServer[]
  gpuPerformance?: "normal" | "high"
  validRegions?: string[]
  validGpus?: CoreweaveValidGpus
  useDynamicGpuRegion?: boolean
  extraNodeSelectorMatchExpressions?: ExtraNodeSelectorMatchExpressions
  updated?: firebaseAdmin.firestore.Timestamp
}

export interface ConfigurationUnrealProjectVersion {
  builderImageId?: string
  builderImageRepo?: string
  builderCpuM?: number
  builderMemoryMb?: number
  builderValidRegions?: string[]
  volumeCopyImageId?: string
  volumeCopyImageRepo?: string
  volumeCopyCpuM?: number
  volumeCopyMemoryMb?: number
  volumeCopyToRegions?: string[]
  volumeCopyNvmeTier?: UnrealProjectVersionNvmeTier
  volumeCopyRegionSupportedNvmeTiers?: UnrealProjectVersionRegionSupportedNvmeTiers
  packageValidatorImageId?: string
  packageValidatorImageRepo?: string
  packageValidatorCpuM?: number
  packageValidatorMemoryMb?: number
  packageValidatorValidRegions?: string[]
  extraNodeSelectorMatchExpressions?: ExtraNodeSelectorMatchExpressions
  updated?: firebaseAdmin.firestore.Timestamp
}

export interface ConfigurationBilling {
  excludedUsageEmailDomains?: string[]
  updated?: firebaseAdmin.firestore.Timestamp
}

export interface ConfigurationOdysseyServer {
  firebaseApiKey?: string
  unrealImageId?: string
  unrealImageRepo?: string
  unrealCpuM?: number
  unrealMemoryMb?: number
  unrealBaseCliArgs?: string
  unrealOverrideCliArgs?: string
  unrealMountContent?: boolean
  unrealMountImageId?: string
  unrealMountContainsClientAndServer?: boolean
  unrealMountImageRepo?: string
  unrealProjectName?: string
  firebaseBridgeImageId?: string
  firebaseBridgeImageRepo?: string
  workloadClusterProvider: ClusterProvider
  newShardParticipantsThreshold?: number
  workloadRegion?: string
  updated?: firebaseAdmin.firestore.Timestamp
}

export interface UpdatedConfigurationOdysseyClientPod {
  unrealMountImageRepo?: string
  unrealMountImageId?: string
  unrealImageRepo?: string
  unrealImageId?: string
  updated: firebaseAdmin.firestore.Timestamp
}

export interface UpdatedConfigurationOdysseyServer {
  unrealMountImageRepo?: string
  unrealMountImageId?: string
  unrealImageRepo?: string
  unrealImageId?: string
  updated: firebaseAdmin.firestore.Timestamp
}

export interface PullClientImageOnNodes extends PullClientImageOnNodesUpdate {
  created: firebaseAdmin.firestore.Timestamp
}

export interface PullClientImageOnNodesUpdate {
  updated: firebaseAdmin.firestore.Timestamp
  imageId?: string
  imageRepo?: string
  nodeCount?: number
  successCount?: number
  failedCount?: number
  workloadClusterProvider?: ClusterProvider
  took?: number
  state?: "started" | "succeeded" | "failed" | "timed out"
}

export interface ParticipantUsageCheckOperation {
  triggeredAt: firebaseAdmin.firestore.Timestamp
  startedAt?: firebaseAdmin.firestore.Timestamp
  participantUsageDocsAddedAt?: firebaseAdmin.firestore.Timestamp
  participantUsageDocsAccounted?: number
  accountedAt?: firebaseAdmin.firestore.Timestamp
  result?: "success" | "failure" | "timed-out" | "participant-usage-docs-added" | "accounted"
  participantUsageDocsAdded?: number
  deductedCredits?: number
  excludedUsageEmailDomains?: string[]
}

export interface NodeImagePullDaemonSet {
  created: firebaseAdmin.firestore.Timestamp
  updated?: firebaseAdmin.firestore.Timestamp
  imageId: string
  imageRepo: string
  workloadClusterProvider: "gke"
  state?: "created" | "updated" | "failed"
}

export interface UserEmailSettings {
  updated?: firebaseAdmin.firestore.Timestamp
  created?: firebaseAdmin.firestore.Timestamp
  email: string
  sendgrid: {
    enabled: boolean
  }
  postmark: {
    enabled: boolean
  }
}

export interface EmailProvidersConfiguration {
  updated?: firebaseAdmin.firestore.Timestamp
  created?: firebaseAdmin.firestore.Timestamp
  sendgrid: {
    enabled: boolean
  }
  postmark: {
    enabled: boolean
  }
}
