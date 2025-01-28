// import * as functions from "firebase-functions";
import {Stripe} from "stripe";
import {generateUrl} from "../../lib/emailServices/index";
import {NewCustomerData, StripeCheckoutRequest, StripeCustomerPortalRequest, UpdateSubscriptionRequest} from "../httpTypes";
import {getBillingProductsAvailable, getBillingProductsAvailableRef, getBillingStreamingCreditsPurchasesRef, getBillingSubscription, getBillingSubscriptionRef, getBillingUsage, getBillingUsageRef, getOrganization} from "../documents/firestore";
import {dedupList, isProductionFirebaseProject, stringify, tryStringToNumber} from "../misc";
import {BillingFeatures, BillingPeriod, BillingProductBaseFeePrice, BillingProductExtra, BillingProductExtras, BillingProductFeaturePrice, BillingProductsAvailable, BillingProductTier, BillingProductTiers, BillingSubscription, BillingSubscriptionPendingSubscription, BillingTier, BILLING_PERIOD, BILLING_TIER, StreamingCreditsPurchase} from "../docTypes";
import * as admin from "firebase-admin";
import {getEnvUrl, getFirebaseProjectId, getPostmarkKey, getStripeSecretKey} from "../firebase";
import * as postmark from "postmark";

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

export async function createNewCustomerAndCheckoutSandbox(customerData: NewCustomerData, organizationId: string) {
  // Validate product & token
  const projectId = getFirebaseProjectId();
  const isProd = isProductionFirebaseProject(projectId);
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});

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
      name: customerData.name,
      email: customerData.email,
      metadata: {
        organizationId: organizationId,
      },
    });

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

export async function generateStripeCheckoutUrl(data: StripeCheckoutRequest) {
  if (!data.customerId) {
    console.error("Customer id not found. User either does not exist or does not have permission.");
    return "Customer id not found";
  }
  // validate product & token
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "internal-error";
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});

  try {
    // define redirect
    const redirect = await generateUrl(`${data.redirectParams}`);
    // define session data
    const sessionData = {
      mode: data.mode,
      customer: data.customerId,
      line_items: data.items,
      success_url: `${redirect}=success`,
      cancel_url: `${redirect}=cancelled`,
      invoice_creation: data.mode === "payment" ? {enabled: true} : undefined,
      payment_method_collection: data.mode === "subscription" ? "always" : undefined,
      customer_update: {address: "auto"},
    } as Stripe.Checkout.SessionCreateParams;
    if (data.isNewCustomer) sessionData.billing_address_collection = "required";
    else sessionData.automatic_tax = {enabled: true};
    const session = await stripe.checkout.sessions.create(sessionData);
    return session;
  } catch (e: any) {
    console.error("Failed to create checkout url");
    console.error(e);
    return "internal-error";
  }
}

export async function generateStripeCustomerPortalUrl(data: StripeCustomerPortalRequest) {
  if (!data.customerId) {
    console.error("Customer id not found. User either does not exist or does not have permission.");
    return "Customer id not found";
  }
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {error: "stripe-key-not-found"};
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
  try {
    // define redirect
    const redirect = await generateUrl(`${data.redirectParams}`);
    // update stripe subscription
    return await stripe.billingPortal.sessions.create({
      customer: data.customerId,
      return_url: `${redirect}?stripe=success`,
    });
  } catch (e: any) {
    console.error("Failed to create and subscribe new customer");
    console.error(e);
    return "internal-error";
  }
}

export async function getLatestActiveExtras() {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {error: "stripe-key-not-found"};
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
  const stripeProducts = (await stripe.products.search({query: "active:'true' AND metadata['productType']:'extra'"})).data;
  console.debug({stripeProducts});
  const productIds = dedupList(stripeProducts.map((p) => p.id));
  const stripePrices = (await Promise.all(productIds.map(async (productId) => (await stripe.prices.search({expand: ["data.tiers"], query: "active:'true' AND product:'" + productId + "'"})).data))).flat();
  console.debug({stripePrices});
  return {stripeProducts, stripePrices};
}

export async function getLatestActiveProducts() {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {error: "stripe-key-not-found"};
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
  const tierProducts = (await stripe.products.search({query: "active:'true' AND metadata['productType']:'subscription'"})).data;
  const workspaceSeatsProduct = (await stripe.products.search({query: "active:'true' AND metadata['productType']:'workspace-seats'"})).data;
  const publishedSpacesProduct = (await stripe.products.search({query: "active:'true' AND metadata['productType']:'published-spaces'"})).data;
  const stripeProducts = [...tierProducts, ...workspaceSeatsProduct, ...publishedSpacesProduct];
  console.debug({stripeProducts});
  const productIds = dedupList(stripeProducts.map((p) => p.id));
  const stripePrices = (await Promise.all(productIds.map(async (productId) => (await stripe.prices.search({expand: ["data.tiers"], query: "active:'true' AND product:'" + productId + "'"})).data))).flat();
  console.debug({stripePrices});
  return {stripeProducts, stripePrices};
}

export async function getSubscriptionItems(subscriptionId: string) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {error: "stripe-key-not-found"};
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
  const items = await stripe.subscriptionItems.list({subscription: subscriptionId});
  return {items: items.data};
}

export type UpdateSubscriptionType = "upgrade" | "downgrade" | "change";

export function resolveUpdateSubscriptionType(existingTier: BillingTier, newTier: BillingTier) : UpdateSubscriptionType {
  const _newTier = BILLING_TIER.indexOf(newTier);
  const _existingTier = BILLING_TIER.indexOf(existingTier);
  if (_newTier > _existingTier) return "upgrade";
  if (_newTier == _existingTier) return "change";
  return "downgrade";
}

