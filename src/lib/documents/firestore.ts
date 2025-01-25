import * as firebaseAdmin from "firebase-admin";
import * as docTypes from "../docTypes";
import * as systemDocTypes from "../systemDocTypes";
import * as cmsDocTypes from "../cmsDocTypes";

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

export type GetFirestoreDocResult<T> = [FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | undefined, T | undefined];

// Wildcarded doc paths
// Used by function triggers

function wildcardDoc(docName: string) {
  return "/{" + docName + "}";
}

export function organizationWildcardPath() {
  return "/" + organizations + wildcardDoc("organizationId");
}

export function userWildcardPath() {
  return "/" + users + wildcardDoc("userId");
}

export function organizationUserWildcardPath() {
  return organizationWildcardPath() + "/" + organizationUsers + wildcardDoc("userId");
}

export function spaceUserWildcardPath() {
  return spaceWildcardPath() + "/" + spaceUsers + wildcardDoc("userId");
}

export function roomWildcardPath() {
  return organizationWildcardPath() + "/" + rooms + wildcardDoc("roomId");
}

export function spaceWildcardPath() {
  return organizationWildcardPath() + "/" + spaces + wildcardDoc("spaceId");
}

export function participantWildcardPath() {
  return roomWildcardPath() + "/" + participants + wildcardDoc("participantId");
}

export function roomParticipantUsageCheckWildcardPath() {
  return roomWildcardPath() + "/" + participantUsageChecks + wildcardDoc("participantUsageCheckId");
}

export function participantUsageWildcardPath() {
  return participantWildcardPath() + "/" + usage + wildcardDoc("usageId");
}

export function productsAvailablePath() {
  return getBillingProductsAvailableRef().path;
}

export function billingPath() {
  return organizationWildcardPath() + "/" + billing;
}

export function billingUsagePath() {
  return billingPath() + "/" + usage;
}

export function billingFeaturesOverridePath() {
  return billingPath() + "/" + featuresOverride;
}

export function billingPublicPath() {
  return billingPath() + "/" + "public";
}

export function billingSubscriptionPath() {
  return billingPath() + "/" + subscription;
}

export function billingPurchasesPath() {
  return billingPath() + "/" + purchases;
}

export function streamingCreditsPurchaseWildcardPath() {
  return billingPurchasesPath() + "/" + streamingCredits + wildcardDoc("streamingCreditsPurchaseId");
}

export function autoTopupPurchaseWildcardPath() {
  return billingPurchasesPath() + "/" + autoTopups + wildcardDoc("autoTopupId");
}

export function browserStateUpdateWebRtcWildcardPath() {
  return participantWildcardPath() + "/" + browserStateUpdates + "/" + webRtc;
}

export function participantDenormalizedWildcardPath() {
  return roomWildcardPath() + "/" + participantsDenormalized + wildcardDoc("participantId");
}

export function deploymentWildcardPath() {
  return participantWildcardPath() + "/" + deployments + wildcardDoc("deploymentId");
}

export function unrealProjectWildcardPath() {
  return "/" + unrealProjects + wildcardDoc("unrealProjectId");
}

export function unrealPluginVersionWildcardPath() {
  return "/" + unrealPluginVersions + wildcardDoc("unrealPluginVersionId");
}

export function unrealProjectVersionWildcardPath() {
  return unrealProjectWildcardPath() + "/" + unrealProjectVersions + wildcardDoc("unrealProjectVersionId");
}

export function deviceWildcardPath() {
  return userWildcardPath() + "/" + devices + wildcardDoc("deviceId");
}

export function organizationInviteWildcardPath() {
  return organizationWildcardPath() + "/" + invites + wildcardDoc("inviteId");
}

export function spaceInviteWildcardPath() {
  return spaceWildcardPath() + "/" + invites + wildcardDoc("inviteId");
}

export function operationsWildcardPath() {
  return "/" + system + "/" + operations;
}

export function spaceTemplateWildcardPath() {
  return "/" + spaceTemplates + wildcardDoc("spaceTemplateId");
}

export function spaceTemplateItemWildcardPath() {
  return spaceTemplateWildcardPath() + "/" + spaceTemplateItems + wildcardDoc("spaceItemId");
}

export function spaceItemWildcardPath() {
  return spaceWildcardPath() + "/" + spaceItems + wildcardDoc("spaceItemId");
}

export function pullClientImageOnNodesWildcardPath() {
  return operationsWildcardPath() + "/" + pullClientImageOnNodes + wildcardDoc("docId");
}

// Get Refs

export function getOrganizationsRef() {
  return firestoreDb.collection(organizations);
}
export function getCompletedParticipantsRef() {
  return firestoreDb.collection(completedParticipants);
}

export function getCompletedParticipantRef(participantId: string) {
  return getCompletedParticipantsRef().doc(participantId);
}

export function getOrganizationRef(organizationId: string) {
  return getOrganizationsRef().doc(organizationId);
}

export function getAuthClientsRef() {
  return firestoreDb.collection(authClients);
}

export function getAuthClientRef(authClientId: string) {
  return getAuthClientsRef().doc(authClientId);
}

export function getPermissionsRef() {
  return firestoreDb.collection(permissions);
}

