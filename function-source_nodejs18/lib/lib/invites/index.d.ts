import * as docTypes from "../docTypes";
export interface InviteRequest {
    email: string;
    inviterName: string;
    orgId: string;
    orgName: string;
    orgRole?: docTypes.OrganizationRoles;
    spaceId?: string;
    spaceName?: string;
    spaceRole?: docTypes.SpaceRoles;
}
export interface InviteUserResult {
    inviteRequest: InviteRequest;
    inviteLink?: string;
    inviteId?: string;
    invite: docTypes.Invite;
    roleCorrect: boolean;
    foundInOrg: boolean;
    foundInSpace: boolean;
}
export interface AddInviteResult {
    inviteLink?: string;
    inviteId?: string;
}
export declare function addInvite(organizationId: string, invite: docTypes.Invite, spaceId?: string): Promise<AddInviteResult | undefined>;
export declare function inviteUsers(inviteRequests: InviteRequest[]): Promise<InviteUserResult[]>;
export interface EmailInviteUserResult {
    inviteUserResult: InviteUserResult;
    success: boolean;
}
export declare function sendInviteEmails(inviteUserResults: InviteUserResult[]): Promise<EmailInviteUserResult[]>;
