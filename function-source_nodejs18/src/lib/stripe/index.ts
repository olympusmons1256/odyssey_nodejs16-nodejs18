// @ts-ignore
// @ts-nocheck - Node.js 16 compatibility
import * as functions from "firebase-functions";
import {Stripe} from "stripe";
import {generateUrl} from "../../lib/emailServices/index";
import type {NewCustomerData, StripeCheckoutRequest, StripeCustomerPortalRequest, UpdateSubscriptionRequest} from "../httpTypes";
import {getBillingProductsAvailable, getBillingProductsAvailableRef, getBillingStreamingCreditsPurchasesRef, getBillingSubscription, getBillingSubscriptionRef, getBillingUsage, getBillingUsageRef, getOrganization} from "../documents/firestore";
import {dedupList, isProductionFirebaseProject, stringify, tryStringToNumber} from "../misc";
import {BillingFeatures, BillingPeriod, BillingProductBaseFeePrice, BillingProductExtra, BillingProductExtras, BillingProductFeaturePrice, BillingProductsAvailable, BillingProductTier, BillingProductTiers, BillingSubscription, BillingSubscriptionPendingSubscription, BillingTier, BILLING_PERIOD, BILLING_TIER, StreamingCreditsPurchase} from "../docTypes";
import * as admin from "firebase-admin";
import {getEnvUrl, getFirebaseProjectId, getPostmarkKey, getStripeSecretKey} from "../firebase";
import * as postmark from "postmark";
import {v4 as uuidv4} from "uuid";

export type ProductWithPrices = {
  product: Stripe.Product
  prices: Stripe.Price[]
}

export type UsersBillingDetails = {
  firstName: string,
  lastName: string,
  billingEmail: string,
  country: string,
  state: string,
  postalCode: string,
}

// Helper function to create Stripe instance with correct API version
function getStripe() {
  const stripeKey = getStripeSecretKey();
  if (!stripeKey) return undefined;
  return new Stripe(stripeKey, {
    apiVersion: "2022-11-15" as any, // Keep Node.js 16 API version
  });
}

export type UpdateSubscriptionType = "upgrade" | "downgrade" | "same";

export function resolveUpdateSubscriptionType(existingTier: BillingTier, newTier: BillingTier): UpdateSubscriptionType {
  if (existingTier == newTier) return "same";
  if (BILLING_TIER[existingTier] < BILLING_TIER[newTier]) return "upgrade";
  return "downgrade";
}

interface ExtendedUpdateSubscriptionRequest {
  organizationId: string;
  subscriptionId: string;
  productId?: string;
  workspaceSeatsSubscribed?: number;
  publishedSpacesSubscribed?: number;
  prorationBehavior?: string;
}

async function createCustomer(customerData: NewCustomerData): Promise<Stripe.Customer | undefined> {
  const stripeKey = getStripeSecretKey();
  if (typeof stripeKey !== "string") {
    console.error("Failed to get Stripe client");
    return undefined;
  }

  const stripe = getStripe();

  try {
    // Create new customer if no customer is found
    const customer = await stripe.customers.create({
      test_clock: (getFirebaseProjectId() == "odyssey-local" && customerData.testClockId != undefined) ? customerData.testClockId : undefined,
      name: customerData.name,
      email: customerData.email,
      metadata: {
        organizationId: customerData.organizationId
      }
    } as any); // Assert type to match Node.js 16 behavior

    return customer;
  } catch (error) {
    console.error("Failed to create customer:", error);
    return undefined;
  }
}

