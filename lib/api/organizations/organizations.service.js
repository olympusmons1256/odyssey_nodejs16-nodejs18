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
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const fireorm_1 = require("fireorm");
const nestjs_fireorm_1 = require("nestjs-fireorm");
const item_entity_1 = require("./item.entity");
const organization_entity_1 = require("./organization.entity");
const space_entity_1 = require("./space.entity");
const organizationUser_entity_1 = require("./organizationUser.entity");
const invite_dto_1 = require("./dto/invite.dto");
const invites_1 = require("../../lib/invites");
let OrganizationsService = class OrganizationsService {
    constructor(organizations) {
        this.organizations = organizations;
    }
    async getOrganization(organizationId) {
        const organization = await this.organizations.findById(organizationId);
        if (organization === null)
            return undefined;
        return organization;
    }
    async getBillingUsage(organizationId) {
        var _a;
        const organization = await this.organizations.findById(organizationId);
        if (organization === null)
            return undefined;
        const billingUsage = await ((_a = organization.billingUsage) === null || _a === void 0 ? void 0 : _a.findById("usage"));
        if (billingUsage == null || billingUsage == undefined)
            return undefined;
        return billingUsage;
    }
    async getBillingPublic(organizationId) {
        var _a;
        const organization = await this.organizations.findById(organizationId);
        if (organization === null)
            return undefined;
        const billingPublic = await ((_a = organization.billingPublic) === null || _a === void 0 ? void 0 : _a.findById("public"));
        if (billingPublic == null || billingPublic == undefined)
            return undefined;
        return billingPublic;
    }
    async getBillingSubscription(organizationId) {
        var _a;
        const organization = await this.organizations.findById(organizationId);
        if (organization === null)
            return undefined;
        const billingSubscription = await ((_a = organization.billingSubscription) === null || _a === void 0 ? void 0 : _a.findById("subscription"));
        if (billingSubscription == null || billingSubscription == undefined)
            return undefined;
        return billingSubscription;
    }
    async getSpaces(organizationId) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.spaces == undefined)
            return [];
        const spaces = await organization.spaces.find();
        if (spaces == null || spaces.length == 0)
            return [];
        return spaces;
    }
    async getSpace(organizationId, spaceId) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.spaces == undefined)
            return undefined;
        const space = await organization.spaces.findById(spaceId);
        if (space == null)
            return undefined;
        return space;
    }
    async getOrganizationUser(organizationId, organizationUserId) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.organizationUsers == undefined)
            return undefined;
        const organizationUser = await organization.organizationUsers.findById(organizationUserId);
        if (organizationUser == null)
            return undefined;
        return organizationUser;
    }
    async getOrganizationUsers(organizationId) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.organizationUsers == undefined)
            return [];
        const organizationUsers = await organization.organizationUsers.find();
        if (organizationUsers == null || organizationUsers.length == 0)
            return [];
        return organizationUsers;
    }
    async createOrganizationUser(organizationId, createUserDto, userId) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.organizationUsers == undefined)
            return undefined;
        const organizationUser = organizationUser_entity_1.OrganizationUser.ofDto(createUserDto, userId);
        try {
            const organizationUserCreated = await organization.organizationUsers.create(organizationUser);
            if (organizationUserCreated == null || organizationUserCreated == undefined)
                return undefined;
            return organizationUser;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async inviteOrganizationUsers(organizationId, inviteUsersDto) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.organizationUsers == undefined)
            return undefined;
        const inviteRequests = inviteUsersDto.users.map((user) => {
            const inviteRequest = {
                email: user.email,
                orgId: organizationId,
                orgName: organization.name,
                inviterName: (inviteUsersDto.inviterName != undefined) ? inviteUsersDto.inviterName : organization.name,
                orgRole: user.organizationRole,
                spaceId: undefined,
                spaceName: undefined,
            };
            return inviteRequest;
        });
        function processResults(emailResults) {
            const results = emailResults.map((result) => {
                if (result.inviteUserResult.foundInOrg == true)
                    return new invite_dto_1.InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 200);
                if (result.inviteUserResult.inviteLink != undefined)
                    return new invite_dto_1.InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 201, result.inviteUserResult.inviteLink, result.inviteUserResult.inviteId);
                if (result.inviteUserResult.roleCorrect == false)
                    return new invite_dto_1.InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Existing invite role is incorrect");
                if (result.success == false)
                    return new invite_dto_1.InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Failed to email invite to user's address");
                return new invite_dto_1.InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Failed to create invite");
            });
            return new invite_dto_1.InviteUsersResultDto(results);
        }
        const inviteResults = await (0, invites_1.inviteUsers)(inviteRequests);
        if (inviteUsersDto.sendInviteEmails == true) {
            const emailResults = await (0, invites_1.sendInviteEmails)(inviteResults);
            return processResults(emailResults);
        }
        else {
            const inviteResultsWithoutEmail = inviteResults.map((inviteUserResult) => {
                return { inviteUserResult, success: true };
            });
            return processResults(inviteResultsWithoutEmail);
        }
    }
    async inviteSpaceUsers(organizationId, spaceId, inviteUsersDto) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.spaces == undefined)
            return undefined;
        const space = await organization.spaces.findById(spaceId);
        if (space == null || space == undefined)
            return undefined;
        const inviteRequests = inviteUsersDto.users.map((user) => {
            const inviteRequest = {
                email: user.email,
                orgId: organizationId,
                orgName: organization.name,
                inviterName: (inviteUsersDto.inviterName != undefined) ? inviteUsersDto.inviterName : organization.name,
                spaceId,
                spaceName: space.name,
            };
            return inviteRequest;
        });
        function processResults(emailResults) {
            const results = emailResults.map((result) => {
                if (result.inviteUserResult.foundInOrg == true || result.inviteUserResult.foundInSpace == true)
                    return new invite_dto_1.InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 200);
                if (result.inviteUserResult.inviteLink != undefined)
                    return new invite_dto_1.InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 201, result.inviteUserResult.inviteLink, result.inviteUserResult.inviteId);
                if (result.success == false)
                    return new invite_dto_1.InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Failed to email invite to user's address");
                return new invite_dto_1.InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Failed to create invite");
            });
            return new invite_dto_1.InviteUsersResultDto(results);
        }
        const inviteResults = await (0, invites_1.inviteUsers)(inviteRequests);
        if (inviteUsersDto.sendInviteEmails == true) {
            const emailResults = await (0, invites_1.sendInviteEmails)(inviteResults);
            return processResults(emailResults);
        }
        else {
            const inviteResultsWithoutEmail = inviteResults.map((inviteUserResult) => {
                return { inviteUserResult, success: true };
            });
            return processResults(inviteResultsWithoutEmail);
        }
    }
    async updateOrganizationUser(organizationId, userId, updateUserDto) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.organizationUsers == undefined)
            return undefined;
        const organizationUserUpdate = organizationUser_entity_1.OrganizationUser.ofUpdateDto(updateUserDto, userId);
        try {
            const organizationUserUpdated = await organization.organizationUsers.update(organizationUserUpdate);
            if (organizationUserUpdated == null || organizationUserUpdated == undefined)
                return undefined;
            const organizationUser = await this.getOrganizationUser(organizationId, userId);
            if (organizationUser == null || organizationUser == undefined)
                return undefined;
            return organizationUser;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async deleteOrganizationUser(organizationId, userId) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.organizationUsers == undefined)
            return undefined;
        try {
            await organization.organizationUsers.delete(userId);
            return userId;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async createSpace(organizationId, createSpaceDto, spaceTemplate) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.spaces == undefined)
            return undefined;
        const space = space_entity_1.Space.ofDto(createSpaceDto, spaceTemplate);
        try {
            const spaceCreated = await organization.spaces.create(space);
            if (spaceCreated == null || spaceCreated == undefined)
                return undefined;
            return space;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async updateSpace(organizationId, spaceId, updateSpaceDto) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.spaces == undefined)
            return undefined;
        const spaceUpdate = space_entity_1.Space.ofUpdateDto(updateSpaceDto, spaceId);
        try {
            const spaceUpdated = await organization.spaces.update(spaceUpdate);
            if (spaceUpdated == null || spaceUpdated == undefined)
                return undefined;
            const space = await this.getSpace(organizationId, spaceId);
            if (space == null || space == undefined)
                return undefined;
            return space;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async deleteSpace(organizationId, spaceId) {
        const organization = await this.getOrganization(organizationId);
        if (organization == undefined || organization.spaces == undefined)
            return undefined;
        try {
            await organization.spaces.delete(spaceId);
            return spaceId;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async getSpaceItems(organizationId, spaceId) {
        const space = await this.getSpace(organizationId, spaceId);
        if (space == undefined || space.items == undefined)
            return [];
        const items = await space.items.find();
        if (items == null || items.length == 0)
            return [];
        return items;
    }
    async getSpaceItem(organizationId, spaceId, itemId) {
        const space = await this.getSpace(organizationId, spaceId);
        if (space == undefined || space.items == undefined)
            return undefined;
        const item = await space.items.findById(itemId);
        if (item == null)
            return undefined;
        return item;
    }
    async deleteSpaceItem(organizationId, spaceId, itemId) {
        const space = await this.getSpace(organizationId, spaceId);
        if (space == undefined || space.items == undefined)
            return undefined;
        try {
            await space.items.delete(itemId);
            return spaceId;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async createRuntimeModel(organizationId, spaceId, createRuntimeModelDto) {
        const space = await this.getSpace(organizationId, spaceId);
        if (space == undefined || space.items == undefined)
            return undefined;
        const runtimeModel = item_entity_1.RuntimeModel.ofDto(createRuntimeModelDto);
        const runtimeModelCreated = await space.items.create(runtimeModel);
        if (runtimeModelCreated == null)
            return undefined;
        if (runtimeModelCreated == undefined)
            return undefined;
        return runtimeModelCreated;
    }
    async createSpatialMedia(organizationId, spaceId, createSpatialMediaDto) {
        const space = await this.getSpace(organizationId, spaceId);
        if (space == undefined || space.items == undefined)
            return undefined;
        const spatialMedia = item_entity_1.SpatialMedia.ofDto(createSpatialMediaDto);
        const spatialMediaCreated = await space.items.create(spatialMedia);
        if (spatialMediaCreated == null)
            return undefined;
        if (spatialMediaCreated == undefined)
            return undefined;
        return spatialMediaCreated;
    }
    async updateRuntimeModel(organizationId, spaceId, runtimeModelId, updateRuntimeModelDto) {
        const space = await this.getSpace(organizationId, spaceId);
        if (space == undefined || space.items == undefined)
            return undefined;
        const runtimeModel = item_entity_1.RuntimeModel.ofUpdateDto(updateRuntimeModelDto, runtimeModelId);
        try {
            const runtimeModelUpdated = await space.items.update(runtimeModel);
            const r = await space.items.findById(runtimeModelId);
            if (r == null || runtimeModelUpdated == null)
                return undefined;
            if (runtimeModelUpdated == null || runtimeModelUpdated == undefined)
                return undefined;
            return r;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
    async updateSpatialMedia(organizationId, spaceId, spatialMediaId, updateSpatialMediaDto) {
        const space = await this.getSpace(organizationId, spaceId);
        if (space == undefined || space.items == undefined)
            return undefined;
        const spatialMedia = item_entity_1.SpatialMedia.ofUpdateDto(updateSpatialMediaDto, spatialMediaId);
        try {
            const spatialMediaUpdated = await space.items.update(spatialMedia);
            const r = await space.items.findById(spatialMediaId);
            if (r == null || spatialMediaUpdated == null)
                return undefined;
            if (r == undefined || spatialMediaUpdated == undefined)
                return undefined;
            return r;
        }
        catch (e) {
            console.error(e);
            return "error";
        }
    }
};
OrganizationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, nestjs_fireorm_1.InjectRepository)(organization_entity_1.Organization)),
    __metadata("design:paramtypes", [fireorm_1.BaseFirestoreRepository])
], OrganizationsService);
exports.OrganizationsService = OrganizationsService;
//# sourceMappingURL=organizations.service.js.map