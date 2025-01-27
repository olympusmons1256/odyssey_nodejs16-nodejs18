import {SpaceItem as SpaceItemDocType, SpaceItemType, Vector3 as Vector3DocType, SpatialMedia as SpatialMediaDocType, SpatialVideo as SpatialVideoDocType, SpatialLink as SpatialLinkDocType, RuntimeModel as RuntimeModelDocType, SpatialMediaTypes, ModelMetadata as ModelMetadataType} from "../../lib/cmsDocTypes";
import * as firebaseAdmin from "firebase-admin";
import {CreateSpaceItemDto} from "./dto/createSpaceItem.dto";
import {CreateRuntimeModelDto} from "./dto/createRuntimeModel.dto";
import {CreateSpatialMediaDto} from "./dto/createSpatialMedia.dto";
import {CreateSpatialVideoDto} from "./dto/createSpatialVideo.dto";
import {CreateSpatialLinkDto} from "./dto/createSpatialLink.dto";
import {UpdateRuntimeModelDto} from "./dto/updateRuntimeModel.dto";
import {UpdateSpatialMediaDto} from "./dto/updateSpatialMedia.dto";
import {UpdateSpatialVideoDto} from "./dto/updateSpatialVideo.dto";
import {UpdateSpatialLinkDto} from "./dto/updateSpatialLink.dto";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class Vector3 implements Vector3DocType {
  @ApiProperty()
  x: number;
  @ApiProperty()
  y: number;
  @ApiProperty()
  z: number;
}

export class SpaceItem implements SpaceItemDocType {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  type: SpaceItemType
  @ApiPropertyOptional({type: Date})
  created?: firebaseAdmin.firestore.Timestamp
  @ApiPropertyOptional({type: Date})
  updated?: firebaseAdmin.firestore.Timestamp
  @ApiProperty()
  position: Vector3
  @ApiProperty()
  rotation: Vector3
  @ApiProperty()
  offsetUpRotation: number;
  @ApiPropertyOptional()
  thumb?: string
  @ApiPropertyOptional()
  isLocked?: boolean
  @ApiPropertyOptional()
  user?: string
  @ApiProperty()
  name: string

  static ofDto(createSpaceItemDto: CreateSpaceItemDto) : SpaceItem | undefined {
    const spaceItem = new SpaceItem();
    spaceItem.created = firebaseAdmin.firestore.Timestamp.now();
    spaceItem.updated = firebaseAdmin.firestore.Timestamp.now();
    spaceItem.type = createSpaceItemDto.type;
    spaceItem.position = createSpaceItemDto.position;
    spaceItem.rotation = createSpaceItemDto.rotation;
    spaceItem.offsetUpRotation = createSpaceItemDto.offsetUpRotation;
    spaceItem.name = createSpaceItemDto.name;
    return spaceItem;
  }
}

export class SpatialMedia extends SpaceItem implements SpatialMediaDocType {
  @ApiProperty()
  type: "SpatialMedia"
  @ApiProperty()
  mediaType: SpatialMediaTypes;
  @ApiProperty()
  attenuation: number;
  @ApiProperty()
  url: string;

  static ofDto(createSpatialMediaDto: CreateSpatialMediaDto) {
    const spatialMedia = new SpatialMedia();
    spatialMedia.created = firebaseAdmin.firestore.Timestamp.now();
    spatialMedia.updated = firebaseAdmin.firestore.Timestamp.now();
    spatialMedia.position = createSpatialMediaDto.position;
    spatialMedia.rotation = createSpatialMediaDto.rotation;
    spatialMedia.offsetUpRotation = createSpatialMediaDto.offsetUpRotation;
    spatialMedia.name = createSpatialMediaDto.name;
    spatialMedia.type = "SpatialMedia";
    spatialMedia.attenuation = createSpatialMediaDto.attenuation;
    spatialMedia.url = createSpatialMediaDto.url;
    spatialMedia.mediaType = createSpatialMediaDto.mediaType;
    return spatialMedia;
  }

  static ofUpdateDto(updateSpatialMediaDto: UpdateSpatialMediaDto, spatialMediaId: string) {
    const spatialMedia = new SpatialMedia();
    spatialMedia.id = spatialMediaId;
    spatialMedia.updated = firebaseAdmin.firestore.Timestamp.now();
    spatialMedia.type = "SpatialMedia";
    if (updateSpatialMediaDto.position != undefined) spatialMedia.position = updateSpatialMediaDto.position;
    if (updateSpatialMediaDto.rotation != undefined) spatialMedia.rotation = updateSpatialMediaDto.rotation;
    if (updateSpatialMediaDto.offsetUpRotation != undefined) spatialMedia.offsetUpRotation = updateSpatialMediaDto.offsetUpRotation;
    if (updateSpatialMediaDto.name != undefined) spatialMedia.name = updateSpatialMediaDto.name;
    if (updateSpatialMediaDto.attenuation != undefined) spatialMedia.attenuation = updateSpatialMediaDto.attenuation;
    if (updateSpatialMediaDto.url != undefined) spatialMedia.url = updateSpatialMediaDto.url;
    return spatialMedia;
  }
}

