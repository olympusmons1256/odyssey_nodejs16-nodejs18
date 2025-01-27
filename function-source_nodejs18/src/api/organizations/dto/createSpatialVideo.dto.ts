import {SpatialMedia as SpatialMediaDocType} from "../../../lib/cmsDocTypes";
import {IsEmpty, IsNotEmpty} from "class-validator";
import {CreateSpatialMediaDto} from "./createSpatialMedia.dto";
import {ApiProperty} from "@nestjs/swagger";

export class CreateSpatialVideoDto extends CreateSpatialMediaDto implements SpatialMediaDocType {
  @IsEmpty()
  mediaType: "video";
  @ApiProperty()
  @IsNotEmpty()
  volume: number;
  @ApiProperty()
  @IsNotEmpty()
  loop: boolean;
  @ApiProperty()
  @IsNotEmpty()
  autoplay: boolean;
  @ApiProperty()
  @IsNotEmpty()
  audioOnly: boolean;
  @ApiProperty()
  @IsNotEmpty()
  showPreview: boolean;
}
