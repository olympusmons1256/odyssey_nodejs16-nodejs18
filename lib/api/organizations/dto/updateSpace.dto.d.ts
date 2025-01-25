import { AvatarTypes } from "../../../lib/cmsDocTypes";
import { CreateSpaceDto, RegistrationInfoFields } from "./createSpace.dto";
declare const UpdateSpaceDto_base: import("@nestjs/common").Type<Partial<CreateSpaceDto>>;
export declare class UpdateSpaceDto extends UpdateSpaceDto_base {
    avatarType?: AvatarTypes;
    description?: string;
    enableSharding?: boolean;
    infoFields?: RegistrationInfoFields;
    isLiveStreamActive?: boolean;
    isPublic?: boolean;
    name?: string;
    persistentLiveStream?: string;
    spaceTemplateId?: string;
    thumb?: string;
    disableComms?: boolean;
}
export {};
