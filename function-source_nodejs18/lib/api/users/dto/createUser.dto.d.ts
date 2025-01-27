import * as firebaseAdmin from "firebase-admin";
import { AvatarClothingSettings as AvatarClothingSettingsDocType, RootUser as RootUserDocType, UserOrganization, UserSpace } from "../../../lib/docTypes";
export declare class AvatarClothingSettings implements AvatarClothingSettingsDocType {
    ueId: string;
    shaderItem?: string;
    shaderColor?: string;
}
export declare class CreateUserDto implements RootUserDocType {
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    name?: string;
    bot?: boolean;
    email: string;
    avatarReadyPlayerMeImg?: string;
    pending?: boolean;
    bodyShape?: string;
    bodyHeight?: string;
    roomInvites?: string[];
    additionalInfo?: {
        email?: string;
        phone?: string;
        fullName?: string;
    };
    avatarReadyPlayerMeUrl?: string;
    followingOrganizationIds?: string[];
    userSpaces?: UserSpace[];
    clothingTop?: AvatarClothingSettings;
    clothingShoes?: AvatarClothingSettings;
    clothingBottom?: AvatarClothingSettings;
    userOrganizations?: UserOrganization[];
}
