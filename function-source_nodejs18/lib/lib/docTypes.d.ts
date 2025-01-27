import * as firebaseAdmin from "firebase-admin";
import firebase from "firebase";
import { ClusterProvider } from "./systemDocTypes";
import { PodState } from "./kubernetes/types";
import { FlightControls, AvatarControlSystems } from "./cmsDocTypes";
export interface ParticipantStateChange {
    state: ParticipantState;
    timestamp: firebaseAdmin.firestore.Timestamp;
}
export interface DeploymentStateChange {
    state: DeploymentState;
    timestamp: firebaseAdmin.firestore.Timestamp;
}
export declare type DeviceState = "offline" | "online";
export declare type BrowserState = "signalling-connected" | "webrtc-connected" | "pixelstreaming-initialized" | "timed-out" | "webrtc-disconnected" | "timed-out-refreshing" | "afk-warning" | "afk-closing" | "leave-room";
export interface BrowserStateRecord {
    state: BrowserState;
    timestamp: firebaseAdmin.firestore.Timestamp;
}
export interface BrowserStateUpdateWebRtc {
    state: IceConnectionState | undefined | null;
    updated: firebaseAdmin.firestore.Timestamp;
}
export declare const ICE_CONNECTION_STATE: readonly ["new", "checking", "connected", "completed", "failed", "disconnected", "closed"];
export declare type IceConnectionState = typeof ICE_CONNECTION_STATE[number];
export interface Device {
    state: DeviceState;
    lastChanged: firebaseAdmin.firestore.Timestamp;
}
export interface RtdbDevice {
    state: DeviceState;
    lastChanged: number;
}
export declare type DeploymentState = PodProvisioningState | PodState | "new" | "failed-before-provisioning";
export declare type ParticipantState = "new" | "created-deployments" | "create-deployments-failed" | "all-deployments-timed-out" | "deprovisioning-deployments" | "deprovisioned-deployments" | "rejected-by-billing" | "ready-deployment";
export declare type PodProvisioningState = "provisioning" | "failed-provisioning" | "timed-out-provisioning" | "deprovisioning" | "failed-deprovisioning" | "timed-out-deprovisioning" | "deprovisioned";
export declare type RoomState = PodProvisioningState | PodState;
export declare type UserRoles = OrganizationRoles | SpaceRoles;
export declare const ORGANIZATION_ROLES: readonly ["org_owner", "org_admin", "org_editor", "org_viewer"];
export declare type OrganizationRoles = typeof ORGANIZATION_ROLES[number];
export declare const SPACE_ROLES: readonly ["space_owner", "space_editor", "space_viewer", "space_visitor"];
export declare type SpaceRoles = typeof SPACE_ROLES[number];
export declare type OrganizationActions = "delete" | "editFolders" | "editOrg" | "editBilling" | "invite" | "view";
export declare type SpaceActions = "create" | "delete" | "editSpace" | "editSpaceItems" | "invite" | "viewPrivateSpace";
export declare type RolePermissions = {
    organization: OrganizationActions[];
    space: SpaceActions[];
    id: string;
};
export declare type Permissions = {
    org_owner: RolePermissions;
    org_admin: RolePermissions;
    org_editor: RolePermissions;
    org_viewer: RolePermissions;
    space_owner: RolePermissions;
    space_editor: RolePermissions;
    space_viewer: RolePermissions;
    space_visitor: RolePermissions;
};
export interface UserSpace {
    id: string;
    role: UserRoles;
    pending: boolean;
}
export interface UserOrganization {
    id: string;
    role: UserRoles;
}
export interface OrganizationUser extends User {
    role: OrganizationRoles;
}
export interface SpaceUser extends User {
    role: SpaceRoles;
}
export interface RootUser extends User {
    pending?: boolean;
    userOrganizations?: UserOrganization[];
    userSpaces?: UserSpace[];
    recentSpaces?: string[];
    followingOrganizationIds?: string[];
    avatarReadyPlayerMeUrl?: string;
    avatarReadyPlayerMeImg?: string;
    roomInvites?: Array<string>;
    clothingBottom?: AvatarClothingSettings;
    clothingTop?: AvatarClothingSettings;
    clothingShoes?: AvatarClothingSettings;
    bodyShape?: string;
    bodyHeight?: string;
    rpmAvatarId?: string;
    additionalInfo?: {
        email?: string;
        phone?: string;
        fullName?: string;
    };
    favoritedSpaces?: string[];
}
export interface User {
    updated: firebaseAdmin.firestore.Timestamp;
    created: firebaseAdmin.firestore.Timestamp;
    email: string;
    name?: string;
    bot?: boolean;
    avatarReadyPlayerMeImg?: string;
    id?: string;
    anonymous?: boolean;
}
export declare type OldOrganizationUserRoles = "admin" | "member" | "guest";
export interface OldOrganizationUser {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    email: string;
    role: OldOrganizationUserRoles;
    name?: string;
    bot?: boolean;
    avatarReadyPlayerMeUrl?: string;
    avatarReadyPlayerMeImg?: string;
    roomInvites?: Array<string>;
    clothing?: {
        top: {
            id: string;
            colors?: string;
        };
        bottoms: {
            id: string;
            colors?: string;
        };
        shoes: {
            id: string;
            colors?: string;
        };
    };
    haircut?: string;
    bodyShape?: string;
    additionalInfo?: {
        email?: string;
        phone?: string;
        fullName?: string;
    };
}
export interface AvatarClothingSettings {
    shaderItem?: string;
    shaderColor?: string;
    ueId: string;
}
export interface Invite {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    accepted?: firebaseAdmin.firestore.Timestamp;
    rejected?: firebaseAdmin.firestore.Timestamp;
    email: string;
    role: UserRoles;
    type: "email" | "link";
    authSkip?: boolean;
    id?: string;
}
export interface InviteLink {
    id: string;
}
export interface RegistrationInfoFields {
    phone: boolean;
    fullName: boolean;
    email: boolean;
}
export interface Folder {
    id: string;
    name: string;
}
export interface Organization {
    name: string;
    domain?: string;
    whitelabel?: boolean;
    logoSmallUrl?: string;
    allowSharedInviteLinks?: boolean;
    created?: firebaseAdmin.firestore.Timestamp;
    updated?: firebaseAdmin.firestore.Timestamp;
    id?: string;
    splashImageUrl?: string;
    location?: string;
    bio?: string;
    websiteUrl?: string;
}
export interface AuthClient {
    name?: string;
    organizationId?: string;
    secret?: string;
    created?: firebaseAdmin.firestore.Timestamp;
    updated?: firebaseAdmin.firestore.Timestamp;
}
export interface Room {
    created?: firebaseAdmin.firestore.Timestamp;
    updated?: firebaseAdmin.firestore.Timestamp;
    provisioningFailures?: number;
    deprovisioningFailures?: number;
    serverAddress?: string;
    staticServer?: boolean;
    currentParticipantCount?: number;
    currentAdminCount?: number;
    isPublic?: boolean;
    state?: RoomState;
    shards?: string[];
    shardOf?: string;
    enableSharding?: boolean;
    name?: string;
    flags?: Array<string>;
    levelId?: string;
    spaceId?: string;
    id?: string;
    persistentLiveStream?: string;
    isLiveStreamActive?: boolean;
    graphicsBenchmark?: number;
    infoFields?: RegistrationInfoFields;
    region?: string;
    flightControl?: FlightControls;
    avatarControlSystem?: AvatarControlSystems;
    rejectedByBilling?: boolean;
}
export interface RoomWithGameServer {
    serverAddress: string;
    updated: firebaseAdmin.firestore.Timestamp;
    took: number;
}
export interface Participant {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    lastUsageCheck?: firebaseAdmin.firestore.Timestamp;
    userId: string;
    deviceId: string;
    bot?: boolean;
    afkCheck?: firebaseAdmin.firestore.Timestamp;
    workloadClusterProvider?: ClusterProvider;
    signallingUrl?: string;
    state?: ParticipantState;
    stateChanges?: ParticipantStateChange[];
    farthestDeploymentState?: DeploymentState;
    winnerDeploymentId?: string;
}
export interface ParticipantUsageSummary {
    timestamp: firebaseAdmin.firestore.Timestamp;
    period: "day" | "hour" | "month";
    participants: number;
    durationMilliseconds: number;
    creditsUsed: number;
}
export interface ParticipantUsage {
    isFinal: boolean;
    start: firebaseAdmin.firestore.Timestamp;
    end: firebaseAdmin.firestore.Timestamp;
    durationSeconds: number;
    totalDurationSeconds?: number;
    totalCreditsUsed?: number;
    creditsUsed: number;
    creditsPerHour: number;
    sku?: string;
}
export interface HistoricParticipant {
    created: firebaseAdmin.firestore.Timestamp;
    deleted?: firebaseAdmin.firestore.Timestamp;
    userId?: string;
    deviceId?: string;
    workloadClusterProvider?: ClusterProvider;
    totalSeconds?: number;
}
export interface CompletedParticipant extends Participant {
    organizationId: string;
    roomId: string;
    spaceId?: string;
    deleted: firebaseAdmin.firestore.Timestamp;
}
export interface ParticipantUpdateState {
    updated: firebaseAdmin.firestore.Timestamp;
    state: ParticipantState;
    signallingUrl?: string;
}
export interface RoomsCommsParticipant {
    dolbyParticipantId: string;
    audioChannelId: string;
    connectedToDolby: boolean;
    userId: string;
    userName?: string;
    avatarReadyPlayerMeImg?: string;
    id?: string;
}
export interface ParticipantDenormalized {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    userId: string;
    userName?: string;
    userEmail: string;
    deviceId: string;
    userRole: string;
    avatarReadyPlayerMeImg?: string;
    id?: string;
}
export interface ParticipantsDenormalized {
    updated: firebaseAdmin.firestore.Timestamp;
    participants: Array<ParticipantDenormalized>;
}
export interface Auth {
    email: string;
    uid: string;
    providerData: (firebase.UserInfo | null)[];
    metaData: firebase.storage.FullMetadata;
}
export interface Deployment {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    attempts: number;
    userId: string;
    deviceId: string;
    state: DeploymentState;
    stateChanges: DeploymentStateChange[];
    signallingUrl?: string;
    nodeName?: string;
    region?: string;
    workloadClusterProvider: ClusterProvider;
}
export interface PodStackState {
    timestamp: firebaseAdmin.firestore.Timestamp;
    eventsJson?: string;
    podJson?: string;
    configMapJson?: string;
    ingressJson?: string;
    serviceJson?: string;
    deploymentState: DeploymentState;
}
export interface DeploymentStateUpdate {
    updated: firebaseAdmin.firestore.Timestamp;
    state: DeploymentState;
    stateChanges: firebaseAdmin.firestore.FieldValue;
    signallingUrl?: string;
    nodeName?: string;
    region?: string;
}
export interface ParticipantStateUpdate {
    updated: firebaseAdmin.firestore.Timestamp;
    state?: ParticipantState;
    stateChanges?: firebaseAdmin.firestore.FieldValue;
    latestDeploymentState?: DeploymentState;
    signallingUrl?: string;
    winnerDeploymentId?: string;
}
export interface RoomStateUpdate {
    updated: firebaseAdmin.firestore.Timestamp;
    state?: RoomState;
    serverAddress?: string | firebaseAdmin.firestore.FieldValue;
    provisioningFailures?: number;
    deprovisioningFailures?: number | firebaseAdmin.firestore.FieldValue;
    region?: string;
    rejectedByBilling?: boolean;
}
export interface RoomStateChange {
    updated: firebaseAdmin.firestore.Timestamp;
    state: RoomState;
}
export interface GkeParticipantDenormalized {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    organizationId: string;
    roomId: string;
    userId: string;
    deviceId: string;
}
export interface GkeParticipantsDenormalized {
    updated: firebaseAdmin.firestore.Timestamp;
    participants: Array<GkeParticipantDenormalized>;
}
export interface BillingDay {
    participantSeconds?: number;
}
export interface GlobalSettings {
    maintenanceBanner: MaintenanceBanner;
    currentFeatureAnnouncement: string;
    disableAvatarCustomization: boolean;
    pluginPaths: {
        [key: string]: string;
    };
}
export interface MaintenanceBanner {
    isActive: boolean;
    message: string;
}
export interface FeatureAnnouncements {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    userRoles: UserRoles[];
    markdown: string;
    readmeUrl: string;
    title: string;
    imageUrl?: string;
    videoUrl?: string;
    id: string;
}
export declare const UNREAL_PLUGIN_VERSION_STATE: readonly ["uploaded", "supported", "supported-5.2", "disabled", "deprecated", "unsupported", "expiring", "expired"];
export declare type UnrealPluginVersionState = typeof UNREAL_PLUGIN_VERSION_STATE[number];
export interface UnrealPluginVersion {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    url: string;
    toolkitUrl: string;
    name: string;
    status: UnrealPluginVersionState;
    sha256Sum: string;
    toolkitSha256Sum: string;
    zippedSizeMb: number;
    toolkitZippedSizeMb: number;
    unzippedSizeMb: number;
    toolkitUnzippedSizeMb: number;
    regions: string[];
    unrealEngineVersion: SupportedUnrealEngineVersion;
    dependencyPlugins: {
        [key: string]: {
            name: string;
            sha256Sum: string;
        };
    };
}
export interface UnrealProject {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    displayName?: string;
    name?: string;
    organizationId: string;
    description?: string;
    thumb?: string;
    spaceCount?: number;
}
export declare const UNREAL_PROJECT_VERSION_TARGET: readonly ["Development", "Shipping"];
export declare type UnrealProjectVersionTarget = typeof UNREAL_PROJECT_VERSION_TARGET[number];
export declare const SUPPORTED_UNREAL_ENGINE_VERSION: readonly ["5.0.3", "5.2.1"];
export declare type SupportedUnrealEngineVersion = typeof SUPPORTED_UNREAL_ENGINE_VERSION[number];
export declare type UnrealProjectVersionNvmeTier = "standard" | "premium";
export interface UnrealProjectVersionRegionSupportedNvmeTiers {
    [key: string]: Array<UnrealProjectVersionNvmeTier>;
}
export interface UnrealProjectVersion {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    name?: string;
    uploadSha256Sum?: string;
    uploader: "webClient" | "bridgeCli";
    selfPackaged?: boolean;
    levelName: string;
    levelFilePath: string;
    uploadUrl: string;
    downloadUrl: string;
    pluginVersionId?: string;
    authorUserId: string;
    target: UnrealProjectVersionTarget;
    state?: UnrealProjectVersionState;
    stateChanges?: UnrealProjectVersionStateChange[];
    lastPingFromBuilder?: firebaseAdmin.firestore.Timestamp;
    lastPingFromVolumeCopyRegion?: firebaseAdmin.firestore.Timestamp;
    packageArchiveUrl?: string;
    packageArchiveSha256Sum?: string;
    symbolsArchiveUrl?: string;
    symbolsArchiveSha256Sum?: string;
    volumeSizeGb?: number;
    buildRegion?: string;
    volumeRegions?: string[];
    volumeCopyRegionsComplete?: string[];
    sleepLoopOnFailure?: boolean;
    builderRetries?: number;
    volumeCopyRetries?: number;
    packageValidatorRetries?: number;
    unrealEngineVersion?: SupportedUnrealEngineVersion;
    thumb?: string;
    buildLogUrls?: string[];
    systemLogUrls?: string[];
    bridgeToolkitFileSettings?: BridgeToolkitFileSettings;
    disableMultiplayer?: boolean;
    unrealProjectDirectoryPath?: string;
    expiredArtifacts?: string[];
    id?: string;
}
export interface UnrealProjectVersionStateChange {
    timestamp: firebaseAdmin.firestore.Timestamp;
    state: UnrealProjectVersionState;
    packagedSizeMb?: number;
}
export declare const UNREAL_PROJECT_VERSION_STATE: readonly ["new", "odyssey-plugin-version-invalid", "failed-missing-unreal-plugin-version", "failed-missing-unreal-project", "failed-missing-package-archive-url", "failed-missing-package-archive-checksum", "upload-complete", "upload-invalid", "upload-failed", "upload-validating", "builder-pod-creating", "builder-pod-failed-to-create", "builder-pod-timed-out-creating", "builder-pod-waiting-for-ready", "builder-pod-failed", "builder-pod-ready", "builder-downloading-project-version", "builder-downloading-project-version-failed", "builder-finding-project-file-failed", "builder-copying-plugin-version", "builder-copying-plugin-version-failed", "builder-downloading-plugin-version", "builder-downloading-plugin-version-failed", "builder-validating", "builder-validation-failed", "builder-update-unreal-project-name", "builder-settings-uploaded", "builder-building", "builder-failed", "builder-retrying", "builder-uploading", "builder-upload-failed", "builder-upload-complete", "package-validator-required", "package-validator-pod-creating", "package-validator-pod-failed-to-create", "package-validator-pod-waiting-for-ready", "package-validator-pod-timed-out", "package-validator-pod-ready", "package-validator-failed", "package-validator-retrying", "package-validator-validating", "package-validator-updating-unreal-project-name", "package-validator-updating-project-path", "package-validator-complete", "volume-copy-pvcs-creating", "volume-copy-pvcs-bound", "volume-copy-pvcs-failed", "volume-copy-pods-creating", "volume-copy-pods-failed-to-create", "volume-copy-pods-timed-out-creating", "volume-copy-pods-waiting-for-ready", "volume-copy-pods-failed", "volume-copy-pods-ready", "volume-copy-region-copying", "volume-copy-region-failed", "volume-copy-region-complete", "volume-copy-failed", "volume-copy-retrying", "volume-copy-complete", "volume-copy-expiring", "volume-copy-expired", "expiring", "expired"];
export declare type UnrealProjectVersionState = typeof UNREAL_PROJECT_VERSION_STATE[number];
export interface BridgeToolkitFileSettings {
    levels: {
        [projectLevelPath: string]: BridgeToolkitLevelEntry;
    };
    customCharacterClass?: boolean;
    supportsMultiplayer?: boolean;
    configurator?: boolean;
}
export interface OldBridgeToolkitFileSettings {
    levels: {
        [projectLevelPath: string]: BridgeToolkitLevelEntry;
    };
    customCharacterClass?: boolean;
    supportsMultiplayer?: boolean;
    pixelstreamingOnly?: boolean;
}
export interface BridgeToolkitLevelEntry {
    configurator?: BridgeToolkitFileConfigurator;
}
export interface BridgeToolkitFileConfigurator {
    location?: string;
    stateConfigurables: BridgeToolkitFileConfiguratorState[];
}
export declare type BridgeToolkitFileConfiguratorType = "String" | "Number" | "Bool" | "Enum" | "Trigger" | "Image";
export interface BridgeToolkitFileConfiguratorState {
    id: string;
    displayName: string;
    type: BridgeToolkitFileConfiguratorType;
    default: string | number | boolean;
    values?: (string | number)[];
    max?: number;
    min?: number;
    step?: number;
    isPersisted?: boolean;
    isNetworked?: boolean;
}
export interface Consent {
    code?: string;
    expiresAt?: number;
    userId?: string;
}
export interface AutoTopupCredits {
    threshold: number;
    quantity: number;
}
export interface BillingSubscriptionSubscription {
    id: string;
    currentPeriodStart: firebaseAdmin.firestore.Timestamp;
    currentPeriodEnd: firebaseAdmin.firestore.Timestamp;
    canceled?: boolean;
    status: "active" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "trialing" | "unpaid";
}
export interface BillingSubscriptionPendingSubscription {
    stripeProductId: string;
    workspaceSeatsQuantity: number;
    publishedSpacesQuantity?: number;
    reason: "unpaid" | "scheduled";
}
export interface BillingSubscription {
    stripeCustomerId: string;
    stripeProductId: string;
    stripeSubscription: BillingSubscriptionSubscription;
    pendingSubscription?: BillingSubscriptionPendingSubscription;
}
export interface StreamingCreditsPurchase {
    timestamp: firebaseAdmin.firestore.Timestamp;
    quantity: number;
    reason: "plan-change" | "top-up";
}
export interface AutoTopup {
    availableCredits: number;
    quantity: number;
    createdAt: firebaseAdmin.firestore.Timestamp;
    state: "new" | "failed" | "invoiced" | "paid";
    updatedAt?: firebaseAdmin.firestore.Timestamp;
    stripeInvoiceId?: string;
}
export declare const BILLING_PERIOD: readonly ["monthly", "yearly"];
export declare type BillingPeriod = typeof BILLING_PERIOD[number];
export interface BillingProductFeaturePrice {
    stripeId: string;
    usdCents: number;
    included: number;
}
export interface BillingProductBaseFeePrice {
    stripeId: string;
    usdCents: number;
}
export declare type ProductFeature = keyof BillingFeatures;
export interface BillingFeatures {
    bridge?: boolean;
    restApi?: boolean;
    inWorldStreams?: boolean;
    analytics?: boolean;
    sharding?: boolean;
    publishSpace?: boolean;
}
export declare const BILLING_TIER: readonly ["sandbox", "pro", "business"];
export declare type BillingTier = typeof BILLING_TIER[number];
export interface BillingProductTier {
    displayName: string;
    tier: BillingTier;
    description?: string;
    billingPeriod: BillingPeriod;
    includedStreamingCredits: number;
    baseFeePrice: BillingProductBaseFeePrice;
    workspaceSeatsPrice: BillingProductFeaturePrice;
    publishedSpacesPrice?: BillingProductFeaturePrice;
    features: BillingFeatures;
    discount: number;
}
export interface BillingProductTiers {
    [key: string]: BillingProductTier;
}
export interface BillingProductExtras {
    [key: string]: BillingProductExtra;
}
export interface BillingProductsAvailable {
    tiers: BillingProductTiers;
    extras: BillingProductExtras;
    timestamp: firebaseAdmin.firestore.Timestamp;
}
export interface BillingProductExtra {
    usdCents: number;
    unitCount: number;
    type: "streaming-credits";
    displayName: string;
}
declare type UsagePeriod = "daily" | "monthly" | "hourly";
declare type AggregateBillingState = "active" | "inactive";
export interface BillingPublic {
    hasAvailableCredits: boolean;
    features: BillingFeatures;
    hasActiveSubscription: boolean;
    disableBilling?: boolean;
    aggregateBillingState?: AggregateBillingState;
}
export interface BillingUsage {
    availableCredits: number;
    rolloverCredits?: number;
    workspaceSeatsUsed: number;
    publishedSpacesUsed: number;
    workspaceSeatsSubscribed: number;
    workspaceSeatsGifted?: number;
    publishedSpacesSubscribed: number;
    autoTopupCredits?: AutoTopupCredits;
}
export interface BillingUsagePeriodBase {
    participantSeconds: number;
    timestamp: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    usedCredits: number;
    type: UsagePeriod;
}
export interface BillingUsageMonth extends BillingUsagePeriodBase {
    purchasedCredits: number;
    lastMonthCarryOverCredits: number;
    type: "monthly";
}
export interface BillingUsageDay extends BillingUsagePeriodBase {
    type: "daily";
}
export interface BillingUsageHour extends BillingUsagePeriodBase {
    type: "hourly";
}
export interface WebRtcStats {
    duration: number;
    controlsStreamInput: string;
    audioCodec: string;
    videoCodec: string;
    videoResolution: string;
    received: number;
    framesDecoded?: number;
    packetsLost?: number;
    framerate?: number;
    framesDropped?: number;
    currentRoundTripTimeMs?: number;
    receiveToCompositeMs?: number;
    audioBitrate?: number;
    videoBitrate?: number;
    videoQuantizationParameter: string;
}
export interface ParticipantWebRtcStats {
    timestamp: firebaseAdmin.firestore.Timestamp;
    data: WebRtcStats;
}
export {};
