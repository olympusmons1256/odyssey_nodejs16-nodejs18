import { ObjectConfiguration, EnumObjectConfiguration } from "./cmsDocTypes";
export interface UeUpdate {
    messageType: string;
    payload?: Record<string, unknown>;
}
export interface CreateGestureEvent extends UeUpdate {
    messageType: "createGestureEvent";
    payload: {
        gestureId: number;
    };
}
export declare type UpdateEnvironmentMessage = "joinRoom" | "joinDressingRoom";
export interface UpdateEnvironment extends UeUpdate {
    messageType: UpdateEnvironmentMessage;
}
export interface UpdateUserDoc extends UeUpdate {
    messageType: "updateUserDoc";
}
declare type AvatarSection = "top" | "bottoms" | "shoes" | "none";
export interface UpdateCustomizationSection {
    messageType: "updateCustomizationSection";
    payload: {
        section: AvatarSection;
    };
}
export declare type CommsStateMessage = "updatePresentingState" | "updateDialogState";
export declare type CommsStatePayload = {
    isPresenting?: boolean;
    isSpeaking?: boolean;
    isMuted?: boolean;
};
export interface UpdateCommsState extends UeUpdate {
    messageType: CommsStateMessage;
    payload: CommsStatePayload;
}
export declare type InteractionTypes = "item" | "sittable" | "clothing";
export declare type Vector2 = {
    x: number;
    y: number;
};
export declare type Vector3 = {
    x: number;
    y: number;
    z: number;
};
export interface LocalSpatialData {
    pos: Vector3;
    rot: Vector3;
    fov: number;
    lap: Vector3;
    camPos: Vector3;
}
export interface RemoteSpatialData {
    id: string;
    hover?: boolean;
}
export interface InteractableItemData extends RemoteSpatialData {
    type: InteractionTypes;
    context?: {
        pos?: Vector3;
    };
}
export interface RemotePlayerSpatialData extends RemoteSpatialData {
    context: {
        screenPos: Vector2;
        dist: number;
        pos: Vector3;
        rot: Vector3;
    };
}
export interface SpatialMediaData extends RemoteSpatialData {
    dist: number;
}
export interface UpdateSpatialData extends UeUpdate {
    messageType: "remoteSpatialData";
    payload: {
        avatars: RemotePlayerSpatialData[];
        items: InteractableItemData[];
        media: SpatialMediaData[];
    };
}
export interface UpdateStreamingResolution extends UeUpdate {
    messageType: "updateStreamingResolution";
    payload: {
        width: string;
        height: string;
    };
}
export declare type PlayerInteraction = {
    mediaUrl: string;
};
export interface WindowFocusState {
    messageType: "updateFocusState";
    payload: {
        isFocused: boolean;
    };
}
export interface AvatarVisibility {
    messageType: "updateAvatarVisibility";
    payload: {
        isVisible: boolean;
    };
}
export interface FaceupCameraToggle {
    messageType: "updateFaceupCameraToggle";
    payload: {
        isVisible: boolean;
    };
}
export interface FaceupLightToggle {
    messageType: "updateFaceupLightToggle";
    payload: {
        isVisible: boolean;
    };
}
export interface InteractionEvent {
    id?: string;
    type: "item" | "avatar" | "sittable" | "clothing" | "spatialMedia";
}
export interface ItemTransformEvent extends InteractionEvent {
    interactionType: "offsetUpRotation" | "offsetUniformScale" | "position" | "rotation" | "scale" | "attenuation" | "volume";
    interactionData: {
        value: number | Vector3;
    };
}
export interface SpatialMediaInteractionEvent extends InteractionEvent {
    type: "spatialMedia";
    interactionType: "open" | "closed";
}
export interface ItemSelectionEvent extends InteractionEvent {
    interactionType: "select";
    interactionData: {
        isSelected: boolean;
    };
}
export interface ItemDraggingEvent extends InteractionEvent {
    interactionType: "drag";
    interactionData: {
        isDragging: boolean;
    };
}
export interface LookAtEvent extends InteractionEvent {
    interactionType: "lookAt";
}
export interface EventResolutionPayload {
    id: string;
    type: "item" | "avatar" | "sittable" | "clothing";
    interactionType?: string;
    resolutionData: {
        success: boolean;
        errorMessage?: string;
    };
}
export interface ConfiguratorDataRequest {
    messageType: "getConfiguratorItems";
}
export interface ConfiguratorObjectData {
    ueId: string;
    name?: string;
    thumb?: string;
    configuration: {
        [key: string]: (ObjectConfiguration | EnumObjectConfiguration);
    };
}
export interface ConfiguratorObjectDataResponse {
    messageType: "configuratorObjectData";
    payload: ConfiguratorObjectData[];
}
export interface EditModeToggle {
    messageType: "cmsEditMode";
    payload: {
        isToggledOn: boolean;
    };
}
export declare type TeleportDestinations = "user" | "poi" | "spawnPoint";
export interface TeleportAvatar {
    messageType: "createTeleportEvent";
    payload: {
        destination: TeleportDestinations;
        id: string;
    };
}
export {};
