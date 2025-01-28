import {BadRequestException, Body, ClassSerializerInterceptor, Controller, Delete, ForbiddenException, Get, HttpCode, InternalServerErrorException, NotFoundException, Param, Post, Put, Request, UseInterceptors} from "@nestjs/common";
import {InternalServerError} from "postmark/dist/client/errors/Errors";
import {Action, CaslAbilityFactory} from "../casl/casl-ability.factory";
import {SpaceTemplatesService} from "../spaceTemplates/spaceTemplates.service";
import {CreateSpaceDto} from "./dto/createSpace.dto";
import {CreateRuntimeModelDto} from "./dto/createRuntimeModel.dto";
import {CreateSpatialMediaDto} from "./dto/createSpatialMedia.dto";
import {UpdateSpaceDto} from "./dto/updateSpace.dto";
import {OrganizationsService} from "./organizations.service";
import {UpdateRuntimeModelDto} from "./dto/updateRuntimeModel.dto";
import {UpdateSpatialMediaDto} from "./dto/updateSpatialMedia.dto";
import {ApiBearerAuth, ApiResponse, ApiTags} from "@nestjs/swagger";
import {Organization} from "./organization.entity";
import {Space} from "./space.entity";
import {RuntimeModel, SpaceItem, SpatialMedia} from "./item.entity";
import {InviteUsersToOrganizationDto, InviteUsersResultDto, InviteUsersToSpaceDto} from "./dto/invite.dto";


