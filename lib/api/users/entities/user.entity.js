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
var User_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const firebaseAdmin = __importStar(require("firebase-admin"));
const fireorm_1 = require("fireorm");
const class_transformer_1 = require("class-transformer");
const createUser_dto_1 = require("../dto/createUser.dto");
const swagger_1 = require("@nestjs/swagger");
let User = User_1 = class User {
    static ofDto(createUserDto) {
        const user = new User_1();
        user.updated = firebaseAdmin.firestore.Timestamp.now();
        user.created = firebaseAdmin.firestore.Timestamp.now();
        user.userSpaces = [];
        user.pending = false;
        user.additionalInfo = {};
        user.email = createUserDto.email;
        user.bot = false;
        user.name = createUserDto.name;
        user.avatarReadyPlayerMeImg = createUserDto.avatarReadyPlayerMeImg;
        user.bodyShape = createUserDto.bodyShape;
        user.bodyHeight = createUserDto.bodyHeight;
        user.roomInvites = createUserDto.roomInvites;
        user.avatarReadyPlayerMeUrl = createUserDto.avatarReadyPlayerMeUrl;
        user.clothingTop = createUserDto.clothingTop;
        user.clothingShoes = createUserDto.clothingShoes;
        user.clothingBottom = createUserDto.clothingBottom;
        return user;
    }
    static ofUpdateDto(updateUserDto, userId) {
        const user = new User_1();
        user.id = userId;
        user.bot = false;
        user.updated = firebaseAdmin.firestore.Timestamp.now();
        if (updateUserDto.updated != undefined)
            user.updated = updateUserDto.updated;
        if (updateUserDto.name != undefined)
            user.name = updateUserDto.name;
        if (updateUserDto.avatarReadyPlayerMeImg != undefined)
            user.avatarReadyPlayerMeImg = updateUserDto.avatarReadyPlayerMeImg;
        if (updateUserDto.bodyShape != undefined)
            user.bodyShape = updateUserDto.bodyShape;
        if (updateUserDto.bodyHeight != undefined)
            user.bodyHeight = updateUserDto.bodyHeight;
        if (updateUserDto.additionalInfo != undefined)
            user.additionalInfo = updateUserDto.additionalInfo;
        if (updateUserDto.avatarReadyPlayerMeUrl != undefined)
            user.avatarReadyPlayerMeUrl = updateUserDto.avatarReadyPlayerMeUrl;
        if (updateUserDto.clothingTop != undefined)
            user.clothingTop = updateUserDto.clothingTop;
        if (updateUserDto.clothingShoes != undefined)
            user.clothingShoes = updateUserDto.clothingShoes;
        if (updateUserDto.clothingBottom != undefined)
            user.clothingBottom = updateUserDto.clothingBottom;
        return user;
    }
};
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Date }),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], User.prototype, "created", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Date }),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], User.prototype, "updated", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Boolean)
], User.prototype, "bot", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], User.prototype, "avatarReadyPlayerMeImg", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Boolean)
], User.prototype, "pending", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], User.prototype, "bodyShape", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], User.prototype, "bodyHeight", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Array)
], User.prototype, "roomInvites", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Object)
], User.prototype, "additionalInfo", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], User.prototype, "avatarReadyPlayerMeUrl", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Array)
], User.prototype, "followingOrganizationIds", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Array)
], User.prototype, "userSpaces", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", createUser_dto_1.AvatarClothingSettings)
], User.prototype, "clothingTop", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", createUser_dto_1.AvatarClothingSettings)
], User.prototype, "clothingShoes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", createUser_dto_1.AvatarClothingSettings)
], User.prototype, "clothingBottom", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Array)
], User.prototype, "userOrganizations", void 0);
User = User_1 = __decorate([
    (0, fireorm_1.Collection)("users")
], User);
exports.User = User;
//# sourceMappingURL=user.entity.js.map