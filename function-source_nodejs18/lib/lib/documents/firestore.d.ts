import * as docTypes from "../docTypes";
import * as systemDocTypes from "../systemDocTypes";
import * as cmsDocTypes from "../cmsDocTypes";
export declare type GetFirestoreDocResult<T> = [FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | undefined, T | undefined];
export declare function organizationWildcardPath(): string;
export declare function userWildcardPath(): string;
export declare function organizationUserWildcardPath(): string;
export declare function spaceUserWildcardPath(): string;
export declare function roomWildcardPath(): string;
export declare function spaceWildcardPath(): string;
export declare function participantWildcardPath(): string;
export declare function roomParticipantUsageCheckWildcardPath(): string;
export declare function participantUsageWildcardPath(): string;
export declare function productsAvailablePath(): string;
export declare function billingPath(): string;
export declare function billingUsagePath(): string;
export declare function billingFeaturesOverridePath(): string;
export declare function billingPublicPath(): string;
export declare function billingSubscriptionPath(): string;
export declare function billingPurchasesPath(): string;
export declare function streamingCreditsPurchaseWildcardPath(): string;
export declare function autoTopupPurchaseWildcardPath(): string;
export declare function browserStateUpdateWebRtcWildcardPath(): string;
export declare function participantDenormalizedWildcardPath(): string;
export declare function deploymentWildcardPath(): string;
export declare function unrealProjectWildcardPath(): string;
export declare function unrealPluginVersionWildcardPath(): string;
export declare function unrealProjectVersionWildcardPath(): string;
export declare function deviceWildcardPath(): string;
export declare function organizationInviteWildcardPath(): string;
export declare function spaceInviteWildcardPath(): string;
export declare function operationsWildcardPath(): string;
export declare function spaceTemplateWildcardPath(): string;
export declare function spaceTemplateItemWildcardPath(): string;
export declare function spaceItemWildcardPath(): string;
export declare function pullClientImageOnNodesWildcardPath(): string;
export declare function getOrganizationsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getCompletedParticipantsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getCompletedParticipantRef(participantId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationRef(organizationId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getAuthClientsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getAuthClientRef(authClientId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getPermissionsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getPermissionRef(userRole: docTypes.UserRoles): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getUsersRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getUserRef(userId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getConsentsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getConsentRef(consentId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceTemplatesRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceTemplateRef(spaceTemplateId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceTemplateItemsRef(spaceTemplateId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceTemplateItemRef(spaceTemplateId: string, spaceItemId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationOdysseyClientPodRef(organizationId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationOdysseyServerRef(organizationId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getRoomsRef(organizationId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getRoomRef(organizationId: string, roomId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpacesRef(organizationId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceRef(organizationId: string, spaceId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getDerivedSpacesRefWithSpaceTemplate(spaceTemplateId: string): FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
export declare function getDerivedSpacesRefWithUnrealProject(unrealProjectId: string): FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
export declare function getProductsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getBillingProductsAvailableRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingRef(organizationId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getBillingSubscriptionRef(organizationId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingPublicRef(organizationId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingPurchasesRef(organizationId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingStreamingCreditsPurchasesRef(organizationId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getBillingAutoTopupsRef(organizationId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getBillingAutoTopupRef(organizationId: string, autoTopupId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingstreamingCreditsPurchaseRef(organizationId: string, streamingCreditsPurchaseId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingFeaturesOverrideRef(organizationId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingDayRef(organizationId: string, day: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingUsageRef(organizationId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingUsageDayRef(organizationId: string, day: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingUsageMonthRef(organizationId: string, month: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBillingUsageHourRef(organizationId: string, hour: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getHistoricRoomsRef(organizationId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getHistoricRoomRef(organizationId: string, roomId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getUserEmailSettingsRef(email: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationUsersRef(organizationId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationUserRef(organizationId: string, userId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationInvitesRef(organizationId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationInviteRef(organizationId: string, inviteId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationSpacesRef(organizationId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationSpaceRef(organizationId: string, spaceId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationSpaceInvitesRef(organizationId: string, spaceId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationSpaceInviteRef(organizationId: string, spaceId: string, inviteId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceUsersRef(organizationId: string, spaceId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceUserRef(organizationId: string, spaceId: string, userId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getUserConfigurationOdysseyClientPodRef(userId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationUserConfigurationOdysseyClientPodRef(organizationId: string, userId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getRoomConfigurationOdysseyServerRef(organizationId: string, roomId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getRoomConfigurationOdysseyClientPodRef(organizationId: string, roomId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceConfigurationOdysseyServerRef(organizationId: string, spaceId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceConfigurationOdysseyClientPodRef(organizationId: string, spaceId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getDevicesRef(userId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getDeviceRef(userId: string, deviceId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getParticipantsRef(organizationId: string, roomId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getParticipantRef(organizationId: string, roomId: string, participantId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getRoomStateChangesRef(organizationId: string, roomId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getRoomStateChangeRef(organizationId: string, roomId: string, roomStateChangeId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getParticipantUsageChecksRef(organizationId: string, roomId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getParticipantUsageCheckRef(organizationId: string, roomId: string, participantUsageCheckId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getPodStackStatesRef(organizationId: string, roomId: string, participantId: string, deploymentId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getPodStackStateRef(organizationId: string, roomId: string, participantId: string, deploymentId: string, podStackStateId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getStateChangesRef(organizationId: string, roomId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getStateChangeRef(organizationId: string, roomId: string, stateChangeId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getHistoricParticipantsRef(organizationId: string, roomId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getHistoricParticipantRef(organizationId: string, roomId: string, participantId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getDeploymentsRef(organizationId: string, roomId: string, participantId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getDeploymentRef(organizationId: string, roomId: string, participantId: string, deploymentId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBrowserStatesRef(organizationId: string, roomId: string, participantId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getBrowserStateRef(organizationId: string, roomId: string, participantId: string, browserStateId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getParticipantUsageCollectionRef(organizationId: string, roomId: string, participantId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getParticipantUsageRef(organizationId: string, roomId: string, participantId: string, participantUsageId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getParticipantBrowserStateUpdateWebRtcRef(organizationId: string, roomId: string, participantId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getCommsParticipantRef(organizationId: string, roomId: string, participantId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getCommsParticipantsRef(organizationId: string, roomId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getParticipantDenormalizedRef(organizationId: string, roomId: string, participantId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getParticipantsDenormalizedRef(organizationId: string, roomId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSettingsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceItemRef(organizationId: string, spaceId: string, spaceItemId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceItemsRef(organizationId: string, spaceId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceHistoryCollectionRef(organizationId: string, spaceId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceHistoryRef(organizationId: string, spaceId: string, spaceHistoryId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceItemsHistoryPagesRef(organizationId: string, spaceId: string, spaceHistoryId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceItemsHistoryPageRef(organizationId: string, spaceId: string, spaceHistoryId: string, spaceItemsHistoryPageId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getBridgeToolkitSettingsRef(organizationId: string, spaceId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceStreamsRef(organizationId: string, spaceId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceStreamRef(organizationId: string, spaceId: string, spaceStreamId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceStreamPrivateRef(organizationId: string, spaceId: string, spaceStreamId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getUnrealPluginVersionsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getUnrealPluginVersionRef(pluginVersionId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getUnrealProjectsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getUnrealProjectRef(unrealProjectId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getUnrealProjectVersionsRef(unrealProjectId: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getUnrealProjectVersionsCollectionGroupRef(): FirebaseFirestore.CollectionGroup<FirebaseFirestore.DocumentData>;
export declare function getUnrealProjectVersionRef(unrealProjectId: string, unrealProjectVersionId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSystemRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getOperationsRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getConfigurationRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getVersionsRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getConfigurationsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getCoreweaveAvailabilityRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOdysseyClientVersionsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getOdysseyServerVersionsRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getGkeParticipantsDenormalizedRef(gkeAccelerator: systemDocTypes.GkeAccelerator): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getWorkloadClusterProvidersRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getWorkloadClusterProviderConfigurationRef(workloadClusterProvider: systemDocTypes.ClusterProvider): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getEmailProvidersConfigurationRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOdysseyClientPodRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
declare type ConfigurationUnrealProjectVersionOps = {
    location: "unrealProjectVersion";
    unrealProjectId: string;
    unrealProjectVersionId: string;
} | {
    location: "unrealProject";
    unrealProjectId: string;
} | {
    location: "organization";
    organizationId: string;
} | {
    location: "authorUser";
    userId: string;
} | {
    location: "root";
};
export declare function getConfigurationUnrealProjectVersionRef(opts: ConfigurationUnrealProjectVersionOps): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getConfigurationUnrealProjectRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOdysseyServerRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getConfigurationBillingRef(): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getOrganizationConfigurationBillingRef(organizationId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getRoomConfigurationBillingRef(organizationId: string, roomId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getSpaceConfigurationBillingRef(organizationId: string, spaceId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function getPullClientImageOnNodesRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getClientNodeImagePullDaemonsetRef(): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
export declare function getDocAs<T>(docRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>): Promise<GetFirestoreDocResult<T>>;
interface QueryWhere {
    fieldPath: string | FirebaseFirestore.FieldPath;
    opStr: FirebaseFirestore.WhereFilterOp;
    value: any;
}
export declare function getOrganization(organizationId: string): Promise<GetFirestoreDocResult<docTypes.Organization>>;
export declare function getOrganizations(): Promise<GetFirestoreDocResult<docTypes.Organization>[] | undefined>;
export declare function getSpaceTemplates(): Promise<GetFirestoreDocResult<cmsDocTypes.SpaceTemplate>[] | undefined>;
export declare function getPermissions(userRole: docTypes.UserRoles): Promise<GetFirestoreDocResult<docTypes.RolePermissions>>;
export declare function getUser(userId: string): Promise<GetFirestoreDocResult<docTypes.RootUser>>;
export declare function getUserEmailSettings(email: string): Promise<GetFirestoreDocResult<systemDocTypes.UserEmailSettings>>;
export declare function getUsers(): Promise<GetFirestoreDocResult<docTypes.User>[] | undefined>;
export declare function getConsent(consentId: string): Promise<GetFirestoreDocResult<docTypes.Consent>>;
export declare function getConsents(): Promise<GetFirestoreDocResult<docTypes.Consent>[] | undefined>;
export declare function getSpaceTemplate(spaceTemplateId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpaceTemplate>>;
export declare function getBridgeSpaceTemplate(spaceTemplateId: string): Promise<GetFirestoreDocResult<cmsDocTypes.BridgeSpaceTemplate>>;
export declare function getBridgeSpaceTemplates(unrealProjectId: string): Promise<GetFirestoreDocResult<cmsDocTypes.BridgeSpaceTemplate>[] | undefined>;
export declare function getAllBridgeSpaceTemplates(options?: {
    publicOnly?: boolean;
}): Promise<GetFirestoreDocResult<cmsDocTypes.BridgeSpaceTemplate>[] | undefined>;
export declare function getSpaceTemplateItems(spaceTemplateId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpaceItem>[] | undefined>;
export declare function getSpaceTemplateItem(spaceTemplateId: string, spaceItemId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpaceItem>>;
export declare function getOldOrganizationUsers(organizationId: string): Promise<GetFirestoreDocResult<docTypes.OldOrganizationUser>[] | undefined>;
export declare function getAuthClient(authClientId: string): Promise<GetFirestoreDocResult<docTypes.AuthClient>>;
export declare function getAuthClients(): Promise<GetFirestoreDocResult<docTypes.AuthClient>[] | undefined>;
export declare function getOrganizationUser(organizationId: string, userId: string): Promise<GetFirestoreDocResult<docTypes.OrganizationUser>>;
export declare function getOrganizationUsers(organizationId: string): Promise<GetFirestoreDocResult<docTypes.OrganizationUser>[] | undefined>;
export declare function getOrganizationInvites(organizationId: string): Promise<GetFirestoreDocResult<docTypes.Invite>[] | undefined>;
export declare function getCoreweaveAvailability(): Promise<GetFirestoreDocResult<systemDocTypes.CoreweaveRegionsAvailability>>;
export declare function getSpace(organizationId: string, spaceId: string): Promise<GetFirestoreDocResult<cmsDocTypes.OrgSpace>>;
export declare function getSpaces(organizationId: string): Promise<GetFirestoreDocResult<cmsDocTypes.OrgSpace>[] | undefined>;
export declare function getDerivedSpacesWithSpaceTemplate(spaceTemplateId: string): Promise<GetFirestoreDocResult<cmsDocTypes.OrgSpace>[] | undefined>;
export declare function getDerivedSpacesWithUnrealProject(unrealProjectId: string): Promise<GetFirestoreDocResult<cmsDocTypes.OrgSpace>[] | undefined>;
export declare function getSpaceUser(organizationId: string, spaceId: string, userId: string): Promise<GetFirestoreDocResult<docTypes.SpaceUser>>;
export declare function getSpaceUsers(organizationId: string, spaceId: string): Promise<GetFirestoreDocResult<docTypes.SpaceUser>[] | undefined>;
export declare function getBridgeToolkitSettingsItem(organizationId: string, spaceId: string): Promise<GetFirestoreDocResult<cmsDocTypes.BridgeToolkitSettings>>;
export declare function getSpaceItems(organizationId: string, spaceId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpaceItem>[] | undefined>;
export declare function getDevice(userId: string, deviceId: string): Promise<GetFirestoreDocResult<docTypes.Device>>;
export declare function getDevices(userId: string): Promise<GetFirestoreDocResult<docTypes.Device>[] | undefined>;
export declare function getRoom(organizationId: string, roomId: string): Promise<GetFirestoreDocResult<docTypes.Room>>;
export declare function getHistoricRoom(organizationId: string, roomId: string): Promise<GetFirestoreDocResult<docTypes.Room>>;
export declare function getBillingProductsAvailable(): Promise<GetFirestoreDocResult<docTypes.BillingProductsAvailable>>;
export declare function getBillingDay(organizationId: string, day: string): Promise<GetFirestoreDocResult<docTypes.BillingDay>>;
export declare function getBillingSubscription(organizationId: string): Promise<GetFirestoreDocResult<docTypes.BillingSubscription>>;
export declare function getBillingPublic(organizationId: string): Promise<GetFirestoreDocResult<docTypes.BillingPublic>>;
export declare function getBillingUsage(organizationId: string): Promise<GetFirestoreDocResult<docTypes.BillingUsage>>;
export declare function getBillingFeaturesOverride(organizationId: string): Promise<GetFirestoreDocResult<docTypes.BillingFeatures>>;
export declare function getRooms(organizationId: string): Promise<GetFirestoreDocResult<docTypes.Room>[] | undefined>;
export declare function getHistoricRooms(organizationId: string): Promise<GetFirestoreDocResult<docTypes.Room>[] | undefined>;
export declare function getParticipant(organizationId: string, roomId: string, participantId: string): Promise<GetFirestoreDocResult<docTypes.Participant>>;
export declare function getParticipants(organizationId: string, roomId: string): Promise<GetFirestoreDocResult<docTypes.Participant>[] | undefined>;
export declare function getRoomStateChanges(organizationId: string, roomId: string): Promise<GetFirestoreDocResult<docTypes.RoomStateChange>[] | undefined>;
export declare function getSpaceStreamPrivate(organizationId: string, spaceId: string, spaceStreamId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpaceStreamPrivate>>;
export declare function getSpaceStream(organizationId: string, spaceId: string, spaceStreamId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpaceStream>>;
export declare function getSpaceStreams(organizationId: string, spaceId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpaceStream>[] | undefined>;
export declare function getHistoricParticipant(organizationId: string, roomId: string, participantId: string): Promise<GetFirestoreDocResult<docTypes.HistoricParticipant>>;
export declare function getHistoricParticipants(organizationId: string, roomId: string): Promise<GetFirestoreDocResult<docTypes.HistoricParticipant>[] | undefined>;
export declare function getParticipantsDenormalized(organizationId: string, roomId: string): Promise<GetFirestoreDocResult<docTypes.ParticipantsDenormalized>[] | undefined>;
export declare function getParticipantDenormalized(organizationId: string, roomId: string, participantId: string): Promise<GetFirestoreDocResult<docTypes.ParticipantsDenormalized>>;
export declare function getDeployment(organizationId: string, roomId: string, participantId: string, deploymentId: string): Promise<GetFirestoreDocResult<docTypes.Deployment>>;
export declare function getDeployments(organizationId: string, roomId: string, participantId: string): Promise<GetFirestoreDocResult<docTypes.Deployment>[] | undefined>;
export declare function getBrowserState(organizationId: string, roomId: string, participantId: string, browserStateId: string): Promise<GetFirestoreDocResult<docTypes.BrowserStateRecord>>;
export declare function getBrowserStates(organizationId: string, roomId: string, participantId: string): Promise<GetFirestoreDocResult<docTypes.BrowserStateRecord>[] | undefined>;
export declare function getParticipantBrowserStateUpdateWebRtc(organizationId: string, roomId: string, participantId: string): Promise<GetFirestoreDocResult<docTypes.BrowserStateUpdateWebRtc>>;
export declare function getSpaceItem(organizationId: string, spaceId: string, spaceItemId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpaceItem>>;
export declare function getSpaceRuntimeModel(organizationId: string, spaceId: string, spaceItemId: string): Promise<GetFirestoreDocResult<cmsDocTypes.RuntimeModel>>;
export declare function getSpaceSpatialMedia(organizationId: string, spaceId: string, spaceItemId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpatialMedia>>;
export declare function getSpaceRuntimeStream(organizationId: string, spaceId: string, spaceItemId: string): Promise<GetFirestoreDocResult<cmsDocTypes.RuntimeStream>>;
export declare function getConfiguratorItem(organizationId: string, spaceId: string, spaceItemId: string): Promise<GetFirestoreDocResult<cmsDocTypes.Configurator>>;
export declare function getSpaceRuntimeModels(organizationId: string, spaceId: string): Promise<GetFirestoreDocResult<cmsDocTypes.RuntimeModel>[] | undefined>;
export declare function getSpaceSpatialMedias(organizationId: string, spaceId: string): Promise<GetFirestoreDocResult<cmsDocTypes.SpatialMedia>[] | undefined>;
export declare function getSpaceRuntimeStreams(organizationId: string, spaceId: string): Promise<GetFirestoreDocResult<cmsDocTypes.RuntimeStream>[] | undefined>;
export declare function getSpaceLibraryModels(organizationId: string, spaceId: string): Promise<GetFirestoreDocResult<cmsDocTypes.LibraryModel>[] | undefined>;
export declare function getUnrealPluginVersions(): Promise<GetFirestoreDocResult<docTypes.UnrealPluginVersion>[] | undefined>;
export declare function getUnrealPluginVersion(unrealPluginVersionId: string): Promise<GetFirestoreDocResult<docTypes.UnrealPluginVersion>>;
export declare function getUnrealProject(unrealProjectId: string): Promise<GetFirestoreDocResult<docTypes.UnrealProject>>;
export declare function getUnrealProjects(): Promise<GetFirestoreDocResult<docTypes.UnrealProject>[] | undefined>;
export declare function getUnrealProjectVersion(unrealProjectId: string, unrealProjectVersionId: string): Promise<GetFirestoreDocResult<docTypes.UnrealProjectVersion>>;
export declare function getUnrealProjectVersions(unrealProjectId: string, conditions?: QueryWhere[]): Promise<GetFirestoreDocResult<docTypes.UnrealProjectVersion>[] | undefined>;
export declare function getUnrealProjectVersionsCollectionGroup(conditions?: QueryWhere[]): Promise<GetFirestoreDocResult<docTypes.UnrealProjectVersion>[] | undefined>;
export declare function getGkeParticipantsDenormalized(gkeAccelerator: systemDocTypes.GkeAccelerator): Promise<GetFirestoreDocResult<docTypes.GkeParticipantsDenormalized>>;
export declare function getWorkloadClusterProviderConfiguration(workloadClusterProvider: systemDocTypes.ClusterProvider): Promise<GetFirestoreDocResult<systemDocTypes.ClusterProviderConfiguration>>;
export declare function getEmailProvidersConfiguration(): Promise<GetFirestoreDocResult<systemDocTypes.EmailProvidersConfiguration>>;
export declare function addDeployment(organizationId: string, roomId: string, participantId: string, deployment: docTypes.Deployment): Promise<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>;
export declare function addRoom(organizationId: string, room: docTypes.Room): Promise<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>;
export declare function addSpaceItem(organizationId: string, spaceId: string, spaceItem: cmsDocTypes.SpaceItem): Promise<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>;
export declare function addRuntimeModel(organizationId: string, spaceId: string, runtimeModel: cmsDocTypes.RuntimeModel): Promise<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>;
export declare function deleteUser(userId: string): Promise<FirebaseFirestore.WriteResult>;
export declare function deleteOrganizationUser(organizationId: string, userId: string): Promise<FirebaseFirestore.WriteResult>;
export declare function deleteRoom(organizationId: string, roomId: string): Promise<FirebaseFirestore.WriteResult>;
export declare function deleteParticipant(organizationId: string, roomId: string, participantId: string): Promise<FirebaseFirestore.WriteResult>;
export declare function deleteDeployment(organizationId: string, roomId: string, participantId: string, deploymentId: string): Promise<FirebaseFirestore.WriteResult>;
export declare function deleteOldConfiguratorSpaceTemplateItems(spaceTemplateId: string, currentItems: string[]): Promise<void>;
export {};