export async function updateStripeSubscription(data: UpdateSubscriptionRequest) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {error: "stripe-key-not-found"};
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
  try {
    if (!data.subscriptionId) {
      throw new Error("No subscription id found");
    }

    // attempt to pay any unpaid invoices
    const [, existingSubscription] = await getBillingSubscription(data.organizationId);
    if (existingSubscription == undefined) {
      throw new Error("Organization subscription not found");
    }
    const unpaidInvoices = (await stripe.invoices.list({
      customer: existingSubscription.stripeCustomerId,
      status: "open",
    }));

    if (unpaidInvoices.data.length < 0) {
      const paymentAttempts = await Promise.allSettled(unpaidInvoices.data.map(async (invoice) => await stripe.invoices.pay(invoice.id)));
      paymentAttempts.forEach((payInvoiceResult) => {
        if (payInvoiceResult.status == "rejected") console.warn(`Failed to pay invoice ${payInvoiceResult.reason}`);
      });
    }
    const remainingUnpaidInvoices = (await stripe.invoices.list({
      customer: existingSubscription.stripeCustomerId,
      status: "open",
    }));
    if (remainingUnpaidInvoices.data.length < 0) {
      console.warn(`Customer has unpaid invoices ${existingSubscription.stripeCustomerId}`);
      throw new Error("Customer does not have a valid card on file or has unpaid invoices.");
    }

    // determine current subscription, new product user is subscribing to, and update type
    const [, billingProductsAvailable] = await getBillingProductsAvailable();
    if (billingProductsAvailable == undefined) {
      throw new Error("Didn't find any available billing products");
    }
    const existingProductSubscription = Object.entries(billingProductsAvailable.tiers).flatMap(([k, v]) => k == existingSubscription.stripeProductId ? {...v} : []).pop();
    if (existingProductSubscription == undefined) {
      console.warn("Didn't find existing subscription product");
      throw new Error("Existing subscription not found");
    }
    const newProductId = data.productId || existingSubscription.pendingSubscription?.stripeProductId || existingSubscription.stripeProductId;
    const newProductSubscription = Object.entries(billingProductsAvailable.tiers).flatMap(([k, v]) => k == newProductId ? {...v} : []).pop();
    if (newProductSubscription == undefined) {
      console.warn("Didn't find new subscription product");
      throw new Error("New product subscription not found");
    }
    const updateType = resolveUpdateSubscriptionType(existingProductSubscription.tier, newProductSubscription.tier);
    const [, existingUsage] = await getBillingUsage(data.organizationId);
    if (existingUsage == undefined) {
      throw new Error("Organization usage not found");
    }

    // retrieve existing subscription
    const customer = (await stripe.customers.retrieve(existingSubscription.stripeCustomerId));
    const subscription = await stripe.subscriptions.retrieve(data.subscriptionId);

    if (subscription.default_payment_method == null && (customer.deleted == true || customer.invoice_settings.default_payment_method == null)) {
      throw new Error("no-default-payment-method");
    }

    // define workspace seats quantity
    const workspaceQuantity = (() => {
      const passedWorkspaceSeatsQuantity = data.workspaceSeatsQuantity;
      const includedWorkspaceSeats = newProductSubscription.workspaceSeatsPrice.included;
      return passedWorkspaceSeatsQuantity != undefined ? passedWorkspaceSeatsQuantity : Math.max(includedWorkspaceSeats, existingUsage.workspaceSeatsSubscribed);
    })();

    // define published spaces quantity
    const publishedSpacesQuantity = (() => {
      const passedPublishedSpacesQuantity = data.publishedSpacesQuantity;
      const includedPublishedSpaced = newProductSubscription.publishedSpacesPrice?.included || 0;
      return passedPublishedSpacesQuantity != undefined ? passedPublishedSpacesQuantity : Math.max(includedPublishedSpaced, existingUsage.publishedSpacesSubscribed);
    })();

    // update subscription schedule
    if (updateType === "downgrade") {
      // DOWNGRADE SUBSCRIPTION
      // define workspace seats quantity
      const newWorkspaceQuantity = (() => {
        const passedWorkspaceSeatsQuantity = data.workspaceSeatsQuantity;
        const includedWorkspaceSeats = newProductSubscription.workspaceSeatsPrice.included;
        return passedWorkspaceSeatsQuantity != undefined ? passedWorkspaceSeatsQuantity : Math.min(includedWorkspaceSeats, existingUsage.workspaceSeatsSubscribed);
      })();

      // define published spaces quantity
      const newPublishedSpacesQuantity = (() => {
        if (newProductSubscription.publishedSpacesPrice == undefined) return 0;
        const passedPublishedSpacesQuantity = data.publishedSpacesQuantity;
        const includedPublishedSpaced = newProductSubscription.publishedSpacesPrice.included;
        return passedPublishedSpacesQuantity != undefined ? passedPublishedSpacesQuantity : Math.min(includedPublishedSpaced, existingUsage.publishedSpacesSubscribed);
      })();

      // define existing published spaces subscription item
      const existingPublishedSpacesItem = (() => {
        if (existingProductSubscription.publishedSpacesPrice == undefined) return undefined;
        return {price: existingProductSubscription.publishedSpacesPrice?.stripeId, quantity: publishedSpacesQuantity};
      })();

      // define new published spaces subscription item
      const newPublishedSpacesItem = (() => {
        if (newProductSubscription.publishedSpacesPrice == undefined) return undefined;
        return {price: newProductSubscription.publishedSpacesPrice?.stripeId, quantity: newPublishedSpacesQuantity};
      })();

      // define existing subscription items
      const existingSubscriptionItems = [
        {price: existingProductSubscription.baseFeePrice.stripeId},
        {price: existingProductSubscription.workspaceSeatsPrice.stripeId, quantity: workspaceQuantity},
        existingPublishedSpacesItem,
      ].flatMap((i) => i == undefined ? [] : [i]);

      // define new subscription items
      const newSubscriptionItems = [
        {price: newProductSubscription.baseFeePrice.stripeId},
        {price: newProductSubscription.workspaceSeatsPrice.stripeId, quantity: newWorkspaceQuantity},
        newPublishedSpacesItem,
      ].flatMap((i) => i == undefined ? [] : [i]);

      // create/retrieve subscription schedule
      const schedule = subscription.schedule && typeof subscription.schedule === "string" ?
        await stripe.subscriptionSchedules.retrieve(subscription.schedule) :
        await stripe.subscriptionSchedules.create({from_subscription: data.subscriptionId});
      // eslint-disable-next-line camelcase
      const currentPhaseStartDate = schedule.current_phase?.start_date;

      // update subscription schedule - existing subscription ends after one iteration
      return await stripe.subscriptionSchedules.update(
        schedule.id,
        {
          phases: [
            {items: existingSubscriptionItems, start_date: currentPhaseStartDate, iterations: 1},
            {items: newSubscriptionItems},
          ],
          proration_behavior: "none",
        },
      );
    } else {
      // UPGRADE/CHANGE SUBSCRIPTION
      // find and update existing subscription items (base fee)
      const newBaseFeeSubscriptionItem = (() => {
        const existingItem = subscription.items.data.find((i) => i.price.metadata.priceType == "base-fee");
        const newItem : Stripe.SubscriptionUpdateParams.Item = {id: (existingItem == undefined) ? undefined : existingItem.id, price: newProductSubscription.baseFeePrice.stripeId, quantity: 1};
        return newItem;
      })();

      // find and update existing subscription items (workspace seats)
      const newWorkspaceSeatsSubscriptionItem = (() => {
        const existingItem = subscription.items.data.find((i) => i.price.metadata.priceType == "workspace-seats");
        const newItem : Stripe.SubscriptionUpdateParams.Item = {id: (existingItem == undefined) ? undefined : existingItem.id, price: newProductSubscription.workspaceSeatsPrice.stripeId, quantity: workspaceQuantity};
        return newItem;
      })();

      // find and update existing subscription items (published spaces)
      const newPublishedSpacesSubscriptionItem = (() => {
        const existingItem = subscription.items.data.find((i) => i.price.metadata.priceType == "published-spaces");
        if (existingItem == undefined && newProductSubscription.publishedSpacesPrice == undefined) return undefined;
        const newItem : Stripe.SubscriptionUpdateParams.Item = {id: (existingItem == undefined) ? undefined : existingItem.id, price: newProductSubscription.publishedSpacesPrice?.stripeId, quantity: publishedSpacesQuantity};
        return newItem;
      })();

      // define updated subscription items
      const updatedSubscriptionItems = [
        newBaseFeeSubscriptionItem,
        newWorkspaceSeatsSubscriptionItem,
        newPublishedSpacesSubscriptionItem,
      ].flatMap((i) => i == undefined ? [] : [i]);

      console.debug({updatedSubscriptionItems});

      // update subscription
      return await stripe.subscriptions.update(
        subscription.id,
        {
          items: updatedSubscriptionItems,
          payment_behavior: "error_if_incomplete",
          proration_behavior: "always_invoice",
          automatic_tax: {enabled: true},
        },
      );
    }
  } catch (e: any) {
    console.error("Failed to create subscription schedule");
    console.error(e);
    throw e;
  }
}

