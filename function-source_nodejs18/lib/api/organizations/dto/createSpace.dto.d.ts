import { AvatarTypes } from "../../../lib/cmsDocTypes";
import * as docTypes from "../../../lib/docTypes";
export declare class RegistrationInfoFields implements docTypes.RegistrationInfoFields {
    email: boolean;
    phone: boolean;
    fullName: boolean;
}
export declare class CreateSpaceDto {
    avatarType?: AvatarTypes;
    description: string;
    enableSharding?: boolean;
    infoFields?: RegistrationInfoFields;
    isLiveStreamActive?: boolean;
    isPublic?: boolean;
    name: string;
    persistentLiveStream?: string;
    spaceTemplateId: string;
    thumb: string;
    disableComms?: boolean;
}
