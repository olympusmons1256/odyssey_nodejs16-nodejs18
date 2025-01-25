import Stripe from "stripe";
import { BillingSubscriptionSubscription as IBillingSubscriptionSubscription, AutoTopupCredits as IAutoTopupCredits, BillingFeatures as IBillingFeatures, BillingPublic as IBillingPublic, BillingUsage as IBillingUsage, BillingSubscription as IBillingSubscription, BillingSubscriptionPendingSubscription as IBillingSubscriptionPendingSubscription } from "../../lib/docTypes";
import * as firebaseAdmin from "firebase-admin";
declare class BillingFeatures implements IBillingFeatures {
    bridge?: boolean;
    restApi?: boolean;
    sharding?: boolean;
    analytics?: boolean;
    publishSpace?: boolean;
    inWorldStreams?: boolean;
}
declare class AutoTopupCredits implements IAutoTopupCredits {
    quantity: number;
    threshold: number;
}
declare class BillingSubscriptionSubscription implements IBillingSubscriptionSubscription {
    id: string;
    status: Stripe.Subscription.Status;
    currentPeriodEnd: firebaseAdmin.firestore.Timestamp;
    currentPeriodStart: firebaseAdmin.firestore.Timestamp;
    canceled?: boolean;
}
declare class BillingSubscriptionPendingSubscription implements IBillingSubscriptionPendingSubscription {
    stripeProductId: string;
    reason: "unpaid" | "scheduled";
    workspaceSeatsQuantity: number;
    publishedSpacesQuantity?: number;
}
export declare class BillingPublic implements IBillingPublic {
    id: "public";
    features: BillingFeatures;
    hasAvailableCredits: boolean;
    hasActiveSubscription: boolean;
    disableBilling?: boolean;
    aggregateBillingState?: "active" | "inactive";
}
export declare class BillingUsage implements IBillingUsage {
    id: "usage";
    availableCredits: number;
    workspaceSeatsUsed: number;
    publishedSpacesUsed: number;
    workspaceSeatsSubscribed: number;
    publishedSpacesSubscribed: number;
    autoTopupCredits?: AutoTopupCredits;
}
export declare class BillingSubscription implements IBillingSubscription {
    id: "subscription";
    stripeProductId: string;
    stripeCustomerId: string;
    stripeSubscription: BillingSubscriptionSubscription;
    pendingSubscription?: BillingSubscriptionPendingSubscription;
}
export {};
