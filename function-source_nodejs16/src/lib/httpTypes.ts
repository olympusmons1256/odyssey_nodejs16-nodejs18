import {SpaceItem, SpaceTemplate} from "./cmsDocTypes";
import {OrganizationRoles, SpaceRoles, UserRoles, UnrealPluginVersion, UnrealProject, UnrealProjectVersion, UnrealProjectVersionTarget, SupportedUnrealEngineVersion, Participant} from "./docTypes";
import {ParticipantUsageCheckOperation} from "./systemDocTypes";

export interface UserBridgeCliLogRequestData {
  timestamp: string,
  bridgeCliVersion: string,
  logLevel: string,
  rawMessage: string,
  organizationId?: string,
  unrealProjectId?: string,
  unrealProjectVersionId?: string,
  rawMetadata?: string,
}

export interface GetUserWritableOrganizationsResponseData {
  organizationIdsAndNames: {id: string, name: string | undefined}[]
}

export interface ConsentAnswerRequestData {
  allow?: boolean,
  consentId?: string,
}

export interface ConsentAnswerResponseData {
  code?: string,
}

export interface CreateParticipantRequestData {
  organizationId: string,
  roomId: string,
  deviceId: string,
}

export interface CreateParticipantResponseData extends Participant {
  id: string,
}

export interface NewConsentResponseData {
  id: string,
}

export interface CustomTokenFromConsentRequestData {
  code?: string,
  consentId?: string,
}

export interface CustomTokenFromConsentResponseData {
  customToken: string,
}

export interface IdTokenForCustomTokenRequestData {
  idToken?: string,
}

export interface IdTokenForCustomTokenResponseData {
  customToken: string,
}

export interface UnrealProjectLatestBuildLogDownloadRequestData {
  organizationId: string,
  unrealProjectId: string,
  unrealProjectVersionId?: string,
}

export interface UnrealProjectLatestBuildLogDownloadResponseData {
  downloadUrl?: string,
}

export interface UnrealProjectVersionBuildLogRequestData {
  organizationId: string,
  unrealProjectId: string,
  unrealProjectVersionId: string,
  limit: number,
  tailData?: UnrealProjectVersionBuildLogTailData,
}

export interface UnrealProjectVersionBuildLogTailData {
  startTime: Date,
  offset: number,
  orderBy: "asc" | "desc",
}

export interface UnrealProjectVersionBuildLogResponseData {
  lastIndex: number,
  logMessages: string[],
}

export interface UnrealProjectVersionRequestData {
  organizationId: string,
  unrealProjectId: string,
  unrealProjectVersionId: string,
}

export interface UnrealProjectVersionResponseData extends UnrealProjectVersion {
  id: string,
}

export interface UnrealProjectResponseData extends UnrealProject {
  id: string,
  currentVersion?: UnrealProjectVersionResponseData,
}

export interface UnrealProjectWithVersionsRequestData {
  organizationId: string,
}

export interface UnrealProjectsWithVersionsResponseData {
  [key: string]: UnrealProjectResponseData,
}

export interface NewUnrealProjectRequestData {
  organizationId: string
  name?: string
}

export interface NewUnrealProjectVersionRequestData {
  organizationId: string
  unrealProjectId: string
  projectName?: string
  levelName: string
  levelFilePath: string
  odysseyPluginVersionId: string
  unrealEngineVersion?: SupportedUnrealEngineVersion
  target: UnrealProjectVersionTarget
}


export interface NewWebUploadedUnrealProjectAndVersionRequestData {
  organizationId: string
  unrealProjectId?: string
  unrealProjectDisplayName?: string
  unrealProjectZipFilename: string
  unrealEngineVersion?: SupportedUnrealEngineVersion
  selfPackaged?: boolean
  target?: UnrealProjectVersionTarget
}

