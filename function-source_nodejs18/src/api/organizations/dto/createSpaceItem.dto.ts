import {SpaceItem as SpaceItemDocType, SpaceItemType} from "../../../lib/cmsDocTypes";
import {IsNotEmpty} from "class-validator";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {Vector3} from "../item.entity";

export class CreateSpaceItemDto implements SpaceItemDocType {
  @IsNotEmpty()
  @ApiProperty()
  name: string;
  @ApiProperty()
  @IsNotEmpty()
  position: Vector3
  @ApiProperty()
  @IsNotEmpty()
  rotation: Vector3;
  @ApiProperty()
  @IsNotEmpty()
  offsetUpRotation: number;
  @ApiPropertyOptional()
  thumb?: string
  @ApiPropertyOptional()
  isLocked?: boolean
  user?: string;
  type: SpaceItemType;
}
