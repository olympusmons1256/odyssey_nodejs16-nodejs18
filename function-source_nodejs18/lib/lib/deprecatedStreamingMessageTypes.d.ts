import { UeUpdate, InteractionTypes, Vector2, Vector3 } from "./streamingMessageTypes";
export interface DeprecatedLocalSpatialData {
    position: Vector3;
    rotation: Vector3;
    fieldOfView: number;
    lookAtPosition: Vector3;
    cameraPosition: Vector3;
}
export interface DeprecatedRemoteSpatialData {
    id: string;
    hover: boolean;
}
export interface DeprecatedInteractableItemData extends DeprecatedRemoteSpatialData {
    type: InteractionTypes;
    context?: {
        position?: Vector3;
    };
}
export interface DeprecatedRemotePlayerSpatialData extends DeprecatedRemoteSpatialData {
    type: "avatar";
    context: {
        screenPosition: Vector2;
        distance: number;
        position: Vector3;
        rotation: Vector3;
    };
}
export interface DeprecatedUpdateSpatialData extends UeUpdate {
    messageType: "remoteSpatialData";
    payload: {
        userAvatars: DeprecatedRemotePlayerSpatialData[];
        interactableItems: DeprecatedInteractableItemData[];
    };
}
