import * as firebaseAdmin from "firebase-admin";
import {RegistrationInfoFields, UserRoles} from "./docTypes";


export type Vector3 = { x: number, y: number, z: number }
export type Vector2 = { x: number, y: number }
export type SpaceVisibility = "private" | "listed"


export type SpaceTemplateTypes = "Odyssey" | "Bridge" | string

// collection path: /spaceTemplates/{spaceTemplateId}
export interface SpaceTemplate {
  created?: firebaseAdmin.firestore.Timestamp
  updated?: firebaseAdmin.firestore.Timestamp
  name: string
  thumb?: string
  description: string
  type: SpaceTemplateTypes
  ueId?: string
  orgOwner: string[]
  public: boolean
  hasSpaceItems?: boolean
  demoUrl?: string
  // never passed to DB, but stored as read-only on client
  id?: string
  unrealProject?: SpaceUnrealProject
}

export interface BridgeSpaceTemplate extends SpaceTemplate {
  type: "Bridge"
  unrealProject: SpaceUnrealProject
}

export type AvatarTypes = "standard" | "aec" | undefined

export interface SpaceUnrealProject {
  unrealProjectId: string
  unrealProjectVersionId: "latest" | string
}

export type FlightControls = "editMode" | "playMode"
export type AvatarControlSystems = "eventMode" | "gameMode" | "flightMode"
export type MobileControls = "on" | "joystick only" | "off"

export interface SpaceLoadingSettings {
  allowAutoplay?: boolean
  showLoadingBackground?: boolean
  showLoadingBackgroundBlur?: boolean
  showSpaceInformation?: boolean
  showHelpMenu?: boolean
  showOdysseyEditorMenu?: boolean
  showLoadingStatus?: boolean
  simpleLoadingUi?: boolean
}

// collection path: /organizations/{organizationId}/spaces/{spaceId}
export interface OrgSpace {
  created?: firebaseAdmin.firestore.Timestamp
  updated?: firebaseAdmin.firestore.Timestamp
  // protected no write access after creation
  spaceTemplateId?: string
  oldSpaceTemplateId?: string
  unrealProject?: SpaceUnrealProject
  ueId?: string
  originalSpaceId?: string
  // copied fields from creation step, editable post creation
  name: string
  thumb: string
  description: string
  rooms: string[]
  allowSharedInviteLinks?: boolean
  afkTimer?: number
  maxSessionLength?: number
  maximumResolution?: {x: number, y: number}
  flightControl?: FlightControls
  avatarControlSystem?: AvatarControlSystems
  allowEmbed?: boolean
  allowAnonymousUsers?: boolean
  disableChat?: boolean
  disableComms?: boolean
  loadingSettings?: SpaceLoadingSettings
  // TODO: fields currently on room doc that should be swapped to here in upcoming release
  persistentLiveStream?: string
  isLiveStreamActive?: boolean
  isPublic?: boolean
  enableSharding?: boolean
  infoFields?: RegistrationInfoFields
  avatarType?: AvatarTypes
  graphicsBenchmark?: number
  odysseyMobileControls?: MobileControls
  nonViewerHuddle?: boolean
  allowConfigurationToolbarForAllUsers?: boolean
  // space counts
  currentParticipantSum?: number
  spaceItemSum?: number
  // never passed to DB, but stored as read-only on client
  id: string
  // deprecated properties
  spaceVisibility?: SpaceVisibility
  showPublicRoomLanding?: boolean
  folder?: string
}

// collection path: /libraryModelRefs/{libraryModelRefId}
export interface LibraryModelRef {
  created?: firebaseAdmin.firestore.Timestamp
  updated?: firebaseAdmin.firestore.Timestamp
  name: string
  thumb: string
  description: string
  supportsCustomImage: boolean
  type: string
  ueId: string
  public: boolean
}

// collection path: /modelMaterial/{modelMaterial}
export interface ModelMaterial {
  created?: firebaseAdmin.firestore.Timestamp
  updated?: firebaseAdmin.firestore.Timestamp
  name: string
  thumb: string
  type: string
  ueId: string
  public: boolean
}

export type ClothingType = "Tops" | "Bottoms" | "Shoes"

// collection path: /clothings/{clothingId}
export interface Clothing {
  created?: firebaseAdmin.firestore.Timestamp
  updated?: firebaseAdmin.firestore.Timestamp
  name: string
  thumb: string
  description: string
  type: ClothingType
  bodyDefinition: "Female" | "Male"
  ueId: string
  public: boolean
}

export type ClothingMaterialCategories = "neutral" | "solid" | "metallic" | "pattern" | "textile" | "special"

// rootlevel collection
export interface ClothingMaterial {
  created?: firebaseAdmin.firestore.Timestamp
  updated?: firebaseAdmin.firestore.Timestamp
  name: string
  thumb: string
  description: string
  type: ClothingMaterialCategories
  ueId: string
  public: boolean
}

// rootlevel collection
export interface CustomClothing {
  created?: firebaseAdmin.firestore.Timestamp
  updated?: firebaseAdmin.firestore.Timestamp
  name: string
  thumb: string
  type: "custom"
  ueId: "M_Sweater" | "M_Hoodie"
  public: boolean
  orgOwner: string[]
  spaces?: string[]
  shaderItem: string
  shaderColor: "0000000000000000"
  roles: UserRoles[]
}

