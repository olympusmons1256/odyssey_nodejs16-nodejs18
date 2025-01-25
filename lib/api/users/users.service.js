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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const firebaseAdmin = __importStar(require("firebase-admin"));
const common_1 = require("@nestjs/common");
const fireorm_1 = require("fireorm");
const nestjs_fireorm_1 = require("nestjs-fireorm");
const organizations_service_1 = require("../organizations/organizations.service");
const organizationUser_entity_1 = require("../organizations/organizationUser.entity");
const user_entity_1 = require("./entities/user.entity");
const authTokenResponseBody_dto_1 = require("./dto/authTokenResponseBody.dto");
let UsersService = class UsersService {
    constructor(users, organizationsService) {
        this.users = users;
        this.organizationsService = organizationsService;
    }
    async createUser(createUserDto) {
        const user = user_entity_1.User.ofDto(createUserDto);
        try {
            const userCreated = await this.users.create(user);
            if (userCreated == null || userCreated == undefined)
                return undefined;
            return user;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async createUserAuthToken(organizationId, userId) {
        const orgUser = await this.organizationsService.getOrganizationUser(organizationId, userId);
        if (orgUser == undefined || orgUser == null)
            return undefined;
        try {
            const token = await firebaseAdmin.auth().createCustomToken(userId);
            return new authTokenResponseBody_dto_1.UserTokenResponseBody(token);
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async getUsers(organizationId) {
        const organizationUsers = await this.organizationsService.getOrganizationUsers(organizationId);
        const userIds = organizationUsers.map((orgUser) => orgUser.id);
        const users = await this.users.whereIn("id", userIds).find();
        return users;
    }
    async getUser(organizationId, userId) {
        const organizationUser = await this.organizationsService.getOrganizationUser(organizationId, userId);
        if (organizationUser === null || organizationUser == undefined)
            return undefined;
        const user = await this.users.findById(userId);
        if (user === null || user == undefined)
            return undefined;
        return user;
    }
    async updateUser(organizationId, userId, updateUserDto) {
        const organizationUserUpdate = organizationUser_entity_1.OrganizationUser.ofUpdateDto(updateUserDto, userId);
        const userUpdate = user_entity_1.User.ofUpdateDto(updateUserDto, userId);
        try {
            const organizationUserUpdated = await this.organizationsService.updateOrganizationUser(organizationId, userId, organizationUserUpdate);
            const userUpdated = await this.users.update(userUpdate);
            if (organizationUserUpdated == null || organizationUserUpdated == undefined)
                return undefined;
            if (userUpdated == null || userUpdated == undefined)
                return undefined;
            const user = await this.getUser(organizationId, userId);
            if (user == null || user == undefined)
                return undefined;
            return user;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async deleteUser(organizationId, userId) {
        const deleteOrgUser = await this.organizationsService.deleteOrganizationUser(organizationId, userId);
        if (deleteOrgUser == "error")
            return "error";
        try {
            await this.users.delete(userId);
            return userId;
        }
        catch (e) {
            return "error";
        }
    }
};
UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, nestjs_fireorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [fireorm_1.BaseFirestoreRepository,
        organizations_service_1.OrganizationsService])
], UsersService);
exports.UsersService = UsersService;
//# sourceMappingURL=users.service.js.map