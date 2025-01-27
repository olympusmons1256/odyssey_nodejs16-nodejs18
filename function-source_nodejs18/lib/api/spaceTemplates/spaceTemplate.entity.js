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
exports.SpaceTemplate = void 0;
const class_transformer_1 = require("class-transformer");
const fireorm_1 = require("fireorm");
const firebaseAdmin = __importStar(require("firebase-admin"));
const swagger_1 = require("@nestjs/swagger");
let SpaceTemplate = class SpaceTemplate {
};
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpaceTemplate.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpaceTemplate.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpaceTemplate.prototype, "type", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], SpaceTemplate.prototype, "ueId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpaceTemplate.prototype, "thumb", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], SpaceTemplate.prototype, "public", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Date }),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], SpaceTemplate.prototype, "created", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Array)
], SpaceTemplate.prototype, "orgOwner", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], SpaceTemplate.prototype, "pakState", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Date }),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], SpaceTemplate.prototype, "updated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SpaceTemplate.prototype, "description", void 0);
SpaceTemplate = __decorate([
    (0, fireorm_1.Collection)("spaceTemplates")
], SpaceTemplate);
exports.SpaceTemplate = SpaceTemplate;
//# sourceMappingURL=spaceTemplate.entity.js.map