export function getPermissionRef(userRole: docTypes.UserRoles) {
  return getPermissionsRef().doc(userRole);
}

export function getUsersRef() {
  return firestoreDb.collection(users);
}

export function getUserRef(userId: string) {
  return getUsersRef().doc(userId);
}

export function getConsentsRef() {
  return firestoreDb.collection(consents);
}

export function getConsentRef(consentId: string) {
  return getConsentsRef().doc(consentId);
}

export function getSpaceTemplatesRef() {
  return firestoreDb.collection(spaceTemplates);
}

export function getSpaceTemplateRef(spaceTemplateId: string) {
  return getSpaceTemplatesRef().doc(spaceTemplateId);
}

export function getSpaceTemplateItemsRef(spaceTemplateId: string) {
  return getSpaceTemplatesRef().doc(spaceTemplateId).collection(spaceTemplateItems);
}

export function getSpaceTemplateItemRef(spaceTemplateId: string, spaceItemId: string) {
  return getSpaceTemplateItemsRef(spaceTemplateId).doc(spaceItemId);
}

export function getOrganizationOdysseyClientPodRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(configurations).doc(odysseyClientPod);
}

export function getOrganizationOdysseyServerRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(configurations).doc(odysseyServer);
}

export function getRoomsRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(rooms);
}

export function getRoomRef(organizationId: string, roomId: string) {
  return getOrganizationRef(organizationId).collection(rooms).doc(roomId);
}

export function getSpacesRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(spaces);
}

export function getSpaceRef(organizationId: string, spaceId: string) {
  return getOrganizationRef(organizationId).collection(spaces).doc(spaceId);
}

export function getDerivedSpacesRefWithSpaceTemplate(spaceTemplateId: string) {
  return firestoreDb.collectionGroup(spaces).where("spaceTemplateId", "==", spaceTemplateId);
}

export function getDerivedSpacesRefWithUnrealProject(unrealProjectId: string) {
  return firestoreDb.collectionGroup(spaces).where("unrealProject.unrealProjectId", "==", unrealProjectId);
}

export function getProductsRef() {
  return firestoreDb.collection(products);
}

export function getBillingProductsAvailableRef() {
  return getProductsRef().doc(available);
}

export function getBillingRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(billing);
}

export function getBillingSubscriptionRef(organizationId: string) {
  return getBillingRef(organizationId).doc(subscription);
}

export function getBillingPublicRef(organizationId: string) {
  return getBillingRef(organizationId).doc("public");
}

export function getBillingPurchasesRef(organizationId: string) {
  return getBillingRef(organizationId).doc(purchases);
}

export function getBillingStreamingCreditsPurchasesRef(organizationId: string) {
  return getBillingPurchasesRef(organizationId).collection(streamingCredits);
}

export function getBillingAutoTopupsRef(organizationId: string) {
  return getBillingPurchasesRef(organizationId).collection(autoTopups);
}

export function getBillingAutoTopupRef(organizationId: string, autoTopupId: string) {
  return getBillingAutoTopupsRef(organizationId).doc(autoTopupId);
}

export function getBillingstreamingCreditsPurchaseRef(organizationId: string, streamingCreditsPurchaseId: string) {
  return getBillingStreamingCreditsPurchasesRef(organizationId).doc(streamingCreditsPurchaseId);
}

export function getBillingFeaturesOverrideRef(organizationId: string) {
  return getBillingRef(organizationId).doc(featuresOverride);
}

export function getBillingDayRef(organizationId: string, day: string) {
  // day format: "YYYY-MM-DD"
  return getBillingRef(organizationId).doc(day);
}

export function getBillingUsageRef(organizationId: string) {
  return getBillingRef(organizationId).doc(usage);
}

export function getBillingUsageDayRef(organizationId: string, day: string) {
  // day format: "YYYY-MM-DD"
  return getBillingRef(organizationId).doc(usage + "-" + day);
}

export function getBillingUsageMonthRef(organizationId: string, month: string) {
  // month format: "YYYY-MM"
  return getBillingRef(organizationId).doc(usage + "-" + month);
}

export function getBillingUsageHourRef(organizationId: string, hour: string) {
  // hour format: "YYYY-MM-DD-HH"
  return getBillingRef(organizationId).doc(usage + "-" + hour);
}

export function getHistoricRoomsRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(historicRooms);
}

export function getHistoricRoomRef(organizationId: string, roomId: string) {
  return getOrganizationRef(organizationId).collection(historicRooms).doc(roomId);
}

export function getUserEmailSettingsRef(email: string) {
  return firestoreDb.collection(userEmailSettings).doc(email);
}

export function getOrganizationUsersRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(organizationUsers);
}

export function getOrganizationUserRef(organizationId: string, userId: string) {
  return getOrganizationUsersRef(organizationId).doc(userId);
}

export function getOrganizationInvitesRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(invites);
}

export function getOrganizationInviteRef(organizationId: string, inviteId: string) {
  return getOrganizationInvitesRef(organizationId).doc(inviteId);
}

export function getOrganizationSpacesRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(spaces);
}

export function getOrganizationSpaceRef(organizationId: string, spaceId: string) {
  return getOrganizationSpacesRef(organizationId).doc(spaceId);
}

