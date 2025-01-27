import * as firebaseAdmin from "firebase-admin";
import { RootUser as RootUserDocType, UserOrganization, UserSpace } from "../../../lib/docTypes";
import { AvatarClothingSettings } from "./createUser.dto";
export declare class UpdateUserDto implements RootUserDocType {
    id?: string;
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