export interface NewWebUploadedUnrealProjectAndVersionResponseData {
  organizationId: string
  unrealProjectId: string
  uploadUrl: string
  unrealProjectVersionId: string
  unrealEngineVersion: SupportedUnrealEngineVersion
  target: UnrealProjectVersionTarget
}

export interface GetUnrealProjectVersionRequestData {
  organizationId: string
  unrealProjectId: string
  unrealProjectVersionId: string
}

export interface NotifyUnrealProjectVersionUploadedRequestData {
  organizationId: string
  unrealProjectId: string
  unrealProjectVersionId: string
  failed?: boolean
  sha256Sum?: string
}

export interface UnrealPluginVersionResponseData extends UnrealPluginVersion {
  id: string,
  downloadUrl: string
}

export interface NewUnrealProjectVersionResponseData extends UnrealProjectVersion {
  id: string
}

export interface NewUnrealProjectResponseData extends UnrealProject {
  id: string
}

export interface NewOrgInviteRequestData {
  email: string,
  role: OrganizationRoles,
  orgId: string,
  orgName: string,
  inviterName: string
}

export interface NewCustomerData {
  email: string
  name?: string
  testClockId?: string
}

export interface SubscribeNewOrganizationRequest {
  organizationDetails: {
    name: string,
  }
  newCustomerData: NewCustomerData
  redirect: string
}

export interface CheckoutSandboxRequest {
  organizationId: string
  customerData: NewCustomerData
  redirect: string
}

export type StripeCheckoutMode = "payment" | "setup" | "subscription"

export type PriceType = "base-fee" | "workspace-seats" | "published-spaces"

export interface StripeCheckoutItem {
  id?: string
  quantity: number
  price: string
}

export interface StripeCheckoutRequest {
  customerId: string
  mode: StripeCheckoutMode
  items: StripeCheckoutItem[]
  redirectParams?: string
  isNewCustomer?: boolean
}

export interface OrganizationUsageRecord {
  creditsUsed: number
  endTimestamp: string
  hour: string
  organizationId: string
  participantId: string
  userId: string
  deviceId: string
  participantUsageId: string
  roomId: string
  spaceId: string
  spaceName: string
  userName: string
  userEmail: string
}

export interface OrganizationUsageRequest {
  organizationId: string
  afterTimestamp: number
  beforeTimestamp?: number
  count?: number
  offset?: number
  aggregation?: "sumCreditsUsedBySpaceId"
}

export interface OrganizationUsageResponse {
  organizationId: string
  afterTimestamp: number
  beforeTimestamp?: number
  usageRecords?: OrganizationUsageRecord[]
  aggregation?: OrganizationUsageResponseAggregation
  pageSize: number
}

export interface ParticipantAnalyticsRecord {
  creditsUsed: number
  deviceId: string
  durationMillis: number
  endedAt?: Date
  organizationId: string
  participantId: string
  participantUsageId: string
  reachedCreatedDeploymentsState: boolean
  reachedCreatedDeploymentsStateAt?: Date
  reachedCreatedDeploymentsStateAfterMs?: number
  reachedReadyState: boolean
  reachedReadyStateAt?: Date
  reachedReadyStateAfterMs?: number
  reachedWebrtcConnectedState: boolean
  reachedWebrtcConnectedStateAt?: Date
  reachedWebrtcConnectedStateAfterMs?: number
  reachedInitializedState: boolean
  reachedInitializedStateAt?: Date
  reachedInitializedStateAfterMs?: number
  shardId: string
  roomName: string
  spaceId: string
  spaceName: string
  startedAt: Date
  userEmail: string
  userId: string
  userName: string
}

export interface ParticipantUsageCheckRecord extends ParticipantUsageCheckOperation {
  participantUsageCheckId: string
  organizationId: string
  roomName: string
  spaceId: string
  spaceName: string
}

export interface ParticipantAnalyticsRequest {
  organizationId: string
  afterTimestamp: number
  beforeTimestamp?: number
  roomId?: string
  spaceId?: string
  count?: number
  offset?: number
}

