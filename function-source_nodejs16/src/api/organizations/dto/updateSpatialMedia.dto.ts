import {ApiPropertyOptional} from "@nestjs/swagger";
import {UpdateSpaceItemDto} from "./updateSpaceItem.dto";

export class UpdateSpatialMediaDto extends UpdateSpaceItemDto {
  @ApiPropertyOptional()
  url?: string;
  @ApiPropertyOptional()
  attenuation?: number;
}