async function createNewCustomerAndCheckoutSandbox(customerData: NewCustomerData, organizationId: string) {
  // Validate product & token
  const projectId = getFirebaseProjectId();
  const isProd = isProductionFirebaseProject(projectId);
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15" as any, // Keep Node.js 16 API version
  });

  try {
    // get sandbox product
    const [, billingProductsAvailable] = await getBillingProductsAvailable();
    if (billingProductsAvailable == undefined) {
      console.error("Didn't find any available billing products");
      return "internal-error";
    }
    const product = Object.entries(billingProductsAvailable.tiers).flatMap(([k, v]) => v.tier == "sandbox" ? {productId: k, priceId: v.baseFeePrice.stripeId, workspaceSeatsPrice: v.workspaceSeatsPrice} : []).pop();
    if (product == undefined) {
      console.error("Didn't find sandbox tier in billing products");
      return "internal-error";
    }

    // define all subscription items
    const baseFeeItem = {price: product.priceId, quantity: 1};
    const workspaceSeatsItems = {price: product.workspaceSeatsPrice.stripeId, quantity: product.workspaceSeatsPrice.included};
    const items = [baseFeeItem, workspaceSeatsItems];

    // check for existing customer
    const existingCustomer = (await stripe.customers.search({query: `metadata['organizationId']:'${organizationId}'`})).data?.pop();

    // create new customer if no customer is found
    const customer = existingCustomer ? existingCustomer : await stripe.customers.create({
      test_clock: (isProd == false && customerData.testClockId != undefined) ? customerData.testClockId : undefined,
      email: customerData.email,
      name: customerData.name,
      metadata: {
        organizationId: customerData.organizationId,
      },
    } as any); // Assert type to match Node.js 16 behavior

    // return url
    return await generateStripeCheckoutUrl({
      customerId: customer.id,
      mode: "subscription",
      items: items,
      redirectParams: `profile/${organizationId}?subscriptionUpdate`,
      isNewCustomer: true,
    });
  } catch (e: any) {
    console.error("Failed to create and subscribe new customer");
    console.error(e);
    return "internal-error";
  }
}

async function generateStripeCheckoutUrl(data: StripeCheckoutRequest) {
  if (!data.customerId) {
    console.error("Customer id not found. User either does not exist or does not have permission.");
    return "Customer id not found";
  }
  // Validate product & token
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15" as any, // Keep Node.js 16 API version
  });

  try {
    // Define redirect
    const redirect = await generateUrl(`${data.redirectParams}`);
    // Define session data
    const sessionData: Stripe.Checkout.SessionCreateParams = {
      mode: data.mode,
      customer: data.customerId,
      line_items: data.items,
      success_url: `${redirect}=success`,
      cancel_url: `${redirect}=cancelled`,
      invoice_creation: data.mode === "payment" ? {enabled: true} : undefined,
      payment_method_collection: data.mode === "subscription" ? "always" : undefined,
      customer_update: {address: "auto"},
    };
    if (data.isNewCustomer) sessionData.billing_address_collection = "required";
    else sessionData.automatic_tax = {enabled: true};
    const session = await stripe.checkout.sessions.create(sessionData);
    return session.url;
  } catch (e: any) {
    console.error("Failed to create checkout url");
    console.error(e);
    return "internal-error";
  }
}

async function generateStripeCustomerPortalUrl(data: StripeCustomerPortalRequest) {
  if (!data.customerId) {
    console.error("Customer id not found. User either does not exist or does not have permission.");
    return "Customer id not found";
  }
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {error: "stripe-key-not-found"};
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15" as any, // Keep Node.js 16 API version
  });

  try {
    // Define redirect
    const redirect = await generateUrl(`${data.redirectParams}`);
    // Update stripe subscription
    return await stripe.billingPortal.sessions.create({
      customer: data.customerId,
      return_url: redirect,
    });
  } catch (e: any) {
    console.error("Failed to create and subscribe new customer");
    console.error(e);
    return "internal-error";
  }
}

async function getLatestActiveExtras() {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15" as any, // Keep Node.js 16 API version
  });

  try {
    const stripeProducts = (await stripe.products.search({query: "active:'true' AND metadata['productType']:'extra'"})).data;
    const stripePrices = (await stripe.prices.list({active: true})).data;
    return {stripeProducts, stripePrices};
  } catch (e: any) {
    console.error("Failed to get latest active extras");
    console.error(e);
    return "internal-error";
  }
}

async function getLatestActiveProducts() {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15" as any, // Keep Node.js 16 API version
  });

  try {
    const tierProducts = (await stripe.products.search({query: "active:'true' AND metadata['productType']:'subscription'"})).data;
    const stripePrices = (await stripe.prices.list({active: true})).data;
    return {stripeProducts: tierProducts, stripePrices: stripePrices};
  } catch (e: any) {
    console.error("Failed to get latest active products");
    console.error(e);
    return "internal-error";
  }
}