export function getOrganizationSpaceInvitesRef(organizationId: string, spaceId: string) {
  return getOrganizationSpaceRef(organizationId, spaceId).collection(invites);
}

export function getOrganizationSpaceInviteRef(organizationId: string, spaceId: string, inviteId: string) {
  return getOrganizationSpaceInvitesRef(organizationId, spaceId).doc(inviteId);
}

export function getSpaceUsersRef(organizationId: string, spaceId: string) {
  return getSpaceRef(organizationId, spaceId).collection(spaceUsers);
}

export function getSpaceUserRef(organizationId: string, spaceId: string, userId: string) {
  return getSpaceUsersRef(organizationId, spaceId).doc(userId);
}

export function getUserConfigurationOdysseyClientPodRef(userId: string) {
  return getUserRef(userId).collection(configurations).doc(odysseyClientPod);
}

export function getOrganizationUserConfigurationOdysseyClientPodRef(organizationId: string, userId: string) {
  return getOrganizationUserRef(organizationId, userId).collection(configurations).doc(odysseyClientPod);
}

export function getRoomConfigurationOdysseyServerRef(organizationId: string, roomId: string) {
  return getRoomRef(organizationId, roomId).collection(configurations).doc(odysseyServer);
}

export function getRoomConfigurationOdysseyClientPodRef(organizationId: string, roomId: string) {
  return getRoomRef(organizationId, roomId).collection(configurations).doc(odysseyClientPod);
}

export function getSpaceConfigurationOdysseyServerRef(organizationId: string, spaceId: string) {
  return getSpaceRef(organizationId, spaceId).collection(configurations).doc(odysseyServer);
}

export function getSpaceConfigurationOdysseyClientPodRef(organizationId: string, spaceId: string) {
  return getSpaceRef(organizationId, spaceId).collection(configurations).doc(odysseyClientPod);
}

export function getDevicesRef(userId: string) {
  return getUserRef(userId).collection(devices);
}

export function getDeviceRef(userId: string, deviceId: string) {
  return getDevicesRef(userId).doc(deviceId);
}

export function getParticipantsRef(organizationId: string, roomId: string) {
  return getRoomRef(organizationId, roomId).collection(participants);
}

export function getParticipantRef(organizationId: string, roomId: string, participantId: string) {
  return getParticipantsRef(organizationId, roomId).doc(participantId);
}

export function getRoomStateChangesRef(organizationId: string, roomId: string) {
  return getRoomRef(organizationId, roomId).collection(stateChanges);
}

export function getRoomStateChangeRef(organizationId: string, roomId: string, roomStateChangeId: string) {
  return getRoomStateChangesRef(organizationId, roomId).doc(roomStateChangeId);
}

export function getParticipantUsageChecksRef(organizationId: string, roomId: string) {
  return getRoomRef(organizationId, roomId).collection(participantUsageChecks);
}

export function getParticipantUsageCheckRef(organizationId: string, roomId: string, participantUsageCheckId: string) {
  return getParticipantUsageChecksRef(organizationId, roomId).doc(participantUsageCheckId);
}

export function getPodStackStatesRef(organizationId: string, roomId: string, participantId: string, deploymentId: string) {
  return getDeploymentRef(organizationId, roomId, participantId, deploymentId).collection(podStackStates);
}

export function getPodStackStateRef(organizationId: string, roomId: string, participantId: string, deploymentId: string, podStackStateId: string) {
  return getPodStackStatesRef(organizationId, roomId, participantId, deploymentId).doc(podStackStateId);
}

export function getStateChangesRef(organizationId: string, roomId: string) {
  return getRoomRef(organizationId, roomId).collection(stateChanges);
}

export function getStateChangeRef(organizationId: string, roomId: string, stateChangeId: string) {
  return getStateChangesRef(organizationId, roomId).doc(stateChangeId);
}

export function getHistoricParticipantsRef(organizationId: string, roomId: string) {
  return getHistoricRoomRef(organizationId, roomId).collection(historicParticipants);
}

export function getHistoricParticipantRef(organizationId: string, roomId: string, participantId: string) {
  return getHistoricParticipantsRef(organizationId, roomId).doc(participantId);
}

export function getDeploymentsRef(organizationId: string, roomId: string, participantId: string) {
  return getParticipantRef(organizationId, roomId, participantId).collection(deployments);
}

export function getDeploymentRef(organizationId: string, roomId: string, participantId: string, deploymentId: string) {
  return getDeploymentsRef(organizationId, roomId, participantId).doc(deploymentId);
}

export function getBrowserStatesRef(organizationId: string, roomId: string, participantId: string) {
  return getParticipantRef(organizationId, roomId, participantId).collection(browserStates);
}

export function getBrowserStateRef(organizationId: string, roomId: string, participantId: string, browserStateId: string) {
  return getBrowserStatesRef(organizationId, roomId, participantId).doc(browserStateId);
}

export function getParticipantUsageCollectionRef(organizationId: string, roomId: string, participantId: string) {
  return getParticipantRef(organizationId, roomId, participantId).collection(participantUsage);
}

