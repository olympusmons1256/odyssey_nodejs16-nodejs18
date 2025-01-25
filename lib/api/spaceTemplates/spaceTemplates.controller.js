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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const spaceTemplate_entity_1 = require("./spaceTemplate.entity");
const spaceTemplates_service_1 = require("./spaceTemplates.service");
let SpaceTemplatesController = class SpaceTemplatesController {
    constructor(spaceTemplatesService) {
        this.spaceTemplatesService = spaceTemplatesService;
    }
    async findOrganization(spaceTemplateId, req) {
        const spaceTemplate = await this.spaceTemplatesService.getSpaceTemplate(spaceTemplateId, req.user.organizationId);
        if (spaceTemplate == null || spaceTemplate == undefined)
            throw new common_1.NotFoundException();
        return spaceTemplate;
    }
    async findSpaces(req) {
        return await this.spaceTemplatesService.getSpaceTemplates(req.user.organizationId);
    }
};
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: spaceTemplate_entity_1.SpaceTemplate }),
    (0, common_1.Get)(":spaceTemplateId"),
    __param(0, (0, common_1.Param)("spaceTemplateId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SpaceTemplatesController.prototype, "findOrganization", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: [spaceTemplate_entity_1.SpaceTemplate] }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SpaceTemplatesController.prototype, "findSpaces", null);
SpaceTemplatesController = __decorate([
    (0, swagger_1.ApiTags)("spaceTemplates"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)("spaceTemplates"),
    __metadata("design:paramtypes", [spaceTemplates_service_1.SpaceTemplatesService])
], SpaceTemplatesController);
exports.SpaceTemplatesController = SpaceTemplatesController;
//# sourceMappingURL=spaceTemplates.controller.js.map