async function getSubscriptionItems(subscriptionId: string) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15" as any, // Keep Node.js 16 API version
  });

  try {
    const items = await stripe.subscriptionItems.list({subscription: subscriptionId});
    return {items: items.data};
  } catch (e: any) {
    console.error("Failed to get subscription items");
    console.error(e);
    return "internal-error";
  }
}

export async function updateStripeSubscription(data: ExtendedUpdateSubscriptionRequest) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15" as any, // Keep Node.js 16 API version
  });

  try {
    // get existing subscription
    const subscription = await stripe.subscriptions.retrieve(data.subscriptionId);
    if (subscription == undefined) {
      console.error("Failed to find subscription");
      return "internal-error";
    }

    // get billing products
    const [, billingProductsAvailable] = await getBillingProductsAvailable();
    if (billingProductsAvailable == undefined) {
      console.error("Failed to find billing products");
      return "internal-error";
    }

    // get product
    const product = billingProductsAvailable.tiers[data.productId];
    if (product == undefined) {
      console.error("Failed to find product");
      return "internal-error";
    }

    // get existing subscription items
    const subscriptionItems = await getSubscriptionItems(data.subscriptionId);
    if (subscriptionItems == "internal-error") {
      console.error("Failed to find subscription items");
      return "internal-error";
    }

    // define subscription items
    const baseFeeItem = {
      id: subscriptionItems.items.find((i) => i.price.product == product.baseFeePrice.stripeId)?.id,
      price: product.baseFeePrice.stripeId,
      quantity: 1,
    };
    const workspaceSeatsItem = {
      id: subscriptionItems.items.find((i) => i.price.product == product.workspaceSeatsPrice.stripeId)?.id,
      price: product.workspaceSeatsPrice.stripeId,
      quantity: data.workspaceSeatsSubscribed,
    };
    const publishedSpacesItem = {
      id: subscriptionItems.items.find((i) => i.price.product == product.publishedSpacesPrice.stripeId)?.id,
      price: product.publishedSpacesPrice.stripeId,
      quantity: data.publishedSpacesSubscribed,
    };
    const items = [baseFeeItem, workspaceSeatsItem, publishedSpacesItem];

    // update subscription
    const subscriptionData = {
      items: items,
      proration_behavior: data.prorationBehavior,
    };
    await stripe.subscriptions.update(data.subscriptionId, subscriptionData);
    return "success";
  } catch (e: any) {
    console.error("Failed to update subscription");
    console.error(e);
    return "internal-error";
  }
}

async function cancelStripeSubscriptionDowngrade(subscriptionId: string) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = getStripe();

  try {
    // get existing subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription == undefined) {
      console.error("Failed to find subscription");
      return "internal-error";
    }

    // cancel subscription schedule
    const schedules = await stripe.subscriptionSchedules.list({customer: subscription.customer as string});
    const schedule = schedules.data.find((s) => s.subscription == subscriptionId);
    if (schedule) {
      await stripe.subscriptionSchedules.cancel(schedule.id);
    }
    return "success";
  } catch (e: any) {
    console.error("Failed to cancel subscription downgrade");
    console.error(e);
    return "internal-error";
  }
}

async function invoiceAndPayAutoTopup(customerId: string, quantity: number, priceId: string, autoTopupId: string) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "stripe-key-not-found";
  const stripe = getStripe();

  try {
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: false,
      metadata: {
        autoTopupId: autoTopupId,
      },
    });

    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      price: priceId,
      quantity: quantity,
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    if (finalizedInvoice.status !== "open") {
      console.error("Failed to finalize invoice");
      return "failed-to-pay-invoice";
    }

    const paidInvoice = await stripe.invoices.pay(invoice.id);
    if (paidInvoice.status !== "paid") {
      console.error("Failed to pay invoice");
      return "failed-to-pay-invoice";
    }

    return paidInvoice;
  } catch (e: any) {
    console.error("Failed to invoice and pay auto topup");
    console.error(e);
    return "failed-to-pay-invoice";
  }
}