export async function cancelStripeSubscriptionDowngrade(subscriptionId) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {error: "stripe-key-not-found"};
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
  try {
    // retrieve existing subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const schedule = subscription.schedule;
    if (schedule != undefined && typeof schedule === "string") {
      await stripe.subscriptionSchedules.release(schedule);
    }
  } catch (e: any) {
    console.error("Failed to cancel subscription downgrade");
    console.error(e);
    throw e;
  }
}

export async function invoiceAndPayAutoTopup(customerId: string, quantity: number, priceId: string, autoTopupId: string) {
  try {
    const stripeKey = getStripeSecretKey();
    if (stripeKey == undefined) return "stripe-key-not-found";
    const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: false,
      metadata: {
        autoTopupId,
      },
    });
    await stripe.invoiceItems.create({
      invoice: invoice.id,
      customer: customerId,
      price: priceId,
      quantity,
    });
    await stripe.invoices.pay(invoice.id);
    return invoice;
  } catch (e: any) {
    console.error(e);
    console.error(`Failed to pay customer invoice for auto topup: ${autoTopupId}`);
    return "failed-to-pay-invoice";
  }
}

export async function stripeCustomerAndOrganzationId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) : Promise<{customer?: Stripe.Customer, organizationId?: string}> {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) {
    console.error("Error failed to retreieve stripe key");
    return {};
  }
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
  if (customer == null || customer == undefined) return {};
  const _customer = await (async () => {
    if (typeof(customer) == "object") return customer;
    return await stripe.customers.retrieve(customer);
  })();
  if (_customer.deleted) {
    console.warn(`Customer ${_customer.id} is deleted`);
    return {};
  }
  const organizationId = _customer.metadata.organizationId as string | undefined;
  return {customer: _customer, organizationId};
}

export async function getTestClock(testClock: string | Stripe.TestHelpers.TestClock | null | undefined) {
  if (testClock == undefined || testClock == null) return undefined;
  if (typeof(testClock) == "object") return testClock;
  if (typeof(testClock) == "string") {
    const stripeKey = getStripeSecretKey();
    if (stripeKey == undefined) {
      console.error("Error: stripe-key-not-found");
      return undefined;
    }
    const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
    return await stripe.testHelpers.testClocks.retrieve(testClock);
  }
}

