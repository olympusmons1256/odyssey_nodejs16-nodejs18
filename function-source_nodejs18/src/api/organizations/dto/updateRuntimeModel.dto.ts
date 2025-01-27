import {ModelMetadata as ModelMetadataType} from "../../../lib/cmsDocTypes";
import {ApiPropertyOptional} from "@nestjs/swagger";
import {Vector3} from "../item.entity";
import {UpdateSpaceItemDto} from "./updateSpaceItem.dto";

export class UpdateRuntimeModelDto extends UpdateSpaceItemDto {
  @ApiPropertyOptional()
  gltfUrl?: string;
  @ApiPropertyOptional()
  materialOverrideId?: string;
  @ApiPropertyOptional()
  collisionsEnabled?: boolean
  @ApiPropertyOptional()
  offsetUniformScale?: number
  @ApiPropertyOptional()
  scale?: Vector3
  @ApiPropertyOptional()
  autoScale?: boolean
  @ApiPropertyOptional()
  currentAnimation?: string
  @ApiPropertyOptional()
  availableAnimations?: string[]
  @ApiPropertyOptional()
  metadata?: ModelMetadataType
}
