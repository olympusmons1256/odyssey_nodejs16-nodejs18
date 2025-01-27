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
exports.UpdateSpatialVideoDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const updateSpatialMedia_dto_1 = require("./updateSpatialMedia.dto");
class UpdateSpatialVideoDto extends updateSpatialMedia_dto_1.UpdateSpatialMediaDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], UpdateSpatialVideoDto.prototype, "volume", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], UpdateSpatialVideoDto.prototype, "loop", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], UpdateSpatialVideoDto.prototype, "autoplay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], UpdateSpatialVideoDto.prototype, "audioOnly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], UpdateSpatialVideoDto.prototype, "showPreview", void 0);
exports.UpdateSpatialVideoDto = UpdateSpatialVideoDto;
//# sourceMappingURL=updateSpatialVideo.dto.js.map