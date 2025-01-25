import { ISubCollection } from "fireorm";
import { Organization as OrganizationDocType } from "../../lib/docTypes";
import { BillingPublic, BillingSubscription, BillingUsage } from "./billing.entity";
import { OrganizationUser } from "./organizationUser.entity";
import { Space } from "./space.entity";
export declare class Organization implements OrganizationDocType {
    id: string;
    name: string;
    domain?: string;
    whitelabel?: boolean;
    logoSmallUrl?: string;
    splashImageUrl?: string;
    location?: string;
    bio?: string;
    websiteUrl?: string;
    spaces?: ISubCollection<Space>;
    organizationUsers?: ISubCollection<OrganizationUser>;
    billingUsage?: ISubCollection<BillingUsage>;
    billingPublic?: ISubCollection<BillingPublic>;
    billingSubscription?: ISubCollection<BillingSubscription>;
}