async function stripeCustomerAndOrganizationId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<{customer?: Stripe.Customer, organizationId?: string}> {
  if (customer == undefined || customer == null) return {};

  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {};
  const stripe = getStripe();

  let _customer: Stripe.Customer | Stripe.DeletedCustomer;
  if (typeof customer === "string") {
    _customer = await stripe.customers.retrieve(customer);
  } else {
    _customer = customer;
  }

  if (_customer.deleted) return {};

  const organizationId = _customer.metadata?.organizationId;
  return {customer: _customer as Stripe.Customer, organizationId: organizationId};
}

async function getTestClock(testClock: string | Stripe.TestHelpers.TestClock | null | undefined) {
  if (testClock == undefined || testClock == null) return undefined;

  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) {
    console.error("Error: stripe-key-not-found");
    return undefined;
  }
  const stripe = getStripe();
  if (typeof testClock === "string") {
    return await stripe.testHelpers.testClocks.retrieve(testClock);
  }
  return testClock;
}

async function pendingSubscriptionFromSchedule(customer: {customer: Stripe.Customer | undefined, organizationId: string | undefined}, schedule: Stripe.SubscriptionSchedule): Promise<BillingSubscriptionPendingSubscription | undefined> {
  if (!schedule.phases || schedule.phases.length < 2) {
    console.error("Schedule has no phases or only one phase");
    return undefined;
  }

  const nextPhase = schedule.phases[1];

  if (!nextPhase.items || nextPhase.items.length === 0) {
    console.error("Next phase has no items");
    return undefined;
  }

  const stripe = getStripe();
  if (typeof stripe !== "string") {
    console.error("Stripe key not found");
    return undefined;
  }

  const prices = await Promise.all(nextPhase.items.map(async (item) => {
    if (!item.price) {
      console.error("Item has no price");
      return undefined;
    }
    try {
      return await stripe.prices.retrieve(typeof item.price === "string" ? item.price : item.price.id);
    } catch (e) {
      console.error("Failed to retrieve price:", e);
      return undefined;
    }
  }));

  if (prices.some(p => p === undefined)) {
    console.error("Failed to retrieve all prices");
    return undefined;
  }

  const validPrices = prices.filter((p): p is Stripe.Response<Stripe.Price> => p !== undefined && "lastResponse" in p);
  const productsResponse = await Promise.all(validPrices.map(async (price) => {
    if (!price.product) {
      console.error("Price has no product");
      return undefined;
    }
    try {
      return await stripe.products.retrieve(typeof price.product === "string" ? price.product : price.product.id);
    } catch (e) {
      console.error("Failed to retrieve product:", e);
      return undefined;
    }
  }));

  if (productsResponse.some(p => p === undefined)) {
    console.error("Failed to retrieve all products");
    return undefined;
  }

  const validProducts = productsResponse.filter((p): p is Stripe.Response<Stripe.Product> => p !== undefined && "lastResponse" in p);

  const productsAndPrices = {
    stripeProducts: validProducts,
    stripePrices: validPrices,
  };

  const tiers = stripeProductsToTiers(productsAndPrices);
  if (typeof tiers === "string") {
    console.error("Failed to convert products to tiers:", tiers);
    return undefined;
  }

  const extras = stripeProductsToExtras(productsAndPrices);
  if (typeof extras === "string") {
    console.error("Failed to convert products to extras:", extras);
    return undefined;
  }

  const productsAvailable = {
    tiers,
    extras: extras,
    timestamp: admin.firestore.Timestamp.now(),
  };
  console.debug({productsAvailable});
  await getBillingProductsAvailableRef().set(productsAvailable);
  const subscriptionItems = {
    items: nextPhase.items.map(item => ({
      id: item.price?.toString() ?? "",
      price: item.price,
      quantity: item.quantity,
    })) as Stripe.SubscriptionItem[],
  };

  const billingSubscription = await buildBillingSubscription(
    {
      id: schedule.id,
      customer: customer.customer?.id ?? "",
      items: subscriptionItems.items,
      cancel_at: nextPhase.end_date ? new Date(nextPhase.end_date * 1000) : undefined,
      current_period_end: nextPhase.end_date ? new Date(nextPhase.end_date * 1000) : undefined,
      status: "active",
      default_payment_method: null,
      latest_invoice: null,
      pending_update: null,
      schedule: schedule.id,
      collection_method: "charge_automatically",
      billing_cycle_anchor: nextPhase.start_date,
      current_period_start: nextPhase.start_date,
    } as unknown as Stripe.Subscription,
    subscriptionItems,
  );

  if (billingSubscription === undefined) {
    return undefined;
  }

  return {
    subscription: billingSubscription,
    effectiveDate: nextPhase.end_date ? new Date(nextPhase.end_date * 1000) : undefined,
  };
}

