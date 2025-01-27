import { Stripe } from "stripe";
import { NewCustomerData, StripeCheckoutRequest, StripeCustomerPortalRequest, UpdateSubscriptionRequest } from "../httpTypes";
import { BillingSubscription, BillingSubscriptionPendingSubscription, BillingTier } from "../docTypes";
import * as admin from "firebase-admin";
export declare type ProductWithPrices = {
    product: Stripe.Product;
    prices: Stripe.Price[];
};
export declare type UsersBillingDetails = {
    firstName: string;
    lastName: string;
    billingEmail: string;
    country: string;
    state: string;
    postalCode: string;
};
export declare function createNewCustomerAndCheckoutSandbox(customerData: NewCustomerData, organizationId: string): Promise<"internal-error" | "Customer id not found" | Stripe.Response<Stripe.Checkout.Session>>;
export declare function generateStripeCheckoutUrl(data: StripeCheckoutRequest): Promise<"internal-error" | "Customer id not found" | Stripe.Response<Stripe.Checkout.Session>>;
export declare function generateStripeCustomerPortalUrl(data: StripeCustomerPortalRequest): Promise<"internal-error" | "Customer id not found" | Stripe.Response<Stripe.BillingPortal.Session> | {
    error: string;
}>;
export declare function getLatestActiveExtras(): Promise<{
    error: string;
    stripeProducts?: undefined;
    stripePrices?: undefined;
} | {
    stripeProducts: Stripe.Product[];
    stripePrices: Stripe.Price[];
    error?: undefined;
}>;
export declare function getLatestActiveProducts(): Promise<{
    error: string;
    stripeProducts?: undefined;
    stripePrices?: undefined;
} | {
    stripeProducts: Stripe.Product[];
    stripePrices: Stripe.Price[];
    error?: undefined;
}>;
export declare function getSubscriptionItems(subscriptionId: string): Promise<{
    error: string;
    items?: undefined;
} | {
    items: Stripe.SubscriptionItem[];
    error?: undefined;
}>;
export declare type UpdateSubscriptionType = "upgrade" | "downgrade" | "change";
export declare function resolveUpdateSubscriptionType(existingTier: BillingTier, newTier: BillingTier): UpdateSubscriptionType;
export declare function updateStripeSubscription(data: UpdateSubscriptionRequest): Promise<Stripe.Response<Stripe.Subscription> | Stripe.Response<Stripe.SubscriptionSchedule> | {
    error: string;
}>;
export declare function cancelStripeSubscriptionDowngrade(subscriptionId: any): Promise<{
    error: string;
} | undefined>;
export declare function invoiceAndPayAutoTopup(customerId: string, quantity: number, priceId: string, autoTopupId: string): Promise<"stripe-key-not-found" | Stripe.Response<Stripe.Invoice> | "failed-to-pay-invoice">;
export declare function stripeCustomerAndOrganzationId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<{
    customer?: Stripe.Customer;
    organizationId?: string;
}>;
export declare function getTestClock(testClock: string | Stripe.TestHelpers.TestClock | null | undefined): Promise<Stripe.TestHelpers.TestClock | undefined>;
export declare function pendingSubscriptionFromSchedule(customer: Stripe.Customer, schedule: Stripe.SubscriptionSchedule): Promise<BillingSubscriptionPendingSubscription | undefined>;
interface UsageUpdate {
    workspaceSeatsSubscribed: number;
    publishedSpacesSubscribed: number;
}
interface InvoiceStreamingCreditsIncrement {
    streamingCreditsToIncrement: number;
    invoiceId: string;
    timestamp: admin.firestore.Timestamp;
}
declare type OrganizationBillingStateChange = {
    eventId: string;
    organizationId?: string;
    usageUpdate?: UsageUpdate;
    billingSubscription?: BillingSubscription;
    creditsIncrement?: InvoiceStreamingCreditsIncrement;
};
export declare function organizationBillingStateFromLatestSubscriptionInvoices(params: {
    eventId: string;
    customerId: string;
    subscriptionId: string;
    paymentMethodId?: string;
}): Promise<OrganizationBillingStateChange | string>;
export declare function ensureCustomerDefaultPaymentMethod(customerId: string, paymentMethodId?: string): Promise<0 | "customer-not-found" | "no-payment-method-provided" | "failed-to-set" | {
    error: string;
}>;
export declare function syncLatestStripeProductsToFirestore(): Promise<1 | 0>;
export declare function writeOrganizationBillingStateChanges(stateToChange: OrganizationBillingStateChange): Promise<1 | undefined>;
export declare function emailStripeInvoice(invoiceId: string): Promise<boolean>;
export {};