export function getParticipantUsageRef(organizationId: string, roomId: string, participantId: string, participantUsageId: string) {
  return getParticipantUsageCollectionRef(organizationId, roomId, participantId).doc(participantUsageId);
}

export function getParticipantBrowserStateUpdateWebRtcRef(organizationId: string, roomId: string, participantId: string) {
  return getParticipantRef(organizationId, roomId, participantId).collection(browserStateUpdates).doc(webRtc);
}

export function getCommsParticipantRef(organizationId: string, roomId: string, participantId: string) {
  return getCommsParticipantsRef(organizationId, roomId).doc(participantId);
}

export function getCommsParticipantsRef(organizationId: string, roomId: string) {
  return getRoomRef(organizationId, roomId).collection(commsParticipants);
}

export function getParticipantDenormalizedRef(organizationId: string, roomId: string, participantId: string) {
  return getParticipantsDenormalizedRef(organizationId, roomId).doc(participantId);
}

export function getParticipantsDenormalizedRef(organizationId: string, roomId: string) {
  return getRoomRef(organizationId, roomId).collection(participantsDenormalized);
}

export function getSettingsRef() {
  return firebaseAdmin.firestore().collection("/" + settings);
}

export function getSpaceItemRef(organizationId: string, spaceId: string, spaceItemId: string) {
  return getSpaceItemsRef(organizationId, spaceId).doc(spaceItemId);
}

export function getSpaceItemsRef(organizationId: string, spaceId: string) {
  return getSpaceRef(organizationId, spaceId).collection(spaceItems);
}

export function getSpaceHistoryCollectionRef(organizationId: string, spaceId: string) {
  return getSpaceRef(organizationId, spaceId).collection(spaceHistory);
}

export function getSpaceHistoryRef(organizationId: string, spaceId: string, spaceHistoryId: string) {
  return getSpaceHistoryCollectionRef(organizationId, spaceId).doc(spaceHistoryId);
}

export function getSpaceItemsHistoryPagesRef(organizationId: string, spaceId: string, spaceHistoryId: string) {
  return getSpaceHistoryRef(organizationId, spaceId, spaceHistoryId).collection(spaceItemsHistoryPages);
}

export function getSpaceItemsHistoryPageRef(organizationId: string, spaceId: string, spaceHistoryId: string, spaceItemsHistoryPageId: string) {
  return getSpaceItemsHistoryPagesRef(organizationId, spaceId, spaceHistoryId).doc(spaceItemsHistoryPageId);
}

export function getBridgeToolkitSettingsRef(organizationId: string, spaceId: string) {
  return getSpaceItemsRef(organizationId, spaceId).doc(BridgeToolkitSettings);
}

export function getSpaceStreamsRef(organizationId: string, spaceId: string) {
  return getSpaceRef(organizationId, spaceId).collection(spaceStreams);
}

export function getSpaceStreamRef(organizationId: string, spaceId: string, spaceStreamId: string) {
  return getSpaceStreamsRef(organizationId, spaceId).doc(spaceStreamId);
}

export function getSpaceStreamPrivateRef(organizationId: string, spaceId: string, spaceStreamId: string) {
  return getSpaceStreamsRef(organizationId, spaceId).doc(spaceStreamId).collection(spaceStreamPrivate).doc("0");
}

export function getUnrealPluginVersionsRef() {
  return firestoreDb.collection(unrealPluginVersions);
}

export function getUnrealPluginVersionRef(pluginVersionId: string) {
  return getUnrealPluginVersionsRef().doc(pluginVersionId);
}

export function getUnrealProjectsRef() {
  return firestoreDb.collection(unrealProjects);
}

export function getUnrealProjectRef(unrealProjectId: string) {
  return getUnrealProjectsRef().doc(unrealProjectId);
}

export function getUnrealProjectVersionsRef(unrealProjectId:string) {
  return getUnrealProjectRef(unrealProjectId).collection(unrealProjectVersions);
}

export function getUnrealProjectVersionsCollectionGroupRef() {
  return firestoreDb.collectionGroup(unrealProjectVersions);
}

export function getUnrealProjectVersionRef(unrealProjectId: string, unrealProjectVersionId: string) {
  return getUnrealProjectVersionsRef(unrealProjectId).doc(unrealProjectVersionId);
}


// System refs

export function getSystemRef() {
  return firestoreDb.collection(system);
}

export function getOperationsRef() {
  return getSystemRef().doc(operations);
}

export function getConfigurationRef() {
  return getSystemRef().doc(configuration);
}

export function getVersionsRef() {
  return getSystemRef().doc(versions);
}

export function getConfigurationsRef() {
  return getConfigurationRef().collection(configurations);
}

export function getCoreweaveAvailabilityRef() {
  return getOperationsRef().collection(coreweaveAvailability).doc("0");
}

export function getOdysseyClientVersionsRef() {
  return getVersionsRef().collection(odysseyClient);
}

export function getOdysseyServerVersionsRef() {
  return getVersionsRef().collection(odysseyServer);
}

export function getGkeParticipantsDenormalizedRef(gkeAccelerator: systemDocTypes.GkeAccelerator) {
  return getOperationsRef().collection(gkeParticipantsDenormalized).doc(gkeAccelerator);
}

