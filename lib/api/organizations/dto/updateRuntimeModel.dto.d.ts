import { ModelMetadata as ModelMetadataType } from "../../../lib/cmsDocTypes";
import { Vector3 } from "../item.entity";
import { UpdateSpaceItemDto } from "./updateSpaceItem.dto";
export declare class UpdateRuntimeModelDto extends UpdateSpaceItemDto {
    gltfUrl?: string;
    materialOverrideId?: string;
    collisionsEnabled?: boolean;
    offsetUniformScale?: number;
    scale?: Vector3;
    autoScale?: boolean;
    currentAnimation?: string;
    availableAnimations?: string[];
    metadata?: ModelMetadataType;
}
