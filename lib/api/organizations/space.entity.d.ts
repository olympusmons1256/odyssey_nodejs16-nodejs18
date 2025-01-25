import { OrgSpace as SpaceDocType } from "../../lib/cmsDocTypes";
import { RegistrationInfoFields as RegistrationInfoFieldsDocType } from "../../lib/docTypes";
import * as firebaseAdmin from "firebase-admin";
import { SpaceItem } from "./item.entity";
import { ISubCollection } from "fireorm";
import { CreateSpaceDto } from "./dto/createSpace.dto";
import { SpaceTemplate } from "../spaceTemplates/spaceTemplate.entity";
import { UpdateSpaceDto } from "./dto/updateSpace.dto";
export declare class RegistrationInfoFields implements RegistrationInfoFieldsDocType {
    email: boolean;
    phone: boolean;
    fullName: boolean;
}
export declare class Space implements SpaceDocType {
    id: string;
    created?: firebaseAdmin.firestore.Timestamp;
    description: string;
    enableSharding?: boolean;
    infoFields?: RegistrationInfoFields;
    isLiveStreamActive?: boolean;
    isPublic?: boolean;
    name: string;
    persistentLiveStream?: string;
    rooms: string[];
    spaceTemplateId: string;
    thumb: string;
    ueId: string;
    updated?: firebaseAdmin.firestore.Timestamp;
    disableComms?: boolean;
    items?: ISubCollection<SpaceItem>;
    static ofDto(createSpaceDto: CreateSpaceDto, spaceTemplate: SpaceTemplate): Space;
    static ofUpdateDto(updateSpaceDto: UpdateSpaceDto, spaceId: string): Space;
}