export class SpatialLink extends SpatialMedia implements SpatialLinkDocType {
  @ApiProperty()
  mediaType: "link";
  @ApiProperty()
  isPortrait?: boolean;
  @ApiProperty()
  openInNewTab?: boolean;

  static ofDto(createSpatialLinkDto: CreateSpatialLinkDto) {
    const spatialLink = new SpatialLink();
    spatialLink.created = firebaseAdmin.firestore.Timestamp.now();
    spatialLink.updated = firebaseAdmin.firestore.Timestamp.now();
    spatialLink.position = createSpatialLinkDto.position;
    spatialLink.rotation = createSpatialLinkDto.rotation;
    spatialLink.offsetUpRotation = createSpatialLinkDto.offsetUpRotation;
    spatialLink.name = createSpatialLinkDto.name;
    spatialLink.type = "SpatialMedia";
    spatialLink.mediaType = "link";
    spatialLink.url = createSpatialLinkDto.url;
    spatialLink.attenuation = createSpatialLinkDto.attenuation;
    spatialLink.isPortrait = createSpatialLinkDto.isPortrait;
    spatialLink.openInNewTab = createSpatialLinkDto.openInNewTab;
    return spatialLink;
  }

  static ofUpdateDto(updateSpatialLinkDto: UpdateSpatialLinkDto, spatialLinkId: string) {
    const spatialLink = new SpatialLink();
    spatialLink.id = spatialLinkId;
    spatialLink.updated = firebaseAdmin.firestore.Timestamp.now();
    spatialLink.type = "SpatialMedia";
    spatialLink.mediaType = "link";
    if (updateSpatialLinkDto.position != undefined) spatialLink.position = updateSpatialLinkDto.position;
    if (updateSpatialLinkDto.rotation != undefined) spatialLink.rotation = updateSpatialLinkDto.rotation;
    if (updateSpatialLinkDto.offsetUpRotation != undefined) spatialLink.offsetUpRotation = updateSpatialLinkDto.offsetUpRotation;
    if (updateSpatialLinkDto.name != undefined) spatialLink.name = updateSpatialLinkDto.name;
    if (updateSpatialLinkDto.url != undefined) spatialLink.url = updateSpatialLinkDto.url;
    if (updateSpatialLinkDto.attenuation != undefined) spatialLink.attenuation = updateSpatialLinkDto.attenuation;
    if (updateSpatialLinkDto.openInNewTab != undefined) spatialLink.openInNewTab = updateSpatialLinkDto.openInNewTab;
    return spatialLink;
  }
}

export class SpatialVideo extends SpatialMedia implements SpatialVideoDocType {
  @ApiProperty()
  mediaType: "video";
  @ApiProperty()
  volume: number;
  @ApiProperty()
  loop: boolean;
  @ApiProperty()
  autoplay: boolean;
  @ApiProperty()
  audioOnly: boolean;
  @ApiProperty()
  showPreview: boolean;

  static ofDto(createSpatialVideoDto: CreateSpatialVideoDto) {
    const spatialVideo = new SpatialVideo();
    spatialVideo.created = firebaseAdmin.firestore.Timestamp.now();
    spatialVideo.updated = firebaseAdmin.firestore.Timestamp.now();
    spatialVideo.position = createSpatialVideoDto.position;
    spatialVideo.rotation = createSpatialVideoDto.rotation;
    spatialVideo.offsetUpRotation = createSpatialVideoDto.offsetUpRotation;
    spatialVideo.name = createSpatialVideoDto.name;
    spatialVideo.type = "SpatialMedia";
    spatialVideo.mediaType = "video";
    spatialVideo.attenuation = createSpatialVideoDto.attenuation;
    spatialVideo.volume = createSpatialVideoDto.volume;
    spatialVideo.url = createSpatialVideoDto.url;
    spatialVideo.loop = createSpatialVideoDto.loop;
    spatialVideo.autoplay = createSpatialVideoDto.autoplay;
    spatialVideo.showPreview = createSpatialVideoDto.showPreview;
    spatialVideo.audioOnly = createSpatialVideoDto.audioOnly;
    return spatialVideo;
  }