export async function pendingSubscriptionFromSchedule(customer: Stripe.Customer, schedule: Stripe.SubscriptionSchedule) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) {
    console.error("Error: stripe-key-not-found");
    return undefined;
  }
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});
  const testClock = await getTestClock(customer.test_clock);
  const nowOrTestClockNowMillis = (() => {
    if (testClock == undefined) return Date.now();
    return testClock.frozen_time * 1000;
  })();

  const pendingPhase = schedule.phases.find((phase) => phase.start_date * 1000 > nowOrTestClockNowMillis);
  if (pendingPhase == undefined) return undefined;

  console.debug({nowOrTestClockNowMillis, pendingPhase});

  console.debug(`Constructing pendingSubscription for subscription schedule: ${schedule.id}`);
  const pendingPhasePrices = (await Promise.all(pendingPhase.items.flatMap(async (item) => {
    if (typeof(item.price) == "string") return [{quantity: item.quantity, price: await stripe.prices.retrieve(item.price)}];
    if (item.price.deleted) return [];
    return [{quantity: item.quantity, price: item.price}];
  }))).flat();

  const stripeProductId = (() => {
    return pendingPhasePrices
      .flatMap((price) => (price.price.product != null && price.price.metadata.priceType == "base-fee" && typeof(price.price.product) == "string") ? [price.price.product] : [])
      .pop();
  })();

  const workspaceSeatsQuantity = (() => {
    return pendingPhasePrices
      .flatMap((price) => (price.price.product != null && price.price.metadata.priceType == "workspace-seats") ? [price.quantity] : [])
      .pop();
  })();

  if (workspaceSeatsQuantity == undefined) {
    console.error(`Failed to find workspace seats quantity in subscription schedule items: ${schedule.id}`);
    return undefined;
  }

  const publishedSpacesQuantity = (() => {
    return pendingPhasePrices
      .flatMap((price) => (price.price.product != null && price.price.metadata.priceType == "published-spaces") ? [price.quantity] : [])
      .pop();
  })();

  if (stripeProductId == undefined || workspaceSeatsQuantity == undefined) {
    console.error("pendingSubscription: stripeProductId or workspaceSeatsQuantity is undefined");
    return undefined;
  }

  const pendingSubscription : BillingSubscriptionPendingSubscription = {
    stripeProductId,
    publishedSpacesQuantity,
    workspaceSeatsQuantity,
    reason: "scheduled",
  };
  return pendingSubscription;
}

interface UsageUpdate {
  workspaceSeatsSubscribed: number
  publishedSpacesSubscribed: number
}

interface InvoiceStreamingCreditsIncrement {
  streamingCreditsToIncrement: number
  invoiceId: string
  timestamp: admin.firestore.Timestamp
}

type OrganizationBillingStateChange = {
  eventId: string,
  organizationId?: string;
  usageUpdate?: UsageUpdate;
  billingSubscription?: BillingSubscription;
  creditsIncrement?: InvoiceStreamingCreditsIncrement;
}