export async function ensureCustomerDefaultPaymentMethod(customerId: string, paymentMethodId?: string) {
  const stripe = getStripe();
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer || customer.deleted) {
      throw new Error(`Customer ${customerId} not found or deleted`);
    }
    
    if (paymentMethodId) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          "default_payment_method": paymentMethodId,
        },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Error ensuring customer default payment method:", error);
    return { error: error.message };
  }
}

async function intervalToBillingPeriod(interval: Stripe.Price.Recurring.Interval) : BillingPeriod | undefined {
  switch (interval) {
    case "year": return "yearly";
    case "month": return "monthly";
    default: {
      console.error(`Failed to convert stripe interval '${interval}' to billing period`);
      return undefined;
    }
  }
}

async function stripeProductsToTiers(latestProductsAndPrices: {stripeProducts: Stripe.Product[], stripePrices: Stripe.Price[]}): Promise<BillingProductTiers | string> {
  try {
    const tiers: BillingProductTiers = {};
    const {stripeProducts, stripePrices} = latestProductsAndPrices;

    for (const product of stripeProducts) {
      if (product.metadata.productType !== "subscription") continue;

      const tier = product.metadata.tier;
      if (tier == undefined) {
        console.error("Product missing tier:", product.id);
        continue;
      }

      const baseFeePrice = stripePrices.find((p) => p.product === product.id && p.metadata.priceType === "base-fee");
      if (baseFeePrice == undefined) {
        console.error("Product missing base fee price:", product.id);
        continue;
      }

      const workspaceSeatsPrice = stripePrices.find((p) => p.product === product.id && p.metadata.priceType === "workspace-seats");
      if (workspaceSeatsPrice == undefined) {
        console.error("Product missing workspace seats price:", product.id);
        continue;
      }

      const publishedSpacesPrice = stripePrices.find((p) => p.product === product.id && p.metadata.priceType === "published-spaces");
      if (publishedSpacesPrice == undefined) {
        console.error("Product missing published spaces price:", product.id);
        continue;
      }

      const period = intervalToBillingPeriod(baseFeePrice.recurring?.interval as Stripe.Price.Recurring.Interval);
      if (period == undefined) {
        console.error("Product has invalid period:", product.id);
        continue;
      }

      tiers[product.id] = {
        tier: tier as BillingTier,
        period: period,
        baseFeePrice: {
          stripeId: baseFeePrice.id,
          amount: baseFeePrice.unit_amount ?? 0,
        },
        workspaceSeatsPrice: {
          stripeId: workspaceSeatsPrice.id,
          amount: workspaceSeatsPrice.unit_amount ?? 0,
          included: tryStringToNumber(workspaceSeatsPrice.metadata.included) ?? 0,
        },
        publishedSpacesPrice: {
          stripeId: publishedSpacesPrice.id,
          amount: publishedSpacesPrice.unit_amount ?? 0,
          included: tryStringToNumber(publishedSpacesPrice.metadata.included) ?? 0,
        },
      };
    }

    return tiers;
  } catch (e: any) {
    console.error("Failed to convert stripe products to tiers");
    console.error(e);
    return "internal-error";
  }
}

async function stripeProductsToExtras(latestProductsAndPrices: {stripeProducts: Stripe.Product[], stripePrices: Stripe.Price[]}): Promise<BillingProductExtras | string> {
  try {
    const extras: BillingProductExtras = {};
    const {stripeProducts, stripePrices} = latestProductsAndPrices;

    for (const product of stripeProducts) {
      if (product.metadata.productType !== "extra") continue;

      const price = stripePrices.find((p) => p.product === product.id);
      if (price == undefined) {
        console.error("Product missing price:", product.id);
        continue;
      }

      extras[product.id] = {
        name: product.name,
        description: product.description ?? "",
        price: {
          stripeId: price.id,
          amount: price.unit_amount ?? 0,
        },
      };
    }

    return extras;
  } catch (e: any) {
    console.error("Failed to convert stripe products to extras");
    console.error(e);
    return "internal-error";
  }
}

