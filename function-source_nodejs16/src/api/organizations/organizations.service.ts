import {Injectable} from "@nestjs/common";
import {BaseFirestoreRepository} from "fireorm";
import {InjectRepository} from "@newgameplus/nestjs-fireorm";
import {SpaceTemplate} from "../spaceTemplates/spaceTemplate.entity";
import {CreateSpaceDto} from "./dto/createSpace.dto";
import {CreateRuntimeModelDto} from "./dto/createRuntimeModel.dto";
import {CreateSpatialMediaDto} from "./dto/createSpatialMedia.dto";
import {UpdateSpaceDto} from "./dto/updateSpace.dto";
import {RuntimeModel, SpaceItem, SpatialMedia} from "./item.entity";
import {Organization} from "./organization.entity";
import {Space} from "./space.entity";
import {UpdateRuntimeModelDto} from "./dto/updateRuntimeModel.dto";
import {UpdateSpatialMediaDto} from "./dto/updateSpatialMedia.dto";
import {CreateUserDto} from "../users/dto/createUser.dto";
import {OrganizationUser} from "./organizationUser.entity";
import {UpdateUserDto} from "../users/dto/updateUser.dto";
import {InviteUserResultDto, InviteUsersToOrganizationDto, InviteUsersResultDto, InviteUsersToSpaceDto} from "./dto/invite.dto";
import {EmailInviteUserResult, InviteRequest, inviteUsers, sendInviteEmails} from "../../lib/invites";
import {BillingPublic, BillingSubscription, BillingUsage} from "./billing.entity";

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizations: BaseFirestoreRepository<Organization>,
  ) { }

  async getOrganization(organizationId: string): Promise<Organization | undefined> {
    const organization = await this.organizations.findById(organizationId);
    if (organization === null) return undefined;
    return organization;
  }

  async getBillingUsage(organizationId: string): Promise<BillingUsage | undefined> {
    const organization = await this.organizations.findById(organizationId);
    if (organization === null) return undefined;
    const billingUsage = await organization.billingUsage?.findById("usage");
    if (billingUsage == null || billingUsage == undefined) return undefined;
    return billingUsage;
  }

  async getBillingPublic(organizationId: string): Promise<BillingPublic | undefined> {
    const organization = await this.organizations.findById(organizationId);
    if (organization === null) return undefined;
    const billingPublic = await organization.billingPublic?.findById("public");
    if (billingPublic == null || billingPublic == undefined) return undefined;
    return billingPublic;
  }

  async getBillingSubscription(organizationId: string): Promise<BillingSubscription | undefined> {
    const organization = await this.organizations.findById(organizationId);
    if (organization === null) return undefined;
    const billingSubscription = await organization.billingSubscription?.findById("subscription");
    if (billingSubscription == null || billingSubscription == undefined) return undefined;
    return billingSubscription;
  }

  async getSpaces(organizationId: string) : Promise<Space[]> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.spaces == undefined) return [];
    const spaces = await organization.spaces.find();
    if (spaces == null || spaces.length == 0) return [];
    return spaces;
  }

  async getSpace(organizationId: string, spaceId: string) : Promise<Space | undefined> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.spaces == undefined) return undefined;
    const space = await organization.spaces.findById(spaceId);
    if (space == null) return undefined;
    return space;
  }

  async getOrganizationUser(organizationId: string, organizationUserId: string) : Promise<OrganizationUser | undefined> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.organizationUsers == undefined) return undefined;
    const organizationUser = await organization.organizationUsers.findById(organizationUserId);
    if (organizationUser == null) return undefined;
    return organizationUser;
  }

  async getOrganizationUsers(organizationId: string) : Promise<OrganizationUser[]> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.organizationUsers == undefined) return [];
    const organizationUsers = await organization.organizationUsers.find();
    if (organizationUsers == null || organizationUsers.length == 0) return [];
    return organizationUsers;
  }

  async createOrganizationUser(organizationId: string, createUserDto: CreateUserDto, userId: string) : Promise<OrganizationUser | undefined | "error"> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.organizationUsers == undefined) return undefined;
    const organizationUser = OrganizationUser.ofDto(createUserDto, userId);
    try {
      const organizationUserCreated = await organization.organizationUsers.create(organizationUser);
      if (organizationUserCreated == null || organizationUserCreated == undefined) return undefined;
      return organizationUser;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async inviteOrganizationUsers(organizationId: string, inviteUsersDto: InviteUsersToOrganizationDto) : Promise<InviteUsersResultDto | undefined> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.organizationUsers == undefined) return undefined;
    const inviteRequests = inviteUsersDto.users.map((user) => {
      const inviteRequest: InviteRequest = {
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

    function processResults(emailResults: EmailInviteUserResult[]) {
      const results = emailResults.map((result) => {
        if (result.inviteUserResult.foundInOrg == true) return new InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 200);
        if (result.inviteUserResult.inviteLink != undefined) return new InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 201, result.inviteUserResult.inviteLink, result.inviteUserResult.inviteId);
        if (result.inviteUserResult.roleCorrect == false) return new InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Existing invite role is incorrect");
        if (result.success == false) return new InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Failed to email invite to user's address");
        return new InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Failed to create invite");
      });
      return new InviteUsersResultDto(results);
    }

    const inviteResults = await inviteUsers(inviteRequests);

    if (inviteUsersDto.sendInviteEmails == true) {
      const emailResults = await sendInviteEmails(inviteResults);
      return processResults(emailResults);
    } else {
      const inviteResultsWithoutEmail : EmailInviteUserResult[] = inviteResults.map((inviteUserResult) => {
        return {inviteUserResult, success: true};
      });
      return processResults(inviteResultsWithoutEmail);
    }
  }

  async inviteSpaceUsers(organizationId: string, spaceId: string, inviteUsersDto: InviteUsersToSpaceDto) : Promise<InviteUsersResultDto | undefined> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.spaces == undefined) return undefined;
    const space = await organization.spaces.findById(spaceId);
    if (space == null || space == undefined) return undefined;
    const inviteRequests = inviteUsersDto.users.map((user) => {
      const inviteRequest: InviteRequest = {
        email: user.email,
        orgId: organizationId,
        orgName: organization.name,
        inviterName: (inviteUsersDto.inviterName != undefined) ? inviteUsersDto.inviterName : organization.name,
        spaceId,
        spaceName: space.name,
      };
      return inviteRequest;
    });

    function processResults(emailResults: EmailInviteUserResult[]) {
      const results = emailResults.map((result) => {
        if (result.inviteUserResult.foundInOrg == true || result.inviteUserResult.foundInSpace == true) return new InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 200);
        if (result.inviteUserResult.inviteLink != undefined) return new InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 201, result.inviteUserResult.inviteLink, result.inviteUserResult.inviteId);
        if (result.success == false) return new InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Failed to email invite to user's address");
        return new InviteUserResultDto(result.inviteUserResult.inviteRequest.email, 500, undefined, undefined, "Failed to create invite");
      });
      return new InviteUsersResultDto(results);
    }

    const inviteResults = await inviteUsers(inviteRequests);

    if (inviteUsersDto.sendInviteEmails == true) {
      const emailResults = await sendInviteEmails(inviteResults);
      return processResults(emailResults);
    } else {
      const inviteResultsWithoutEmail : EmailInviteUserResult[] = inviteResults.map((inviteUserResult) => {
        return {inviteUserResult, success: true};
      });
      return processResults(inviteResultsWithoutEmail);
    }
  }

  async updateOrganizationUser(organizationId: string, userId: string, updateUserDto: UpdateUserDto) : Promise<OrganizationUser | undefined | "error"> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.organizationUsers == undefined) return undefined;
    const organizationUserUpdate = OrganizationUser.ofUpdateDto(updateUserDto, userId);
    try {
      const organizationUserUpdated = await organization.organizationUsers.update(organizationUserUpdate);
      if (organizationUserUpdated == null || organizationUserUpdated == undefined) return undefined;
      const organizationUser = await this.getOrganizationUser(organizationId, userId);
      if (organizationUser == null || organizationUser == undefined) return undefined;
      return organizationUser;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async deleteOrganizationUser(organizationId: string, userId: string) : Promise<string | "error" | undefined> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.organizationUsers == undefined) return undefined;
    try {
      await organization.organizationUsers.delete(userId);
      return userId;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async createSpace(organizationId: string, createSpaceDto: CreateSpaceDto, spaceTemplate: SpaceTemplate) : Promise<Space | undefined | "error"> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.spaces == undefined) return undefined;
    const space = Space.ofDto(createSpaceDto, spaceTemplate);
    try {
      const spaceCreated = await organization.spaces.create(space);
      if (spaceCreated == null || spaceCreated == undefined) return undefined;
      return space;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async updateSpace(organizationId: string, spaceId: string, updateSpaceDto: UpdateSpaceDto) : Promise<Space | undefined | "error"> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.spaces == undefined) return undefined;
    const spaceUpdate = Space.ofUpdateDto(updateSpaceDto, spaceId);
    try {
      const spaceUpdated = await organization.spaces.update(spaceUpdate);
      if (spaceUpdated == null || spaceUpdated == undefined) return undefined;
      const space = await this.getSpace(organizationId, spaceId);
      if (space == null || space == undefined) return undefined;
      return space;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async deleteSpace(organizationId: string, spaceId: string) : Promise<string | "error" | undefined> {
    const organization = await this.getOrganization(organizationId);
    if (organization == undefined || organization.spaces == undefined) return undefined;
    try {
      await organization.spaces.delete(spaceId);
      return spaceId;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async getSpaceItems(organizationId: string, spaceId: string) {
    const space = await this.getSpace(organizationId, spaceId);
    if (space == undefined || space.items == undefined) return [];
    const items = await space.items.find();
    if (items == null || items.length == 0) return [];
    return items;
  }

  async getSpaceItem(organizationId: string, spaceId: string, itemId: string) : Promise<SpaceItem | undefined> {
    const space = await this.getSpace(organizationId, spaceId);
    if (space == undefined || space.items == undefined) return undefined;
    const item = await space.items.findById(itemId);
    if (item == null) return undefined;
    return item;
  }

  async deleteSpaceItem(organizationId: string, spaceId: string, itemId: string) : Promise<string | "error" | undefined> {
    const space = await this.getSpace(organizationId, spaceId);
    if (space == undefined || space.items == undefined) return undefined;
    try {
      await space.items.delete(itemId);
      return spaceId;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async createRuntimeModel(organizationId: string, spaceId: string, createRuntimeModelDto: CreateRuntimeModelDto) : Promise<SpaceItem | undefined | "error"> {
    const space = await this.getSpace(organizationId, spaceId);
    if (space == undefined || space.items == undefined) return undefined;
    const runtimeModel = RuntimeModel.ofDto(createRuntimeModelDto);
    const runtimeModelCreated = await space.items.create(runtimeModel);
    if (runtimeModelCreated == null) return undefined;
    if (runtimeModelCreated == undefined) return undefined;
    return runtimeModelCreated;
  }

  async createSpatialMedia(organizationId: string, spaceId: string, createSpatialMediaDto: CreateSpatialMediaDto) : Promise<SpaceItem | undefined | "error"> {
    const space = await this.getSpace(organizationId, spaceId);
    if (space == undefined || space.items == undefined) return undefined;
    const spatialMedia = SpatialMedia.ofDto(createSpatialMediaDto);
    const spatialMediaCreated = await space.items.create(spatialMedia);
    if (spatialMediaCreated == null) return undefined;
    if (spatialMediaCreated == undefined) return undefined;
    return spatialMediaCreated;
  }

  async updateRuntimeModel(organizationId: string, spaceId: string, runtimeModelId: string, updateRuntimeModelDto: UpdateRuntimeModelDto) : Promise<SpaceItem | undefined | "error"> {
    const space = await this.getSpace(organizationId, spaceId);
    if (space == undefined || space.items == undefined) return undefined;
    const runtimeModel = RuntimeModel.ofUpdateDto(updateRuntimeModelDto, runtimeModelId);
    try {
      const runtimeModelUpdated = await space.items.update(runtimeModel);
      const r = await space.items.findById(runtimeModelId);
      if (r == null || runtimeModelUpdated == null) return undefined;
      if (runtimeModelUpdated == null || runtimeModelUpdated == undefined) return undefined;
      return r;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async updateSpatialMedia(organizationId: string, spaceId: string, spatialMediaId: string, updateSpatialMediaDto: UpdateSpatialMediaDto) : Promise<SpaceItem | undefined | "error"> {
    const space = await this.getSpace(organizationId, spaceId);
    if (space == undefined || space.items == undefined) return undefined;
    const spatialMedia = SpatialMedia.ofUpdateDto(updateSpatialMediaDto, spatialMediaId);
    try {
      const spatialMediaUpdated = await space.items.update(spatialMedia);
      const r = await space.items.findById(spatialMediaId);
      if (r == null || spatialMediaUpdated == null) return undefined;
      if (r == undefined || spatialMediaUpdated == undefined) return undefined;
      return r;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }
}
