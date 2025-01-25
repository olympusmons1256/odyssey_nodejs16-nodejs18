import { SpatialMedia as SpatialMediaDocType } from "../../../lib/cmsDocTypes";
import { CreateSpatialMediaDto } from "./createSpatialMedia.dto";
export declare class CreateSpatialVideoDto extends CreateSpatialMediaDto implements SpatialMediaDocType {
    mediaType: "video";
    volume: number;
    loop: boolean;
    autoplay: boolean;
    audioOnly: boolean;
    showPreview: boolean;
}
