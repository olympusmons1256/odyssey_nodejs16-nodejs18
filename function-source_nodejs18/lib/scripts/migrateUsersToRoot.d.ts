import { RootUser, OrganizationUser, OldOrganizationUser } from "../lib/docTypes";
interface UserRecordBase {
    id: string;
    updated: number;
    organizationId: string;
}
interface RootUserRecord extends UserRecordBase {
    rootUser: RootUser;
}
interface OldOrganizationUserRecord extends UserRecordBase {
    oldOrganizationUser: OldOrganizationUser;
}
interface OrganizationUserRecord extends UserRecordBase {
    organizationUser: OrganizationUser;
}
export declare function getAllOrganizationUsers(): Promise<OrganizationUserRecord[]>;
export declare function constructRootUserRecords(userRecords: OldOrganizationUserRecord[]): RootUserRecord[];
export declare function chunkAddRootUsers(users: RootUserRecord[]): Promise<RootUserRecord[]>;
export declare function chunkAddOrganizationUsers(users: OldOrganizationUserRecord[]): Promise<OldOrganizationUserRecord[]>;
export declare function findMissingUsers(users: RootUserRecord[]): Promise<RootUserRecord[]>;
interface AuthUserId {
    id: string;
}
export interface DeleteAuthUserError {
    code: string;
    message: string;
    stack?: string;
}
export declare function deleteGuestAuthUsers(users: AuthUserId[]): Promise<DeleteAuthUserError[]>;
export {};
