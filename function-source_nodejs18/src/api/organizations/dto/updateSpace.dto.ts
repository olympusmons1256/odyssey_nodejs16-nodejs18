import {ApiPropertyOptional, PartialType} from "@nestjs/swagger";
import {AvatarTypes} from "../../../lib/cmsDocTypes";
import {CreateSpaceDto, RegistrationInfoFields} from "./createSpace.dto";

export class UpdateSpaceDto extends PartialType(CreateSpaceDto) {
  @ApiPropertyOptional()
  avatarType?: AvatarTypes;
  @ApiPropertyOptional()
  description?: string;
  @ApiPropertyOptional()
  enableSharding?: boolean;
  @ApiPropertyOptional()
  infoFields?: RegistrationInfoFields;
  @ApiPropertyOptional()
  isLiveStreamActive?: boolean;
  @ApiPropertyOptional()
  isPublic?: boolean;
  @ApiPropertyOptional()
  name?: string;
  @ApiPropertyOptional()
  persistentLiveStream?: string;
  @ApiPropertyOptional()
  spaceTemplateId?: string;
  @ApiPropertyOptional()
  thumb?: string;
  @ApiPropertyOptional()
  disableComms?: boolean;
}