export function getWorkloadClusterProvidersRef() {
  return getConfigurationRef().collection(workloadClusterProviders);
}

export function getWorkloadClusterProviderConfigurationRef(workloadClusterProvider: systemDocTypes.ClusterProvider) {
  return getWorkloadClusterProvidersRef().doc(workloadClusterProvider);
}

export function getEmailProvidersConfigurationRef() {
  return getConfigurationsRef().doc(emailProviders);
}

export function getOdysseyClientPodRef() {
  return getConfigurationsRef().doc(odysseyClientPod);
}

type ConfigurationUnrealProjectVersionOps =
| { location: "unrealProjectVersion", unrealProjectId: string, unrealProjectVersionId: string }
| { location: "unrealProject", unrealProjectId: string }
| { location: "organization", organizationId: string }
| { location: "authorUser", userId: string }
| { location: "root"}

export function getConfigurationUnrealProjectVersionRef(opts: ConfigurationUnrealProjectVersionOps) {
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

export function getConfigurationUnrealProjectRef() {
  return getConfigurationsRef().doc(unrealProject);
}

export function getOdysseyServerRef() {
  return getConfigurationsRef().doc(odysseyServer);
}

export function getConfigurationBillingRef() {
  return getConfigurationsRef().doc(billing);
}

export function getOrganizationConfigurationBillingRef(organizationId: string) {
  return getOrganizationRef(organizationId).collection(configurations).doc(billing);
}

export function getRoomConfigurationBillingRef(organizationId: string, roomId: string) {
  return getRoomRef(organizationId, roomId).collection(configurations).doc(billing);
}

export function getSpaceConfigurationBillingRef(organizationId: string, spaceId: string) {
  return getSpaceRef(organizationId, spaceId).collection(configurations).doc(billing);
}

export function getPullClientImageOnNodesRef() {
  return getOperationsRef().collection(pullClientImageOnNodes);
}

export function getClientNodeImagePullDaemonsetRef() {
  return getOperationsRef().collection(clientNodeImagePullDaemonset);
}

// Generic getter functions with Result type wrapper

export async function getDocAs<T>(docRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>) : Promise<GetFirestoreDocResult<T>> {
  return await docRef.get()
    .then((doc) => {
      return [doc, doc.data() as T] as GetFirestoreDocResult<T>;
    })
    .catch((e: any) => {
      console.error(`Failed to get doc due to exception:\n?${e}`);
      return [undefined, undefined] as GetFirestoreDocResult<T>;
    });
}

interface QueryWhere {
  fieldPath: string | FirebaseFirestore.FieldPath,
  opStr: FirebaseFirestore.WhereFilterOp,
  value: any
}

async function getDocsAs<T>(collectionRef: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData> | FirebaseFirestore.Query<FirebaseFirestore.DocumentData>, conditions?: QueryWhere[] ) : Promise<GetFirestoreDocResult<T>[] | undefined> {
  function addQueryConditions(collectionRef: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>, conditions: QueryWhere[] | undefined) : FirebaseFirestore.Query<FirebaseFirestore.DocumentData> {
    if (conditions == undefined) return collectionRef;
    const condition = conditions.pop();
    if (condition == undefined) return collectionRef;
    const newCollectionRef = addQueryConditions(collectionRef.where(condition.fieldPath, condition.opStr, condition.value), conditions);
    return addQueryConditions(newCollectionRef, conditions);
  }

  const query = addQueryConditions(collectionRef, conditions);
  return await query.get()
    .then((r) => {
      return r.docs.map((doc) => {
        return [doc, doc.data() as T] as GetFirestoreDocResult<T>;
      });
    })
    .catch((e: any) => {
      console.error(`Failed to get collection due to exception:\n?${e}`);
      return undefined;
    });
}

// Get

export async function getOrganization(organizationId: string) {
  return await getDocAs<docTypes.Organization>(getOrganizationRef(organizationId));
}

export async function getOrganizations() {
  return await getDocsAs<docTypes.Organization>(getOrganizationsRef());
}

export async function getSpaceTemplates() {
  return await getDocsAs<cmsDocTypes.SpaceTemplate>(getSpaceTemplatesRef());
}

export async function getPermissions(userRole: docTypes.UserRoles) {
  return await getDocAs<docTypes.RolePermissions>(getPermissionRef(userRole));
}

export async function getUser(userId: string) {
  return await getDocAs<docTypes.RootUser>(getUserRef(userId));
}

export async function getUserEmailSettings(email: string) {
  return await getDocAs<systemDocTypes.UserEmailSettings>(getUserEmailSettingsRef(email));
}

// BUG: Use RootUser type for getUsers
export async function getUsers() {
  return await getDocsAs<docTypes.User>(getUsersRef());
}

export async function getConsent(consentId: string) {
  return await getDocAs<docTypes.Consent>(getConsentRef(consentId));
}

export async function getConsents() {
  return await getDocsAs<docTypes.Consent>(getConsentsRef());
}

export async function getSpaceTemplate(spaceTemplateId: string) {
  return await getDocAs<cmsDocTypes.SpaceTemplate>(getSpaceTemplateRef(spaceTemplateId));
}

export async function getBridgeSpaceTemplate(spaceTemplateId: string) {
  return await getDocAs<cmsDocTypes.BridgeSpaceTemplate>(getSpaceTemplateRef(spaceTemplateId));
}

export async function getBridgeSpaceTemplates(unrealProjectId: string) {
  return await getDocsAs<cmsDocTypes.BridgeSpaceTemplate>(getSpaceTemplatesRef(), [{fieldPath: "type", opStr: "==", value: "Bridge"}, {fieldPath: "unrealProject.unrealProjectId", opStr: "==", value: unrealProjectId}]);
}

export async function getAllBridgeSpaceTemplates(options?: {publicOnly?: boolean}) {
  const expressions : QueryWhere[] = [{fieldPath: "type", opStr: "==", value: "Bridge"}];
  if (options?.publicOnly == true) {
    expressions.push({fieldPath: "public", opStr: "==", value: true});
  }
  return await getDocsAs<cmsDocTypes.BridgeSpaceTemplate>(getSpaceTemplatesRef(), expressions);
}

export async function getSpaceTemplateItems(spaceTemplateId: string) {
  return await getDocsAs<cmsDocTypes.SpaceItem>(getSpaceTemplateItemsRef(spaceTemplateId));
}

export async function getSpaceTemplateItem(spaceTemplateId: string, spaceItemId: string) {
  return await getDocAs<cmsDocTypes.SpaceItem>(getSpaceTemplateItemRef(spaceTemplateId, spaceItemId));
}

export async function getOldOrganizationUsers(organizationId: string) {
  return await getDocsAs<docTypes.OldOrganizationUser>(getOrganizationRef(organizationId).collection(users));
}

export async function getAuthClient(authClientId: string) {
  return await getDocAs<docTypes.AuthClient>(getAuthClientRef(authClientId));
}

export async function getAuthClients() {
  return await getDocsAs<docTypes.AuthClient>(getAuthClientsRef());
}

export async function getOrganizationUser(organizationId: string, userId: string) {
  return await getDocAs<docTypes.OrganizationUser>(getOrganizationUserRef(organizationId, userId));
}

export async function getOrganizationUsers(organizationId: string) {
  return await getDocsAs<docTypes.OrganizationUser>(getOrganizationUsersRef(organizationId));
}

export async function getOrganizationInvites(organizationId: string) {
  return await getDocsAs<docTypes.Invite>(getOrganizationInvitesRef(organizationId));
}

export async function getCoreweaveAvailability() {
  return await getDocAs<systemDocTypes.CoreweaveRegionsAvailability>(getCoreweaveAvailabilityRef());
}

export async function getSpace(organizationId: string, spaceId: string) {
  return await getDocAs<cmsDocTypes.OrgSpace>(getSpaceRef(organizationId, spaceId));
}

export async function getSpaces(organizationId: string) {
  return await getDocsAs<cmsDocTypes.OrgSpace>(getSpacesRef(organizationId));
}

export async function getDerivedSpacesWithSpaceTemplate(spaceTemplateId: string) {
  return await getDocsAs<cmsDocTypes.OrgSpace>(getDerivedSpacesRefWithSpaceTemplate(spaceTemplateId));
}

export async function getDerivedSpacesWithUnrealProject(unrealProjectId: string) {
  return await getDocsAs<cmsDocTypes.OrgSpace>(getDerivedSpacesRefWithUnrealProject(unrealProjectId));
}

export async function getSpaceUser(organizationId: string, spaceId: string, userId: string) {
  return await getDocAs<docTypes.SpaceUser>(getSpaceUserRef(organizationId, spaceId, userId));
}

export async function getSpaceUsers(organizationId: string, spaceId: string) {
  return await getDocsAs<docTypes.SpaceUser>(getSpaceUsersRef(organizationId, spaceId));
}

export async function getBridgeToolkitSettingsItem(organizationId: string, spaceId: string) {
  return await getDocAs<cmsDocTypes.BridgeToolkitSettings>(getBridgeToolkitSettingsRef(organizationId, spaceId));
}

export async function getSpaceItems(organizationId: string, spaceId: string) {
  return await getDocsAs<cmsDocTypes.SpaceItem>(getSpaceItemsRef(organizationId, spaceId));
}

export async function getDevice(userId: string, deviceId: string) {
  return await getDocAs<docTypes.Device>(getDeviceRef(userId, deviceId));
}

export async function getDevices(userId: string) {
  return await getDocsAs<docTypes.Device>(getDevicesRef(userId));
}

export async function getRoom(organizationId: string, roomId: string) {
  return await getDocAs<docTypes.Room>(getRoomRef(organizationId, roomId));
}

export async function getHistoricRoom(organizationId: string, roomId: string) {
  return await getDocAs<docTypes.Room>(getHistoricRoomRef(organizationId, roomId));
}

export async function getBillingProductsAvailable() {
  return await getDocAs<docTypes.BillingProductsAvailable>(getBillingProductsAvailableRef());
}

export async function getBillingDay(organizationId: string, day: string) {
  // day format: "YYYY-MM-DD"
  return await getDocAs<docTypes.BillingDay>(getBillingDayRef(organizationId, day));
}

export async function getBillingSubscription(organizationId: string) {
  return await getDocAs<docTypes.BillingSubscription>(getBillingSubscriptionRef(organizationId));
}

export async function getBillingPublic(organizationId: string) {
  return await getDocAs<docTypes.BillingPublic>(getBillingPublicRef(organizationId));
}

export async function getBillingUsage(organizationId: string) {
  return await getDocAs<docTypes.BillingUsage>(getBillingUsageRef(organizationId));
}

export async function getBillingFeaturesOverride(organizationId: string) {
  return await getDocAs<docTypes.BillingFeatures>(getBillingFeaturesOverrideRef(organizationId));
}

export async function getRooms(organizationId: string) {
  return await getDocsAs<docTypes.Room>(getRoomsRef(organizationId));
}

export async function getHistoricRooms(organizationId: string) {
  return await getDocsAs<docTypes.Room>(getHistoricRoomsRef(organizationId));
}

export async function getParticipant(organizationId: string, roomId: string, participantId: string) {
  return await getDocAs<docTypes.Participant>(getParticipantRef(organizationId, roomId, participantId));
}

export async function getParticipants(organizationId: string, roomId: string) {
  return await getDocsAs<docTypes.Participant>(getParticipantsRef(organizationId, roomId));
}

export async function getRoomStateChanges(organizationId: string, roomId: string) {
  return await getDocsAs<docTypes.RoomStateChange>(getParticipantsRef(organizationId, roomId));
}

export async function getSpaceStreamPrivate(organizationId: string, spaceId: string, spaceStreamId: string) {
  return await getDocAs<cmsDocTypes.SpaceStreamPrivate>(getSpaceStreamPrivateRef(organizationId, spaceId, spaceStreamId));
}

export async function getSpaceStream(organizationId: string, spaceId: string, spaceStreamId: string) {
  return await getDocAs<cmsDocTypes.SpaceStream>(getSpaceStreamRef(organizationId, spaceId, spaceStreamId));
}

export async function getSpaceStreams(organizationId: string, spaceId: string) {
  return await getDocsAs<cmsDocTypes.SpaceStream>(getSpaceStreamsRef(organizationId, spaceId));
}

export async function getHistoricParticipant(organizationId: string, roomId: string, participantId: string) {
  return await getDocAs<docTypes.HistoricParticipant>(getHistoricParticipantRef(organizationId, roomId, participantId));
}

export async function getHistoricParticipants(organizationId: string, roomId: string) {
  return await getDocsAs<docTypes.HistoricParticipant>(getHistoricParticipantsRef(organizationId, roomId));
}

export async function getParticipantsDenormalized(organizationId: string, roomId: string) {
  return await getDocsAs<docTypes.ParticipantsDenormalized>(getParticipantsDenormalizedRef(organizationId, roomId));
}

export async function getParticipantDenormalized(organizationId: string, roomId: string, participantId: string) {
  return await getDocAs<docTypes.ParticipantsDenormalized>(getParticipantDenormalizedRef(organizationId, roomId, participantId));
}

export async function getDeployment(organizationId: string, roomId: string, participantId: string, deploymentId: string) {
  return await getDocAs<docTypes.Deployment>(getDeploymentRef(organizationId, roomId, participantId, deploymentId));
}

export async function getDeployments(organizationId: string, roomId: string, participantId: string) {
  return await getDocsAs<docTypes.Deployment>(getDeploymentsRef(organizationId, roomId, participantId));
}

export async function getBrowserState(organizationId: string, roomId: string, participantId: string, browserStateId: string) {
  return await getDocAs<docTypes.BrowserStateRecord>(getBrowserStateRef(organizationId, roomId, participantId, browserStateId));
}

export async function getBrowserStates(organizationId: string, roomId: string, participantId: string) {
  return await getDocsAs<docTypes.BrowserStateRecord>(getBrowserStatesRef(organizationId, roomId, participantId));
}

export async function getParticipantBrowserStateUpdateWebRtc(organizationId: string, roomId: string, participantId: string) {
  return await getDocAs<docTypes.BrowserStateUpdateWebRtc>(getParticipantBrowserStateUpdateWebRtcRef(organizationId, roomId, participantId));
}

export async function getSpaceItem(organizationId: string, spaceId: string, spaceItemId: string) {
  return await getDocAs<cmsDocTypes.SpaceItem>(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}

export async function getSpaceRuntimeModel(organizationId: string, spaceId: string, spaceItemId: string) {
  return await getDocAs<cmsDocTypes.RuntimeModel>(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}

export async function getSpaceSpatialMedia(organizationId: string, spaceId: string, spaceItemId: string) {
  return await getDocAs<cmsDocTypes.SpatialMedia>(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}

export async function getSpaceRuntimeStream(organizationId: string, spaceId: string, spaceItemId: string) {
  return await getDocAs<cmsDocTypes.RuntimeStream>(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}

export async function getConfiguratorItem(organizationId: string, spaceId: string, spaceItemId: string) {
  return await getDocAs<cmsDocTypes.Configurator>(getSpaceItemRef(organizationId, spaceId, spaceItemId));
}

export async function getSpaceRuntimeModels(organizationId: string, spaceId: string) {
  return await getDocsAs<cmsDocTypes.RuntimeModel>(
    getSpaceItemsRef(organizationId, spaceId),
    [{fieldPath: "type", opStr: "==", value: "RuntimeModel"}]
  );
}

export async function getSpaceSpatialMedias(organizationId: string, spaceId: string) {
  return await getDocsAs<cmsDocTypes.SpatialMedia>(
    getSpaceItemsRef(organizationId, spaceId),
    [{fieldPath: "type", opStr: "==", value: "SpatialMedia"}]
  );
}

export async function getSpaceRuntimeStreams(organizationId: string, spaceId: string) {
  return await getDocsAs<cmsDocTypes.RuntimeStream>(
    getSpaceItemsRef(organizationId, spaceId),
    [{fieldPath: "type", opStr: "==", value: "RuntimeStream"}]
  );
}

export async function getSpaceLibraryModels(organizationId: string, spaceId: string) {
  return await getDocsAs<cmsDocTypes.LibraryModel>(
    getSpaceItemsRef(organizationId, spaceId),
    [{fieldPath: "type", opStr: "==", value: "LibraryModel"}]
  );
}

export async function getUnrealPluginVersions() {
  return await getDocsAs<docTypes.UnrealPluginVersion>(getUnrealPluginVersionsRef());
}

export async function getUnrealPluginVersion(unrealPluginVersionId: string) {
  return await getDocAs<docTypes.UnrealPluginVersion>(getUnrealPluginVersionRef(unrealPluginVersionId));
}

export async function getUnrealProject(unrealProjectId: string) {
  return await getDocAs<docTypes.UnrealProject>(getUnrealProjectRef(unrealProjectId));
}

export async function getUnrealProjects() {
  return await getDocsAs<docTypes.UnrealProject>(getUnrealProjectsRef());
}

export async function getUnrealProjectVersion(unrealProjectId: string, unrealProjectVersionId: string) {
  return await getDocAs<docTypes.UnrealProjectVersion>(getUnrealProjectVersionRef(unrealProjectId, unrealProjectVersionId));
}

export async function getUnrealProjectVersions(unrealProjectId: string, conditions: QueryWhere[] = []) {
  return await getDocsAs<docTypes.UnrealProjectVersion>(getUnrealProjectVersionsRef(unrealProjectId), conditions);
}

export async function getUnrealProjectVersionsCollectionGroup(conditions: QueryWhere[] = []) {
  return await getDocsAs<docTypes.UnrealProjectVersion>(getUnrealProjectVersionsCollectionGroupRef(), conditions);
}

// Get System

export async function getGkeParticipantsDenormalized(gkeAccelerator: systemDocTypes.GkeAccelerator) {
  return await getDocAs<docTypes.GkeParticipantsDenormalized>(getGkeParticipantsDenormalizedRef(gkeAccelerator));
}

export async function getWorkloadClusterProviderConfiguration(workloadClusterProvider: systemDocTypes.ClusterProvider) {
  return getDocAs<systemDocTypes.ClusterProviderConfiguration>(getWorkloadClusterProviderConfigurationRef(workloadClusterProvider));
}

export async function getEmailProvidersConfiguration() {
  return getDocAs<systemDocTypes.EmailProvidersConfiguration>(getEmailProvidersConfigurationRef());
}

// Add

export async function addDeployment(organizationId: string, roomId: string, participantId: string, deployment: docTypes.Deployment) {
  return await getDeploymentsRef(organizationId, roomId, participantId).add(deployment);
}

export async function addRoom(organizationId: string, room: docTypes.Room) {
  return await getRoomsRef(organizationId).add(room);
}

export async function addSpaceItem(organizationId: string, spaceId: string, spaceItem : cmsDocTypes.SpaceItem) {
  return await getSpaceItemsRef(organizationId, spaceId).add(spaceItem);
}

export async function addRuntimeModel(organizationId: string, spaceId: string, runtimeModel : cmsDocTypes.RuntimeModel) {
  return await getSpaceItemsRef(organizationId, spaceId).add(runtimeModel);
}

// Delete
export async function deleteUser(userId: string) {
  return await getUserRef(userId).delete();
}

export async function deleteOrganizationUser(organizationId: string, userId: string) {
  return await getOrganizationUserRef(organizationId, userId).delete();
}

export async function deleteRoom(organizationId: string, roomId: string) {
  return await getRoomRef(organizationId, roomId).delete();
}

export async function deleteParticipant(organizationId: string, roomId: string, participantId: string) {
  return await getParticipantRef(organizationId, roomId, participantId).delete();
}

export async function deleteDeployment(organizationId: string, roomId: string, participantId: string, deploymentId: string) {
  return await getDeploymentRef(organizationId, roomId, participantId, deploymentId).delete();
}

export async function deleteOldConfiguratorSpaceTemplateItems(spaceTemplateId: string, currentItems: string[]) {
  return (await getSpaceTemplateItemsRef(spaceTemplateId)
    .where("type", "==", "Configurator")
    .where("itemTemplateId", "not-in", currentItems)
    .get()).docs.forEach((doc) => {
    if (doc.exists) doc.ref.delete();
  });
}
