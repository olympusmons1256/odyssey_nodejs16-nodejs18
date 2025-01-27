"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRuntimeModelDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const item_entity_1 = require("../item.entity");
const updateSpaceItem_dto_1 = require("./updateSpaceItem.dto");
class UpdateRuntimeModelDto extends updateSpaceItem_dto_1.UpdateSpaceItemDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UpdateRuntimeModelDto.prototype, "gltfUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UpdateRuntimeModelDto.prototype, "materialOverrideId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], UpdateRuntimeModelDto.prototype, "collisionsEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], UpdateRuntimeModelDto.prototype, "offsetUniformScale", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", item_entity_1.Vector3)
], UpdateRuntimeModelDto.prototype, "scale", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], UpdateRuntimeModelDto.prototype, "autoScale", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UpdateRuntimeModelDto.prototype, "currentAnimation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], UpdateRuntimeModelDto.prototype, "availableAnimations", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], UpdateRuntimeModelDto.prototype, "metadata", void 0);
exports.UpdateRuntimeModelDto = UpdateRuntimeModelDto;
//# sourceMappingURL=updateRuntimeModel.dto.js.map