export async function organizationBillingStateFromLatestSubscriptionInvoices(params: {
  // NOTE: This function must idempotently update stripe and any firestore documents
  eventId: string,
  customerId: string,
  subscriptionId: string,
  paymentMethodId?: string,
}) : Promise<OrganizationBillingStateChange | string> {
  console.debug({organizationBillingStateFromLatestSubscriptionInvoices: params});

  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return "stripe-key-not-found";
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});

  const [, productsAvailable] = await getBillingProductsAvailable();
  if (productsAvailable == undefined) {
    console.error("Failed to get products available");
    return "customer-not-found";
  }

  const customer = await stripe.customers.retrieve(params.customerId);
  if (customer == undefined || customer.deleted) {
    console.error("Customer does not exist, or was deleted");
    return "customer-not-found";
  }
  const organizationId: string | undefined = customer.metadata.organizationId;
  if (organizationId == undefined) {
    console.error("Updated subscription is missing metadata.organizationId field");
    return "customer-no-organizationid";
  }

  // retrieve current subscription state from stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(params.subscriptionId, {expand: ["schedule"]} );
  if (typeof(stripeSubscription) == "string") {
    console.error(`Stripe subscription ${params.subscriptionId} is a string. It should be an object`);
    return "invalid-subscription-object";
  }

  if (stripeSubscription.status == "canceled") {
    console.debug(`Subscription ${stripeSubscription.id} canceled for organization ${organizationId}`);
    return {eventId: params.eventId, organizationId};
  }

  // get base fee data
  const subscriptionBaseFeePrice = stripeSubscription.items.data.find((line) => line.price?.metadata?.priceType === "base-fee");
  if (subscriptionBaseFeePrice == undefined || subscriptionBaseFeePrice.price == undefined || subscriptionBaseFeePrice.price == null) {
    console.error(`Failed to find base-fee price/product for ${params.subscriptionId} in subscription ${stripeSubscription.id}`);
    return "subscription-missing-base-fee";
  }

  // get workspace seats data
  const subscriptionWorkspaceSeatsPrice = stripeSubscription.items.data.find((item) => item.price?.metadata?.priceType === "workspace-seats");
  const workspaceSeatsSubscribed = (() => {
    const fromItems = subscriptionWorkspaceSeatsPrice?.quantity;
    if (fromItems == undefined) return undefined;
    return fromItems;
  })();
  if (workspaceSeatsSubscribed == undefined) {
    console.error("Failed to resolve workspaceSeatsSubscribed from subscription");
    return "subscription-object-missing-workspace-seats";
  }

  // get published spaces data
  const subscriptionPublishedSpacesPrice = stripeSubscription.items.data.find((item) => item.price?.metadata?.priceType === "published-spaces");
  const publishedSpacesSubscribed = (() => {
    const fromItems = subscriptionPublishedSpacesPrice?.quantity;
    return fromItems || 0;
  })();

  const subscriptionProductId = (() => {
    const product = subscriptionBaseFeePrice.price.product;
    if (product == null) return undefined;
    if (typeof(product) == "string") return product;
    return product.id;
  })();
  if (subscriptionProductId == undefined) {
    console.warn(`Failed to find subscription productId - ${params.subscriptionId}`);
    return "subscription-no-product-id";
  }

  const subscriptionLatestInvoiceId = (() => {
    const latestInvoice = stripeSubscription.latest_invoice;
    if (latestInvoice == null) return undefined;
    if (typeof(latestInvoice) == "string") return latestInvoice;
    return latestInvoice.id;
  })();

  if (subscriptionLatestInvoiceId == undefined) {
    console.error(`Stripe subscription ${params.subscriptionId} has no latest invoice`);
    return "subscription-no-latest-invoice";
  }
  // Get paid invoices from the last year
  const oneYearAgoSeconds = Math.round((Date.now() / 1000) - (60 * 60 * 24 * 365));
  const paidSubscriptionInvoices =
   (await stripe.invoices.list({
     subscription: stripeSubscription.id,
     status: "paid",
     limit: 100,
     created: {
       gte: oneYearAgoSeconds,
     },
   })).data
     .sort((a, b) => b.created - a.created);

  // Get latest and previous invoice that included a base fee charge
  const paidBaseFeeInvoices = paidSubscriptionInvoices.filter((invoice) => invoice.lines.data.find((line) => line.price?.metadata?.priceType === "base-fee" && line.amount >= 0));
  const latestPaidBaseFeeInvoice = paidBaseFeeInvoices.length >= 1 ? paidBaseFeeInvoices[0] : undefined;
  const previousPaidBaseFeeInvoice = paidBaseFeeInvoices.length >= 2 ? paidBaseFeeInvoices[1] : undefined;
  if (latestPaidBaseFeeInvoice == undefined) {
    console.error(`Failed to find latest paid invoice for subscription: ${params.subscriptionId}`);
    return "subscription-no-latest-paid-invoice";
  }
  console.debug({stripeSubscription, latestPaidBaseFeeInvoice, previousPaidBaseFeeInvoice});

  // Determine current and previous product id and subscription tier
  const latestBaseFeeLineItem = latestPaidBaseFeeInvoice.lines.data.find((line) => line.price?.metadata?.priceType === "base-fee" && line.amount >= 0);
  if (latestBaseFeeLineItem == undefined) {
    console.warn(`Failed to find latest invoice line item for base fee - ${params.subscriptionId}`);
    return "latest-paid-invoice-no-base-fee";
  }
  const latestProductId = (() => {
    if (latestBaseFeeLineItem == undefined) return undefined;
    if (latestBaseFeeLineItem.price == undefined) return undefined;
    const product = latestBaseFeeLineItem.price.product;
    if (typeof(product) == "string") return product;
    if (typeof(product) == "object") return product.id;
  })();
  if (latestProductId == undefined) {
    console.warn(`Failed to find latest productId from latest paid invoice - ${params.subscriptionId}`);
    return "latest-paid-invoice-no-product-id";
  }
  const previousBaseFeeLineItem = previousPaidBaseFeeInvoice?.lines.data.find((line) => line.price?.metadata?.priceType === "base-fee" && line.amount >= 0);
  const previousProductId = (() => {
    if (previousBaseFeeLineItem == undefined) return undefined;
    if (previousBaseFeeLineItem.price == undefined) return undefined;
    const product = previousBaseFeeLineItem.price.product;
    if (typeof(product) == "string") return product;
    if (typeof(product) == "object") return product.id;
  })();

  const latestSubscriptionTier = productsAvailable.tiers[latestProductId];
  const previousSubscriptionTier = (previousProductId == undefined) ? undefined : productsAvailable.tiers[previousProductId];

  // Determine plan change
  const planChangeType = (() => {
    if (previousPaidBaseFeeInvoice == undefined || previousSubscriptionTier == undefined) {
      return "new-subscription";
    } else {
      if (previousPaidBaseFeeInvoice.period_end < stripeSubscription.current_period_start) return "new-period";
      if (latestSubscriptionTier.tier != previousSubscriptionTier.tier) return "plan-change";
    }
    return undefined;
  })();
  console.debug({planChangeType, latestSubscriptionTier: latestSubscriptionTier.tier, previousSubscriptionTier: previousSubscriptionTier?.tier});

  // Prorate streaming credits
  const streamingCreditsToIncrement: number | undefined = (() => {
    switch (planChangeType) {
      case "new-subscription": return latestSubscriptionTier.includedStreamingCredits;
      case "new-period": return latestSubscriptionTier.tier !== "sandbox" ? latestSubscriptionTier.includedStreamingCredits : 0;
      case "plan-change": return latestSubscriptionTier.includedStreamingCredits - (previousSubscriptionTier?.includedStreamingCredits || 0);
      default: return undefined;
    }
  })();

  // Rollover streaming credits
  const rolloverStreamingCredits: number = await (async () => {
    if (planChangeType === "new-period" || planChangeType === "new-subscription") {
      const [, billingUsage] = await getBillingUsage(organizationId);
      const availableCredits = billingUsage?.availableCredits || 0;
      return Math.max(availableCredits, 0);
    } else return 0;
  })();

  const schedule = typeof(stripeSubscription.schedule) == "string" || stripeSubscription.schedule == undefined ? undefined : stripeSubscription.schedule;
  const pendingSubscription : BillingSubscriptionPendingSubscription | undefined = await (async () => {
    if (schedule != undefined) return await pendingSubscriptionFromSchedule(customer, schedule);
    return undefined;
  })();

  const subscriptionIsActive = stripeSubscription.status == "active";
  const usageUpdate = {
    // NOTE: The workspaceSeatsUsed & publishedSpacesUsed values are denormalized elsewhere
    workspaceSeatsSubscribed: workspaceSeatsSubscribed,
    publishedSpacesSubscribed: publishedSpacesSubscribed,
    rolloverCredits: rolloverStreamingCredits,
  };

  const creditsIncrement : InvoiceStreamingCreditsIncrement | undefined = (() => {
    if (streamingCreditsToIncrement == undefined) return undefined;
    return {
      streamingCreditsToIncrement: (streamingCreditsToIncrement < 0) ? 0 : streamingCreditsToIncrement,
      invoiceId: latestPaidBaseFeeInvoice.id,
      timestamp: admin.firestore.Timestamp.fromDate(new Date(latestPaidBaseFeeInvoice.created * 1000)),
    };
  })();

  const billingSubscription: BillingSubscription = {
    stripeProductId: latestProductId,
    stripeCustomerId: params.customerId,
    stripeSubscription: {
      id: stripeSubscription.id,
      currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(stripeSubscription.current_period_start * 1000)),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(stripeSubscription.current_period_end * 1000)),
      canceled: subscriptionIsActive && stripeSubscription.cancel_at ? true : false,
      status: (stripeSubscription.status == "active") ? "active" : "unpaid",
    },
    pendingSubscription,
  };

  return {eventId: params.eventId, organizationId, usageUpdate, billingSubscription, creditsIncrement};
}