@ApiTags("organizations")
@ApiBearerAuth()
@Controller("organizations")
export class OrganizationsController {
  constructor(
    private organizationsService: OrganizationsService,
    private spaceTemplatesService: SpaceTemplatesService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  static checkJwtUserOrganizationId(user: any, organizationId: string) {
  // Reject based on user organizationId attribute
    if (user.organizationId == undefined || user.organizationId != organizationId) {
      throw new ForbiddenException();
    }
  }

  static getJwtUserOrganizationId(user: any) {
  // Reject based on user organizationId attribute
    if (user.organizationId == undefined || user.organizationId == null) {
      throw new ForbiddenException();
    }
    return user.organizationId as string;
  }

  private static checkBodyNotEmpty(body: any) {
    if (Object.keys(body).length === 0) throw new BadRequestException("Request body is empty");
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: Organization})
  @Get(":organizationId")
  async findOrganization(
  @Param("organizationId") organizationId: string,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const ability = this.caslAbilityFactory.createForJwtUser(req.user);

    const organization = await this.organizationsService.getOrganization(organizationId);

    // Kind of useless way to reject, but here as an example
    if (organization == null) throw new NotFoundException();
    if (!(ability.can(Action.Read, organization))) throw new ForbiddenException();
    return organization;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: Space})
  @Get(":organizationId/spaces/:spaceId")
  async findSpace(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const space = await this.organizationsService.getSpace(organizationId, spaceId);
    if (space == undefined) throw new NotFoundException();
    return space;
  }

  @ApiResponse({type: [Space]})
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(":organizationId/spaces")
  async findSpaces(
  @Param("organizationId") organizationId: string,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const ability = this.caslAbilityFactory.createForJwtUser(req.user);

    const organization = await this.organizationsService.getOrganization(organizationId);
    if (organization == undefined) throw new NotFoundException();

    // Kind of useless way to reject, but here as an example
    if (!ability.can(Action.Read, organization)) throw new ForbiddenException();
    return await this.organizationsService.getSpaces(organizationId);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: Space})
  @Post(":organizationId/spaces")
  async createSpace(
  @Param("organizationId") organizationId: string,
    @Body() createSpaceDto: CreateSpaceDto,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const spaceTemplate = await this.spaceTemplatesService.getSpaceTemplate(createSpaceDto.spaceTemplateId);
    if (spaceTemplate == undefined) throw new NotFoundException("spaceTemplateId not found");
    const space = await this.organizationsService.createSpace(organizationId, createSpaceDto, spaceTemplate);
    if (space == undefined) throw new BadRequestException();
    if (space == "error") throw new InternalServerError("Error creating space", 1, 500);
    return space;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: InviteUsersResultDto})
  @Post(":organizationId/inviteUsers")
  async inviteUsers(
  @Body() inviteUsersDto: InviteUsersToOrganizationDto,
    @Request() req: any
  ) {
    const organizationId = OrganizationsController.getJwtUserOrganizationId(req.user);
    const inviteUsersResult = await this.organizationsService.inviteOrganizationUsers(organizationId, inviteUsersDto);
    if (inviteUsersResult == undefined) throw new InternalServerErrorException(new InviteUsersResultDto([]));
    if (inviteUsersResult.errorCount > 0) throw new InternalServerErrorException(inviteUsersResult);
    return inviteUsersResult;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: Space})
  @Put(":organizationId/spaces/:spaceId")
  async updateSpace(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
    @Request() req: any
  ) {
    OrganizationsController.checkBodyNotEmpty(req.body);
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const space = await this.organizationsService.updateSpace(organizationId, spaceId, updateSpaceDto);
    if (space == undefined) throw new BadRequestException();
    if (space == "error") throw new InternalServerError("Error creating space", 1, 500);
    return space;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({status: 204})
  @HttpCode(204)
  @Delete(":organizationId/spaces/:spaceId")
  async deleteSpace(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const result = await this.organizationsService.deleteSpace(organizationId, spaceId);
    if (result == "error") throw new InternalServerError("Error deleting space", 1, 500);
    if (result == undefined) throw new NotFoundException();
    return;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: InviteUsersResultDto})
  @Post(":organizationId/spaces/:spaceId/inviteUsers")
  async inviteUsersToSpace(
  @Body() inviteUsersDto: InviteUsersToSpaceDto,
    @Param("spaceId") spaceId: string,
    @Request() req: any
  ) {
    const organizationId = OrganizationsController.getJwtUserOrganizationId(req.user);
    const inviteUsersResult = await this.organizationsService.inviteSpaceUsers(organizationId, spaceId, inviteUsersDto);
    if (inviteUsersResult == undefined) throw new InternalServerErrorException(new InviteUsersResultDto([]));
    if (inviteUsersResult.errorCount > 0) throw new InternalServerErrorException(inviteUsersResult);
    return inviteUsersResult;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: SpaceItem})
  @Get(":organizationId/spaces/:spaceId/items/:itemId")
  async findSpaceItem(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Param("itemId") itemId: string,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const item = await this.organizationsService.getSpaceItem(organizationId, spaceId, itemId);
    if (item == undefined) throw new NotFoundException();
    return item;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({status: 204})
  @HttpCode(204)
  @Delete(":organizationId/spaces/:spaceId/items/:itemId")
  async deleteSpaceItem(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Param("itemId") itemId: string,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const result = await this.organizationsService.deleteSpaceItem(organizationId, spaceId, itemId);
    if (result == "error") throw new InternalServerError("Error deleting item", 1, 500);
    if (result == undefined) throw new NotFoundException();
    return;
  }

  @ApiResponse({type: [SpaceItem]})
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(":organizationId/spaces/:spaceId/items")
  async findSpaceItems(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    return await this.organizationsService.getSpaceItems(organizationId, spaceId);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: RuntimeModel})
  @Post(":organizationId/spaces/:spaceId/runtimeModels")
  async createRuntimeModel(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Body() createRuntimeModelDto: CreateRuntimeModelDto,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const runtimeModel = await this.organizationsService.createRuntimeModel(organizationId, spaceId, createRuntimeModelDto);
    if (runtimeModel == undefined) throw new BadRequestException();
    if (runtimeModel == "error") throw new InternalServerError("Error creating runtimeModel", 1, 500);
    return runtimeModel;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: SpatialMedia})
  @Post(":organizationId/spaces/:spaceId/spatialMedia")
  async createSpatialMedia(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Body() createSpatialMediaDto: CreateSpatialMediaDto,
    @Request() req: any
  ) {
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const spatialMedia = await this.organizationsService.createSpatialMedia(organizationId, spaceId, createSpatialMediaDto);
    if (spatialMedia == undefined) throw new BadRequestException();
    if (spatialMedia == "error") throw new InternalServerError("Error creating spatialMedia", 1, 500);
    return spatialMedia;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: RuntimeModel})
  @Put(":organizationId/spaces/:spaceId/runtimeModels/:runtimeModelId")
  async updateRuntimeModel(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Param("runtimeModelId") runtimeModelId: string,
    @Body() updateRuntimeModelDto: UpdateRuntimeModelDto,
    @Request() req: any
  ) {
    OrganizationsController.checkBodyNotEmpty(req.body);
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const runtimeModel = await this.organizationsService.updateRuntimeModel(organizationId, spaceId, runtimeModelId, updateRuntimeModelDto);
    if (runtimeModel == undefined) throw new BadRequestException();
    if (runtimeModel == "error") throw new InternalServerError("Error creating runtimeModel", 1, 500);
    return runtimeModel;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: SpatialMedia})
  @Put(":organizationId/spaces/:spaceId/spatialMedia/:spatialMediaId")
  async updateSpatialMedia(
  @Param("organizationId") organizationId: string,
    @Param("spaceId") spaceId: string,
    @Param("spatialMediaId") spatialMediaId: string,
    @Body() updateSpatialMediaDto: UpdateSpatialMediaDto,
    @Request() req: any
  ) {
    OrganizationsController.checkBodyNotEmpty(req.body);
    OrganizationsController.checkJwtUserOrganizationId(req.user, organizationId);

    const spatialMedia = await this.organizationsService.updateSpatialMedia(organizationId, spaceId, spatialMediaId, updateSpatialMediaDto);
    if (spatialMedia == undefined) throw new BadRequestException();
    if (spatialMedia == "error") throw new InternalServerError("Error creating spatialMedia", 1, 500);
    return spatialMedia;
  }
}
