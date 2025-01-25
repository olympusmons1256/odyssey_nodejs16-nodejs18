import { OrganizationActions, UserRoles } from "../lib/docTypes";
export declare function getUserOrgRole(organizationId: string, userId: string): Promise<UserRoles | undefined>;
export declare function getOrganizationPermission(query: {
    action: OrganizationActions;
    userRole: UserRoles;
}): Promise<boolean>;
export declare function updateOrganizationBillingUsage(organizationId: string): Promise<FirebaseFirestore.WriteResult>;
interface UserCanViewSpaceResult {
    result: boolean;
    reason?: "organization-billing-inactive" | "space-not-found" | "permission-denied";
}
export declare function userCanViewSpace(organizationId: string, spaceId: string, userId: string): Promise<UserCanViewSpaceResult>;
export {};
