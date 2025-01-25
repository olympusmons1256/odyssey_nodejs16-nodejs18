import { SpaceItemType } from "../../../lib/cmsDocTypes";
import { Vector3 } from "../item.entity";
export declare class UpdateSpaceItemDto {
    name?: string;
    position?: Vector3;
    rotation?: Vector3;
    offsetUpRotation?: number;
    type?: SpaceItemType;
}
