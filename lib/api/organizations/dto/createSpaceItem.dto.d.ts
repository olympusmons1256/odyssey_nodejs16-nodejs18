import { SpaceItem as SpaceItemDocType, SpaceItemType } from "../../../lib/cmsDocTypes";
import { Vector3 } from "../item.entity";
export declare class CreateSpaceItemDto implements SpaceItemDocType {
    name: string;
    position: Vector3;
    rotation: Vector3;
    offsetUpRotation: number;
    thumb?: string;
    isLocked?: boolean;
    user?: string;
    type: SpaceItemType;
}