  static ofUpdateDto(updateSpatialVideoDto: UpdateSpatialVideoDto, spatialVideoId: string) {
    const spatialVideo = new SpatialVideo();
    spatialVideo.id = spatialVideoId;
    spatialVideo.updated = firebaseAdmin.firestore.Timestamp.now();
    spatialVideo.type = "SpatialMedia";
    spatialVideo.mediaType = "video";
    if (updateSpatialVideoDto.position != undefined) spatialVideo.position = updateSpatialVideoDto.position;
    if (updateSpatialVideoDto.rotation != undefined) spatialVideo.rotation = updateSpatialVideoDto.rotation;
    if (updateSpatialVideoDto.offsetUpRotation != undefined) spatialVideo.offsetUpRotation = updateSpatialVideoDto.offsetUpRotation;
    if (updateSpatialVideoDto.name != undefined) spatialVideo.name = updateSpatialVideoDto.name;
    if (updateSpatialVideoDto.attenuation != undefined) spatialVideo.attenuation = updateSpatialVideoDto.attenuation;
    if (updateSpatialVideoDto.volume != undefined) spatialVideo.volume = updateSpatialVideoDto.volume;
    if (updateSpatialVideoDto.url != undefined) spatialVideo.url = updateSpatialVideoDto.url;
    if (updateSpatialVideoDto.loop != undefined) spatialVideo.loop = updateSpatialVideoDto.loop;
    if (updateSpatialVideoDto.autoplay != undefined) spatialVideo.autoplay = updateSpatialVideoDto.autoplay;
    if (updateSpatialVideoDto.showPreview != undefined) spatialVideo.showPreview = updateSpatialVideoDto.showPreview;
    if (updateSpatialVideoDto.audioOnly != undefined) spatialVideo.audioOnly = updateSpatialVideoDto.audioOnly;
    return spatialVideo;
  }
}

export class RuntimeModel extends SpaceItem implements RuntimeModelDocType {
  @ApiProperty()
  collisionsEnabled: boolean
  @ApiPropertyOptional()
  currentAnimation?: string
  @ApiPropertyOptional()
  availableAnimations?: string[]
  @ApiProperty()
  type: "RuntimeModel"
  @ApiProperty()
  gltfUrl: string;
  @ApiProperty()
  scale: Vector3
  @ApiProperty()
  offsetUniformScale: number
  @ApiProperty()
  materialOverrideId: string;
  @ApiProperty()
  autoScale: boolean;
  @ApiPropertyOptional()
  metadata?: ModelMetadataType;

  static ofDto(createRuntimeModelDto: CreateRuntimeModelDto) {
    const runtimeModel = new RuntimeModel();
    runtimeModel.created = firebaseAdmin.firestore.Timestamp.now();
    runtimeModel.updated = firebaseAdmin.firestore.Timestamp.now();
    runtimeModel.position = createRuntimeModelDto.position;
    runtimeModel.rotation = createRuntimeModelDto.rotation;
    runtimeModel.offsetUpRotation = createRuntimeModelDto.offsetUpRotation;
    runtimeModel.scale = createRuntimeModelDto.scale;
    runtimeModel.offsetUniformScale = createRuntimeModelDto.offsetUniformScale;
    runtimeModel.name = createRuntimeModelDto.name;
    runtimeModel.type = "RuntimeModel";
    runtimeModel.gltfUrl = createRuntimeModelDto.gltfUrl;
    runtimeModel.materialOverrideId = createRuntimeModelDto.materialOverrideId;
    runtimeModel.metadata = createRuntimeModelDto.metadata;
    return runtimeModel;
  }

  static ofUpdateDto(updateRuntimeModelDto: UpdateRuntimeModelDto, runtimeModelId: string) {
    const runtimeModel = new RuntimeModel();
    runtimeModel.id = runtimeModelId;
    runtimeModel.updated = firebaseAdmin.firestore.Timestamp.now();
    runtimeModel.type = "RuntimeModel";
    if (updateRuntimeModelDto.position != undefined) runtimeModel.position = updateRuntimeModelDto.position;
    if (updateRuntimeModelDto.rotation != undefined) runtimeModel.rotation = updateRuntimeModelDto.rotation;
    if (updateRuntimeModelDto.offsetUpRotation != undefined) runtimeModel.offsetUpRotation = updateRuntimeModelDto.offsetUpRotation;
    if (updateRuntimeModelDto.scale != undefined) runtimeModel.scale = updateRuntimeModelDto.scale;
    if (updateRuntimeModelDto.offsetUniformScale != undefined) runtimeModel.offsetUniformScale = updateRuntimeModelDto.offsetUniformScale;
    if (updateRuntimeModelDto.name != undefined) runtimeModel.name = updateRuntimeModelDto.name;
    if (updateRuntimeModelDto.gltfUrl != undefined) runtimeModel.gltfUrl = updateRuntimeModelDto.gltfUrl;
    if (updateRuntimeModelDto.materialOverrideId != undefined) runtimeModel.materialOverrideId = updateRuntimeModelDto.materialOverrideId;
    if (updateRuntimeModelDto.metadata != undefined) runtimeModel.metadata = updateRuntimeModelDto.metadata;
    return runtimeModel;
  }
}
