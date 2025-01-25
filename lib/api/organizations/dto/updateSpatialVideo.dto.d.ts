import { UpdateSpatialMediaDto } from "./updateSpatialMedia.dto";
export declare class UpdateSpatialVideoDto extends UpdateSpatialMediaDto {
    volume?: number;
    loop?: boolean;
    autoplay?: boolean;
    audioOnly?: boolean;
    showPreview?: boolean;
}