async function syncLatestStripeProductsToFirestore() {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = getStripe();

  try {
    // get latest products
    const latestProductsAndPrices = await getLatestActiveProducts();
    if (latestProductsAndPrices == "internal-error") {
      console.error("Failed to get latest active products");
      return "internal-error";
    }

    // get latest extras
    const latestExtrasAndPrices = await getLatestActiveExtras();
    if (latestExtrasAndPrices == "internal-error") {
      console.error("Failed to get latest active extras");
      return "internal-error";
    }

    // convert products to tiers
    const tiers = await stripeProductsToTiers(latestProductsAndPrices);
    if (typeof tiers === "string") {
      console.error("Failed to convert stripe products to tiers");
      return "internal-error";
    }

    // convert products to extras
    const extras = await stripeProductsToExtras(latestExtrasAndPrices);
    if (typeof extras === "string") {
      console.error("Failed to convert stripe products to extras");
      return "internal-error";
    }

    // write to firestore
    const billingProductsAvailableRef = await getBillingProductsAvailableRef();
    await billingProductsAvailableRef.set({
      tiers: tiers,
      extras: extras,
    });

    return "success";
  } catch (e: any) {
    console.error("Failed to sync latest stripe products to firestore");
    console.error(e);
    return "internal-error";
  }
}

export async function emailStripeInvoice(invoiceId: string): Promise<{error?: string; success?: boolean}> {
  const stripeKey = getStripeSecretKey();
  if (typeof stripeKey !== "string") return {error: "stripe-key-not-found"};
  const stripe = getStripe();

  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    if (!invoice) {
      return {error: "invoice-not-found"};
    }

    if (!invoice.hosted_invoice_url) {
      return {error: "invoice-url-not-found"};
    }

    return {success: true};
  } catch (error) {
    console.error("Error emailing Stripe invoice:", error);
    return {error: "internal-error"};
  }
}

async function buildBillingSubscription(
  stripeSubscription: Stripe.Subscription,
  subscriptionItems: {items: Stripe.SubscriptionItem[]}
): Promise<BillingSubscription | undefined> {
  try {
    const { items } = subscriptionItems;
    const customerId = typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : stripeSubscription.customer.id;

    const subscription: BillingSubscription = {
      stripeProductId: stripeSubscription.items.data[0]?.price?.product as string,
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeSubscription: {
        id: stripeSubscription.id,
        currentPeriodStart: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        cancelAt: stripeSubscription.cancel_at ? admin.firestore.Timestamp.fromMillis(stripeSubscription.cancel_at * 1000) : undefined,
        status: stripeSubscription.status as BillingSubscriptionSubscription["status"],
        defaultPaymentMethod: stripeSubscription.default_payment_method as string | undefined,
        latestInvoiceId: stripeSubscription.latest_invoice as string | undefined,
        pendingUpdate: stripeSubscription.pending_update as Stripe.SubscriptionPendingUpdate | undefined,
        schedule: stripeSubscription.schedule as string | undefined,
        collectionMethod: stripeSubscription.collection_method as Stripe.SubscriptionCollectionMethod,
        billingCycleAnchor: stripeSubscription.billing_cycle_anchor as number | undefined,
        currentPeriodStart: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_start * 1000),
      }
    };

    return subscription;
  } catch (e) {
    console.error("Error building subscription", e);
    return undefined;
  }
}

async function calculateCreditsIncrement(stripeSubscription: Stripe.Subscription): Promise<{
  invoiceId: string;
  streamingCreditsToIncrement: number;
  timestamp: admin.firestore.Timestamp;
} | undefined> {
  try {
    const latestInvoice = await stripeSubscription.latest_invoice;
    if (!latestInvoice || typeof latestInvoice === "string") {
      return undefined;
    }

    return {
      invoiceId: latestInvoice.id,
      streamingCreditsToIncrement: 0,
      timestamp: admin.firestore.Timestamp.fromMillis(latestInvoice.created * 1000),
    };
  } catch (error) {
    console.error("Failed to calculate credits increment:", error);
    return undefined;
  }
}

