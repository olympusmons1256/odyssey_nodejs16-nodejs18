import {Controller, Get, Post, Body, Param, Delete, InternalServerErrorException, Request, UseInterceptors, ClassSerializerInterceptor, Put, HttpCode, NotFoundException} from "@nestjs/common";
import {UsersService} from "./users.service";
import {CreateUserDto} from "./dto/createUser.dto";
import {UpdateUserDto} from "./dto/updateUser.dto";
import {OrganizationsController} from "../organizations/organizations.controller";
import {OrganizationsService} from "../organizations/organizations.service";
import {ApiBearerAuth, ApiResponse, ApiTags} from "@nestjs/swagger";
import {User} from "./entities/user.entity";
import {UserTokenResponseBody} from "./dto/authTokenResponseBody.dto";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: User})
  @Post()
  async createUser(
  @Body() createUserDto: CreateUserDto,
    @Request() req: any
  ) {
    const organizationId = OrganizationsController.getJwtUserOrganizationId(req.user);
    const user = await this.usersService.createUser(createUserDto);
    if (user == undefined || user == "error") throw new InternalServerErrorException(undefined, "Error creating user");
    const organizationUser = await this.organizationsService.createOrganizationUser(organizationId, createUserDto, user.id);
    if (organizationUser == "error") throw new InternalServerErrorException(undefined, "Error creating organization user");
    return user;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: UserTokenResponseBody})
  @Post(":userId/token")
  async createCustomToken(
  @Param("userId") userId: string,
    @Request() req: any
  ) {
    const organizationId = OrganizationsController.getJwtUserOrganizationId(req.user);
    const token = await this.usersService.createUserAuthToken(organizationId, userId);
    if (token == "error") throw new InternalServerErrorException(undefined, "Error creating user auth token");
    if (token == undefined) throw new NotFoundException();
    return token;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: [User]})
  @Get()
  async getUsers(
  @Request() req: any
  ) {
    const organizationId = OrganizationsController.getJwtUserOrganizationId(req.user);
    return await this.usersService.getUsers(organizationId);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: User})
  @Get(":userId")
  async getUser(
  @Param("userId") userId: string,
    @Request() req: any
  ) {
    const organizationId = OrganizationsController.getJwtUserOrganizationId(req.user);
    return await this.usersService.getUser(organizationId, userId);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: User})
  @Put(":userId")
  async updateUser(
  @Param("userId") userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any
  ) {
    const organizationId = OrganizationsController.getJwtUserOrganizationId(req.user);
    const user = await this.usersService.updateUser(organizationId, userId, updateUserDto);
    if (user == "error") throw new InternalServerErrorException(undefined, "Error updating user");
    return user;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({status: 204})
  @HttpCode(204)
  @Delete(":userId")
  async deleteUser(
  @Param("userId") userId: string,
    @Request() req: any
  ) {
    const organizationId = OrganizationsController.getJwtUserOrganizationId(req.user);
    const result = await this.usersService.deleteUser(organizationId, userId);
    if (result == "error") throw new InternalServerErrorException(undefined, "Error deleting user");
    return;
  }
}
