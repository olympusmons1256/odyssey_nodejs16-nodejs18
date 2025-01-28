import {ApiPropertyOptional} from "@nestjs/swagger";
import {UpdateSpatialMediaDto} from "./updateSpatialMedia.dto";

export class UpdateSpatialLinkDto extends UpdateSpatialMediaDto {
  @ApiPropertyOptional()
  isPortrait?: boolean;
  @ApiPropertyOptional()
  openInNewTab?: boolean;
}
