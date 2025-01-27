import { RuntimeModel as RuntimeModelDocType, ModelMetadata as ModelMetadataType } from "../../../lib/cmsDocTypes";
import { CreateSpaceItemDto } from "./createSpaceItem.dto";
import { Vector3 } from "../item.entity";
export declare class CreateRuntimeModelDto extends CreateSpaceItemDto implements RuntimeModelDocType {
    type: "RuntimeModel";
    gltfUrl: string;
    materialOverrideId: string;
    collisionsEnabled: boolean;
    autoScale: boolean;
    scale: Vector3;
    offsetUniformScale: number;
    metadata: ModelMetadataType;
}