async function writeOrganizationBillingStateChanges(stateToChange: {
  eventId: string;
  organizationId: string;
  billingSubscription?: BillingSubscription;
  usageUpdate?: BillingUsage;
  creditsIncrement?: {
    invoiceId: string;
    streamingCreditsToIncrement: number;
    timestamp: admin.firestore.Timestamp;
  };
}): Promise<{success: boolean}> {
  try {
    if (stateToChange.organizationId == undefined) {
      console.error(`Error processing subscription write ${stateToChange.eventId}: No organizationId`);
      return { success: false };
    }

    const { billingSubscription, usageUpdate, creditsIncrement } = stateToChange;

    // Update usage if provided
    if (usageUpdate) {
      await getBillingUsageRef(stateToChange.organizationId).set(usageUpdate, {merge: true});
    }

    // Update billing subscription
    if (billingSubscription === undefined) {
      await getBillingSubscriptionRef(stateToChange.organizationId).delete();
    } else {
      await getBillingSubscriptionRef(stateToChange.organizationId).set(billingSubscription);
    }

    // Handle credits increment if provided
    if (creditsIncrement) {
      const streamingCreditsPurchase: StreamingCreditsPurchase = {
        quantity: creditsIncrement.streamingCreditsToIncrement,
        reason: "plan-change",
        timestamp: creditsIncrement.timestamp,
      };
      await getBillingStreamingCreditsPurchasesRef(stateToChange.organizationId)
        .doc(creditsIncrement.invoiceId)
        .create(streamingCreditsPurchase);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to write organization billing state changes:", error);
    return { success: false };
  }
}

interface OrganizationBillingStateChange {
  eventId: string;
  organizationId: string;
  billingSubscription?: BillingSubscription;
  usageUpdate?: BillingUsage;
  creditsIncrement?: {
    invoiceId: string;
    streamingCreditsToIncrement: number;
    timestamp: admin.firestore.Timestamp;
  };
}

const _projectId = getFirebaseProjectId();

async function pendingSubscriptionFromSchedule(customer: Stripe.Customer, schedule: Stripe.SubscriptionSchedule): Promise<BillingSubscriptionPendingSubscription> {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return undefined;
  const stripe = getStripe();

  try {
    // get billing products
    const [, billingProductsAvailable] = await getBillingProductsAvailable();
    if (billingProductsAvailable == undefined) {
      console.error("Failed to find billing products");
      return undefined;
    }

    // get subscription
    const subscription = await stripe.subscriptions.retrieve(schedule.subscription as string);
    if (subscription == undefined) {
      console.error("Failed to find subscription");
      return undefined;
    }

    // get subscription items
    const subscriptionItems = await getSubscriptionItems(subscription.id);
    if (subscriptionItems == "internal-error") {
      console.error("Failed to find subscription items");
      return undefined;
    }

    // get product id
    const productId = Object.entries(billingProductsAvailable.tiers).find(([, v]) => v.baseFeePrice.stripeId == subscription.items.data[0].price.product)?.[0];
    if (productId == undefined) {
      console.error("Failed to find product id");
      return undefined;
    }

    // get product
    const product = billingProductsAvailable.tiers[productId];
    if (product == undefined) {
      console.error("Failed to find product");
      return undefined;
    }

    // get workspace seats quantity
    const workspaceSeatsQuantity = subscriptionItems.items.find((i) => i.price.product == product.workspaceSeatsPrice.stripeId)?.quantity ?? 0;

    // get published spaces quantity
    const publishedSpacesQuantity = subscriptionItems.items.find((i) => i.price.product == product.publishedSpacesPrice.stripeId)?.quantity ?? 0;

    return {
      productId: productId,
      workspaceSeatsSubscribed: workspaceSeatsQuantity,
      publishedSpacesSubscribed: publishedSpacesQuantity,
      scheduleId: schedule.id,
      timestamp: admin.firestore.Timestamp.fromMillis(schedule.phases[0].end * 1000),
    };
  } catch (e: any) {
    console.error("Failed to get pending subscription from schedule");
    console.error(e);
    return undefined;
  }
}

async function organizationBillingStateFromLatestSubscriptionInvoices(params: {
  eventId: string,
  customerId: string,
  subscriptionId: string,
  paymentMethodId?: string,
}): Promise<OrganizationBillingStateChange | string> {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = getStripe();

  try {
    // get customer
    const {customer, organizationId} = await stripeCustomerAndOrganizationId(params.customerId);
    if (customer == undefined || organizationId == undefined) {
      console.error("Failed to find customer or organization id");
      return "internal-error";
    }

    // get subscription
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
    if (subscription == undefined) {
      console.error("Failed to find subscription");
      return "internal-error";
    }

    // get subscription items
    const subscriptionItems = await getSubscriptionItems(params.subscriptionId);
    if (subscriptionItems == "internal-error") {
      console.error("Failed to find subscription items");
      return "internal-error";
    }

    // get billing products
    const [, billingProductsAvailable] = await getBillingProductsAvailable();
    if (billingProductsAvailable == undefined) {
      console.error("Failed to find billing products");
      return "internal-error";
    }

    // get product id
    const productId = Object.entries(billingProductsAvailable.tiers).find(([, v]) => v.baseFeePrice.stripeId == subscription.items.data[0].price.product)?.[0];
    if (productId == undefined) {
      console.error("Failed to find product id");
      return "internal-error";
    }

    // get product
    const product = billingProductsAvailable.tiers[productId];
    if (product == undefined) {
      console.error("Failed to find product");
      return "internal-error";
    }

    // get workspace seats quantity
    const workspaceSeatsQuantity = subscriptionItems.items.find((i) => i.price.product == product.workspaceSeatsPrice.stripeId)?.quantity ?? 0;

    // get published spaces quantity
    const publishedSpacesQuantity = subscriptionItems.items.find((i) => i.price.product == product.publishedSpacesPrice.stripeId)?.quantity ?? 0;

    // get pending subscription
    const schedules = await stripe.subscriptionSchedules.list({customer: customer.id});
    const schedule = schedules.data.find((s) => s.subscription == params.subscriptionId);
    const pendingSubscription = schedule ? await pendingSubscriptionFromSchedule(customer, schedule) : undefined;

    // get usage
    const usageUpdate = {
      workspaceSeatsSubscribed: workspaceSeatsQuantity,
      publishedSpacesSubscribed: publishedSpacesQuantity,
    };

    // get billing subscription
    const billingSubscription = {
      stripeSubscription: {
        subscriptionId: subscription.id,
        productId: productId,
        workspaceSeatsSubscribed: workspaceSeatsQuantity,
        publishedSpacesSubscribed: publishedSpacesQuantity,
        status: subscription.status,
        currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      },
      pendingSubscription: pendingSubscription,
    };

    return {
      eventId: params.eventId,
      organizationId: organizationId,
      usageUpdate: usageUpdate,
      billingSubscription: billingSubscription,
    };
  } catch (e: any) {
    console.error("Failed to get organization billing state from latest subscription invoices");
    console.error(e);
    return "internal-error";
  }
}

function intervalToBillingPeriod(interval: Stripe.Price.Recurring.Interval): BillingPeriod | undefined {
  switch (interval) {
    case "month":
      return BILLING_PERIOD.MONTHLY;
    case "year":
      return BILLING_PERIOD.YEARLY;
    default:
      return undefined;
  }
}

async function stripeCustomerAndOrganizationId(customerId: string): Promise<{customer?: Stripe.Customer, organizationId?: string}> {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {};
  const stripe = getStripe();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return {};

    const organizationId = customer.metadata?.organizationId;
    return {customer: customer as Stripe.Customer, organizationId: organizationId};
  } catch (e: any) {
    console.error("Failed to find customer or organization id");
    console.error(e);
    return {};
  }
}

export {
  generateStripeCheckoutUrl,
  generateStripeCustomerPortalUrl,
  emailStripeInvoice,
  updateStripeSubscription,
  cancelStripeSubscriptionDowngrade,
  invoiceAndPayAutoTopup,
  buildBillingSubscription,
  calculateCreditsIncrement,
  writeOrganizationBillingStateChanges,
  stripeCustomerAndOrganizationId,
  syncLatestStripeProductsToFirestore,
  createNewCustomerAndCheckoutSandbox,
  pendingSubscriptionFromSchedule,
  organizationBillingStateFromLatestSubscriptionInvoices,
  getTestClock,
};
