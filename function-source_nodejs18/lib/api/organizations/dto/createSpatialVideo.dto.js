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
exports.CreateSpatialVideoDto = void 0;
const class_validator_1 = require("class-validator");
const createSpatialMedia_dto_1 = require("./createSpatialMedia.dto");
const swagger_1 = require("@nestjs/swagger");
class CreateSpatialVideoDto extends createSpatialMedia_dto_1.CreateSpatialMediaDto {
}
__decorate([
    (0, class_validator_1.IsEmpty)(),
    __metadata("design:type", String)
], CreateSpatialVideoDto.prototype, "mediaType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateSpatialVideoDto.prototype, "volume", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Boolean)
], CreateSpatialVideoDto.prototype, "loop", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Boolean)
], CreateSpatialVideoDto.prototype, "autoplay", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Boolean)
], CreateSpatialVideoDto.prototype, "audioOnly", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Boolean)
], CreateSpatialVideoDto.prototype, "showPreview", void 0);
exports.CreateSpatialVideoDto = CreateSpatialVideoDto;
//# sourceMappingURL=createSpatialVideo.dto.js.map