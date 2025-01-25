import { OrganizationRoles, OrganizationUser as OrganizationUserDocType } from "../../lib/docTypes";
import * as firebaseAdmin from "firebase-admin";
import { CreateUserDto } from "../users/dto/createUser.dto";
import { UpdateUserDto } from "../users/dto/updateUser.dto";
export declare class OrganizationUser implements OrganizationUserDocType {
    id: string;
    bot?: boolean;
    email: string;
    avatarReadyPlayerMeImg?: string;
    role: OrganizationRoles;
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    name?: string;
    static ofDto(createOrganizationUserDto: CreateUserDto, userId: string): OrganizationUser;
    static ofUpdateDto(updateUserDto: UpdateUserDto, userId: string): OrganizationUser;
}
