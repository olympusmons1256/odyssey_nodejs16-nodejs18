import { SpatialMedia as SpatialMediaDocType } from "../../../lib/cmsDocTypes";
import { CreateSpatialMediaDto } from "./createSpatialMedia.dto";
export declare class CreateSpatialLinkDto extends CreateSpatialMediaDto implements SpatialMediaDocType {
    mediaType: "link";
    isPortrait: boolean;
    openInNewTab: boolean;
}
