import { SpatialMedia as SpatialMediaDocType, SpatialMediaTypes } from "../../../lib/cmsDocTypes";
import { CreateSpaceItemDto } from "./createSpaceItem.dto";
export declare class CreateSpatialMediaDto extends CreateSpaceItemDto implements SpatialMediaDocType {
    type: "SpatialMedia";
    url: string;
    mediaType: SpatialMediaTypes;
    attenuation: number;
}
