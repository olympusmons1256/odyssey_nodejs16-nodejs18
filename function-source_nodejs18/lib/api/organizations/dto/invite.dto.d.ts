import { ValidatorConstraintInterface } from "class-validator";
import { OrganizationRoles } from "../../../lib/docTypes";
export declare class IsOrganizationRole implements ValidatorConstraintInterface {
    validate(text: string): boolean;
    defaultMessage(): string;
}
export declare class InviteUserToOrganizationDto {
    email: string;
    organizationRole: OrganizationRoles;
}
export declare class InviteUsersToOrganizationDto {
    users: InviteUserToOrganizationDto[];
    sendInviteEmails?: boolean;
    inviterName?: string;
}
export declare class InviteUserToSpaceDto {
    email: string;
}
export declare class InviteUsersToSpaceDto {
    users: InviteUserToSpaceDto[];
    sendInviteEmails?: boolean;
    inviterName?: string;
}
export interface IInviteUserResultDto {
    email: string;
    statusCode: number;
    inviteLink?: string;
    inviteId?: string;
    error?: string;
}
export declare class InviteUserResultDto implements IInviteUserResultDto {
    email: string;
    statusCode: number;
    inviteLink?: string;
    inviteId?: string;
    error?: string;
    constructor(email: string, statusCode: number, inviteLink?: string, inviteId?: string, error?: string);
}
export interface IInviteUsersResultDto {
    results: IInviteUserResultDto[];
    errorCount: number;
}
export declare class InviteUsersResultDto implements IInviteUsersResultDto {
    results: InviteUserResultDto[];
    errorCount: number;
    constructor(results: InviteUserResultDto[]);
}