export async function ensureCustomerDefaultPaymentMethod(customerId: string, paymentMethodId?: string) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) return {error: "stripe-key-not-found"};
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});

  const customer = await stripe.customers.retrieve(customerId);
  if (customer == undefined || customer.deleted) {
    console.error("Customer does not exist, or was deleted");
    return "customer-not-found";
  }

  if (customer.invoice_settings.default_payment_method != null) {
    console.debug(`Customer ${customerId} already has a default payment method`);
    return 0;
  }

  if (paymentMethodId == undefined) {
    console.warn(`Can't set default payment method for ${customerId} because paymentMethodId was not provided`);
    return "no-payment-method-provided";
  }

  try {
    console.debug(`Customer ${customerId} has no default payment method. Trying to use ${paymentMethodId}`);
    await stripe.customers.update(customerId, {invoice_settings: {default_payment_method: paymentMethodId}});
    return 0;
  } catch (e: any) {
    console.error(e);
    console.error(`Failed to check/set default payment method for customer ${customer.id}`);
    return "failed-to-set";
  }
}


function intervalToBillingPeriod(interval: Stripe.Price.Recurring.Interval) : BillingPeriod | undefined {
  switch (interval) {
    case "year": return "yearly";
    case "month": return "monthly";
    default: {
      console.error(`Failed to convert stripe interval '${interval}' to billing period`);
      return undefined;
    }
  }
}

function stripeProductsToTiers(latestProductsAndPrices: {stripeProducts: Stripe.Product[], stripePrices: Stripe.Price[]}): BillingProductTiers | string {
  return latestProductsAndPrices.stripeProducts.reduce<BillingProductTiers | string>((tiers, stripeProduct) => {
    if (["workspace-seats", "published-spaces"].includes(stripeProduct.metadata.productType)) {
      console.debug(`Skipping non-tier product: ${stripeProduct.name}`);
      return tiers;
    }
    const billingPeriod = stripeProduct.metadata.billingPeriod as BillingPeriod;
    if (billingPeriod == undefined || billingPeriod.length < 1) {
      return "Failed to find billingPeriod metadata on product " + stripeProduct.id;
    }
    if (!BILLING_PERIOD.includes(billingPeriod)) {
      return "Invalid billingPeriod on product " + stripeProduct.id;
    }
    const displayName = stripeProduct.metadata.displayName;
    if (displayName == undefined || displayName.length < 1) {
      return "Failed to find displayName metadata on product " + stripeProduct.id;
    }

    const tier = stripeProduct.metadata.tier as BillingTier;
    if (tier == undefined || tier.length < 1 || !BILLING_TIER.includes(tier)) {
      return "Failed to find valid tier metadata on product " + stripeProduct.id;
    }

    const includedWorkspaceSeats = tryStringToNumber(stripeProduct.metadata.includedWorkspaceSeats);
    if (includedWorkspaceSeats == undefined) {
      return "Failed to find includedWorkspaceSeats metadata on product " + stripeProduct.id;
    }
    const includedPublishedSpaces = tryStringToNumber(stripeProduct.metadata.includedPublishedSpaces);
    if (includedPublishedSpaces == undefined) {
      return "Failed to find includedPublishedSpaces metadata on product " + stripeProduct.id;
    }
    const includedStreamingCredits = tryStringToNumber(stripeProduct.metadata.includedStreamingCredits);
    if (includedStreamingCredits == undefined) {
      return "Failed to find includedStreamingCredits metadata on product " + stripeProduct.id;
    }
    const productStripePrices = latestProductsAndPrices.stripePrices.filter((stripePrice) => typeof(stripePrice.product) == "string" && stripePrice.product == stripeProduct.id);

    const baseFeeStripePrice = productStripePrices.find((stripePrice) => stripePrice.unit_amount != undefined && stripePrice.unit_amount != null);
    if (baseFeeStripePrice == undefined || baseFeeStripePrice.unit_amount == null) {
      return "Failed to find Base Fee price of product " + stripeProduct.id;
    }
    const baseFeePrice : BillingProductBaseFeePrice = {
      stripeId: baseFeeStripePrice.id,
      usdCents: baseFeeStripePrice.unit_amount,
    };

    const workspaceSeatsPrice : string | BillingProductFeaturePrice = (() => {
      const workspaceSeatsStripeProduct = latestProductsAndPrices.stripeProducts.find((stripePrice) => stripePrice.metadata.productType == "workspace-seats");
      if (workspaceSeatsStripeProduct == undefined) {
        return "Failed to find Workspace Seats product";
      }
      const workspaceSeatsStripePrice = latestProductsAndPrices.stripePrices.find((stripePrice) => {
        const priceBillingPeriod = (stripePrice.recurring?.interval != undefined) ? intervalToBillingPeriod(stripePrice.recurring.interval) : undefined;
        return (
          typeof(stripePrice.product) == "string" &&
          stripePrice.product == workspaceSeatsStripeProduct.id &&
          priceBillingPeriod == billingPeriod &&
          stripePrice.metadata.tier == tier &&
          stripePrice.tiers != undefined
        );
      });
      console.debug({workspaceSeatsStripeProduct, workspaceSeatsStripePrice});
      if (workspaceSeatsStripePrice == undefined || workspaceSeatsStripePrice.tiers == undefined) {
        return "Failed to find Workspace Seats price of product " + stripeProduct.id;
      }
      // eslint-disable-next-line camelcase
      const workspaceSeatUsdCents = workspaceSeatsStripePrice.tiers.find((tier) => (tier.unit_amount != null && tier.unit_amount != undefined) && (tier.up_to == null || tier.up_to == undefined))?.unit_amount;
      if (workspaceSeatUsdCents == null || workspaceSeatUsdCents == undefined) {
        return "Failed to find Workspace Seats unit price: "+ stripeProduct.id;
      }
      return {
        stripeId: workspaceSeatsStripePrice.id,
        usdCents: workspaceSeatUsdCents,
        included: includedWorkspaceSeats,
      };
    })();
    if (typeof(workspaceSeatsPrice) == "string") return workspaceSeatsPrice;

    const publishedSpacesPrice : undefined | string | BillingProductFeaturePrice = (() => {
      if (tier == "sandbox") return undefined;
      const publishedSpacesStripeProduct = latestProductsAndPrices.stripeProducts.find((stripePrice) => stripePrice.metadata.productType == "published-spaces");
      if (publishedSpacesStripeProduct == undefined) {
        return "Failed to find Published Spaces product";
      }
      const publishedSpacesStripePrice = latestProductsAndPrices.stripePrices.find((stripePrice) => {
        const priceBillingPeriod = (stripePrice.recurring?.interval != undefined) ? intervalToBillingPeriod(stripePrice.recurring.interval) : undefined;
        return (
          typeof(stripePrice.product) == "string" &&
          stripePrice.product == publishedSpacesStripeProduct.id &&
          priceBillingPeriod == billingPeriod &&
          stripePrice.metadata.tier == tier &&
          stripePrice.tiers != undefined
        );
      });
      console.debug({publishedSpacesStripeProduct, publishedSpacesStripePrice});
      if (publishedSpacesStripePrice == undefined || publishedSpacesStripePrice.tiers == undefined) {
        return "Failed to find Published Spaces price of product " + stripeProduct.id;
      }
      // eslint-disable-next-line camelcase
      const publishedSpaceUsdCents = publishedSpacesStripePrice.tiers.find((tier) => (tier.unit_amount != null && tier.unit_amount != undefined) && (tier.up_to == null || tier.up_to == undefined))?.unit_amount;
      if (publishedSpaceUsdCents == null || publishedSpaceUsdCents == undefined) {
        return "Failed to find Published Spaces unit price: "+ stripeProduct.id;
      }
      return {
        stripeId: publishedSpacesStripePrice.id,
        usdCents: publishedSpaceUsdCents,
        included: includedPublishedSpaces,
      };
    })();
    if (typeof(publishedSpacesPrice) == "string") return publishedSpacesPrice;

    const features: BillingFeatures = Object.entries(stripeProduct.metadata).reduce<BillingFeatures>((acc, [k, v]) => {
      const keyMatch = k.match(/^feature([A-Z])(.*)/);
      if (keyMatch == null) return acc;
      if (keyMatch.length != 3) return acc;
      const featureKey = keyMatch[1].toLowerCase() + keyMatch[2];
      acc[featureKey] = (v == "true");
      return acc;
    }, {
      publishSpace: false,
      bridge: false,
      restApi: false,
      sharding: false,
      analytics: false,
      inWorldStreams: false,
    });

    const discount = tryStringToNumber(stripeProduct.metadata.discount) || 0;

    const description = stripeProduct.description || "";

    const productTier :BillingProductTier = {
      tier,
      displayName,
      billingPeriod,
      baseFeePrice,
      includedStreamingCredits,
      workspaceSeatsPrice,
      publishedSpacesPrice,
      features,
      discount,
      description,
    };
    tiers[stripeProduct.id] = productTier;
    return tiers;
  }, {});
}

