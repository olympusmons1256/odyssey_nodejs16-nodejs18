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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const createUser_dto_1 = require("./dto/createUser.dto");
const updateUser_dto_1 = require("./dto/updateUser.dto");
const organizations_controller_1 = require("../organizations/organizations.controller");
const organizations_service_1 = require("../organizations/organizations.service");
const swagger_1 = require("@nestjs/swagger");
const user_entity_1 = require("./entities/user.entity");
const authTokenResponseBody_dto_1 = require("./dto/authTokenResponseBody.dto");
let UsersController = class UsersController {
    constructor(usersService, organizationsService) {
        this.usersService = usersService;
        this.organizationsService = organizationsService;
    }
    async createUser(createUserDto, req) {
        const organizationId = organizations_controller_1.OrganizationsController.getJwtUserOrganizationId(req.user);
        const user = await this.usersService.createUser(createUserDto);
        if (user == undefined || user == "error")
            throw new common_1.InternalServerErrorException(undefined, "Error creating user");
        const organizationUser = await this.organizationsService.createOrganizationUser(organizationId, createUserDto, user.id);
        if (organizationUser == "error")
            throw new common_1.InternalServerErrorException(undefined, "Error creating organization user");
        return user;
    }
    async createCustomToken(userId, req) {
        const organizationId = organizations_controller_1.OrganizationsController.getJwtUserOrganizationId(req.user);
        const token = await this.usersService.createUserAuthToken(organizationId, userId);
        if (token == "error")
            throw new common_1.InternalServerErrorException(undefined, "Error creating user auth token");
        if (token == undefined)
            throw new common_1.NotFoundException();
        return token;
    }
    async getUsers(req) {
        const organizationId = organizations_controller_1.OrganizationsController.getJwtUserOrganizationId(req.user);
        return await this.usersService.getUsers(organizationId);
    }
    async getUser(userId, req) {
        const organizationId = organizations_controller_1.OrganizationsController.getJwtUserOrganizationId(req.user);
        return await this.usersService.getUser(organizationId, userId);
    }
    async updateUser(userId, updateUserDto, req) {
        const organizationId = organizations_controller_1.OrganizationsController.getJwtUserOrganizationId(req.user);
        const user = await this.usersService.updateUser(organizationId, userId, updateUserDto);
        if (user == "error")
            throw new common_1.InternalServerErrorException(undefined, "Error updating user");
        return user;
    }
    async deleteUser(userId, req) {
        const organizationId = organizations_controller_1.OrganizationsController.getJwtUserOrganizationId(req.user);
        const result = await this.usersService.deleteUser(organizationId, userId);
        if (result == "error")
            throw new common_1.InternalServerErrorException(undefined, "Error deleting user");
        return;
    }
};
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: user_entity_1.User }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [createUser_dto_1.CreateUserDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createUser", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: authTokenResponseBody_dto_1.UserTokenResponseBody }),
    (0, common_1.Post)(":userId/token"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createCustomToken", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: [user_entity_1.User] }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUsers", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: user_entity_1.User }),
    (0, common_1.Get)(":userId"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUser", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ type: user_entity_1.User }),
    (0, common_1.Put)(":userId"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, updateUser_dto_1.UpdateUserDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, swagger_1.ApiResponse)({ status: 204 }),
    (0, common_1.HttpCode)(204),
    (0, common_1.Delete)(":userId"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteUser", null);
UsersController = __decorate([
    (0, swagger_1.ApiTags)("users"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)("users"),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        organizations_service_1.OrganizationsService])
], UsersController);
exports.UsersController = UsersController;
//# sourceMappingURL=users.controller.js.map