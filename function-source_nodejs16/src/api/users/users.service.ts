import * as firebaseAdmin from "firebase-admin";
import {Injectable} from "@nestjs/common";
import {BaseFirestoreRepository} from "fireorm";
import {InjectRepository} from "@newgameplus/nestjs-fireorm";
import {OrganizationsService} from "../organizations/organizations.service";
import {OrganizationUser} from "../organizations/organizationUser.entity";
import {CreateUserDto} from "./dto/createUser.dto";
import {UpdateUserDto} from "./dto/updateUser.dto";
import {User} from "./entities/user.entity";
import {UserTokenResponseBody} from "./dto/authTokenResponseBody.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private users: BaseFirestoreRepository<User>,
    private organizationsService: OrganizationsService,
  ) { }

  async createUser(createUserDto: CreateUserDto) : Promise<User | undefined | "error"> {
    const user = User.ofDto(createUserDto);
    try {
      const userCreated = await this.users.create(user);
      if (userCreated == null || userCreated == undefined) return undefined;
      return user;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async createUserAuthToken(organizationId: string, userId: string) : Promise<{customToken: string} | undefined | "error"> {
    const orgUser = await this.organizationsService.getOrganizationUser(organizationId, userId);
    if (orgUser == undefined || orgUser == null) return undefined;
    try {
      const token = await firebaseAdmin.auth().createCustomToken(userId);
      return new UserTokenResponseBody(token);
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async getUsers(organizationId: string) {
    const organizationUsers = await this.organizationsService.getOrganizationUsers(organizationId);
    const userIds = organizationUsers.map((orgUser) => orgUser.id);
    const users = await this.users.whereIn("id", userIds).find();
    return users;
  }

  async getUser(organizationId: string, userId: string): Promise<User | undefined> {
    const organizationUser = await this.organizationsService.getOrganizationUser(organizationId, userId);
    if (organizationUser === null || organizationUser == undefined) return undefined;
    const user = await this.users.findById(userId);
    if (user === null || user == undefined) return undefined;
    return user;
  }

  async updateUser(organizationId: string, userId: string, updateUserDto: UpdateUserDto) : Promise<User | undefined | "error"> {
    const organizationUserUpdate = OrganizationUser.ofUpdateDto(updateUserDto, userId);
    const userUpdate = User.ofUpdateDto(updateUserDto, userId);
    try {
      const organizationUserUpdated = await this.organizationsService.updateOrganizationUser(organizationId, userId, organizationUserUpdate);
      const userUpdated = await this.users.update(userUpdate);
      if (organizationUserUpdated == null || organizationUserUpdated == undefined) return undefined;
      if (userUpdated == null || userUpdated == undefined) return undefined;
      const user = await this.getUser(organizationId, userId);
      if (user == null || user == undefined) return undefined;
      return user;
    } catch (e: any) {
      console.error(e);
      return "error";
    }
  }

  async deleteUser(organizationId: string, userId: string) {
    const deleteOrgUser = await this.organizationsService.deleteOrganizationUser(organizationId, userId);
    if (deleteOrgUser == "error") return "error";
    try {
      await this.users.delete(userId);
      return userId;
    } catch (e: any) {
      return "error";
    }
  }
}