function stripeProductsToExtras(latestExtrasAndPrices: {stripeProducts: Stripe.Product[], stripePrices: Stripe.Price[]}): BillingProductExtras | string {
  return latestExtrasAndPrices.stripeProducts.reduce<BillingProductExtras | string>((extras, stripeProduct) => {
    const defaultPriceId = stripeProduct.default_price;
    if (typeof(defaultPriceId) != "string") {
      return "Product field default_price is not a string: " + stripeProduct.id;
    }
    const defaultPrice = latestExtrasAndPrices.stripePrices.find((p) => p.id == defaultPriceId);
    if (defaultPrice == undefined) {
      return `Default price of product ${stripeProduct.id} - ${defaultPriceId} not found`;
    }
    const usdCents = defaultPrice.unit_amount;
    if (usdCents == null) {
      return `Default price of product ${stripeProduct.id} - ${defaultPriceId} not found`;
    }
    // eslint-disable-next-line camelcase
    const unitCount = defaultPrice.transform_quantity?.divide_by || 1;
    const extra :BillingProductExtra = {
      unitCount,
      type: "streaming-credits",
      usdCents,
      displayName: stripeProduct.metadata.displayName || "Streaming Credits",
    };
    extras[defaultPriceId] = extra;
    return extras;
  }, {});
}

export async function syncLatestStripeProductsToFirestore() {
  const latestProductsAndPrices = await getLatestActiveProducts();
  console.debug({latestProductsAndPrices});
  const latestExtrasAndPrices = await getLatestActiveExtras();
  console.debug({latestExtrasAndPrices});
  if (latestProductsAndPrices.error != undefined) {
    console.error(latestProductsAndPrices.error);
    return 1;
  }
  if (latestExtrasAndPrices.error != undefined) {
    console.error(latestExtrasAndPrices.error);
    return 1;
  }
  try {
    const tiers = stripeProductsToTiers(latestProductsAndPrices);
    if (typeof(tiers) == "string") {
      console.error(tiers);
      console.error("Failed to convert stripe products/prices to tiers");
      return 1;
    }
    const extras = stripeProductsToExtras(latestExtrasAndPrices);
    if (typeof(extras) == "string") {
      console.error(extras);
      console.error("Failed to convert stripe products/prices to packages");
      return 1;
    }
    const availableProducts: BillingProductsAvailable = {
      tiers,
      extras: extras,
      timestamp: admin.firestore.Timestamp.now(),
    };
    console.debug({availableProducts});
    await getBillingProductsAvailableRef().set(availableProducts);
    return 0;
  } catch (e: any) {
    console.error(e);
    return 1;
  }
}