export type SpaceItemType = "RuntimeModel" | "SpatialMedia" | "LibraryModel" | "RuntimeStream" | "BridgeToolkitSettings" | "Configurator" | "ConfiguratorObject"

export interface SpaceItem {
  type: SpaceItemType
  created?: firebaseAdmin.firestore.Timestamp
  updated?: firebaseAdmin.firestore.Timestamp
  position: Vector3
  rotation: Vector3
  offsetUpRotation: number
  name: string
  thumb?: string
  isLocked?: boolean
  user?: string // id of user that added item to space
  // never passed to DB, but stored as read-only on client
  id?: string
}

export interface BridgeToolkitSettingsData {
  customCharacterClass: {
    immutable: true
    value: boolean
  },
  supportsMultiplayer: {
    immutable: true
    value: boolean
  },
  configurator: {
    immutable: true
    value: boolean
  },
}

// This will be stores at /spaceItems/BridgeToolkitSettings and acts as a singleton document
export interface BridgeToolkitSettings extends SpaceItem {
  type: "BridgeToolkitSettings"
  itemTemplateId: "BridgeToolkitSettings"
  name: "BridgeToolkitSettings"
  denormalizeOnUpdate: true
  data: BridgeToolkitSettingsData
}

export type ConfiguratorType = "string" | "number" | "boolean" | "enum" | "trigger" | "image" | "String" | "Number" | "Bool" | "Enum" | "Trigger" | "Image"

export interface ConfiguratorSchema {
  displayName: string
  type: ConfiguratorType
  default: string | number | boolean
  values?: (string | number)[]
  max?: number
  min?: number
  step?: number
  isPersisted?: boolean
  isNetworked?: boolean
}

export interface Configurator extends SpaceItem {
  type: "Configurator"
  itemTemplateId: string
  name: string
  levelFilePath?: string
  denormalizeOnUpdate: true
  currentState?: string | number | boolean
  schema: ConfiguratorSchema
}

export interface ObjectConfiguration {
  displayName: string
  type: ConfiguratorType
  currentState: string | number | boolean
  default: string | number | boolean
  max?: number
  min?: number
  step?: number
  values: (string | number)[]
}

export type ConfiguratorEnumDisplayTypes = "image" | "dropdown"

export interface ConfiguratorEnumValues {
  displayName: string
  thumb?: string
}

export interface EnumObjectConfiguration extends ObjectConfiguration {
  displayType: ConfiguratorEnumDisplayTypes
  type: "enum"
  default: string | number
  currentState: string | number
  valuesImages?: ConfiguratorEnumValues[]
}

export interface ConfiguratorObject extends SpaceItem {
  type: "ConfiguratorObject"
  offsetUniformScale: number
  versionId: string
  ueId: string
  configuration: {
    [key: string]: ObjectConfiguration | EnumObjectConfiguration
  }
}

export type ModelMetadata = {
  uid?: string
  viewerUrl?: string
  author?: { username: string, profileUrl: string }
  license?: string
  glb?: {
    faceCount?: number
    textureCount?: number
    size?: number
    vertexCount?: number
    textureMaxResolution?: number
  }
}

export interface SpaceItemsHistoryPage {
  data: string
}

export interface SpaceHistory {
  name?: string // optional human given name
  timestamp: firebaseAdmin.firestore.Timestamp
  authorType: "system" | "user"
  authorUserId?: string // user.id
  authorName?: string // user.name
  checksum: string // calculated
  space: OrgSpace
}

export interface RuntimeModel extends SpaceItem {
  type: "RuntimeModel"
  sketchfabTempUrl?: string
  gltfUrl: string
  scale: Vector3
  autoScale: boolean
  materialOverrideId: string
  collisionsEnabled: boolean
  currentAnimation?: string
  availableAnimations?: string[]
  offsetUniformScale: number
  metadata?: ModelMetadata
}

export interface SpaceStream {
  streamName: string
  subscriberToken: string
  subscriberTokenId: string
  subscriberTokenAccountId: string
}

export interface SpaceStreamPrivate {
  encryptedPublisherToken: string
  publisherTokenId: string
  publisherTokenAccountId: string
}

export type RuntimeStreamRatios = "16:9" | "4:3"

export interface RuntimeStream extends SpaceItem {
  type: "RuntimeStream"
  spaceStreamId: string
  name: string
  attenuation?: number
  volume?: number
  audioOnly?: boolean
  scale?: Vector3
  autoScale?: boolean
  offsetUniformScale?: number
  aspectRatio: RuntimeStreamRatios
  curvature: number
}

export type SpatialMediaTypes = "video" | "link"

export interface SpatialMedia extends SpaceItem {
  type: "SpatialMedia"
  mediaType: SpatialMediaTypes
  url: string
  attenuation: number
}

export interface SpatialVideo extends SpatialMedia {
  mediaType: "video"
  loop?: boolean
  autoplay?: boolean
  audioOnly?: boolean
  volume?: number
  showPreview: boolean
}

export interface SpatialLink extends SpatialMedia {
  mediaType: "link"
  isPortrait?: boolean
  openInNewTab?: boolean
}

export interface LibraryModel extends SpaceItem {
  type: "LibraryModel"
  libraryModelRefId: string
  ueId: string // denormalized from libraryModelRefId for easy UE API
  customImageUrl: string
  scale: Vector3
  autoScale: boolean
  offsetUniformScale: number
  collisionsEnabled: boolean
}
