import { OrganizationRoles } from "../docTypes";
export declare function addOrganizationUser(organizationId: string, userId: string, role: OrganizationRoles): Promise<FirebaseFirestore.WriteResult | {
    undefined: undefined;
} | undefined>;
