"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestClock = exports.organizationBillingStateFromLatestSubscriptionInvoices = exports.pendingSubscriptionFromSchedule = exports.createNewCustomerAndCheckoutSandbox = exports.syncLatestStripeProductsToFirestore = exports.stripeCustomerAndOrganizationId = exports.writeOrganizationBillingStateChanges = exports.calculateCreditsIncrement = exports.buildBillingSubscription = exports.invoiceAndPayAutoTopup = exports.cancelStripeSubscriptionDowngrade = exports.generateStripeCustomerPortalUrl = exports.generateStripeCheckoutUrl = exports.emailStripeInvoice = exports.ensureCustomerDefaultPaymentMethod = exports.updateStripeSubscription = exports.resolveUpdateSubscriptionType = void 0;
const stripe_1 = require("stripe");
const index_1 = require("../../lib/emailServices/index");
const firestore_1 = require("../documents/firestore");
const misc_1 = require("../misc");
const docTypes_1 = require("../docTypes");
const admin = __importStar(require("firebase-admin"));
const firebase_1 = require("../firebase");
// Helper function to create Stripe instance with correct API version
function getStripe() {
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (!stripeKey)
        return undefined;
    return new stripe_1.Stripe(stripeKey, {
        apiVersion: "2022-11-15", // Keep Node.js 16 API version
    });
}
function resolveUpdateSubscriptionType(existingTier, newTier) {
    if (existingTier == newTier)
        return "same";
    if (docTypes_1.BILLING_TIER[existingTier] < docTypes_1.BILLING_TIER[newTier])
        return "upgrade";
    return "downgrade";
}
exports.resolveUpdateSubscriptionType = resolveUpdateSubscriptionType;
async function createCustomer(customerData) {
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (typeof stripeKey !== "string") {
        console.error("Failed to get Stripe client");
        return undefined;
    }
    const stripe = getStripe();
    try {
        // Create new customer if no customer is found
        const customer = await stripe.customers.create({
            test_clock: ((0, firebase_1.getFirebaseProjectId)() == "odyssey-local" && customerData.testClockId != undefined) ? customerData.testClockId : undefined,
            name: customerData.name,
            email: customerData.email,
            metadata: {
                organizationId: customerData.organizationId
            }
        }); // Assert type to match Node.js 16 behavior
        return customer;
    }
    catch (error) {
        console.error("Failed to create customer:", error);
        return undefined;
    }
}
async function createNewCustomerAndCheckoutSandbox(customerData, organizationId) {
    var _a;
    // Validate product & token
    const projectId = (0, firebase_1.getFirebaseProjectId)();
    const isProd = (0, misc_1.isProductionFirebaseProject)(projectId);
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "internal-error";
    const stripe = new stripe_1.Stripe(stripeKey, {
        apiVersion: "2022-11-15", // Keep Node.js 16 API version
    });
    try {
        // get sandbox product
        const [, billingProductsAvailable] = await (0, firestore_1.getBillingProductsAvailable)();
        if (billingProductsAvailable == undefined) {
            console.error("Didn't find any available billing products");
            return "internal-error";
        }
        const product = Object.entries(billingProductsAvailable.tiers).flatMap(([k, v]) => v.tier == "sandbox" ? { productId: k, priceId: v.baseFeePrice.stripeId, workspaceSeatsPrice: v.workspaceSeatsPrice } : []).pop();
        if (product == undefined) {
            console.error("Didn't find sandbox tier in billing products");
            return "internal-error";
        }
        // define all subscription items
        const baseFeeItem = { price: product.priceId, quantity: 1 };
        const workspaceSeatsItems = { price: product.workspaceSeatsPrice.stripeId, quantity: product.workspaceSeatsPrice.included };
        const items = [baseFeeItem, workspaceSeatsItems];
        // check for existing customer
        const existingCustomer = (_a = (await stripe.customers.search({ query: `metadata['organizationId']:'${organizationId}'` })).data) === null || _a === void 0 ? void 0 : _a.pop();
        // create new customer if no customer is found
        const customer = existingCustomer ? existingCustomer : await stripe.customers.create({
            test_clock: (isProd == false && customerData.testClockId != undefined) ? customerData.testClockId : undefined,
            email: customerData.email,
            name: customerData.name,
            metadata: {
                organizationId: customerData.organizationId,
            },
        }); // Assert type to match Node.js 16 behavior
        // return url
        return await generateStripeCheckoutUrl({
            customerId: customer.id,
            mode: "subscription",
            items: items,
            redirectParams: `profile/${organizationId}?subscriptionUpdate`,
            isNewCustomer: true,
        });
    }
    catch (e) {
        console.error("Failed to create and subscribe new customer");
        console.error(e);
        return "internal-error";
    }
}
exports.createNewCustomerAndCheckoutSandbox = createNewCustomerAndCheckoutSandbox;
async function generateStripeCheckoutUrl(data) {
    if (!data.customerId) {
        console.error("Customer id not found. User either does not exist or does not have permission.");
        return "Customer id not found";
    }
    // Validate product & token
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "internal-error";
    const stripe = new stripe_1.Stripe(stripeKey, {
        apiVersion: "2022-11-15", // Keep Node.js 16 API version
    });
    try {
        // Define redirect
        const redirect = await (0, index_1.generateUrl)(`${data.redirectParams}`);
        // Define session data
        const sessionData = {
            mode: data.mode,
            customer: data.customerId,
            line_items: data.items,
            success_url: `${redirect}=success`,
            cancel_url: `${redirect}=cancelled`,
            invoice_creation: data.mode === "payment" ? { enabled: true } : undefined,
            payment_method_collection: data.mode === "subscription" ? "always" : undefined,
            customer_update: { address: "auto" },
        };
        if (data.isNewCustomer)
            sessionData.billing_address_collection = "required";
        else
            sessionData.automatic_tax = { enabled: true };
        const session = await stripe.checkout.sessions.create(sessionData);
        return session.url;
    }
    catch (e) {
        console.error("Failed to create checkout url");
        console.error(e);
        return "internal-error";
    }
}
exports.generateStripeCheckoutUrl = generateStripeCheckoutUrl;
async function generateStripeCustomerPortalUrl(data) {
    if (!data.customerId) {
        console.error("Customer id not found. User either does not exist or does not have permission.");
        return "Customer id not found";
    }
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return { error: "stripe-key-not-found" };
    const stripe = new stripe_1.Stripe(stripeKey, {
        apiVersion: "2022-11-15", // Keep Node.js 16 API version
    });
    try {
        // Define redirect
        const redirect = await (0, index_1.generateUrl)(`${data.redirectParams}`);
        // Update stripe subscription
        return await stripe.billingPortal.sessions.create({
            customer: data.customerId,
            return_url: redirect,
        });
    }
    catch (e) {
        console.error("Failed to create and subscribe new customer");
        console.error(e);
        return "internal-error";
    }
}
exports.generateStripeCustomerPortalUrl = generateStripeCustomerPortalUrl;
async function getLatestActiveExtras() {
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "internal-error";
    const stripe = new stripe_1.Stripe(stripeKey, {
        apiVersion: "2022-11-15", // Keep Node.js 16 API version
    });
    try {
        const stripeProducts = (await stripe.products.search({ query: "active:'true' AND metadata['productType']:'extra'" })).data;
        const stripePrices = (await stripe.prices.list({ active: true })).data;
        return { stripeProducts, stripePrices };
    }
    catch (e) {
        console.error("Failed to get latest active extras");
        console.error(e);
        return "internal-error";
    }
}
async function getLatestActiveProducts() {
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "internal-error";
    const stripe = new stripe_1.Stripe(stripeKey, {
        apiVersion: "2022-11-15", // Keep Node.js 16 API version
    });
    try {
        const tierProducts = (await stripe.products.search({ query: "active:'true' AND metadata['productType']:'subscription'" })).data;
        const stripePrices = (await stripe.prices.list({ active: true })).data;
        return { stripeProducts: tierProducts, stripePrices: stripePrices };
    }
    catch (e) {
        console.error("Failed to get latest active products");
        console.error(e);
        return "internal-error";
    }
}
async function getSubscriptionItems(subscriptionId) {
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "internal-error";
    const stripe = new stripe_1.Stripe(stripeKey, {
        apiVersion: "2022-11-15", // Keep Node.js 16 API version
    });
    try {
        const items = await stripe.subscriptionItems.list({ subscription: subscriptionId });
        return { items: items.data };
    }
    catch (e) {
        console.error("Failed to get subscription items");
        console.error(e);
        return "internal-error";
    }
}
async function updateStripeSubscription(data) {
    var _a, _b, _c;
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "internal-error";
    const stripe = new stripe_1.Stripe(stripeKey, {
        apiVersion: "2022-11-15", // Keep Node.js 16 API version
    });
    try {
        // get existing subscription
        const subscription = await stripe.subscriptions.retrieve(data.subscriptionId);
        if (subscription == undefined) {
            console.error("Failed to find subscription");
            return "internal-error";
        }
        // get billing products
        const [, billingProductsAvailable] = await (0, firestore_1.getBillingProductsAvailable)();
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
            id: (_a = subscriptionItems.items.find((i) => i.price.product == product.baseFeePrice.stripeId)) === null || _a === void 0 ? void 0 : _a.id,
            price: product.baseFeePrice.stripeId,
            quantity: 1,
        };
        const workspaceSeatsItem = {
            id: (_b = subscriptionItems.items.find((i) => i.price.product == product.workspaceSeatsPrice.stripeId)) === null || _b === void 0 ? void 0 : _b.id,
            price: product.workspaceSeatsPrice.stripeId,
            quantity: data.workspaceSeatsSubscribed,
        };
        const publishedSpacesItem = {
            id: (_c = subscriptionItems.items.find((i) => i.price.product == product.publishedSpacesPrice.stripeId)) === null || _c === void 0 ? void 0 : _c.id,
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
    }
    catch (e) {
        console.error("Failed to update subscription");
        console.error(e);
        return "internal-error";
    }
}
exports.updateStripeSubscription = updateStripeSubscription;
async function cancelStripeSubscriptionDowngrade(subscriptionId) {
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "internal-error";
    const stripe = getStripe();
    try {
        // get existing subscription
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription == undefined) {
            console.error("Failed to find subscription");
            return "internal-error";
        }
        // cancel subscription schedule
        const schedules = await stripe.subscriptionSchedules.list({ customer: subscription.customer });
        const schedule = schedules.data.find((s) => s.subscription == subscriptionId);
        if (schedule) {
            await stripe.subscriptionSchedules.cancel(schedule.id);
        }
        return "success";
    }
    catch (e) {
        console.error("Failed to cancel subscription downgrade");
        console.error(e);
        return "internal-error";
    }
}
exports.cancelStripeSubscriptionDowngrade = cancelStripeSubscriptionDowngrade;
async function invoiceAndPayAutoTopup(customerId, quantity, priceId, autoTopupId) {
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "stripe-key-not-found";
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
    }
    catch (e) {
        console.error("Failed to invoice and pay auto topup");
        console.error(e);
        return "failed-to-pay-invoice";
    }
}
exports.invoiceAndPayAutoTopup = invoiceAndPayAutoTopup;
async function stripeCustomerAndOrganizationId(customer) {
    var _a;
    if (customer == undefined || customer == null)
        return {};
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return {};
    const stripe = getStripe();
    let _customer;
    if (typeof customer === "string") {
        _customer = await stripe.customers.retrieve(customer);
    }
    else {
        _customer = customer;
    }
    if (_customer.deleted)
        return {};
    const organizationId = (_a = _customer.metadata) === null || _a === void 0 ? void 0 : _a.organizationId;
    return { customer: _customer, organizationId: organizationId };
}
exports.stripeCustomerAndOrganizationId = stripeCustomerAndOrganizationId;
async function getTestClock(testClock) {
    if (testClock == undefined || testClock == null)
        return undefined;
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
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
exports.getTestClock = getTestClock;
async function pendingSubscriptionFromSchedule(customer, schedule) {
    var _a, _b;
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
        }
        catch (e) {
            console.error("Failed to retrieve price:", e);
            return undefined;
        }
    }));
    if (prices.some(p => p === undefined)) {
        console.error("Failed to retrieve all prices");
        return undefined;
    }
    const validPrices = prices.filter((p) => p !== undefined && "lastResponse" in p);
    const productsResponse = await Promise.all(validPrices.map(async (price) => {
        if (!price.product) {
            console.error("Price has no product");
            return undefined;
        }
        try {
            return await stripe.products.retrieve(typeof price.product === "string" ? price.product : price.product.id);
        }
        catch (e) {
            console.error("Failed to retrieve product:", e);
            return undefined;
        }
    }));
    if (productsResponse.some(p => p === undefined)) {
        console.error("Failed to retrieve all products");
        return undefined;
    }
    const validProducts = productsResponse.filter((p) => p !== undefined && "lastResponse" in p);
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
    console.debug({ productsAvailable });
    await (0, firestore_1.getBillingProductsAvailableRef)().set(productsAvailable);
    const subscriptionItems = {
        items: nextPhase.items.map(item => {
            var _a, _b;
            return ({
                id: (_b = (_a = item.price) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
                price: item.price,
                quantity: item.quantity,
            });
        }),
    };
    const billingSubscription = await buildBillingSubscription({
        id: schedule.id,
        customer: (_b = (_a = customer.customer) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "",
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
    }, subscriptionItems);
    if (billingSubscription === undefined) {
        return undefined;
    }
    return {
        subscription: billingSubscription,
        effectiveDate: nextPhase.end_date ? new Date(nextPhase.end_date * 1000) : undefined,
    };
}
exports.pendingSubscriptionFromSchedule = pendingSubscriptionFromSchedule;
async function ensureCustomerDefaultPaymentMethod(customerId, paymentMethodId) {
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
    }
    catch (error) {
        console.error("Error ensuring customer default payment method:", error);
        return { error: error.message };
    }
}
exports.ensureCustomerDefaultPaymentMethod = ensureCustomerDefaultPaymentMethod;
async function intervalToBillingPeriod(interval) {
    switch (interval) {
        case "year": return "yearly";
        case "month": return "monthly";
        default: {
            console.error(`Failed to convert stripe interval '${interval}' to billing period`);
            return undefined;
        }
    }
}
async function stripeProductsToTiers(latestProductsAndPrices) {
    var _a, _b, _c, _d, _e, _f;
    try {
        const tiers = {};
        const { stripeProducts, stripePrices } = latestProductsAndPrices;
        for (const product of stripeProducts) {
            if (product.metadata.productType !== "subscription")
                continue;
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
            const period = intervalToBillingPeriod((_a = baseFeePrice.recurring) === null || _a === void 0 ? void 0 : _a.interval);
            if (period == undefined) {
                console.error("Product has invalid period:", product.id);
                continue;
            }
            tiers[product.id] = {
                tier: tier,
                period: period,
                baseFeePrice: {
                    stripeId: baseFeePrice.id,
                    amount: (_b = baseFeePrice.unit_amount) !== null && _b !== void 0 ? _b : 0,
                },
                workspaceSeatsPrice: {
                    stripeId: workspaceSeatsPrice.id,
                    amount: (_c = workspaceSeatsPrice.unit_amount) !== null && _c !== void 0 ? _c : 0,
                    included: (_d = (0, misc_1.tryStringToNumber)(workspaceSeatsPrice.metadata.included)) !== null && _d !== void 0 ? _d : 0,
                },
                publishedSpacesPrice: {
                    stripeId: publishedSpacesPrice.id,
                    amount: (_e = publishedSpacesPrice.unit_amount) !== null && _e !== void 0 ? _e : 0,
                    included: (_f = (0, misc_1.tryStringToNumber)(publishedSpacesPrice.metadata.included)) !== null && _f !== void 0 ? _f : 0,
                },
            };
        }
        return tiers;
    }
    catch (e) {
        console.error("Failed to convert stripe products to tiers");
        console.error(e);
        return "internal-error";
    }
}
async function stripeProductsToExtras(latestProductsAndPrices) {
    var _a, _b;
    try {
        const extras = {};
        const { stripeProducts, stripePrices } = latestProductsAndPrices;
        for (const product of stripeProducts) {
            if (product.metadata.productType !== "extra")
                continue;
            const price = stripePrices.find((p) => p.product === product.id);
            if (price == undefined) {
                console.error("Product missing price:", product.id);
                continue;
            }
            extras[product.id] = {
                name: product.name,
                description: (_a = product.description) !== null && _a !== void 0 ? _a : "",
                price: {
                    stripeId: price.id,
                    amount: (_b = price.unit_amount) !== null && _b !== void 0 ? _b : 0,
                },
            };
        }
        return extras;
    }
    catch (e) {
        console.error("Failed to convert stripe products to extras");
        console.error(e);
        return "internal-error";
    }
}
async function syncLatestStripeProductsToFirestore() {
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "internal-error";
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
        const billingProductsAvailableRef = await (0, firestore_1.getBillingProductsAvailableRef)();
        await billingProductsAvailableRef.set({
            tiers: tiers,
            extras: extras,
        });
        return "success";
    }
    catch (e) {
        console.error("Failed to sync latest stripe products to firestore");
        console.error(e);
        return "internal-error";
    }
}
exports.syncLatestStripeProductsToFirestore = syncLatestStripeProductsToFirestore;
async function emailStripeInvoice(invoiceId) {
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (typeof stripeKey !== "string")
        return { error: "stripe-key-not-found" };
    const stripe = getStripe();
    try {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        if (!invoice) {
            return { error: "invoice-not-found" };
        }
        if (!invoice.hosted_invoice_url) {
            return { error: "invoice-url-not-found" };
        }
        return { success: true };
    }
    catch (error) {
        console.error("Error emailing Stripe invoice:", error);
        return { error: "internal-error" };
    }
}
exports.emailStripeInvoice = emailStripeInvoice;
async function buildBillingSubscription(stripeSubscription, subscriptionItems) {
    var _a, _b;
    try {
        const { items } = subscriptionItems;
        const customerId = typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : stripeSubscription.customer.id;
        const subscription = {
            stripeProductId: (_b = (_a = stripeSubscription.items.data[0]) === null || _a === void 0 ? void 0 : _a.price) === null || _b === void 0 ? void 0 : _b.product,
            stripeCustomerId: customerId,
            stripeSubscriptionId: stripeSubscription.id,
            stripeSubscription: {
                id: stripeSubscription.id,
                currentPeriodStart: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                cancelAt: stripeSubscription.cancel_at ? admin.firestore.Timestamp.fromMillis(stripeSubscription.cancel_at * 1000) : undefined,
                status: stripeSubscription.status,
                defaultPaymentMethod: stripeSubscription.default_payment_method,
                latestInvoiceId: stripeSubscription.latest_invoice,
                pendingUpdate: stripeSubscription.pending_update,
                schedule: stripeSubscription.schedule,
                collectionMethod: stripeSubscription.collection_method,
                billingCycleAnchor: stripeSubscription.billing_cycle_anchor,
                currentPeriodStart: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_start * 1000),
            }
        };
        return subscription;
    }
    catch (e) {
        console.error("Error building subscription", e);
        return undefined;
    }
}
exports.buildBillingSubscription = buildBillingSubscription;
async function calculateCreditsIncrement(stripeSubscription) {
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
    }
    catch (error) {
        console.error("Failed to calculate credits increment:", error);
        return undefined;
    }
}
exports.calculateCreditsIncrement = calculateCreditsIncrement;
async function writeOrganizationBillingStateChanges(stateToChange) {
    try {
        if (stateToChange.organizationId == undefined) {
            console.error(`Error processing subscription write ${stateToChange.eventId}: No organizationId`);
            return { success: false };
        }
        const { billingSubscription, usageUpdate, creditsIncrement } = stateToChange;
        // Update usage if provided
        if (usageUpdate) {
            await (0, firestore_1.getBillingUsageRef)(stateToChange.organizationId).set(usageUpdate, { merge: true });
        }
        // Update billing subscription
        if (billingSubscription === undefined) {
            await (0, firestore_1.getBillingSubscriptionRef)(stateToChange.organizationId).delete();
        }
        else {
            await (0, firestore_1.getBillingSubscriptionRef)(stateToChange.organizationId).set(billingSubscription);
        }
        // Handle credits increment if provided
        if (creditsIncrement) {
            const streamingCreditsPurchase = {
                quantity: creditsIncrement.streamingCreditsToIncrement,
                reason: "plan-change",
                timestamp: creditsIncrement.timestamp,
            };
            await (0, firestore_1.getBillingStreamingCreditsPurchasesRef)(stateToChange.organizationId)
                .doc(creditsIncrement.invoiceId)
                .create(streamingCreditsPurchase);
        }
        return { success: true };
    }
    catch (error) {
        console.error("Failed to write organization billing state changes:", error);
        return { success: false };
    }
}
exports.writeOrganizationBillingStateChanges = writeOrganizationBillingStateChanges;
const _projectId = (0, firebase_1.getFirebaseProjectId)();
async function pendingSubscriptionFromSchedule(customer, schedule) {
    var _a, _b, _c, _d, _e;
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return undefined;
    const stripe = getStripe();
    try {
        // get billing products
        const [, billingProductsAvailable] = await (0, firestore_1.getBillingProductsAvailable)();
        if (billingProductsAvailable == undefined) {
            console.error("Failed to find billing products");
            return undefined;
        }
        // get subscription
        const subscription = await stripe.subscriptions.retrieve(schedule.subscription);
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
        const productId = (_a = Object.entries(billingProductsAvailable.tiers).find(([, v]) => v.baseFeePrice.stripeId == subscription.items.data[0].price.product)) === null || _a === void 0 ? void 0 : _a[0];
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
        const workspaceSeatsQuantity = (_c = (_b = subscriptionItems.items.find((i) => i.price.product == product.workspaceSeatsPrice.stripeId)) === null || _b === void 0 ? void 0 : _b.quantity) !== null && _c !== void 0 ? _c : 0;
        // get published spaces quantity
        const publishedSpacesQuantity = (_e = (_d = subscriptionItems.items.find((i) => i.price.product == product.publishedSpacesPrice.stripeId)) === null || _d === void 0 ? void 0 : _d.quantity) !== null && _e !== void 0 ? _e : 0;
        return {
            productId: productId,
            workspaceSeatsSubscribed: workspaceSeatsQuantity,
            publishedSpacesSubscribed: publishedSpacesQuantity,
            scheduleId: schedule.id,
            timestamp: admin.firestore.Timestamp.fromMillis(schedule.phases[0].end * 1000),
        };
    }
    catch (e) {
        console.error("Failed to get pending subscription from schedule");
        console.error(e);
        return undefined;
    }
}
exports.pendingSubscriptionFromSchedule = pendingSubscriptionFromSchedule;
async function organizationBillingStateFromLatestSubscriptionInvoices(params) {
    var _a, _b, _c, _d, _e;
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return "internal-error";
    const stripe = getStripe();
    try {
        // get customer
        const { customer, organizationId } = await stripeCustomerAndOrganizationId(params.customerId);
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
        const [, billingProductsAvailable] = await (0, firestore_1.getBillingProductsAvailable)();
        if (billingProductsAvailable == undefined) {
            console.error("Failed to find billing products");
            return "internal-error";
        }
        // get product id
        const productId = (_a = Object.entries(billingProductsAvailable.tiers).find(([, v]) => v.baseFeePrice.stripeId == subscription.items.data[0].price.product)) === null || _a === void 0 ? void 0 : _a[0];
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
        const workspaceSeatsQuantity = (_c = (_b = subscriptionItems.items.find((i) => i.price.product == product.workspaceSeatsPrice.stripeId)) === null || _b === void 0 ? void 0 : _b.quantity) !== null && _c !== void 0 ? _c : 0;
        // get published spaces quantity
        const publishedSpacesQuantity = (_e = (_d = subscriptionItems.items.find((i) => i.price.product == product.publishedSpacesPrice.stripeId)) === null || _d === void 0 ? void 0 : _d.quantity) !== null && _e !== void 0 ? _e : 0;
        // get pending subscription
        const schedules = await stripe.subscriptionSchedules.list({ customer: customer.id });
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
    }
    catch (e) {
        console.error("Failed to get organization billing state from latest subscription invoices");
        console.error(e);
        return "internal-error";
    }
}
exports.organizationBillingStateFromLatestSubscriptionInvoices = organizationBillingStateFromLatestSubscriptionInvoices;
function intervalToBillingPeriod(interval) {
    switch (interval) {
        case "month":
            return docTypes_1.BILLING_PERIOD.MONTHLY;
        case "year":
            return docTypes_1.BILLING_PERIOD.YEARLY;
        default:
            return undefined;
    }
}
async function stripeCustomerAndOrganizationId(customerId) {
    var _a;
    const stripeKey = (0, firebase_1.getStripeSecretKey)();
    if (stripeKey == undefined)
        return {};
    const stripe = getStripe();
    try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted)
            return {};
        const organizationId = (_a = customer.metadata) === null || _a === void 0 ? void 0 : _a.organizationId;
        return { customer: customer, organizationId: organizationId };
    }
    catch (e) {
        console.error("Failed to find customer or organization id");
        console.error(e);
        return {};
    }
}
exports.stripeCustomerAndOrganizationId = stripeCustomerAndOrganizationId;
//# sourceMappingURL=index.js.map