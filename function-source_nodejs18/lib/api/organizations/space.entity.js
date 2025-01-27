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
exports.Space = exports.RegistrationInfoFields = void 0;
const firebaseAdmin = __importStar(require("firebase-admin"));
const item_entity_1 = require("./item.entity");
const fireorm_1 = require("fireorm");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class RegistrationInfoFields {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], RegistrationInfoFields.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], RegistrationInfoFields.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], RegistrationInfoFields.prototype, "fullName", void 0);
exports.RegistrationInfoFields = RegistrationInfoFields;
class Space {
    static ofDto(createSpaceDto, spaceTemplate) {
        const space = new Space();
        space.created = firebaseAdmin.firestore.Timestamp.now();
        space.updated = firebaseAdmin.firestore.Timestamp.now();
        space.thumb = createSpaceDto.thumb || spaceTemplate.thumb;
        space.persistentLiveStream = createSpaceDto.persistentLiveStream;
        space.disableComms = createSpaceDto.disableComms;
        space.isLiveStreamActive = createSpaceDto.isLiveStreamActive;
        space.infoFields = createSpaceDto.infoFields;
        space.spaceTemplateId = createSpaceDto.spaceTemplateId;
        space.enableSharding = createSpaceDto.enableSharding;
        space.isPublic = createSpaceDto.isPublic;
        space.name = createSpaceDto.name;
        space.ueId = spaceTemplate.ueId;
        return space;
    }
    static ofUpdateDto(updateSpaceDto, spaceId) {
        const space = new Space();
        space.id = spaceId;
        space.updated = firebaseAdmin.firestore.Timestamp.now();
        if (updateSpaceDto.thumb != undefined)
            space.thumb = updateSpaceDto.thumb;
        if (updateSpaceDto.persistentLiveStream != undefined)
            space.persistentLiveStream = updateSpaceDto.persistentLiveStream;
        if (updateSpaceDto.disableComms != undefined)
            space.disableComms = updateSpaceDto.disableComms;
        if (updateSpaceDto.isLiveStreamActive != undefined)
            space.isLiveStreamActive = updateSpaceDto.isLiveStreamActive;
        if (updateSpaceDto.infoFields != undefined)
            space.infoFields = updateSpaceDto.infoFields;
        if (updateSpaceDto.enableSharding != undefined)
            space.enableSharding = updateSpaceDto.enableSharding;
        if (updateSpaceDto.isPublic != undefined)
            space.isPublic = updateSpaceDto.isPublic;
        if (updateSpaceDto.name != undefined)
            space.name = updateSpaceDto.name;
        return space;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], Space.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Date }),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], Space.prototype, "created", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], Space.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], Space.prototype, "enableSharding", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", RegistrationInfoFields)
], Space.prototype, "infoFields", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], Space.prototype, "isLiveStreamActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], Space.prototype, "isPublic", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], Space.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Space.prototype, "persistentLiveStream", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Array)
], Space.prototype, "rooms", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], Space.prototype, "spaceTemplateId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], Space.prototype, "thumb", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], Space.prototype, "ueId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Date }),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], Space.prototype, "updated", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], Space.prototype, "disableComms", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, fireorm_1.SubCollection)(item_entity_1.SpaceItem, "spaceItems"),
    __metadata("design:type", Object)
], Space.prototype, "items", void 0);
exports.Space = Space;
//# sourceMappingURL=space.entity.js.map