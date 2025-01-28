import {ObjectConfiguration, EnumObjectConfiguration} from "./cmsDocTypes";

export interface UeUpdate {
  messageType: string,
  payload?: Record<string, unknown>
}

// Animations
export interface CreateGestureEvent extends UeUpdate {
  messageType: "createGestureEvent",
  payload: {
    gestureId: number
  }
}

// Environment updates
export type UpdateEnvironmentMessage = "joinRoom" | "joinDressingRoom"

export interface UpdateEnvironment extends UeUpdate {
  messageType: UpdateEnvironmentMessage
}


// User document updates
export interface UpdateUserDoc extends UeUpdate {
  messageType: "updateUserDoc"
}

type AvatarSection = "top" | "bottoms" | "shoes" | "none"

// Avatar customization camera updates
export interface UpdateCustomizationSection {
  messageType: "updateCustomizationSection",
  payload: {
    section: AvatarSection
  }
}

// Comms updates
export type CommsStateMessage = "updatePresentingState" | "updateDialogState"
export type CommsStatePayload = {
  isPresenting?: boolean,
  isSpeaking?: boolean,
  isMuted?: boolean
}

export interface UpdateCommsState extends UeUpdate {
  messageType: CommsStateMessage,
  payload: CommsStatePayload
}

export type InteractionTypes = "item" | "sittable" | "clothing"

export type Vector2 = { x: number, y: number }
export type Vector3 = { x: number, y: number, z: number }

// Local player spatial updates
export interface LocalSpatialData {
  pos: Vector3, // position
  rot: Vector3, // rotation
  fov: number, // fieldOfView
  lap: Vector3, // lookAtPosition
  camPos: Vector3, // cameraPosition
}

export interface RemoteSpatialData {
  id: string
  hover? : boolean // passed only when true
}

// Interactable spatial items
export interface InteractableItemData extends RemoteSpatialData {
  type: InteractionTypes
  context?: {
    pos?: Vector3
  }
}

// Remote player spatial updates
export interface RemotePlayerSpatialData extends RemoteSpatialData {
  context: {
    screenPos: Vector2 // screenPosition
    dist: number // distance
    pos: Vector3 // position
    rot: Vector3 // rotation
  }
}

// Remote player spatial updates
export interface SpatialMediaData extends RemoteSpatialData {
  dist: number // distance
}

export interface UpdateSpatialData extends UeUpdate {
  messageType: "remoteSpatialData",
  payload: {
    avatars: RemotePlayerSpatialData[],
    items: InteractableItemData[],
    media: SpatialMediaData[],
  }
}

// Streaming resolution
export interface UpdateStreamingResolution extends UeUpdate {
  messageType: "updateStreamingResolution",
  payload: {
    width: string,
    height: string
  }
}

// Information on interactable object
export type PlayerInteraction = { mediaUrl: string }

// Game stream focus state
export interface WindowFocusState {
  messageType: "updateFocusState",
  payload: {
    isFocused: boolean
  }
}

// Toggle avatar visibility
export interface AvatarVisibility {
  messageType: "updateAvatarVisibility",
  payload: {
    isVisible: boolean
  }
}

// Changes UE camera position
// if true, camera will face users avatar
export interface FaceupCameraToggle {
  messageType: "updateFaceupCameraToggle",
  payload: {
    isVisible: boolean
  }
}

// Turns on front facing light to eluminate front of avatar
// if true, light will turn on
export interface FaceupLightToggle {
  messageType: "updateFaceupLightToggle",
  payload: {
    isVisible: boolean
  }
}

export interface InteractionEvent {
  id?: string
  type: "item" | "avatar" | "sittable" | "clothing" | "spatialMedia"
}

export interface ItemTransformEvent extends InteractionEvent {
  interactionType: "offsetUpRotation" | "offsetUniformScale" | "position" | "rotation" | "scale" | "attenuation" | "volume"
  interactionData: { value: number | Vector3 }
}

export interface SpatialMediaInteractionEvent extends InteractionEvent {
  type: "spatialMedia"
  interactionType: "open" | "closed"
}

export interface ItemSelectionEvent extends InteractionEvent {
  interactionType: "select"
  interactionData: { isSelected: boolean }
}

export interface ItemDraggingEvent extends InteractionEvent {
  interactionType: "drag"
  interactionData: { isDragging: boolean }
}

export interface LookAtEvent extends InteractionEvent {
  interactionType: "lookAt"
}

export interface EventResolutionPayload {
  id: string
  type: "item" | "avatar" | "sittable" | "clothing"
  interactionType?: string
  resolutionData: {
    success: boolean
    errorMessage?: string
  }
}

// Configurator data
export interface ConfiguratorDataRequest {
  messageType: "getConfiguratorItems"
}

export interface ConfiguratorObjectData {
  ueId: string
  name?: string
  thumb?: string
  configuration: {
    [key: string]: (ObjectConfiguration | EnumObjectConfiguration)
  }
}

export interface ConfiguratorObjectDataResponse {
  messageType: "configuratorObjectData",
  payload: ConfiguratorObjectData[]
}

// Toggle edit mode
export interface EditModeToggle {
  messageType: "cmsEditMode",
  payload: {
    isToggledOn: boolean
  }
}

export type TeleportDestinations= "user" | "poi" | "spawnPoint"
export interface TeleportAvatar {
  messageType: "createTeleportEvent",
  payload: {
    destination: TeleportDestinations
    id: string
  }
}
