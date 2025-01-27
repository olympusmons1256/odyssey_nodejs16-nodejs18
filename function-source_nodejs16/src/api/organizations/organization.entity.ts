import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {Exclude} from "class-transformer";
import {Collection, ISubCollection, SubCollection} from "fireorm";
import {Organization as OrganizationDocType} from "../../lib/docTypes";
import {BillingPublic, BillingSubscription, BillingUsage} from "./billing.entity";
import {OrganizationUser} from "./organizationUser.entity";
import {Space} from "./space.entity";

@Collection("organizations")
export class Organization implements OrganizationDocType {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  name: string;
  @ApiPropertyOptional()
  domain?: string
  @ApiPropertyOptional()
  whitelabel?: boolean
  @ApiPropertyOptional()
  logoSmallUrl?: string
  @ApiPropertyOptional()
  splashImageUrl?: string
  @ApiPropertyOptional()
  location?: string
  @ApiPropertyOptional()
  bio?: string
  @ApiPropertyOptional()
  websiteUrl?: string

  @Exclude()
  @SubCollection(Space, "spaces")
  spaces?: ISubCollection<Space>;

  @Exclude()
  @SubCollection(OrganizationUser, "organizationUsers")
  organizationUsers?: ISubCollection<OrganizationUser>;

  @Exclude()
  @SubCollection(BillingUsage, "billing")
  billingUsage?: ISubCollection<BillingUsage>;

  @Exclude()
  @SubCollection(BillingPublic, "billing")
  billingPublic?: ISubCollection<BillingPublic>;

  @Exclude()
  @SubCollection(BillingSubscription, "billing")
  billingSubscription?: ISubCollection<BillingSubscription>;
}
