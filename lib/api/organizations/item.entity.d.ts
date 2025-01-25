import { SpaceItem as SpaceItemDocType, SpaceItemType, Vector3 as Vector3DocType, SpatialMedia as SpatialMediaDocType, SpatialVideo as SpatialVideoDocType, SpatialLink as SpatialLinkDocType, RuntimeModel as RuntimeModelDocType, SpatialMediaTypes, ModelMetadata as ModelMetadataType } from "../../lib/cmsDocTypes";
import * as firebaseAdmin from "firebase-admin";
import { CreateSpaceItemDto } from "./dto/createSpaceItem.dto";
import { CreateRuntimeModelDto } from "./dto/createRuntimeModel.dto";
import { CreateSpatialMediaDto } from "./dto/createSpatialMedia.dto";
import { CreateSpatialVideoDto } from "./dto/createSpatialVideo.dto";
import { CreateSpatialLinkDto } from "./dto/createSpatialLink.dto";
import { UpdateRuntimeModelDto } from "./dto/updateRuntimeModel.dto";
import { UpdateSpatialMediaDto } from "./dto/updateSpatialMedia.dto";
import { UpdateSpatialVideoDto } from "./dto/updateSpatialVideo.dto";
import { UpdateSpatialLinkDto } from "./dto/updateSpatialLink.dto";
export declare class Vector3 implements Vector3DocType {
    x: number;
    y: number;
    z: number;
}
export declare class SpaceItem implements SpaceItemDocType {
    id: string;
    type: SpaceItemType;
    created?: firebaseAdmin.firestore.Timestamp;
    updated?: firebaseAdmin.firestore.Timestamp;
    position: Vector3;
    rotation: Vector3;
    offsetUpRotation: number;
    thumb?: string;
    isLocked?: boolean;
    user?: string;
    name: string;
    static ofDto(createSpaceItemDto: CreateSpaceItemDto): SpaceItem | undefined;
}
export declare class SpatialMedia extends SpaceItem implements SpatialMediaDocType {
    type: "SpatialMedia";
    mediaType: SpatialMediaTypes;
    attenuation: number;
    url: string;
    static ofDto(createSpatialMediaDto: CreateSpatialMediaDto): SpatialMedia;
    static ofUpdateDto(updateSpatialMediaDto: UpdateSpatialMediaDto, spatialMediaId: string): SpatialMedia;
}
export declare class SpatialLink extends SpatialMedia implements SpatialLinkDocType {
    mediaType: "link";
    isPortrait?: boolean;
    openInNewTab?: boolean;
    static ofDto(createSpatialLinkDto: CreateSpatialLinkDto): SpatialLink;
    static ofUpdateDto(updateSpatialLinkDto: UpdateSpatialLinkDto, spatialLinkId: string): SpatialLink;
}
export declare class SpatialVideo extends SpatialMedia implements SpatialVideoDocType {
    mediaType: "video";
    volume: number;
    loop: boolean;
    autoplay: boolean;
    audioOnly: boolean;
    showPreview: boolean;
    static ofDto(createSpatialVideoDto: CreateSpatialVideoDto): SpatialVideo;
    static ofUpdateDto(updateSpatialVideoDto: UpdateSpatialVideoDto, spatialVideoId: string): SpatialVideo;
}
export declare class RuntimeModel extends SpaceItem implements RuntimeModelDocType {
    collisionsEnabled: boolean;
    currentAnimation?: string;
    availableAnimations?: string[];
    type: "RuntimeModel";
    gltfUrl: string;
    scale: Vector3;
    offsetUniformScale: number;
    materialOverrideId: string;
    autoScale: boolean;
    metadata?: ModelMetadataType;
    static ofDto(createRuntimeModelDto: CreateRuntimeModelDto): RuntimeModel;
    static ofUpdateDto(updateRuntimeModelDto: UpdateRuntimeModelDto, runtimeModelId: string): RuntimeModel;
}
