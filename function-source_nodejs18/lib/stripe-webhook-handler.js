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
exports.stripeWebhookHandler = void 0;
// @ts-nocheck - Node.js 16 compatibility
// @ts-ignore
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("./shared");
const firebase_1 = require("./lib/firebase");
const stripe_1 = require("stripe");
const firestore_1 = require("./lib/documents/firestore");
const stripe_2 = require("./lib/stripe");
const customRunWithWarmStripeKey = Object.assign(Object.assign({}, shared_1.customRunWith), { secrets: ["STRIPE_SECRETKEY", "STRIPE_WEBHOOK_SIGNING_KEY"] });
exports.stripeWebhookHandler = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onRequest(async (request, response) => {
    try {
        const stripeKey = (0, firebase_1.getStripeSecretKey)();
        if (!stripeKey) {
            throw new functions.https.HttpsError("internal", "Stripe key not found");
        }
        const webhookSigningKey = (0, firebase_1.getStripeWebhookSigningKey)();
        if (!webhookSigningKey) {
            throw new functions.https.HttpsError("internal", "Stripe webhook signing key not found");
        }
        const stripe = new stripe_1.Stripe(stripeKey, {
            apiVersion: "2022-11-15",
        });
        const signature = request.headers["stripe-signature"];
        if (!signature) {
            throw new Error("No signature provided");
        }
        const event = stripe.webhooks.constructEvent(request.rawBody, signature, webhookSigningKey);
        console.debug(`Received event: ${event.type}`);
        // console.debug(event);
        switch (event.type) {
            case "invoice.payment_failed":
            case "invoice.paid": {
                if (event.data.object.object == "invoice") {
                    try {
                        const emailInvoiceResult = await (0, stripe_2.emailStripeInvoice)(event.data.object.id);
                        if (!(emailInvoiceResult === null || emailInvoiceResult === void 0 ? void 0 : emailInvoiceResult.success)) {
                            throw new Error(`Failed to email invoice ${event.data.object.id}: ${(emailInvoiceResult === null || emailInvoiceResult === void 0 ? void 0 : emailInvoiceResult.error) || "Unknown error"}`);
                        }
                    }
                    catch (e) {
                        console.error(e);
                    }
                    const { customer, organizationId } = await (0, stripe_2.stripeCustomerAndOrganizationId)(event.data.object.customer);
                    if (customer == undefined || organizationId == undefined) {
                        console.error(`Failed to retrieve stripe customer ${event.data.object.customer} with organizationId in ${event.data.object.object} event: ${event.data.object.id}`);
                        break;
                    }
                    const customerId = customer.id;
                    const addStreamingCredits = (async () => {
                        if (event.data.object.status != "paid") {
                            return { success: false, reason: "not_paid" };
                        }
                        const hasStreamingCredits = event.data.object.lines.data.find((li) => { var _a; return ((_a = li.price) === null || _a === void 0 ? void 0 : _a.metadata.priceType) == "streaming-credits"; }) != undefined;
                        if (hasStreamingCredits == false) {
                            console.debug(`Invoice does not include any streaming credits: ${event.data.object.id}`);
                            return { success: false, reason: "no_streaming_credits" };
                        }
                        const totalQuantity = event.data.object.lines.data.reduce((acc, li) => {
                            var _a, _b, _c;
                            // eslint-disable-next-line camelcase
                            const quantity = (((_a = li.price) === null || _a === void 0 ? void 0 : _a.metadata.priceType) == "streaming-credits" && li.quantity != null) ? (((_c = (_b = li.price) === null || _b === void 0 ? void 0 : _b.transform_quantity) === null || _c === void 0 ? void 0 : _c.divide_by) || 1) * li.quantity : 0;
                            return acc + quantity;
                        }, 0);
                        const streamingCreditsPurchase = {
                            quantity: totalQuantity,
                            timestamp: admin.firestore.Timestamp.fromDate(new Date(event.data.object.created * 1000)),
                            reason: "top-up",
                        };
                        await (0, firestore_1.getBillingStreamingCreditsPurchasesRef)(organizationId).doc(event.data.object.id).create(streamingCreditsPurchase);
                        return { success: true, credits: totalQuantity };
                    })();
                    const setOrganizationBillingState = (async () => {
                        const subscriptionId = getStripeSubscriptionId(event.data.object.subscription);
                        if (subscriptionId == undefined) {
                            console.warn(`Invoice contains no subscription: ${event.data.object.id}`);
                            return { success: false, reason: "no_subscription" };
                        }
                        try {
                            const stateToChange = await (0, stripe_2.organizationBillingStateFromLatestSubscriptionInvoices)({
                                eventId: event.data.object.id,
                                subscriptionId,
                                customerId,
                            });
                            await (0, stripe_2.writeOrganizationBillingStateChanges)(stateToChange);
                            return { success: true };
                        }
                        catch (error) {
                            console.error(`Error processing subscription state: ${error}`);
                            return { success: false, error: String(error) };
                        }
                    })();
                    const result = await Promise.allSettled([
                        addStreamingCredits,
                        setOrganizationBillingState,
                    ]);
                    result.forEach((e) => {
                        var _a;
                        if (e.status == "rejected") {
                            console.dir(e.reason, { depth: null });
                        }
                        else if (e.status == "fulfilled" && ((_a = e.value) === null || _a === void 0 ? void 0 : _a.success) === false) {
                            console.debug("Operation completed but was not successful:", e.value);
                        }
                    });
                    console.debug({ result });
                    break;
                }
                else {
                    console.warn(`Invoice.paid event is not for an invoice. This is not handled. InvoiceId: ${event.data.object.id}`);
                    break;
                }
            }
            case "product.created":
            case "product.updated":
            case "product.deleted":
            case "price.created":
            case "price.updated":
            case "price.deleted": {
                const updateResult = await (0, stripe_2.syncLatestStripeProductsToFirestore)();
                if (!(updateResult === null || updateResult === void 0 ? void 0 : updateResult.success)) {
                    console.error("Failed to sync stripe products to firestore");
                }
                break;
            }
            case "customer.subscription.created":
            case "customer.subscription.deleted":
            case "customer.subscription.updated": {
                // HACK: Debug log the entire event
                console.debug(JSON.stringify(event));
                const { customer, organizationId } = await (0, stripe_2.stripeCustomerAndOrganizationId)(event.data.object.customer);
                if (customer == undefined || organizationId == undefined) {
                    console.error(`Failed to retrieve stripe customer ${event.data.object.customer} with organizationId in ${event.data.object.object} event: ${event.data.object.id}`);
                    break;
                }
                const paymentMethodId = (() => {
                    if (typeof (event.data.object.default_payment_method) == "string")
                        return event.data.object.default_payment_method;
                    if (event.data.object.default_payment_method == null || event.data.object.default_payment_method == undefined)
                        return undefined;
                    return event.data.object.default_payment_method.id;
                })();
                const stateToChange = await (0, stripe_2.organizationBillingStateFromLatestSubscriptionInvoices)({
                    eventId: event.data.object.id,
                    paymentMethodId,
                    subscriptionId: event.data.object.id,
                    customerId: customer.id,
                });
                if (typeof (stateToChange) == "string") {
                    console.error(`Error from organizationBillingStateFromLatestSubscriptionInvoices ${event.data.object.id}: ${stateToChange}`);
                    return;
                }
                await (0, stripe_2.writeOrganizationBillingStateChanges)(stateToChange);
                break;
            }
            case "subscription_schedule.expiring": {
                // TODO: Send email (occurs 7 days before a subscription schedule will expire)
                break;
            }
            case "subscription_schedule.released":
            case "subscription_schedule.canceled":
            case "subscription_schedule.aborted":
            case "subscription_schedule.completed": {
                // TODO: Send email when a new subscription schedule is completed
                const { organizationId } = await (0, stripe_2.stripeCustomerAndOrganizationId)(event.data.object.customer);
                if (organizationId == undefined) {
                    console.error(`Failed to retrieve stripe customer ${event.data.object.customer} in ${event.data.object.object} event: ${event.data.object.id}`);
                    break;
                }
                console.debug(`Removing pendingSubscription from organizationId: ${organizationId} because subscription schedule ${event.data.object.id} status is ${event.data.object.status}`);
                await (0, firestore_1.getBillingSubscriptionRef)(organizationId).update({ pendingSubscription: admin.firestore.FieldValue.delete() });
                break;
            }
            case "subscription_schedule.created":
            case "subscription_schedule.updated": {
                if (event.data.object.status != "active") {
                    console.warn(`Ignoring inactive schedule update ${event.data.object.id}`);
                    break;
                }
                const { customer, organizationId } = await (0, stripe_2.stripeCustomerAndOrganizationId)(event.data.object.customer);
                if (customer == undefined || organizationId == undefined) {
                    console.error(`Failed to retrieve stripe customer ${event.data.object.customer} with organizationId in ${event.data.object.object} event: ${event.data.object.id}`);
                    break;
                }
                const schedule = await stripe.subscriptionSchedules.retrieve(event.data.object.id);
                const pendingSubscription = await (0, stripe_2.pendingSubscriptionFromSchedule)({ customer, organizationId: undefined }, schedule);
                console.debug({ pendingSubscription });
                if (pendingSubscription == undefined) {
                    console.debug(`Removing pendingSubscription ${schedule.id} from ${organizationId}`);
                    await (0, firestore_1.getBillingSubscriptionRef)(organizationId).update({ pendingSubscription: admin.firestore.FieldValue.delete() });
                    console.debug(`Releasing subscriptionSchedule from customerId: ${customer.id} for organizationId: ${organizationId}`);
                    await stripe.subscriptionSchedules.release(schedule.id);
                }
                else {
                    console.debug(`Writing pendingSubscription for subscription schedule: ${event.data.object.id}`);
                    await (0, firestore_1.getBillingSubscriptionRef)(organizationId).update({ pendingSubscription });
                }
                break;
            }
            // TODO - send email when a subscription schedule is updated
            case "checkout.session.completed": {
                // TODO - check if credits were purchased, update billing/usage
                break;
            }
            default: console.warn(`Unhandled event type ${event.type}`);
        }
        // Return a response to acknowledge receipt of the event
        response.json({ received: true });
    }
    catch (err) {
        console.error("Error processing webhook:", err);
        response.status(400).send(`Webhook Error: ${err.message}`);
    }
});
//# sourceMappingURL=stripe-webhook-handler.js.map