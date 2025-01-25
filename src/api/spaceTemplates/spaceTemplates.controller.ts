import {ClassSerializerInterceptor, Controller, Get, NotFoundException, Param, Request, UseInterceptors} from "@nestjs/common";
import {ApiBearerAuth, ApiResponse, ApiTags} from "@nestjs/swagger";
import {SpaceTemplate} from "./spaceTemplate.entity";
import {SpaceTemplatesService} from "./spaceTemplates.service";

@ApiTags("spaceTemplates")
@ApiBearerAuth()
@Controller("spaceTemplates")
export class SpaceTemplatesController {
  constructor(
    private spaceTemplatesService: SpaceTemplatesService,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: SpaceTemplate})
  @Get(":spaceTemplateId")
  async findOrganization(
  @Param("spaceTemplateId") spaceTemplateId: string,
    @Request() req: any
  ) {
    const spaceTemplate = await this.spaceTemplatesService.getSpaceTemplate(spaceTemplateId, req.user.organizationId);
    if (spaceTemplate == null || spaceTemplate == undefined) throw new NotFoundException();
    return spaceTemplate;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiResponse({type: [SpaceTemplate]})
  @Get()
  async findSpaces(
  @Request() req: any
  ) {
    return await this.spaceTemplatesService.getSpaceTemplates(req.user.organizationId);
  }
}
