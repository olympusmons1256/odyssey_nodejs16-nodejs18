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
exports.UpdateUserDto = void 0;
const firebaseAdmin = __importStar(require("firebase-admin"));
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const createUser_dto_1 = require("./createUser.dto");
class UpdateUserDto {
}
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], UpdateUserDto.prototype, "created", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], UpdateUserDto.prototype, "updated", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", Boolean)
], UpdateUserDto.prototype, "bot", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "avatarReadyPlayerMeImg", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", Boolean)
], UpdateUserDto.prototype, "pending", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "bodyShape", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "bodyHeight", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "roomInvites", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "additionalInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "avatarReadyPlayerMeUrl", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "followingOrganizationIds", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "userSpaces", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", createUser_dto_1.AvatarClothingSettings)
], UpdateUserDto.prototype, "clothingTop", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", createUser_dto_1.AvatarClothingSettings)
], UpdateUserDto.prototype, "clothingShoes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", createUser_dto_1.AvatarClothingSettings)
], UpdateUserDto.prototype, "clothingBottom", void 0);
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "userOrganizations", void 0);
exports.UpdateUserDto = UpdateUserDto;
//# sourceMappingURL=updateUser.dto.js.map