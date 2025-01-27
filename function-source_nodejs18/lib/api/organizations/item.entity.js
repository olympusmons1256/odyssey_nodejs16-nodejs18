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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeModel = exports.SpatialVideo = exports.SpatialLink = exports.SpatialMedia = exports.SpaceItem = exports.Vector3 = void 0;
const firebaseAdmin = __importStar(require("firebase-admin"));
const swagger_1 = require("@nestjs/swagger");
class Vector3 {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], Vector3.prototype, "x", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], Vector3.prototype, "y", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], Vector3.prototype, "z", void 0);
exports.Vector3 = Vector3;
class SpaceItem {
    static ofDto(createSpaceItemDto) {
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
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpaceItem.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpaceItem.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Date }),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], SpaceItem.prototype, "created", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Date }),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], SpaceItem.prototype, "updated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Vector3)
], SpaceItem.prototype, "position", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Vector3)
], SpaceItem.prototype, "rotation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SpaceItem.prototype, "offsetUpRotation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], SpaceItem.prototype, "thumb", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], SpaceItem.prototype, "isLocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], SpaceItem.prototype, "user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpaceItem.prototype, "name", void 0);
exports.SpaceItem = SpaceItem;
class SpatialMedia extends SpaceItem {
    static ofDto(createSpatialMediaDto) {
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
    static ofUpdateDto(updateSpatialMediaDto, spatialMediaId) {
        const spatialMedia = new SpatialMedia();
        spatialMedia.id = spatialMediaId;
        spatialMedia.updated = firebaseAdmin.firestore.Timestamp.now();
        spatialMedia.type = "SpatialMedia";
        if (updateSpatialMediaDto.position != undefined)
            spatialMedia.position = updateSpatialMediaDto.position;
        if (updateSpatialMediaDto.rotation != undefined)
            spatialMedia.rotation = updateSpatialMediaDto.rotation;
        if (updateSpatialMediaDto.offsetUpRotation != undefined)
            spatialMedia.offsetUpRotation = updateSpatialMediaDto.offsetUpRotation;
        if (updateSpatialMediaDto.name != undefined)
            spatialMedia.name = updateSpatialMediaDto.name;
        if (updateSpatialMediaDto.attenuation != undefined)
            spatialMedia.attenuation = updateSpatialMediaDto.attenuation;
        if (updateSpatialMediaDto.url != undefined)
            spatialMedia.url = updateSpatialMediaDto.url;
        return spatialMedia;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpatialMedia.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpatialMedia.prototype, "mediaType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SpatialMedia.prototype, "attenuation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpatialMedia.prototype, "url", void 0);
exports.SpatialMedia = SpatialMedia;
class SpatialLink extends SpatialMedia {
    static ofDto(createSpatialLinkDto) {
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
    static ofUpdateDto(updateSpatialLinkDto, spatialLinkId) {
        const spatialLink = new SpatialLink();
        spatialLink.id = spatialLinkId;
        spatialLink.updated = firebaseAdmin.firestore.Timestamp.now();
        spatialLink.type = "SpatialMedia";
        spatialLink.mediaType = "link";
        if (updateSpatialLinkDto.position != undefined)
            spatialLink.position = updateSpatialLinkDto.position;
        if (updateSpatialLinkDto.rotation != undefined)
            spatialLink.rotation = updateSpatialLinkDto.rotation;
        if (updateSpatialLinkDto.offsetUpRotation != undefined)
            spatialLink.offsetUpRotation = updateSpatialLinkDto.offsetUpRotation;
        if (updateSpatialLinkDto.name != undefined)
            spatialLink.name = updateSpatialLinkDto.name;
        if (updateSpatialLinkDto.url != undefined)
            spatialLink.url = updateSpatialLinkDto.url;
        if (updateSpatialLinkDto.attenuation != undefined)
            spatialLink.attenuation = updateSpatialLinkDto.attenuation;
        if (updateSpatialLinkDto.openInNewTab != undefined)
            spatialLink.openInNewTab = updateSpatialLinkDto.openInNewTab;
        return spatialLink;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpatialLink.prototype, "mediaType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], SpatialLink.prototype, "isPortrait", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], SpatialLink.prototype, "openInNewTab", void 0);
exports.SpatialLink = SpatialLink;
class SpatialVideo extends SpatialMedia {
    static ofDto(createSpatialVideoDto) {
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
    static ofUpdateDto(updateSpatialVideoDto, spatialVideoId) {
        const spatialVideo = new SpatialVideo();
        spatialVideo.id = spatialVideoId;
        spatialVideo.updated = firebaseAdmin.firestore.Timestamp.now();
        spatialVideo.type = "SpatialMedia";
        spatialVideo.mediaType = "video";
        if (updateSpatialVideoDto.position != undefined)
            spatialVideo.position = updateSpatialVideoDto.position;
        if (updateSpatialVideoDto.rotation != undefined)
            spatialVideo.rotation = updateSpatialVideoDto.rotation;
        if (updateSpatialVideoDto.offsetUpRotation != undefined)
            spatialVideo.offsetUpRotation = updateSpatialVideoDto.offsetUpRotation;
        if (updateSpatialVideoDto.name != undefined)
            spatialVideo.name = updateSpatialVideoDto.name;
        if (updateSpatialVideoDto.attenuation != undefined)
            spatialVideo.attenuation = updateSpatialVideoDto.attenuation;
        if (updateSpatialVideoDto.volume != undefined)
            spatialVideo.volume = updateSpatialVideoDto.volume;
        if (updateSpatialVideoDto.url != undefined)
            spatialVideo.url = updateSpatialVideoDto.url;
        if (updateSpatialVideoDto.loop != undefined)
            spatialVideo.loop = updateSpatialVideoDto.loop;
        if (updateSpatialVideoDto.autoplay != undefined)
            spatialVideo.autoplay = updateSpatialVideoDto.autoplay;
        if (updateSpatialVideoDto.showPreview != undefined)
            spatialVideo.showPreview = updateSpatialVideoDto.showPreview;
        if (updateSpatialVideoDto.audioOnly != undefined)
            spatialVideo.audioOnly = updateSpatialVideoDto.audioOnly;
        return spatialVideo;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpatialVideo.prototype, "mediaType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SpatialVideo.prototype, "volume", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], SpatialVideo.prototype, "loop", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], SpatialVideo.prototype, "autoplay", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], SpatialVideo.prototype, "audioOnly", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], SpatialVideo.prototype, "showPreview", void 0);
exports.SpatialVideo = SpatialVideo;
class RuntimeModel extends SpaceItem {
    static ofDto(createRuntimeModelDto) {
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
    static ofUpdateDto(updateRuntimeModelDto, runtimeModelId) {
        const runtimeModel = new RuntimeModel();
        runtimeModel.id = runtimeModelId;
        runtimeModel.updated = firebaseAdmin.firestore.Timestamp.now();
        runtimeModel.type = "RuntimeModel";
        if (updateRuntimeModelDto.position != undefined)
            runtimeModel.position = updateRuntimeModelDto.position;
        if (updateRuntimeModelDto.rotation != undefined)
            runtimeModel.rotation = updateRuntimeModelDto.rotation;
        if (updateRuntimeModelDto.offsetUpRotation != undefined)
            runtimeModel.offsetUpRotation = updateRuntimeModelDto.offsetUpRotation;
        if (updateRuntimeModelDto.scale != undefined)
            runtimeModel.scale = updateRuntimeModelDto.scale;
        if (updateRuntimeModelDto.offsetUniformScale != undefined)
            runtimeModel.offsetUniformScale = updateRuntimeModelDto.offsetUniformScale;
        if (updateRuntimeModelDto.name != undefined)
            runtimeModel.name = updateRuntimeModelDto.name;
        if (updateRuntimeModelDto.gltfUrl != undefined)
            runtimeModel.gltfUrl = updateRuntimeModelDto.gltfUrl;
        if (updateRuntimeModelDto.materialOverrideId != undefined)
            runtimeModel.materialOverrideId = updateRuntimeModelDto.materialOverrideId;
        if (updateRuntimeModelDto.metadata != undefined)
            runtimeModel.metadata = updateRuntimeModelDto.metadata;
        return runtimeModel;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], RuntimeModel.prototype, "collisionsEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], RuntimeModel.prototype, "currentAnimation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], RuntimeModel.prototype, "availableAnimations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RuntimeModel.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RuntimeModel.prototype, "gltfUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Vector3)
], RuntimeModel.prototype, "scale", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RuntimeModel.prototype, "offsetUniformScale", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RuntimeModel.prototype, "materialOverrideId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], RuntimeModel.prototype, "autoScale", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], RuntimeModel.prototype, "metadata", void 0);
exports.RuntimeModel = RuntimeModel;
//# sourceMappingURL=item.entity.js.map