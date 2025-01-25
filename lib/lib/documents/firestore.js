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
exports.getOrganizationOdysseyServerRef = exports.getOrganizationOdysseyClientPodRef = exports.getSpaceTemplateItemRef = exports.getSpaceTemplateItemsRef = exports.getSpaceTemplateRef = exports.getSpaceTemplatesRef = exports.getConsentRef = exports.getConsentsRef = exports.getUserRef = exports.getUsersRef = exports.getPermissionRef = exports.getPermissionsRef = exports.getAuthClientRef = exports.getAuthClientsRef = exports.getOrganizationRef = exports.getCompletedParticipantRef = exports.getCompletedParticipantsRef = exports.getOrganizationsRef = exports.pullClientImageOnNodesWildcardPath = exports.spaceItemWildcardPath = exports.spaceTemplateItemWildcardPath = exports.spaceTemplateWildcardPath = exports.operationsWildcardPath = exports.spaceInviteWildcardPath = exports.organizationInviteWildcardPath = exports.deviceWildcardPath = exports.unrealProjectVersionWildcardPath = exports.unrealPluginVersionWildcardPath = exports.unrealProjectWildcardPath = exports.deploymentWildcardPath = exports.participantDenormalizedWildcardPath = exports.browserStateUpdateWebRtcWildcardPath = exports.autoTopupPurchaseWildcardPath = exports.streamingCreditsPurchaseWildcardPath = exports.billingPurchasesPath = exports.billingSubscriptionPath = exports.billingPublicPath = exports.billingFeaturesOverridePath = exports.billingUsagePath = exports.billingPath = exports.productsAvailablePath = exports.participantUsageWildcardPath = exports.roomParticipantUsageCheckWildcardPath = exports.participantWildcardPath = exports.spaceWildcardPath = exports.roomWildcardPath = exports.spaceUserWildcardPath = exports.organizationUserWildcardPath = exports.userWildcardPath = exports.organizationWildcardPath = void 0;
exports.getPodStackStatesRef = exports.getParticipantUsageCheckRef = exports.getParticipantUsageChecksRef = exports.getRoomStateChangeRef = exports.getRoomStateChangesRef = exports.getParticipantRef = exports.getParticipantsRef = exports.getDeviceRef = exports.getDevicesRef = exports.getSpaceConfigurationOdysseyClientPodRef = exports.getSpaceConfigurationOdysseyServerRef = exports.getRoomConfigurationOdysseyClientPodRef = exports.getRoomConfigurationOdysseyServerRef = exports.getOrganizationUserConfigurationOdysseyClientPodRef = exports.getUserConfigurationOdysseyClientPodRef = exports.getSpaceUserRef = exports.getSpaceUsersRef = exports.getOrganizationSpaceInviteRef = exports.getOrganizationSpaceInvitesRef = exports.getOrganizationSpaceRef = exports.getOrganizationSpacesRef = exports.getOrganizationInviteRef = exports.getOrganizationInvitesRef = exports.getOrganizationUserRef = exports.getOrganizationUsersRef = exports.getUserEmailSettingsRef = exports.getHistoricRoomRef = exports.getHistoricRoomsRef = exports.getBillingUsageHourRef = exports.getBillingUsageMonthRef = exports.getBillingUsageDayRef = exports.getBillingUsageRef = exports.getBillingDayRef = exports.getBillingFeaturesOverrideRef = exports.getBillingstreamingCreditsPurchaseRef = exports.getBillingAutoTopupRef = exports.getBillingAutoTopupsRef = exports.getBillingStreamingCreditsPurchasesRef = exports.getBillingPurchasesRef = exports.getBillingPublicRef = exports.getBillingSubscriptionRef = exports.getBillingRef = exports.getBillingProductsAvailableRef = exports.getProductsRef = exports.getDerivedSpacesRefWithUnrealProject = exports.getDerivedSpacesRefWithSpaceTemplate = exports.getSpaceRef = exports.getSpacesRef = exports.getRoomRef = exports.getRoomsRef = void 0;
exports.getOdysseyServerRef = exports.getConfigurationUnrealProjectRef = exports.getConfigurationUnrealProjectVersionRef = exports.getOdysseyClientPodRef = exports.getEmailProvidersConfigurationRef = exports.getWorkloadClusterProviderConfigurationRef = exports.getWorkloadClusterProvidersRef = exports.getGkeParticipantsDenormalizedRef = exports.getOdysseyServerVersionsRef = exports.getOdysseyClientVersionsRef = exports.getCoreweaveAvailabilityRef = exports.getConfigurationsRef = exports.getVersionsRef = exports.getConfigurationRef = exports.getOperationsRef = exports.getSystemRef = exports.getUnrealProjectVersionRef = exports.getUnrealProjectVersionsCollectionGroupRef = exports.getUnrealProjectVersionsRef = exports.getUnrealProjectRef = exports.getUnrealProjectsRef = exports.getUnrealPluginVersionRef = exports.getUnrealPluginVersionsRef = exports.getSpaceStreamPrivateRef = exports.getSpaceStreamRef = exports.getSpaceStreamsRef = exports.getBridgeToolkitSettingsRef = exports.getSpaceItemsHistoryPageRef = exports.getSpaceItemsHistoryPagesRef = exports.getSpaceHistoryRef = exports.getSpaceHistoryCollectionRef = exports.getSpaceItemsRef = exports.getSpaceItemRef = exports.getSettingsRef = exports.getParticipantsDenormalizedRef = exports.getParticipantDenormalizedRef = exports.getCommsParticipantsRef = exports.getCommsParticipantRef = exports.getParticipantBrowserStateUpdateWebRtcRef = exports.getParticipantUsageRef = exports.getParticipantUsageCollectionRef = exports.getBrowserStateRef = exports.getBrowserStatesRef = exports.getDeploymentRef = exports.getDeploymentsRef = exports.getHistoricParticipantRef = exports.getHistoricParticipantsRef = exports.getStateChangeRef = exports.getStateChangesRef = exports.getPodStackStateRef = void 0;
exports.getParticipant = exports.getHistoricRooms = exports.getRooms = exports.getBillingFeaturesOverride = exports.getBillingUsage = exports.getBillingPublic = exports.getBillingSubscription = exports.getBillingDay = exports.getBillingProductsAvailable = exports.getHistoricRoom = exports.getRoom = exports.getDevices = exports.getDevice = exports.getSpaceItems = exports.getBridgeToolkitSettingsItem = exports.getSpaceUsers = exports.getSpaceUser = exports.getDerivedSpacesWithUnrealProject = exports.getDerivedSpacesWithSpaceTemplate = exports.getSpaces = exports.getSpace = exports.getCoreweaveAvailability = exports.getOrganizationInvites = exports.getOrganizationUsers = exports.getOrganizationUser = exports.getAuthClients = exports.getAuthClient = exports.getOldOrganizationUsers = exports.getSpaceTemplateItem = exports.getSpaceTemplateItems = exports.getAllBridgeSpaceTemplates = exports.getBridgeSpaceTemplates = exports.getBridgeSpaceTemplate = exports.getSpaceTemplate = exports.getConsents = exports.getConsent = exports.getUsers = exports.getUserEmailSettings = exports.getUser = exports.getPermissions = exports.getSpaceTemplates = exports.getOrganizations = exports.getOrganization = exports.getDocAs = exports.getClientNodeImagePullDaemonsetRef = exports.getPullClientImageOnNodesRef = exports.getSpaceConfigurationBillingRef = exports.getRoomConfigurationBillingRef = exports.getOrganizationConfigurationBillingRef = exports.getConfigurationBillingRef = void 0;
exports.deleteOldConfiguratorSpaceTemplateItems = exports.deleteDeployment = exports.deleteParticipant = exports.deleteRoom = exports.deleteOrganizationUser = exports.deleteUser = exports.addRuntimeModel = exports.addSpaceItem = exports.addRoom = exports.addDeployment = exports.getEmailProvidersConfiguration = exports.getWorkloadClusterProviderConfiguration = exports.getGkeParticipantsDenormalized = exports.getUnrealProjectVersionsCollectionGroup = exports.getUnrealProjectVersions = exports.getUnrealProjectVersion = exports.getUnrealProjects = exports.getUnrealProject = exports.getUnrealPluginVersion = exports.getUnrealPluginVersions = exports.getSpaceLibraryModels = exports.getSpaceRuntimeStreams = exports.getSpaceSpatialMedias = exports.getSpaceRuntimeModels = exports.getConfiguratorItem = exports.getSpaceRuntimeStream = exports.getSpaceSpatialMedia = exports.getSpaceRuntimeModel = exports.getSpaceItem = exports.getParticipantBrowserStateUpdateWebRtc = exports.getBrowserStates = exports.getBrowserState = exports.getDeployments = exports.getDeployment = exports.getParticipantDenormalized = exports.getParticipantsDenormalized = exports.getHistoricParticipants = exports.getHistoricParticipant = exports.getSpaceStreams = exports.getSpaceStream = exports.getSpaceStreamPrivate = exports.getRoomStateChanges = exports.getParticipants = void 0;
const firebaseAdmin = __importStar(require("firebase-admin"));
const firestoreDb = firebaseAdmin.firestore();
const organizations = "organizations";
const users = "users";
const organizationUsers = "organizationUsers";
const spaceUsers = "spaceUsers";
const rooms = "rooms";
const spaces = "spaces";
const historicRooms = "historicRooms";
const participants = "participants";
const stateChanges = "stateChanges";
const billing = "billing";
const historicParticipants = "historicParticipants";
const completedParticipants = "completedParticipants";
const participantsDenormalized = "participantsDenormalized";
const deployments = "deployments";
const browserStates = "browserStates";
const system = "system";
const settings = "settings";
const operations = "operations";
const coreweaveAvailability = "coreweaveAvailability";
const versions = "versions";
const invites = "invites";
const configuration = "configuration";
const configurations = "configurations";
const odysseyClientPod = "odysseyClientPod";
const odysseyClient = "odysseyClient";
const odysseyServer = "odysseyServer";
const gkeParticipantsDenormalized = "gkeParticipantsDenormalized";
const workloadClusterProviders = "workloadClusterProviders";
const pullClientImageOnNodes = "pullClientImageOnNodes";
const clientNodeImagePullDaemonset = "clientNodeImagePullDaemonset";
const devices = "devices";
const spaceTemplates = "spaceTemplates";
const spaceTemplateItems = "spaceTemplateItems";
const spaceItems = "spaceItems";
const spaceHistory = "spaceHistory";
const spaceItemsHistoryPages = "spaceItemsHistoryPages";
const spaceStreams = "spaceStreams";
const spaceStreamPrivate = "spaceStreamPrivate";
const userEmailSettings = "userEmailSettings";
const emailProviders = "emailProviders";
const authClients = "authClients";
const browserStateUpdates = "browserStateUpdates";
const commsParticipants = "commsParticipants";
const webRtc = "webRtc";
const unrealProjects = "unrealProjects";
const unrealProject = "unrealProject";
const unrealPluginVersions = "unrealPluginVersions";
const unrealProjectVersions = "unrealProjectVersions";
const unrealProjectVersion = "unrealProjectVersion";
const consents = "consents";
const podStackStates = "podStackStates";
const products = "products";
const available = "available";
const subscription = "subscription";
const featuresOverride = "featuresOverride";
const usage = "usage";
const participantUsage = "participantUsage";
const participantUsageChecks = "participantUsageChecks";
const permissions = "permissions";
const purchases = "purchases";
const streamingCredits = "streamingCredits";
const autoTopups = "autoTopups";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BridgeToolkitSettings = "BridgeToolkitSettings";
// Wildcarded doc paths
// Used by function triggers
function wildcardDoc(docName) {
    return "/{" + docName + "}";
}
function organizationWildcardPath() {
    return "/" + organizations + wildcardDoc("organizationId");
}
exports.organizationWildcardPath = organizationWildcardPath;
function userWildcardPath() {
    return "/" + users + wildcardDoc("userId");
}
exports.userWildcardPath = userWildcardPath;
function organizationUserWildcardPath() {
    return organizationWildcardPath() + "/" + organizationUsers + wildcardDoc("userId");
}
exports.organizationUserWildcardPath = organizationUserWildcardPath;
function spaceUserWildcardPath() {
    return spaceWildcardPath() + "/" + spaceUsers + wildcardDoc("userId");
}
exports.spaceUserWildcardPath = spaceUserWildcardPath;
function roomWildcardPath() {
    return organizationWildcardPath() + "/" + rooms + wildcardDoc("roomId");
}
exports.roomWildcardPath = roomWildcardPath;
function spaceWildcardPath() {
    return organizationWildcardPath() + "/" + spaces + wildcardDoc("spaceId");
}
exports.spaceWildcardPath = spaceWildcardPath;
function participantWildcardPath() {
    return roomWildcardPath() + "/" + participants + wildcardDoc("participantId");
}
exports.participantWildcardPath = participantWildcardPath;
function roomParticipantUsageCheckWildcardPath() {
    return roomWildcardPath() + "/" + participantUsageChecks + wildcardDoc("participantUsageCheckId");
}
exports.roomParticipantUsageCheckWildcardPath = roomParticipantUsageCheckWildcardPath;
function participantUsageWildcardPath() {
    return participantWildcardPath() + "/" + usage + wildcardDoc("usageId");
}
exports.participantUsageWildcardPath = participantUsageWildcardPath;
function productsAvailablePath() {
    return getBillingProductsAvailableRef().path;
}
exports.productsAvailablePath = productsAvailablePath;
function billingPath() {
    return organizationWildcardPath() + "/" + billing;
}
exports.billingPath = billingPath;
function billingUsagePath() {
    return billingPath() + "/" + usage;
}
exports.billingUsagePath = billingUsagePath;
function billingFeaturesOverridePath() {
    return billingPath() + "/" + featuresOverride;
}
exports.billingFeaturesOverridePath = billingFeaturesOverridePath;
function billingPublicPath() {
    return billingPath() + "/" + "public";
}
exports.billingPublicPath = billingPublicPath;
function billingSubscriptionPath() {
    return billingPath() + "/" + subscription;
}
exports.billingSubscriptionPath = billingSubscriptionPath;
function billingPurchasesPath() {
    return billingPath() + "/" + purchases;
}
exports.billingPurchasesPath = billingPurchasesPath;
function streamingCreditsPurchaseWildcardPath() {
    return billingPurchasesPath() + "/" + streamingCredits + wildcardDoc("streamingCreditsPurchaseId");
}
exports.streamingCreditsPurchaseWildcardPath = streamingCreditsPurchaseWildcardPath;
function autoTopupPurchaseWildcardPath() {
    return billingPurchasesPath() + "/" + autoTopups + wildcardDoc("autoTopupId");
}
exports.autoTopupPurchaseWildcardPath = autoTopupPurchaseWildcardPath;
function browserStateUpdateWebRtcWildcardPath() {
    return participantWildcardPath() + "/" + browserStateUpdates + "/" + webRtc;
}
exports.browserStateUpdateWebRtcWildcardPath = browserStateUpdateWebRtcWildcardPath;
function participantDenormalizedWildcardPath() {
    return roomWildcardPath() + "/" + participantsDenormalized + wildcardDoc("participantId");
}
exports.participantDenormalizedWildcardPath = participantDenormalizedWildcardPath;
function deploymentWildcardPath() {
    return participantWildcardPath() + "/" + deployments + wildcardDoc("deploymentId");
}
exports.deploymentWildcardPath = deploymentWildcardPath;
function unrealProjectWildcardPath() {
    return "/" + unrealProjects + wildcardDoc("unrealProjectId");
}
exports.unrealProjectWildcardPath = unrealProjectWildcardPath;
function unrealPluginVersionWildcardPath() {
    return "/" + unrealPluginVersions + wildcardDoc("unrealPluginVersionId");
}
exports.unrealPluginVersionWildcardPath = unrealPluginVersionWildcardPath;
function unrealProjectVersionWildcardPath() {
    return unrealProjectWildcardPath() + "/" + unrealProjectVersions + wildcardDoc("unrealProjectVersionId");
}
exports.unrealProjectVersionWildcardPath = unrealProjectVersionWildcardPath;
function deviceWildcardPath() {
    return userWildcardPath() + "/" + devices + wildcardDoc("deviceId");
}
exports.deviceWildcardPath = deviceWildcardPath;
function organizationInviteWildcardPath() {
    return organizationWildcardPath() + "/" + invites + wildcardDoc("inviteId");
}
exports.organizationInviteWildcardPath = organizationInviteWildcardPath;
function spaceInviteWildcardPath() {
    return spaceWildcardPath() + "/" + invites + wildcardDoc("inviteId");
}
exports.spaceInviteWildcardPath = spaceInviteWildcardPath;
function operationsWildcardPath() {
    return "/" + system + "/" + operations;
}
exports.operationsWildcardPath = operationsWildcardPath;
function spaceTemplateWildcardPath() {
    return "/" + spaceTemplates + wildcardDoc("spaceTemplateId");
}
exports.spaceTemplateWildcardPath = spaceTemplateWildcardPath;
function spaceTemplateItemWildcardPath() {
    return spaceTemplateWildcardPath() + "/" + spaceTemplateItems + wildcardDoc("spaceItemId");
}
exports.spaceTemplateItemWildcardPath = spaceTemplateItemWildcardPath;
function spaceItemWildcardPath() {
    return spaceWildcardPath() + "/" + spaceItems + wildcardDoc("spaceItemId");
}
exports.spaceItemWildcardPath = spaceItemWildcardPath;
function pullClientImageOnNodesWildcardPath() {
    return operationsWildcardPath() + "/" + pullClientImageOnNodes + wildcardDoc("docId");
}
exports.pullClientImageOnNodesWildcardPath = pullClientImageOnNodesWildcardPath;
// Get Refs
function getOrganizationsRef() {
    return firestoreDb.collection(organizations);
}
exports.getOrganizationsRef = getOrganizationsRef;
function getCompletedParticipantsRef() {
    return firestoreDb.collection(completedParticipants);
}
exports.getCompletedParticipantsRef = getCompletedParticipantsRef;
function getCompletedParticipantRef(participantId) {
    return getCompletedParticipantsRef().doc(participantId);
}
exports.getCompletedParticipantRef = getCompletedParticipantRef;
function getOrganizationRef(organizationId) {
    return getOrganizationsRef().doc(organizationId);
}
exports.getOrganizationRef = getOrganizationRef;
function getAuthClientsRef() {
    return firestoreDb.collection(authClients);
}
exports.getAuthClientsRef = getAuthClientsRef;
function getAuthClientRef(authClientId) {
    return getAuthClientsRef().doc(authClientId);
}
exports.getAuthClientRef = getAuthClientRef;
function getPermissionsRef() {
    return firestoreDb.collection(permissions);
}
exports.getPermissionsRef = getPermissionsRef;
function getPermissionRef(userRole) {
    return getPermissionsRef().doc(userRole);
}
exports.getPermissionRef = getPermissionRef;
function getUsersRef() {
    return firestoreDb.collection(users);
}
exports.getUsersRef = getUsersRef;
function getUserRef(userId) {
    return getUsersRef().doc(userId);
}
exports.getUserRef = getUserRef;
function getConsentsRef() {
    return firestoreDb.collection(consents);
}
exports.getConsentsRef = getConsentsRef;
function getConsentRef(consentId) {
    return getConsentsRef().doc(consentId);
}
exports.getConsentRef = getConsentRef;
function getSpaceTemplatesRef() {
    return firestoreDb.collection(spaceTemplates);
}
exports.getSpaceTemplatesRef = getSpaceTemplatesRef;
function getSpaceTemplateRef(spaceTemplateId) {
    return getSpaceTemplatesRef().doc(spaceTemplateId);
}
exports.getSpaceTemplateRef = getSpaceTemplateRef;
function getSpaceTemplateItemsRef(spaceTemplateId) {
    return getSpaceTemplatesRef().doc(spaceTemplateId).collection(spaceTemplateItems);
}
exports.getSpaceTemplateItemsRef = getSpaceTemplateItemsRef;
function getSpaceTemplateItemRef(spaceTemplateId, spaceItemId) {
    return getSpaceTemplateItemsRef(spaceTemplateId).doc(spaceItemId);
}
exports.getSpaceTemplateItemRef = getSpaceTemplateItemRef;
function getOrganizationOdysseyClientPodRef(organizationId) {
    return getOrganizationRef(organizationId).collection(configurations).doc(odysseyClientPod);
}
exports.getOrganizationOdysseyClientPodRef = getOrganizationOdysseyClientPodRef;
function getOrganizationOdysseyServerRef(organizationId) {
    return getOrganizationRef(organizationId).collection(configurations).doc(odysseyServer);
}
exports.getOrganizationOdysseyServerRef = getOrganizationOdysseyServerRef;
function getRoomsRef(organizationId) {
    return getOrganizationRef(organizationId).collection(rooms);
}
exports.getRoomsRef = getRoomsRef;
function getRoomRef(organizationId, roomId) {
    return getOrganizationRef(organizationId).collection(rooms).doc(roomId);
}
exports.getRoomRef = getRoomRef;
function getSpacesRef(organizationId) {
    return getOrganizationRef(organizationId).collection(spaces);
}
exports.getSpacesRef = getSpacesRef;
function getSpaceRef(organizationId, spaceId) {
    return getOrganizationRef(organizationId).collection(spaces).doc(spaceId);
}
exports.getSpaceRef = getSpaceRef;
function getDerivedSpacesRefWithSpaceTemplate(spaceTemplateId) {
    return firestoreDb.collectionGroup(spaces).where("spaceTemplateId", "==", spaceTemplateId);
}
exports.getDerivedSpacesRefWithSpaceTemplate = getDerivedSpacesRefWithSpaceTemplate;
function getDerivedSpacesRefWithUnrealProject(unrealProjectId) {
    return firestoreDb.collectionGroup(spaces).where("unrealProject.unrealProjectId", "==", unrealProjectId);
}
exports.getDerivedSpacesRefWithUnrealProject = getDerivedSpacesRefWithUnrealProject;
function getProductsRef() {
    return firestoreDb.collection(products);
}
exports.getProductsRef = getProductsRef;
function getBillingProductsAvailableRef() {
    return getProductsRef().doc(available);
}
exports.getBillingProductsAvailableRef = getBillingProductsAvailableRef;
function getBillingRef(organizationId) {
    return getOrganizationRef(organizationId).collection(billing);
}
exports.getBillingRef = getBillingRef;
function getBillingSubscriptionRef(organizationId) {
    return getBillingRef(organizationId).doc(subscription);
}
exports.getBillingSubscriptionRef = getBillingSubscriptionRef;
function getBillingPublicRef(organizationId) {
    return getBillingRef(organizationId).doc("public");
}
exports.getBillingPublicRef = getBillingPublicRef;
function getBillingPurchasesRef(organizationId) {
    return getBillingRef(organizationId).doc(purchases);
}
exports.getBillingPurchasesRef = getBillingPurchasesRef;
function getBillingStreamingCreditsPurchasesRef(organizationId) {
    return getBillingPurchasesRef(organizationId).collection(streamingCredits);
}
exports.getBillingStreamingCreditsPurchasesRef = getBillingStreamingCreditsPurchasesRef;
function getBillingAutoTopupsRef(organizationId) {
    return getBillingPurchasesRef(organizationId).collection(autoTopups);
}
exports.getBillingAutoTopupsRef = getBillingAutoTopupsRef;
function getBillingAutoTopupRef(organizationId, autoTopupId) {
    return getBillingAutoTopupsRef(organizationId).doc(autoTopupId);
}
exports.getBillingAutoTopupRef = getBillingAutoTopupRef;
function getBillingstreamingCreditsPurchaseRef(organizationId, streamingCreditsPurchaseId) {
    return getBillingStreamingCreditsPurchasesRef(organizationId).doc(streamingCreditsPurchaseId);
}
exports.getBillingstreamingCreditsPurchaseRef = getBillingstreamingCreditsPurchaseRef;
function getBillingFeaturesOverrideRef(organizationId) {
    return getBillingRef(organizationId).doc(featuresOverride);
}
exports.getBillingFeaturesOverrideRef = getBillingFeaturesOverrideRef;
function getBillingDayRef(organizationId, day) {
    // day format: "YYYY-MM-DD"
    return getBillingRef(organizationId).doc(day);
}
exports.getBillingDayRef = getBillingDayRef;
function getBillingUsageRef(organizationId) {
    return getBillingRef(organizationId).doc(usage);
}
exports.getBillingUsageRef = getBillingUsageRef;
function getBillingUsageDayRef(organizationId, day) {
    // day format: "YYYY-MM-DD"
    return getBillingRef(organizationId).doc(usage + "-" + day);
}
exports.getBillingUsageDayRef = getBillingUsageDayRef;
function getBillingUsageMonthRef(organizationId, month) {
    // month format: "YYYY-MM"
    return getBillingRef(organizationId).doc(usage + "-" + month);
}
exports.getBillingUsageMonthRef = getBillingUsageMonthRef;
function getBillingUsageHourRef(organizationId, hour) {
    // hour format: "YYYY-MM-DD-HH"
    return getBillingRef(organizationId).doc(usage + "-" + hour);
}
exports.getBillingUsageHourRef = getBillingUsageHourRef;
function getHistoricRoomsRef(organizationId) {
    return getOrganizationRef(organizationId).collection(historicRooms);
}
exports.getHistoricRoomsRef = getHistoricRoomsRef;
function getHistoricRoomRef(organizationId, roomId) {
    return getOrganizationRef(organizationId).collection(historicRooms).doc(roomId);
}
exports.getHistoricRoomRef = getHistoricRoomRef;
function getUserEmailSettingsRef(email) {
    return firestoreDb.collection(userEmailSettings).doc(email);
}
exports.getUserEmailSettingsRef = getUserEmailSettingsRef;
function getOrganizationUsersRef(organizationId) {
    return getOrganizationRef(organizationId).collection(organizationUsers);
}
exports.getOrganizationUsersRef = getOrganizationUsersRef;
function getOrganizationUserRef(organizationId, userId) {
    return getOrganizationUsersRef(organizationId).doc(userId);
}
exports.getOrganizationUserRef = getOrganizationUserRef;
function getOrganizationInvitesRef(organizationId) {
    return getOrganizationRef(organizationId).collection(invites);
}
exports.getOrganizationInvitesRef = getOrganizationInvitesRef;
function getOrganizationInviteRef(organizationId, inviteId) {
    return getOrganizationInvitesRef(organizationId).doc(inviteId);
}
exports.getOrganizationInviteRef = getOrganizationInviteRef;
function getOrganizationSpacesRef(organizationId) {
    return getOrganizationRef(organizationId).collection(spaces);
}
exports.getOrganizationSpacesRef = getOrganizationSpacesRef;
function getOrganizationSpaceRef(organizationId, spaceId) {
    return getOrganizationSpacesRef(organizationId).doc(spaceId);
}
exports.getOrganizationSpaceRef = getOrganizationSpaceRef;
function getOrganizationSpaceInvitesRef(organizationId, spaceId) {
    return getOrganizationSpaceRef(organizationId, spaceId).collection(invites);
}
exports.getOrganizationSpaceInvitesRef = getOrganizationSpaceInvitesRef;
function getOrganizationSpaceInviteRef(organizationId, spaceId, inviteId) {
    return getOrganizationSpaceInvitesRef(organizationId, spaceId).doc(inviteId);
}
exports.getOrganizationSpaceInviteRef = getOrganizationSpaceInviteRef;
function getSpaceUsersRef(organizationId, spaceId) {
    return getSpaceRef(organizationId, spaceId).collection(spaceUsers);
}
exports.getSpaceUsersRef = getSpaceUsersRef;
function getSpaceUserRef(organizationId, spaceId, userId) {
    return getSpaceUsersRef(organizationId, spaceId).doc(userId);
}
exports.getSpaceUserRef = getSpaceUserRef;
function getUserConfigurationOdysseyClientPodRef(userId) {
    return getUserRef(userId).collection(configurations).doc(odysseyClientPod);
}
exports.getUserConfigurationOdysseyClientPodRef = getUserConfigurationOdysseyClientPodRef;
function getOrganizationUserConfigurationOdysseyClientPodRef(organizationId, userId) {
    return getOrganizationUserRef(organizationId, userId).collection(configurations).doc(odysseyClientPod);
}
exports.getOrganizationUserConfigurationOdysseyClientPodRef = getOrganizationUserConfigurationOdysseyClientPodRef;
function getRoomConfigurationOdysseyServerRef(organizationId, roomId) {
    return getRoomRef(organizationId, roomId).collection(configurations).doc(odysseyServer);
}
exports.getRoomConfigurationOdysseyServerRef = getRoomConfigurationOdysseyServerRef;
function getRoomConfigurationOdysseyClientPodRef(organizationId, roomId) {
    return getRoomRef(organizationId, roomId).collection(configurations).doc(odysseyClientPod);
}
exports.getRoomConfigurationOdysseyClientPodRef = getRoomConfigurationOdysseyClientPodRef;
function getSpaceConfigurationOdysseyServerRef(organizationId, spaceId) {
    return getSpaceRef(organizationId, spaceId).collection(configurations).doc(odysseyServer);
}
exports.getSpaceConfigurationOdysseyServerRef = getSpaceConfigurationOdysseyServerRef;
function getSpaceConfigurationOdysseyClientPodRef(organizationId, spaceId) {
    return getSpaceRef(organizationId, spaceId).collection(configurations).doc(odysseyClientPod);
}
exports.getSpaceConfigurationOdysseyClientPodRef = getSpaceConfigurationOdysseyClientPodRef;
function getDevicesRef(userId) {
    return getUserRef(userId).collection(devices);
}
exports.getDevicesRef = getDevicesRef;
function getDeviceRef(userId, deviceId) {
    return getDevicesRef(userId).doc(deviceId);
}
exports.getDeviceRef = getDeviceRef;
function getParticipantsRef(organizationId, roomId) {
    return getRoomRef(organizationId, roomId).collection(participants);
}
exports.getParticipantsRef = getParticipantsRef;
function getParticipantRef(organizationId, roomId, participantId) {
    return getParticipantsRef(organizationId, roomId).doc(participantId);
}
exports.getParticipantRef = getParticipantRef;
function getRoomStateChangesRef(organizationId, roomId) {
    return getRoomRef(organizationId, roomId).collection(stateChanges);
}
exports.getRoomStateChangesRef = getRoomStateChangesRef;
function getRoomStateChangeRef(organizationId, roomId, roomStateChangeId) {
    return getRoomStateChangesRef(organizationId, roomId).doc(roomStateChangeId);
}
exports.getRoomStateChangeRef = getRoomStateChangeRef;
function getParticipantUsageChecksRef(organizationId, roomId) {
    return getRoomRef(organizationId, roomId).collection(participantUsageChecks);
}
exports.getParticipantUsageChecksRef = getParticipantUsageChecksRef;
function getParticipantUsageCheckRef(organizationId, roomId, participantUsageCheckId) {
    return getParticipantUsageChecksRef(organizationId, roomId).doc(participantUsageCheckId);
}
exports.getParticipantUsageCheckRef = getParticipantUsageCheckRef;
function getPodStackStatesRef(organizationId, roomId, participantId, deploymentId) {
    return getDeploymentRef(organizationId, roomId, participantId, deploymentId).collection(podStackStates);
}
exports.getPodStackStatesRef = getPodStackStatesRef;
function getPodStackStateRef(organizationId, roomId, participantId, deploymentId, podStackStateId) {
    return getPodStackStatesRef(organizationId, roomId, participantId, deploymentId).doc(podStackStateId);
}
exports.getPodStackStateRef = getPodStackStateRef;
function getStateChangesRef(organizationId, roomId) {
    return getRoomRef(organizationId, roomId).collection(stateChanges);
}
exports.getStateChangesRef = getStateChangesRef;
function getStateChangeRef(organizationId, roomId, stateChangeId) {
    return getStateChangesRef(organizationId, roomId).doc(stateChangeId);
}
exports.getStateChangeRef = getStateChangeRef;
function getHistoricParticipantsRef(organizationId, roomId) {
    return getHistoricRoomRef(organizationId, roomId).collection(historicParticipants);
}
exports.getHistoricParticipantsRef = getHistoricParticipantsRef;
function getHistoricParticipantRef(organizationId, roomId, participantId) {
    return getHistoricParticipantsRef(organizationId, roomId).doc(participantId);
}
exports.getHistoricParticipantRef = getHistoricParticipantRef;
function getDeploymentsRef(organizationId, roomId, participantId) {
    return getParticipantRef(organizationId, roomId, participantId).collection(deployments);
}
exports.getDeploymentsRef = getDeploymentsRef;
function getDeploymentRef(organizationId, roomId, participantId, deploymentId) {
    return getDeploymentsRef(organizationId, roomId, participantId).doc(deploymentId);
}
exports.getDeploymentRef = getDeploymentRef;
function getBrowserStatesRef(organizationId, roomId, participantId) {
    return getParticipantRef(organizationId, roomId, participantId).collection(browserStates);
}
exports.getBrowserStatesRef = getBrowserStatesRef;
function getBrowserStateRef(organizationId, roomId, participantId, browserStateId) {
    return getBrowserStatesRef(organizationId, roomId, participantId).doc(browserStateId);
}
exports.getBrowserStateRef = getBrowserStateRef;
function getParticipantUsageCollectionRef(organizationId, roomId, participantId) {
    return getParticipantRef(organizationId, roomId, participantId).collection(participantUsage);
}
exports.getParticipantUsageCollectionRef = getParticipantUsageCollectionRef;
function getParticipantUsageRef(organizationId, roomId, participantId, participantUsageId) {
    return getParticipantUsageCollectionRef(organizationId, roomId, participantId).doc(participantUsageId);
}
exports.getParticipantUsageRef = getParticipantUsageRef;
function getParticipantBrowserStateUpdateWebRtcRef(organizationId, roomId, participantId) {
    return getParticipantRef(organizationId, roomId, participantId).collection(browserStateUpdates).doc(webRtc);
}
exports.getParticipantBrowserStateUpdateWebRtcRef = getParticipantBrowserStateUpdateWebRtcRef;
function getCommsParticipantRef(organizationId, roomId, participantId) {
    return getCommsParticipantsRef(organizationId, roomId).doc(participantId);
}
exports.getCommsParticipantRef = getCommsParticipantRef;
function getCommsParticipantsRef(organizationId, roomId) {
    return getRoomRef(organizationId, roomId).collection(commsParticipants);
}
exports.getCommsParticipantsRef = getCommsParticipantsRef;
function getParticipantDenormalizedRef(organizationId, roomId, participantId) {
    return getParticipantsDenormalizedRef(organizationId, roomId).doc(participantId);
}
exports.getParticipantDenormalizedRef = getParticipantDenormalizedRef;
function getParticipantsDenormalizedRef(organizationId, roomId) {
    return getRoomRef(organizationId, roomId).collection(participantsDenormalized);
}
exports.getParticipantsDenormalizedRef = getParticipantsDenormalizedRef;
function getSettingsRef() {
    return firebaseAdmin.firestore().collection("/" + settings);
}
exports.getSettingsRef = getSettingsRef;
function getSpaceItemRef(organizationId, spaceId, spaceItemId) {
    return getSpaceItemsRef(organizationId, spaceId).doc(spaceItemId);
}
exports.getSpaceItemRef = getSpaceItemRef;
function getSpaceItemsRef(organizationId, spaceId) {
    return getSpaceRef(organizationId, spaceId).collection(spaceItems);
}
exports.getSpaceItemsRef = getSpaceItemsRef;
function getSpaceHistoryCollectionRef(organizationId, spaceId) {
    return getSpaceRef(organizationId, spaceId).collection(spaceHistory);
}
exports.getSpaceHistoryCollectionRef = getSpaceHistoryCollectionRef;
function getSpaceHistoryRef(organizationId, spaceId, spaceHistoryId) {
    return getSpaceHistoryCollectionRef(organizationId, spaceId).doc(spaceHistoryId);
}
exports.getSpaceHistoryRef = getSpaceHistoryRef;
function getSpaceItemsHistoryPagesRef(organizationId, spaceId, spaceHistoryId) {
    return getSpaceHistoryRef(organizationId, spaceId, spaceHistoryId).collection(spaceItemsHistoryPages);
}
exports.getSpaceItemsHistoryPagesRef = getSpaceItemsHistoryPagesRef;
function getSpaceItemsHistoryPageRef(organizationId, spaceId, spaceHistoryId, spaceItemsHistoryPageId) {
    return getSpaceItemsHistoryPagesRef(organizationId, spaceId, spaceHistoryId).doc(spaceItemsHistoryPageId);
}
exports.getSpaceItemsHistoryPageRef = getSpaceItemsHistoryPageRef;
function getBridgeToolkitSettingsRef(organizationId, spaceId) {
    return getSpaceItemsRef(organizationId, spaceId).doc(BridgeToolkitSettings);
}
exports.getBridgeToolkitSettingsRef = getBridgeToolkitSettingsRef;
function getSpaceStreamsRef(organizationId, spaceId) {
    return getSpaceRef(organizationId, spaceId).collection(spaceStreams);
}
exports.getSpaceStreamsRef = getSpaceStreamsRef;
function getSpaceStreamRef(organizationId, spaceId, spaceStreamId) {
    return getSpaceStreamsRef(organizationId, spaceId).doc(spaceStreamId);
}
exports.getSpaceStreamRef = getSpaceStreamRef;
function getSpaceStreamPrivateRef(organizationId, spaceId, spaceStreamId) {
    return getSpaceStreamsRef(organizationId, spaceId).doc(spaceStreamId).collection(spaceStreamPrivate).doc("0");
}
exports.getSpaceStreamPrivateRef = getSpaceStreamPrivateRef;
function getUnrealPluginVersionsRef() {
    return firestoreDb.collection(unrealPluginVersions);
}
exports.getUnrealPluginVersionsRef = getUnrealPluginVersionsRef;
function getUnrealPluginVersionRef(pluginVersionId) {
    return getUnrealPluginVersionsRef().doc(pluginVersionId);
}
exports.getUnrealPluginVersionRef = getUnrealPluginVersionRef;
function getUnrealProjectsRef() {
    return firestoreDb.collection(unrealProjects);
}
exports.getUnrealProjectsRef = getUnrealProjectsRef;
function getUnrealProjectRef(unrealProjectId) {
    return getUnrealProjectsRef().doc(unrealProjectId);
}
exports.getUnrealProjectRef = getUnrealProjectRef;
function getUnrealProjectVersionsRef(unrealProjectId) {
    return getUnrealProjectRef(unrealProjectId).collection(unrealProjectVersions);
}
exports.getUnrealProjectVersionsRef = getUnrealProjectVersionsRef;
function getUnrealProjectVersionsCollectionGroupRef() {
    return firestoreDb.collectionGroup(unrealProjectVersions);
}
exports.getUnrealProjectVersionsCollectionGroupRef = getUnrealProjectVersionsCollectionGroupRef;
function getUnrealProjectVersionRef(unrealProjectId, unrealProjectVersionId) {
    return getUnrealProjectVersionsRef(unrealProjectId).doc(unrealProjectVersionId);
}
exports.getUnrealProjectVersionRef = getUnrealProjectVersionRef;
// System refs
function getSystemRef() {
    return firestoreDb.collection(system);
}
exports.getSystemRef = getSystemRef;
function getOperationsRef() {
    return getSystemRef().doc(operations);
}
exports.getOperationsRef = getOperationsRef;
function getConfigurationRef() {
    return getSystemRef().doc(configuration);
}
exports.getConfigurationRef = getConfigurationRef;
function getVersionsRef() {
    return getSystemRef().doc(versions);
}
exports.getVersionsRef = getVersionsRef;
function getConfigurationsRef() {
    return getConfigurationRef().collection(configurations);
}
exports.getConfigurationsRef = getConfigurationsRef;
function getCoreweaveAvailabilityRef() {
    return getOperationsRef().collection(coreweaveAvailability).doc("0");
}
exports.getCoreweaveAvailabilityRef = getCoreweaveAvailabilityRef;
function getOdysseyClientVersionsRef() {
    return getVersionsRef().collection(odysseyClient);
}
exports.getOdysseyClientVersionsRef = getOdysseyClientVersionsRef;
function getOdysseyServerVersionsRef() {
    return getVersionsRef().collection(odysseyServer);
}
exports.getOdysseyServerVersionsRef = getOdysseyServerVersionsRef;
function getGkeParticipantsDenormalizedRef(gkeAccelerator) {
    return getOperationsRef().collection(gkeParticipantsDenormalized).doc(gkeAccelerator);
}
exports.getGkeParticipantsDenormalizedRef = getGkeParticipantsDenormalizedRef;
function getWorkloadClusterProvidersRef() {
    return getConfigurationRef().collection(workloadClusterProviders);
}
exports.getWorkloadClusterProvidersRef = getWorkloadClusterProvidersRef;
function getWorkloadClusterProviderConfigurationRef(workloadClusterProvider) {
    return getWorkloadClusterProvidersRef().doc(workloadClusterProvider);
}
exports.getWorkloadClusterProviderConfigurationRef = getWorkloadClusterProviderConfigurationRef;
function getEmailProvidersConfigurationRef() {
    return getConfigurationsRef().doc(emailProviders);
}
exports.getEmailProvidersConfigurationRef = getEmailProvidersConfigurationRef;
function getOdysseyClientPodRef() {
    return getConfigurationsRef().doc(odysseyClientPod);
}
exports.getOdysseyClientPodRef = getOdysseyClientPodRef;
function getConfigurationUnrealProjectVersionRef(opts) {
    const baseRef = (() => {
        switch (opts.location) {
            case "root": return getConfigurationRef();
            case "organization": return getOrganizationRef(opts.organizationId);
            case "unrealProject": return getUnrealProjectRef(opts.unrealProjectId);
            case "unrealProjectVersion": return getUnrealProjectVersionRef(opts.unrealProjectId, opts.unrealProjectVersionId);
            case "authorUser": return getUserRef(opts.userId);
        }
    })();
    return baseRef.collection(configurations).doc(unrealProjectVersion);
}
exports.getConfigurationUnrealProjectVersionRef = getConfigurationUnrealProjectVersionRef;
function getConfigurationUnrealProjectRef() {
    return getConfigurationsRef().doc(unrealProject);
}
exports.getConfigurationUnrealProjectRef = getConfigurationUnrealProjectRef;
function getOdysseyServerRef() {
    return getConfigurationsRef().doc(odysseyServer);
}
exports.getOdysseyServerRef = getOdysseyServerRef;
function getConfigurationBillingRef() {
    return getConfigurationsRef().doc(billing);
}
exports.getConfigurationBillingRef = getConfigurationBillingRef;
function getOrganizationConfigurationBillingRef(organizationId) {
    return getOrganizationRef(organizationId).collection(configurations).doc(billing);
}
exports.getOrganizationConfigurationBillingRef = getOrganizationConfigurationBillingRef;
function getRoomConfigurationBillingRef(organizationId, roomId) {
    return getRoomRef(organizationId, roomId).collection(configurations).doc(billing);
}
exports.getRoomConfigurationBillingRef = getRoomConfigurationBillingRef;
function getSpaceConfigurationBillingRef(organizationId, spaceId) {
    return getSpaceRef(organizationId, spaceId).collection(configurations).doc(billing);
}
exports.getSpaceConfigurationBillingRef = getSpaceConfigurationBillingRef;
function getPullClientImageOnNodesRef() {
    return getOperationsRef().collection(pullClientImageOnNodes);
}
exports.getPullClientImageOnNodesRef = getPullClientImageOnNodesRef;
function getClientNodeImagePullDaemonsetRef() {
    return getOperationsRef().collection(clientNodeImagePullDaemonset);
}
exports.getClientNodeImagePullDaemonsetRef = getClientNodeImagePullDaemonsetRef;
// Generic getter functions with Result type wrapper
async function getDocAs(docRef) {
    return await docRef.get()
        .then((doc) => {
        return [doc, doc.data()];
    })
        .catch((e) => {
        console.error(`Failed to get doc due to exception:\n?${e}`);
        return [undefined, undefined];
    });
}
exports.getDocAs = getDocAs;
async function getDocsAs(collectionRef, conditions) {
    function addQueryConditions(collectionRef, conditions) {
        if (conditions == undefined)
            return collectionRef;
        const condition = conditions.pop();
        if (condition == undefined)
            return collectionRef;
        const newCollectionRef = addQueryConditions(collectionRef.where(condition.fieldPath, condition.opStr, condition.value), conditions);
        return addQueryConditions(newCollectionRef, conditions);
    }
    const query = addQueryConditions(collectionRef, conditions);
    return await query.get()
        .then((r) => {
        return r.docs.map((doc) => {
            return [doc, doc.data()];
        });
    })
        .catch((e) => {
        console.error(`Failed to get collection due to exception:\n?${e}`);
        return undefined;
    });
}
// Get
async function getOrganization(organizationId) {
    return await getDocAs(getOrganizationRef(organizationId));
}
exports.getOrganization = getOrganization;
async function getOrganizations() {
    return await getDocsAs(getOrganizationsRef());
}
exports.getOrganizations = getOrganizations;
async function getSpaceTemplates() {
    return await getDocsAs(getSpaceTemplatesRef());
}
exports.getSpaceTemplates = getSpaceTemplates;
async function getPermissions(userRole) {
    return await getDocAs(getPermissionRef(userRole));
}
exports.getPermissions = getPermissions;
async function getUser(userId) {
    return await getDocAs(getUserRef(userId));
}
exports.getUser = getUser;
async function getUserEmailSettings(email) {
    return await getDocAs(getUserEmailSettingsRef(email));
}
exports.getUserEmailSettings = getUserEmailSettings;
// BUG: Use RootUser type for getUsers
async function getUsers() {
    return await getDocsAs(getUsersRef());
}
exports.getUsers = getUsers;
async function getConsent(consentId) {
    return await getDocAs(getConsentRef(consentId));
}
exports.getConsent = getConsent;
async function getConsents() {
    return await getDocsAs(getConsentsRef());
}
exports.getConsents = getConsents;
async function getSpaceTemplate(spaceTemplateId) {
    return await getDocAs(getSpaceTemplateRef(spaceTemplateId));
}
exports.getSpaceTemplate = getSpaceTemplate;
async function getBridgeSpaceTemplate(spaceTemplateId) {
    return await getDocAs(getSpaceTemplateRef(spaceTemplateId));
}
exports.getBridgeSpaceTemplate = getBridgeSpaceTemplate;
async function getBridgeSpaceTemplates(unrealProjectId) {
    return await getDocsAs(getSpaceTemplatesRef(), [{ fieldPath: "type", opStr: "==", value: "Bridge" }, { fieldPath: "unrealProject.unrealProjectId", opStr: "==", value: unrealProjectId }]);
}
exports.getBridgeSpaceTemplates = getBridgeSpaceTemplates;
async function getAllBridgeSpaceTemplates(options) {
    const expressions = [{ fieldPath: "type", opStr: "==", value: "Bridge" }];
    if ((options === null || options === void 0 ? void 0 : options.publicOnly) == true) {
        expressions.push({ fieldPath: "public", opStr: "==", value: true });
    }
    return await getDocsAs(getSpaceTemplatesRef(), expressions);
}
exports.getAllBridgeSpaceTemplates = getAllBridgeSpaceTemplates;
async function getSpaceTemplateItems(spaceTemplateId) {
    return await getDocsAs(getSpaceTemplateItemsRef(spaceTemplateId));
}
exports.getSpaceTemplateItems = getSpaceTemplateItems;
async function getSpaceTemplateItem(spaceTemplateId, spaceItemId) {
    return await getDocAs(getSpaceTemplateItemRef(spaceTemplateId, spaceItemId));
}
exports.getSpaceTemplateItem = getSpaceTemplateItem;
async function getOldOrganizationUsers(organizationId) {
    return await getDocsAs(getOrganizationRef(organizationId).collection(users));
}
exports.getOldOrganizationUsers = getOldOrganizationUsers;
async function getAuthClient(authClientId) {
    return await getDocAs(getAuthClientRef(authClientId));
}
exports.getAuthClient = getAuthClient;
async function getAuthClients() {
    return await getDocsAs(getAuthClientsRef());
}
exports.getAuthClients = getAuthClients;
async function getOrganizationUser(organizationId, userId) {
    return await getDocAs(getOrganizationUserRef(organizationId, userId));
}
exports.getOrganizationUser = getOrganizationUser;
async function getOrganizationUsers(organizationId) {
    return await getDocsAs(getOrganizationUsersRef(organizationId));
}
exports.getOrganizationUsers = getOrganizationUsers;
async function getOrganizationInvites(organizationId) {
    return await getDocsAs(getOrganizationInvitesRef(organizationId));
}
exports.getOrganizationInvites = getOrganizationInvites;
async function getCoreweaveAvailability() {
    return await getDocAs(getCoreweaveAvailabilityRef());
}
exports.getCoreweaveAvailability = getCoreweaveAvailability;
async function getSpace(organizationId, spaceId) {
    return await getDocAs(getSpaceRef(organizationId, spaceId));
}
exports.getSpace = getSpace;
async function getSpaces(organizationId) {
    return await getDocsAs(getSpacesRef(organizationId));
}
exports.getSpaces = getSpaces;
async function getDerivedSpacesWithSpaceTemplate(spaceTemplateId) {
    return await getDocsAs(getDerivedSpacesRefWithSpaceTemplate(spaceTemplateId));
}
exports.getDerivedSpacesWithSpaceTemplate = getDerivedSpacesWithSpaceTemplate;
async function getDerivedSpacesWithUnrealProject(unrealProjectId) {
    return await getDocsAs(getDerivedSpacesRefWithUnrealProject(unrealProjectId));
}
exports.getDerivedSpacesWithUnrealProject = getDerivedSpacesWithUnrealProject;
async function getSpaceUser(organizationId, spaceId, userId) {
    return await getDocAs(getSpaceUserRef(organizationId, spaceId, userId));
}
exports.getSpaceUser = getSpaceUser;
async function getSpaceUsers(organizationId, spaceId) {
    return await getDocsAs(getSpaceUsersRef(organizationId, spaceId));
}
exports.getSpaceUsers = getSpaceUsers;
async function getBridgeToolkitSettingsItem(organizationId, spaceId) {
    return await getDocAs(getBridgeToolkitSettingsRef(organizationId, spaceId));
}
exports.getBridgeToolkitSettingsItem = getBridgeToolkitSettingsItem;
async function getSpaceItems(organizationId, spaceId) {
    return await getDocsAs(getSpaceItemsRef(organizationId, spaceId));
}
exports.getSpaceItems = getSpaceItems;
async function getDevice(userId, deviceId) {
    return await getDocAs(getDeviceRef(userId, deviceId));
}
exports.getDevice = getDevice;
async function getDevices(userId) {
    return await getDocsAs(getDevicesRef(userId));
}
exports.getDevices = getDevices;
async function getRoom(organizationId, roomId) {
    return await getDocAs(getRoomRef(organizationId, roomId));
}
exports.getRoom = getRoom;
async function getHistoricRoom(organizationId, roomId) {
    return await getDocAs(getHistoricRoomRef(organizationId, roomId));
}
exports.getHistoricRoom = getHistoricRoom;
async function getBillingProductsAvailable() {
    return await getDocAs(getBillingProductsAvailableRef());
}
exports.getBillingProductsAvailable = getBillingProductsAvailable;
async function getBillingDay(organizationId, day) {
    // day format: "YYYY-MM-DD"
    return await getDocAs(getBillingDayRef(organizationId, day));
}
exports.getBillingDay = getBillingDay;
async function getBillingSubscription(organizationId) {
    return await getDocAs(getBillingSubscriptionRef(organizationId));
}
exports.getBillingSubscription = getBillingSubscription;
async function getBillingPublic(organizationId) {
    return await getDocAs(getBillingPublicRef(organizationId));
}
exports.getBillingPublic = getBillingPublic;
async function getBillingUsage(organizationId) {
    return await getDocAs(getBillingUsageRef(organizationId));
}
exports.getBillingUsage = getBillingUsage;
async function getBillingFeaturesOverride(organizationId) {
    return await getDocAs(getBillingFeaturesOverrideRef(organizationId));
}
exports.getBillingFeaturesOverride = getBillingFeaturesOverride;
async function getRooms(organizationId) {
    return await getDocsAs(getRoomsRef(organizationId));
}
exports.getRooms = getRooms;
async function getHistoricRooms(organizationId) {
    return await getDocsAs(getHistoricRoomsRef(organizationId));
}
exports.getHistoricRooms = getHistoricRooms;
async function getParticipant(organizationId, roomId, participantId) {
    return await getDocAs(getParticipantRef(organizationId, roomId, participantId));
}
exports.getParticipant = getParticipant;
async function getParticipants(organizationId, roomId) {
    return await getDocsAs(getParticipantsRef(organizationId, roomId));
}
exports.getParticipants = getParticipants;
async function getRoomStateChanges(organizationId, roomId) {
    return await getDocsAs(getParticipantsRef(organizationId, roomId));
}
exports.getRoomStateChanges = getRoomStateChanges;
async function getSpaceStreamPrivate(organizationId, spaceId, spaceStreamId) {
    return await getDocAs(getSpaceStreamPrivateRef(organizationId, spaceId, spaceStreamId));
}
exports.getSpaceStreamPrivate = getSpaceStreamPrivate;
async function getSpaceStream(organizationId, spaceId, spaceStreamId) {
    return await getDocAs(getSpaceStreamRef(organizationId, spaceId, spaceStreamId));
}
exports.getSpaceStream = getSpaceStream;
async function getSpaceStreams(organizationId, spaceId) {
    return await getDocsAs(getSpaceStreamsRef(organizationId, spaceId));
}
exports.getSpaceStreams = getSpaceStreams;
async function getHistoricParticipant(organizationId, roomId, participantId) {
    return await getDocAs(getHistoricParticipantRef(organizationId, roomId, participantId));
}
exports.getHistoricParticipant = getHistoricParticipant;
async function getHistoricParticipants(organizationId, roomId) {
    return await getDocsAs(getHistoricParticipantsRef(organizationId, roomId));
}
exports.getHistoricParticipants = getHistoricParticipants;
async function getParticipantsDenormalized(organizationId, roomId) {
    return await getDocsAs(getParticipantsDenormalizedRef(organizationId, roomId));
}
exports.getParticipantsDenormalized = getParticipantsDenormalized;
async function getParticipantDenormalized(organizationId, roomId, participantId) {
    return await getDocAs(getParticipantDenormalizedRef(organizationId, roomId, participantId));
}
exports.getParticipantDenormalized = getParticipantDenormalized;
async function getDeployment(organizationId, roomId, participantId, deploymentId) {
    return await getDocAs(getDeploymentRef(organizationId, roomId, participantId, deploymentId));
}
exports.getDeployment = getDeployment;
async function getDeployments(organizationId, roomId, participantId) {
    return await getDocsAs(getDeploymentsRef(organizationId, roomId, participantId));
}
exports.getDeployments = getDeployments;
async function getBrowserState(organizationId, roomId, participantId, browserStateId) {
    return await getDocAs(getBrowserStateRef(organizationId, roomId, participantId, browserStateId));
}
exports.getBrowserState = getBrowserState;
async function getBrowserStates(organizationId, roomId, participantId) {
    return await getDocsAs(getBrowserStatesRef(organizationId, roomId, participantId));
}
exports.getBrowserStates = getBrowserStates;
async function getParticipantBrowserStateUpdateWebRtc(organizationId, roomId, participantId) {
    return await getDocAs(getParticipantBrowserStateUpdateWebRtcRef(organizationId, roomId, participantId));
}
exports.getParticipantBrowserStateUpdateWebRtc = getParticipantBrowserStateUpdateWebRtc;
async function getSpaceItem(organizationId, spaceId, spaceItemId) {
    return await getDocAs(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}
exports.getSpaceItem = getSpaceItem;
async function getSpaceRuntimeModel(organizationId, spaceId, spaceItemId) {
    return await getDocAs(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}
exports.getSpaceRuntimeModel = getSpaceRuntimeModel;
async function getSpaceSpatialMedia(organizationId, spaceId, spaceItemId) {
    return await getDocAs(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}
exports.getSpaceSpatialMedia = getSpaceSpatialMedia;
async function getSpaceRuntimeStream(organizationId, spaceId, spaceItemId) {
    return await getDocAs(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}
exports.getSpaceRuntimeStream = getSpaceRuntimeStream;
async function getConfiguratorItem(organizationId, spaceId, spaceItemId) {
    return await getDocAs(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}
exports.getConfiguratorItem = getConfiguratorItem;
async function getSpaceRuntimeModels(organizationId, spaceId) {
    return await getDocsAs(getSpaceItemsRef(organizationId, spaceId), [{ fieldPath: "type", opStr: "==", value: "RuntimeModel" }]);
}
exports.getSpaceRuntimeModels = getSpaceRuntimeModels;
async function getSpaceSpatialMedias(organizationId, spaceId) {
    return await getDocsAs(getSpaceItemsRef(organizationId, spaceId), [{ fieldPath: "type", opStr: "==", value: "SpatialMedia" }]);
}
exports.getSpaceSpatialMedias = getSpaceSpatialMedias;
async function getSpaceRuntimeStreams(organizationId, spaceId) {
    return await getDocsAs(getSpaceItemsRef(organizationId, spaceId), [{ fieldPath: "type", opStr: "==", value: "RuntimeStream" }]);
}
exports.getSpaceRuntimeStreams = getSpaceRuntimeStreams;
async function getSpaceLibraryModels(organizationId, spaceId) {
    return await getDocsAs(getSpaceItemsRef(organizationId, spaceId), [{ fieldPath: "type", opStr: "==", value: "LibraryModel" }]);
}
exports.getSpaceLibraryModels = getSpaceLibraryModels;
async function getUnrealPluginVersions() {
    return await getDocsAs(getUnrealPluginVersionsRef());
}
exports.getUnrealPluginVersions = getUnrealPluginVersions;
async function getUnrealPluginVersion(unrealPluginVersionId) {
    return await getDocAs(getUnrealPluginVersionRef(unrealPluginVersionId));
}
exports.getUnrealPluginVersion = getUnrealPluginVersion;
async function getUnrealProject(unrealProjectId) {
    return await getDocAs(getUnrealProjectRef(unrealProjectId));
}
exports.getUnrealProject = getUnrealProject;
async function getUnrealProjects() {
    return await getDocsAs(getUnrealProjectsRef());
}
exports.getUnrealProjects = getUnrealProjects;
async function getUnrealProjectVersion(unrealProjectId, unrealProjectVersionId) {
    return await getDocAs(getUnrealProjectVersionRef(unrealProjectId, unrealProjectVersionId));
}
exports.getUnrealProjectVersion = getUnrealProjectVersion;
async function getUnrealProjectVersions(unrealProjectId, conditions = []) {
    return await getDocsAs(getUnrealProjectVersionsRef(unrealProjectId), conditions);
}
exports.getUnrealProjectVersions = getUnrealProjectVersions;
async function getUnrealProjectVersionsCollectionGroup(conditions = []) {
    return await getDocsAs(getUnrealProjectVersionsCollectionGroupRef(), conditions);
}
exports.getUnrealProjectVersionsCollectionGroup = getUnrealProjectVersionsCollectionGroup;
// Get System
async function getGkeParticipantsDenormalized(gkeAccelerator) {
    return await getDocAs(getGkeParticipantsDenormalizedRef(gkeAccelerator));
}
exports.getGkeParticipantsDenormalized = getGkeParticipantsDenormalized;
async function getWorkloadClusterProviderConfiguration(workloadClusterProvider) {
    return getDocAs(getWorkloadClusterProviderConfigurationRef(workloadClusterProvider));
}
exports.getWorkloadClusterProviderConfiguration = getWorkloadClusterProviderConfiguration;
async function getEmailProvidersConfiguration() {
    return getDocAs(getEmailProvidersConfigurationRef());
}
exports.getEmailProvidersConfiguration = getEmailProvidersConfiguration;
// Add
async function addDeployment(organizationId, roomId, participantId, deployment) {
    return await getDeploymentsRef(organizationId, roomId, participantId).add(deployment);
}
exports.addDeployment = addDeployment;
async function addRoom(organizationId, room) {
    return await getRoomsRef(organizationId).add(room);
}
exports.addRoom = addRoom;
async function addSpaceItem(organizationId, spaceId, spaceItem) {
    return await getSpaceItemsRef(organizationId, spaceId).add(spaceItem);
}
exports.addSpaceItem = addSpaceItem;
async function addRuntimeModel(organizationId, spaceId, runtimeModel) {
    return await getSpaceItemsRef(organizationId, spaceId).add(runtimeModel);
}
exports.addRuntimeModel = addRuntimeModel;
// Delete
async function deleteUser(userId) {
    return await getUserRef(userId).delete();
}
exports.deleteUser = deleteUser;
async function deleteOrganizationUser(organizationId, userId) {
    return await getOrganizationUserRef(organizationId, userId).delete();
}
exports.deleteOrganizationUser = deleteOrganizationUser;
async function deleteRoom(organizationId, roomId) {
    return await getRoomRef(organizationId, roomId).delete();
}
exports.deleteRoom = deleteRoom;
async function deleteParticipant(organizationId, roomId, participantId) {
    return await getParticipantRef(organizationId, roomId, participantId).delete();
}
exports.deleteParticipant = deleteParticipant;
async function deleteDeployment(organizationId, roomId, participantId, deploymentId) {
    return await getDeploymentRef(organizationId, roomId, participantId, deploymentId).delete();
}
exports.deleteDeployment = deleteDeployment;
async function deleteOldConfiguratorSpaceTemplateItems(spaceTemplateId, currentItems) {
    return (await getSpaceTemplateItemsRef(spaceTemplateId)
        .where("type", "==", "Configurator")
        .where("itemTemplateId", "not-in", currentItems)
        .get()).docs.forEach((doc) => {
        if (doc.exists)
            doc.ref.delete();
    });
}
exports.deleteOldConfiguratorSpaceTemplateItems = deleteOldConfiguratorSpaceTemplateItems;
//# sourceMappingURL=firestore.js.map