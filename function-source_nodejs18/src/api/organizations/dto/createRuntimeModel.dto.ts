import {RuntimeModel as RuntimeModelDocType, ModelMetadata as ModelMetadataType} from "../../../lib/cmsDocTypes";
import {IsEmpty, IsNotEmpty} from "class-validator";
import {CreateSpaceItemDto} from "./createSpaceItem.dto";
import {ApiProperty} from "@nestjs/swagger";
import {Vector3} from "../item.entity";

export class CreateRuntimeModelDto extends CreateSpaceItemDto implements RuntimeModelDocType {
  @IsEmpty()
  type: "RuntimeModel";
  @ApiProperty()
  @IsNotEmpty()
  gltfUrl: string;
  @ApiProperty()
  @IsNotEmpty()
  materialOverrideId: string;
  @ApiProperty()
  @IsNotEmpty()
  collisionsEnabled: boolean;
  @ApiProperty()
  @IsNotEmpty()
  autoScale: boolean;
  @ApiProperty()
  @IsNotEmpty()
  scale: Vector3;
  @ApiProperty()
  @IsNotEmpty()
  offsetUniformScale: number
  @ApiProperty()
  @IsNotEmpty()
  metadata: ModelMetadataType
}
