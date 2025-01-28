import {SpatialMedia as SpatialMediaDocType, SpatialMediaTypes} from "../../../lib/cmsDocTypes";
import {IsEmpty, IsNotEmpty} from "class-validator";
import {CreateSpaceItemDto} from "./createSpaceItem.dto";
import {ApiProperty} from "@nestjs/swagger";

export class CreateSpatialMediaDto extends CreateSpaceItemDto implements SpatialMediaDocType {
  @IsEmpty()
  type: "SpatialMedia";
  @ApiProperty()
  @IsNotEmpty()
  url: string;
  @ApiProperty()
  @IsNotEmpty()
  mediaType: SpatialMediaTypes;
  @ApiProperty()
  @IsNotEmpty()
  attenuation: number;
}
