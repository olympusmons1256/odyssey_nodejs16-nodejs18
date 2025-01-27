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
var OrganizationsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsController = void 0;
const common_1 = require("@nestjs/common");
const Errors_1 = require("postmark/dist/client/errors/Errors");
const casl_ability_factory_1 = require("../casl/casl-ability.factory");
const spaceTemplates_service_1 = require("../spaceTemplates/spaceTemplates.service");
const createSpace_dto_1 = require("./dto/createSpace.dto");
const createRuntimeModel_dto_1 = require("./dto/createRuntimeModel.dto");
const createSpatialMedia_dto_1 = require("./dto/createSpatialMedia.dto");
const updateSpace_dto_1 = require("./dto/updateSpace.dto");
const organizations_service_1 = require("./organizations.service");
const updateRuntimeModel_dto_1 = require("./dto/updateRuntimeModel.dto");
const updateSpatialMedia_dto_1 = require("./dto/updateSpatialMedia.dto");
const swagger_1 = require("@nestjs/swagger");
const organization_entity_1 = require("./organization.entity");
const space_entity_1 = require("./space.entity");
const item_entity_1 = require("./item.entity");
const invite_dto_1 = require("./dto/invite.dto");
let OrganizationsController = OrganizationsController_1 = class OrganizationsController {
    constructor(organizationsService, spaceTemplatesService, caslAbilityFactory) {
        this.organizationsService = organizationsService;
        this.spaceTemplatesService = spaceTemplatesService;
        this.caslAbilityFactory = caslAbilityFactory;
    }
    static checkJwtUserOrganizationId(user, organizationId) {
        // Reject based on user organizationId attribute
        if (user.organizationId == undefined || user.organizationId != organizationId) {
            throw new common_1.ForbiddenException();
        }
    }
    static getJwtUserOrganizationId(user) {
        // Reject based on user organizationId attribute
        if (user.organizationId == undefined || user.organizationId == null) {
            throw new common_1.ForbiddenException();
        }
        return user.organizationId;
    }
    static checkBodyNotEmpty(body) {
        if (Object.keys(body).length === 0)
            throw new common_1.BadRequestException("Request body is empty");
    }
    async findOrganization(organizationId, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const ability = this.caslAbilityFactory.createForJwtUser(req.user);
        const organization = await this.organizationsService.getOrganization(organizationId);
        // Kind of useless way to reject, but here as an example
        if (organization == null)
            throw new common_1.NotFoundException();
        if (!(ability.can(casl_ability_factory_1.Action.Read, organization)))
            throw new common_1.ForbiddenException();
        return organization;
    }
    async findSpace(organizationId, spaceId, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const space = await this.organizationsService.getSpace(organizationId, spaceId);
        if (space == undefined)
            throw new common_1.NotFoundException();
        return space;
    }
    async findSpaces(organizationId, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const ability = this.caslAbilityFactory.createForJwtUser(req.user);
        const organization = await this.organizationsService.getOrganization(organizationId);
        if (organization == undefined)
            throw new common_1.NotFoundException();
        // Kind of useless way to reject, but here as an example
        if (!ability.can(casl_ability_factory_1.Action.Read, organization))
            throw new common_1.ForbiddenException();
        return await this.organizationsService.getSpaces(organizationId);
    }
    async createSpace(organizationId, createSpaceDto, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const spaceTemplate = await this.spaceTemplatesService.getSpaceTemplate(createSpaceDto.spaceTemplateId);
        if (spaceTemplate == undefined)
            throw new common_1.NotFoundException("spaceTemplateId not found");
        const space = await this.organizationsService.createSpace(organizationId, createSpaceDto, spaceTemplate);
        if (space == undefined)
            throw new common_1.BadRequestException();
        if (space == "error")
            throw new Errors_1.InternalServerError("Error creating space", 1, 500);
        return space;
    }
    async inviteUsers(inviteUsersDto, req) {
        const organizationId = OrganizationsController_1.getJwtUserOrganizationId(req.user);
        const inviteUsersResult = await this.organizationsService.inviteOrganizationUsers(organizationId, inviteUsersDto);
        if (inviteUsersResult == undefined)
            throw new common_1.InternalServerErrorException(new invite_dto_1.InviteUsersResultDto([]));
        if (inviteUsersResult.errorCount > 0)
            throw new common_1.InternalServerErrorException(inviteUsersResult);
        return inviteUsersResult;
    }
    async updateSpace(organizationId, spaceId, updateSpaceDto, req) {
        OrganizationsController_1.checkBodyNotEmpty(req.body);
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const space = await this.organizationsService.updateSpace(organizationId, spaceId, updateSpaceDto);
        if (space == undefined)
            throw new common_1.BadRequestException();
        if (space == "error")
            throw new Errors_1.InternalServerError("Error creating space", 1, 500);
        return space;
    }
    async deleteSpace(organizationId, spaceId, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const result = await this.organizationsService.deleteSpace(organizationId, spaceId);
        if (result == "error")
            throw new Errors_1.InternalServerError("Error deleting space", 1, 500);
        if (result == undefined)
            throw new common_1.NotFoundException();
        return;
    }
    async inviteUsersToSpace(inviteUsersDto, spaceId, req) {
        const organizationId = OrganizationsController_1.getJwtUserOrganizationId(req.user);
        const inviteUsersResult = await this.organizationsService.inviteSpaceUsers(organizationId, spaceId, inviteUsersDto);
        if (inviteUsersResult == undefined)
            throw new common_1.InternalServerErrorException(new invite_dto_1.InviteUsersResultDto([]));
        if (inviteUsersResult.errorCount > 0)
            throw new common_1.InternalServerErrorException(inviteUsersResult);
        return inviteUsersResult;
    }
    async findSpaceItem(organizationId, spaceId, itemId, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const item = await this.organizationsService.getSpaceItem(organizationId, spaceId, itemId);
        if (item == undefined)
            throw new common_1.NotFoundException();
        return item;
    }
    async deleteSpaceItem(organizationId, spaceId, itemId, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const result = await this.organizationsService.deleteSpaceItem(organizationId, spaceId, itemId);
        if (result == "error")
            throw new Errors_1.InternalServerError("Error deleting item", 1, 500);
        if (result == undefined)
            throw new common_1.NotFoundException();
        return;
    }
    async findSpaceItems(organizationId, spaceId, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        return await this.organizationsService.getSpaceItems(organizationId, spaceId);
    }
    async createRuntimeModel(organizationId, spaceId, createRuntimeModelDto, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const runtimeModel = await this.organizationsService.createRuntimeModel(organizationId, spaceId, createRuntimeModelDto);
        if (runtimeModel == undefined)
            throw new common_1.BadRequestException();
        if (runtimeModel == "error")
            throw new Errors_1.InternalServerError("Error creating runtimeModel", 1, 500);
        return runtimeModel;
    }
    async createSpatialMedia(organizationId, spaceId, createSpatialMediaDto, req) {
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const spatialMedia = await this.organizationsService.createSpatialMedia(organizationId, spaceId, createSpatialMediaDto);
        if (spatialMedia == undefined)
            throw new common_1.BadRequestException();
        if (spatialMedia == "error")
            throw new Errors_1.InternalServerError("Error creating spatialMedia", 1, 500);
        return spatialMedia;
    }
    async updateRuntimeModel(organizationId, spaceId, runtimeModelId, updateRuntimeModelDto, req) {
        OrganizationsController_1.checkBodyNotEmpty(req.body);
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const runtimeModel = await this.organizationsService.updateRuntimeModel(organizationId, spaceId, runtimeModelId, updateRuntimeModelDto);
        if (runtimeModel == undefined)
            throw new common_1.BadRequestException();
        if (runtimeModel == "error")
            throw new Errors_1.InternalServerError("Error creating runtimeModel", 1, 500);
        return runtimeModel;
    }
    async updateSpatialMedia(organizationId, spaceId, spatialMediaId, updateSpatialMediaDto, req) {
        OrganizationsController_1.checkBodyNotEmpty(req.body);
        OrganizationsController_1.checkJwtUserOrganizationId(req.user, organizationId);
        const spatialMedia = await this.organizationsService.updateSpatialMedia(organizationId, spaceId, spatialMediaId, updateSpatialMediaDto);
        if (spatialMedia == undefined)
            throw new common_1.BadRequestException();
        if (spatialMedia == "error")
            throw new Errors_1.InternalServerError("Error creating spatialMedia", 1, 500);
        return spatialMedia;
    }
};
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: organization_entity_1.Organization }),
    (0, common_1.Get)(":organizationId"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findOrganization", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: space_entity_1.Space }),
    (0, common_1.Get)(":organizationId/spaces/:spaceId"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findSpace", null);
__decorate([
    (0, swagger_1.ApiResponse)({ type: [space_entity_1.Space] }),
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, common_1.Get)(":organizationId/spaces"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findSpaces", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: space_entity_1.Space }),
    (0, common_1.Post)(":organizationId/spaces"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, createSpace_dto_1.CreateSpaceDto, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "createSpace", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: invite_dto_1.InviteUsersResultDto }),
    (0, common_1.Post)(":organizationId/inviteUsers"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invite_dto_1.InviteUsersToOrganizationDto, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "inviteUsers", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: space_entity_1.Space }),
    (0, common_1.Put)(":organizationId/spaces/:spaceId"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, updateSpace_dto_1.UpdateSpaceDto, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "updateSpace", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ status: 204 }),
    (0, common_1.HttpCode)(204),
    (0, common_1.Delete)(":organizationId/spaces/:spaceId"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "deleteSpace", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: invite_dto_1.InviteUsersResultDto }),
    (0, common_1.Post)(":organizationId/spaces/:spaceId/inviteUsers"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invite_dto_1.InviteUsersToSpaceDto, String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "inviteUsersToSpace", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: item_entity_1.SpaceItem }),
    (0, common_1.Get)(":organizationId/spaces/:spaceId/items/:itemId"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Param)("itemId")),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findSpaceItem", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ status: 204 }),
    (0, common_1.HttpCode)(204),
    (0, common_1.Delete)(":organizationId/spaces/:spaceId/items/:itemId"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Param)("itemId")),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "deleteSpaceItem", null);
