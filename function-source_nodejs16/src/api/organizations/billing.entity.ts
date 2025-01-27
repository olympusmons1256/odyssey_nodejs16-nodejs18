import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import Stripe from "stripe";
import {BillingSubscriptionSubscription as IBillingSubscriptionSubscription, AutoTopupCredits as IAutoTopupCredits, BillingFeatures as IBillingFeatures, BillingPublic as IBillingPublic, BillingUsage as IBillingUsage, BillingSubscription as IBillingSubscription, BillingSubscriptionPendingSubscription as IBillingSubscriptionPendingSubscription} from "../../lib/docTypes";
import * as firebaseAdmin from "firebase-admin";

class BillingFeatures implements IBillingFeatures {
  @ApiPropertyOptional()
  bridge?: boolean;
  @ApiPropertyOptional()
  restApi?: boolean;
  @ApiPropertyOptional()
  sharding?: boolean;
  @ApiPropertyOptional()
  analytics?: boolean;
  @ApiPropertyOptional()
  publishSpace?: boolean;
  @ApiPropertyOptional()
  inWorldStreams?: boolean;
}

class AutoTopupCredits implements IAutoTopupCredits {
  @ApiProperty()
  quantity: number;
  @ApiProperty()
  threshold: number;
}

class BillingSubscriptionSubscription implements IBillingSubscriptionSubscription {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  status: Stripe.Subscription.Status;
  @ApiProperty()
  currentPeriodEnd: firebaseAdmin.firestore.Timestamp;
  @ApiProperty()
  currentPeriodStart: firebaseAdmin.firestore.Timestamp;
  @ApiPropertyOptional()
  canceled?: boolean;
}

class BillingSubscriptionPendingSubscription implements IBillingSubscriptionPendingSubscription {
  @ApiProperty()
  stripeProductId: string;
  @ApiProperty()
  reason: "unpaid" | "scheduled";
  @ApiProperty()
  workspaceSeatsQuantity: number;
  @ApiPropertyOptional()
  publishedSpacesQuantity?: number;
}

export class BillingPublic implements IBillingPublic {
  @ApiProperty()
  id!: "public";
  features: BillingFeatures;
  @ApiProperty()
  hasAvailableCredits: boolean;
  @ApiProperty()
  hasActiveSubscription: boolean;
  @ApiPropertyOptional()
  disableBilling?: boolean;
  @ApiPropertyOptional()
  aggregateBillingState?: "active" | "inactive";
}

export class BillingUsage implements IBillingUsage {
  @ApiProperty()
  id!: "usage"
  @ApiProperty()
  availableCredits: number;
  @ApiProperty()
  workspaceSeatsUsed: number;
  @ApiProperty()
  publishedSpacesUsed: number;
  @ApiProperty()
  workspaceSeatsSubscribed: number;
  @ApiProperty()
  publishedSpacesSubscribed: number;
  @ApiPropertyOptional()
  autoTopupCredits?: AutoTopupCredits;
}

export class BillingSubscription implements IBillingSubscription {
  @ApiProperty()
  id!: "subscription"
  @ApiProperty()
  stripeProductId: string;
  @ApiProperty()
  stripeCustomerId: string;
  @ApiProperty()
  stripeSubscription: BillingSubscriptionSubscription;
  @ApiPropertyOptional()
  pendingSubscription?: BillingSubscriptionPendingSubscription;
}
