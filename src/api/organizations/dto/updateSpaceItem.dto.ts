import {ApiPropertyOptional} from "@nestjs/swagger";
import {SpaceItemType} from "../../../lib/cmsDocTypes";
import {Vector3} from "../item.entity";

export class UpdateSpaceItemDto {
  @ApiPropertyOptional()
  name?: string;
  @ApiPropertyOptional()
  position?: Vector3;
  @ApiPropertyOptional()
  rotation?: Vector3;
  @ApiPropertyOptional()
  offsetUpRotation?: number
  @ApiPropertyOptional()
  type?: SpaceItemType;
}
