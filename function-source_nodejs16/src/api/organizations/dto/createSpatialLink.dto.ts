import {SpatialMedia as SpatialMediaDocType} from "../../../lib/cmsDocTypes";
import {IsEmpty, IsNotEmpty} from "class-validator";
import {CreateSpatialMediaDto} from "./createSpatialMedia.dto";
import {ApiProperty} from "@nestjs/swagger";

export class CreateSpatialLinkDto extends CreateSpatialMediaDto implements SpatialMediaDocType {
  @IsEmpty()
  mediaType: "link";
  @ApiProperty()
  @IsNotEmpty()
  isPortrait: boolean;
  @ApiProperty()
  @IsNotEmpty()
  openInNewTab: boolean;
}