export async function writeOrganizationBillingStateChanges(stateToChange: OrganizationBillingStateChange) {
  if (stateToChange.organizationId == undefined) {
    console.error(`Error processing subscription write ${stateToChange.eventId}: No organizationId`);
    return 1;
  }

  if (stateToChange.usageUpdate != undefined) await getBillingUsageRef(stateToChange.organizationId).set(stateToChange.usageUpdate, {merge: true});
  if (stateToChange.billingSubscription == undefined) {
    await getBillingSubscriptionRef(stateToChange.organizationId).delete();
  } else {
    await getBillingSubscriptionRef(stateToChange.organizationId).set(stateToChange.billingSubscription);
  }

  if (stateToChange.creditsIncrement != undefined) {
    const streamingCreditsPurchase: StreamingCreditsPurchase = {
      quantity: stateToChange.creditsIncrement.streamingCreditsToIncrement,
      reason: "plan-change",
      timestamp: stateToChange.creditsIncrement.timestamp,
    };
    try {
      await getBillingStreamingCreditsPurchasesRef(stateToChange.organizationId).doc(stateToChange.creditsIncrement.invoiceId).create(streamingCreditsPurchase);
    } catch (e: any) {
      if (stringify(e.details).includes("Document already exists")) {
        console.debug(`Streaming credits purchase for invoiceId: ${stateToChange.creditsIncrement.invoiceId} already exists`);
      } else {
        console.error(e);
      }
    }
  }
}

export async function emailStripeInvoice(invoiceId: string) {
  const stripeKey = getStripeSecretKey();
  if (stripeKey == undefined) {
    console.error("Stripe key not found");
    return false;
  }
  const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});

  const invoice = await stripe.invoices.retrieve(invoiceId);
  const {customer, organizationId} = await stripeCustomerAndOrganzationId(invoice.customer);

  if (organizationId == undefined) {
    console.error("Failed to find organizationId");
    return false;
  }
  const [, organization] = await getOrganization(organizationId);

  if (organization == undefined) {
    console.error("Organization is undefined");
    return false;
  }

  if (customer == undefined) {
    console.error("Customer is undefined");
    return false;
  }

  const customerEmail = customer.email;
  if (customerEmail == null) {
    console.error("Customer email is undefined");
    return false;
  }

  if (invoice.status == "paid" && (invoice.invoice_pdf == undefined || invoice.invoice_pdf == null)) {
    console.error("Invoice is missing pdf url");
    return false;
  }

  if (invoice.number == undefined || invoice.number == null) {
    console.error("Invoice is missing number");
    return false;
  }

  const paymentMethod = await (async () => {
    if (invoice.amount_paid == 0 && invoice.amount_due == 0) return undefined;
    // eslint-disable-next-line camelcase
    const payment_intent = (typeof(invoice.payment_intent) == "string") ? await stripe.paymentIntents.retrieve(invoice.payment_intent) : invoice.payment_intent;
    // eslint-disable-next-line camelcase
    if (payment_intent == null) return undefined;
    const method = (typeof(payment_intent.payment_method) == "string") ? await stripe.paymentMethods.retrieve(payment_intent.payment_method) : payment_intent.payment_method;
    if (method == null || method.card == undefined) return "None";
    const capitalizedCardBrand = method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1);
    return `${capitalizedCardBrand} - ${method.card.last4}`;
  })();

  if (paymentMethod == "None" || paymentMethod == undefined) {
    console.warn(`Failed to find payment method for invoice: ${invoiceId}. Got ${paymentMethod}`);
  }

  const subject = invoice.status == "paid" ? "Receipt from Odyssey Purchase" : "Odyssey Invoice Payment Failed";

  const envUrl = getEnvUrl(getFirebaseProjectId());
  const organizationUrl = envUrl + "/profile/" + organization.domain;

  const charge = invoice.charge != undefined && typeof invoice.charge === "string" ? await stripe.charges.retrieve(invoice.charge) : undefined;
  const receiptNumber = charge != undefined && charge.receipt_number != null ? charge.receipt_number : undefined;
  const receiptUrl = charge != undefined ? charge.receipt_url : undefined;

  const template = {
    Subject: subject,
    CustomerName: customer.name || "",
    PaymentMethod: paymentMethod,
    PaymentAmount: invoice.status == "paid" ? String(invoice.amount_paid / 100) : invoice.amount_due / 100,
    PaymentDate: new Date(invoice.created * 1000).toLocaleDateString(undefined, {timeZone: "UTC", timeZoneName: "short", year: "numeric", month: "long", day: "numeric", weekday: "long", hour12: true, hour: "numeric", minute: "numeric"}),
    InvoiceUrl: invoice.invoice_pdf,
    ReceiptUrl: receiptUrl,
    InvoiceNumber: invoice.number,
    ReceiptNumber: receiptNumber,
    OrganizationUrl: organizationUrl,
  };

  const sendViaPostmark = (async () => {
    try {
      const postmarkKey = getPostmarkKey();
      if (postmarkKey == undefined) {
        console.error("Failed to resolve postmark key");
        return false;
      }
      const postmarkClient = new postmark.ServerClient(postmarkKey);
      console.debug("Sending invoice email via postmark");
      const payload: postmark.Models.TemplatedMessage = {
        From: "Odyssey <noreply@odyssey.stream>",
        To: customerEmail,
        ReplyTo: "noreply@odyssey.stream",
        TemplateAlias: invoice.status == "paid" ? "invoice-receipt-v2" : "payment-failed",
        MessageStream: "stripe-invoices",
        TemplateModel: template,
      };
      const result = await postmarkClient.sendEmailWithTemplate(payload);
      return result.ErrorCode == 0;
    } catch (e: any) {
      console.error("Error sending email via postmark");
      console.error(e);
      return false;
    }
  });

  return await sendViaPostmark();
}