export interface SumCreditsUsedBySpaceIdAggregationResults {
  type: "sumCreditsUsedBySpaceId"
  sumCreditsUsedBySpaceId: {
    spaceId: string,
    creditsUsed: number
    recordCount?: number
  }[]
}

export interface SumDeductedCreditsBySpaceIdAggregationResults {
  type: "sumDeductedCreditsBySpaceId"
  sumDeductedCreditsBySpaceId: {
    spaceId: string,
    deductedCredits: number
    recordCount?: number
  }[]
}

type OrganizationUsageResponseAggregation =
  | SumCreditsUsedBySpaceIdAggregationResults

export interface ParticipantAnalyticsResponse {
  organizationId: string
  afterTimestamp: number
  beforeTimestamp?: number
  results: ParticipantAnalyticsRecord[]
  pageSize: number
}

export interface StripeCustomerPortalRequest {
  customerId: string
  redirectParams?: string
}

export interface UpdateSubscriptionRequest {
  organizationId: string,
  subscriptionId: string
  productId?: string
  workspaceSeatsQuantity?: number
  publishedSpacesQuantity?: number
}

export interface UpdateAutoTopupRequest {
  enabled: boolean
  quantity: number
  threshold: number
  organizationId: string
}

export interface NewGuestInviteRequestData {
  email: string,
  orgId: string,
  orgName: string,
  inviterName: string,
  spaceId: string,
  spaceName: string,
  role: SpaceRoles
}
export interface DecryptSpaceStreamPrivateRequestData {
  organizationId: string
  spaceId: string
  spaceStreamId: string
}

export interface DecryptSpaceStreamPrivateResponseBody {
  publisherToken: string
}

export interface NewVisitorRequestData {
  email: string,
  userName: string,
  userId: string,
  spaceId: string,
  orgId: string
}

export interface NewSignInData {
  email: string,
  redirect: Location | string
}

export interface AnonymousAuthSigninRequestData {
  organizationId: string,
  spaceId: string,
}

export interface AnonymousAuthSigninResponseData {
  customToken: string,
  userId: string,
}

export interface AfkCheckParticipantRequestData {
  organizationId: string,
  roomId: string,
  deviceId: string
}

export interface NewUserRequestData {
  email: string,
  inviteLink?: string,
  spaceId?: string,
  orgId?: string
}

export interface NewOrgInviteData {
  email: string,
  inviteLink: string
}

export interface DolbyJwtRequestData {
  roomId: string,
  participantId: string
}

export interface AudioChannelUpdateRequestData {
  organizationId: string,
  roomId: string,
  participantId: string,
  audioChannelId: string
}

export interface DolbyJwtResponseData {
  jwtToken: string,
}

export interface StreamKeyResponseData {
  consumerKey: string,
}

export interface StreamJwtRequestData {
  userId: string,
}

export interface StreamJwtResponseData {
  jwtToken: string,
}

export interface NewInviteLinkData {
  path: string,
  role: UserRoles
}

export interface NewAvatarData {
  avatarUrl: string
  fileName: string
  userId: string
}

export interface FilteredSpaceTemplates {
  fieldPath: string
  operation: FirebaseFirestore.WhereFilterOp
  value: string | number | boolean
}

export interface SpaceTemplatesWithSpaceItems extends SpaceTemplate {
  spaceTemplateItems: SpaceItem[]
}

export interface SpaceRuntimeLogsRequestData {
  organizationId: string,
  spaceId: string,
  roomId?: string,
  startTime?: Date,
  endTime?: Date,
  limit?: number,
  offset?: number,
  order?: "ASC" | "DESC",
}

export interface SpaceRuntimeLogData {
  time: Date,
  module: string | undefined,
  phase: string | undefined,
  message: string | undefined,
  rawmessage: string,
}

export interface SpaceRuntimeLogsResponseData {
  lastIndex: number,
  data: SpaceRuntimeLogData[],
}
