import {ApiPropertyOptional} from "@nestjs/swagger";
import {UpdateSpatialMediaDto} from "./updateSpatialMedia.dto";

export class UpdateSpatialVideoDto extends UpdateSpatialMediaDto {
  @ApiPropertyOptional()
  volume?: number;
  @ApiPropertyOptional()
  loop?: boolean;
  @ApiPropertyOptional()
  autoplay?: boolean;
  @ApiPropertyOptional()
  audioOnly?: boolean;
  @ApiPropertyOptional()
  showPreview?: boolean;
}