__decorate([
    (0, swagger_1.ApiResponse)({ type: [item_entity_1.SpaceItem] }),
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, common_1.Get)(":organizationId/spaces/:spaceId/items"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findSpaceItems", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: item_entity_1.RuntimeModel }),
    (0, common_1.Post)(":organizationId/spaces/:spaceId/runtimeModels"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, createRuntimeModel_dto_1.CreateRuntimeModelDto, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "createRuntimeModel", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: item_entity_1.SpatialMedia }),
    (0, common_1.Post)(":organizationId/spaces/:spaceId/spatialMedia"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, createSpatialMedia_dto_1.CreateSpatialMediaDto, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "createSpatialMedia", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: item_entity_1.RuntimeModel }),
    (0, common_1.Put)(":organizationId/spaces/:spaceId/runtimeModels/:runtimeModelId"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Param)("runtimeModelId")),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, updateRuntimeModel_dto_1.UpdateRuntimeModelDto, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "updateRuntimeModel", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: item_entity_1.SpatialMedia }),
    (0, common_1.Put)(":organizationId/spaces/:spaceId/spatialMedia/:spatialMediaId"),
    __param(0, (0, common_1.Param)("organizationId")),
    __param(1, (0, common_1.Param)("spaceId")),
    __param(2, (0, common_1.Param)("spatialMediaId")),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, updateSpatialMedia_dto_1.UpdateSpatialMediaDto, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "updateSpatialMedia", null);
OrganizationsController = OrganizationsController_1 = __decorate([
    (0, swagger_1.ApiTags)("organizations"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)("organizations"),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService,
        spaceTemplates_service_1.SpaceTemplatesService,
        casl_ability_factory_1.CaslAbilityFactory])
], OrganizationsController);
exports.OrganizationsController = OrganizationsController;
//# sourceMappingURL=organizations.controller.js.map