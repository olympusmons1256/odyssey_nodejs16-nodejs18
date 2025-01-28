// @ts-nocheck - Node.js 16 compatibility
// @ts-ignore
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {customRunWith, customRunWithWarm} from "./shared";
import {getStripeSecretKey, getStripeWebhookSigningKey} from "./lib/firebase";
import {Stripe} from "stripe";
import {getBillingSubscriptionRef, getBillingStreamingCreditsPurchasesRef} from "./lib/documents/firestore";
import {emailStripeInvoice, organizationBillingStateFromLatestSubscriptionInvoices, pendingSubscriptionFromSchedule, stripeCustomerAndOrganizationId, syncLatestStripeProductsToFirestore, writeOrganizationBillingStateChanges} from "./lib/stripe";
import {docTypes} from "./lib/docTypes";

const customRunWithWarmStripeKey = {...customRunWithWarm, secrets: ["STRIPE_SECRETKEY", "STRIPE_WEBHOOK_SIGNING_KEY"]};
export const stripeWebhookHandler: functions.HttpsFunction =
functions
  .runWith(customRunWithWarmStripeKey)
  .https.onRequest(async (request, response) => {
    try {
      const stripeKey = getStripeSecretKey();
      if (!stripeKey) {
        throw new functions.https.HttpsError("internal", "Stripe key not found");
      }

      const webhookSigningKey = getStripeWebhookSigningKey();
      if (!webhookSigningKey) {
        throw new functions.https.HttpsError("internal", "Stripe webhook signing key not found");
      }

      const stripe = new Stripe(stripeKey, {
        apiVersion: "2022-11-15",
      });

      const signature = request.headers["stripe-signature"];
      if (!signature) {
        throw new Error("No signature provided");
      }

      const event = stripe.webhooks.constructEvent(
        request.rawBody,
        signature,
        webhookSigningKey
      );

      console.debug(`Received event: ${event.type}`);
      // console.debug(event);

      switch (event.type) {
        case "invoice.payment_failed":
        case "invoice.paid": {
          if (event.data.object.object == "invoice") {
            try {
              const emailInvoiceResult = await emailStripeInvoice(event.data.object.id);
              if (!emailInvoiceResult?.success) {
                throw new Error(`Failed to email invoice ${event.data.object.id}: ${emailInvoiceResult?.error || "Unknown error"}`);
              }
            } catch (e: any) {
              console.error(e);
            }
            const {customer, organizationId} = await stripeCustomerAndOrganizationId(event.data.object.customer);
            if (customer == undefined || organizationId == undefined) {
              console.error(`Failed to retrieve stripe customer ${event.data.object.customer} with organizationId in ${event.data.object.object} event: ${event.data.object.id}`);
              break;
            }

            const customerId = customer.id;

            const addStreamingCredits = (async () => {
              if (event.data.object.status != "paid") {
                return {success: false, reason: "not_paid"};
              }

              const hasStreamingCredits = event.data.object.lines.data.find((li) => li.price?.metadata.priceType == "streaming-credits") != undefined;
              if (hasStreamingCredits == false) {
                console.debug(`Invoice does not include any streaming credits: ${event.data.object.id}`);
                return {success: false, reason: "no_streaming_credits"};
              }

              const totalQuantity = event.data.object.lines.data.reduce<number>((acc, li) => {
              // eslint-disable-next-line camelcase
                const quantity = (li.price?.metadata.priceType == "streaming-credits" && li.quantity != null) ? (li.price?.transform_quantity?.divide_by || 1) * li.quantity : 0;
                return acc + quantity;
              }, 0);

              const streamingCreditsPurchase : docTypes.StreamingCreditsPurchase = {
                quantity: totalQuantity,
                timestamp: admin.firestore.Timestamp.fromDate(new Date(event.data.object.created * 1000)),
                reason: "top-up",
              };

              await getBillingStreamingCreditsPurchasesRef(organizationId).doc(event.data.object.id).create(streamingCreditsPurchase);
              return {success: true, credits: totalQuantity};
            })();

            const setOrganizationBillingState = (async () => {
              const subscriptionId = getStripeSubscriptionId(event.data.object.subscription);
              if (subscriptionId == undefined) {
                console.warn(`Invoice contains no subscription: ${event.data.object.id}`);
                return {success: false, reason: "no_subscription"};
              }
              try {
                const stateToChange = await organizationBillingStateFromLatestSubscriptionInvoices({
                  eventId: event.data.object.id,
                  subscriptionId,
                  customerId,
                });

                await writeOrganizationBillingStateChanges(stateToChange);
                return {success: true};
              } catch (error) {
                console.error(`Error processing subscription state: ${error}`);
                return {success: false, error: String(error)};
              }
            })();

            const result = await Promise.allSettled([
              addStreamingCredits,
              setOrganizationBillingState,
            ]);
            result.forEach((e) => {
              if (e.status == "rejected") {
                console.dir(e.reason, {depth: null});
              } else if (e.status == "fulfilled" && e.value?.success === false) {
                console.debug("Operation completed but was not successful:", e.value);
              }
            });
            console.debug({result});
            break;
          } else {
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
          const updateResult = await syncLatestStripeProductsToFirestore();
          if (!updateResult?.success) {
            console.error("Failed to sync stripe products to firestore");
          }
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.deleted":
        case "customer.subscription.updated": {
          // HACK: Debug log the entire event
          console.debug(JSON.stringify(event));

          const {customer, organizationId} = await stripeCustomerAndOrganizationId(event.data.object.customer);
          if (customer == undefined || organizationId == undefined) {
            console.error(`Failed to retrieve stripe customer ${event.data.object.customer} with organizationId in ${event.data.object.object} event: ${event.data.object.id}`);
            break;
          }

          const paymentMethodId = (() => {
            if (typeof(event.data.object.default_payment_method) == "string") return event.data.object.default_payment_method;
            if (event.data.object.default_payment_method == null || event.data.object.default_payment_method == undefined) return undefined;
            return event.data.object.default_payment_method.id;
          })();

          const stateToChange = await organizationBillingStateFromLatestSubscriptionInvoices({
            eventId: event.data.object.id,
            paymentMethodId,
            subscriptionId: event.data.object.id,
            customerId: customer.id,
          });

          if (typeof(stateToChange) == "string") {
            console.error(`Error from organizationBillingStateFromLatestSubscriptionInvoices ${event.data.object.id}: ${stateToChange}`);
            return;
          }

          await writeOrganizationBillingStateChanges(stateToChange);
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
          const {organizationId} = await stripeCustomerAndOrganizationId(event.data.object.customer);
          if (organizationId == undefined) {
            console.error(`Failed to retrieve stripe customer ${event.data.object.customer} in ${event.data.object.object} event: ${event.data.object.id}`);
            break;
          }

          console.debug(`Removing pendingSubscription from organizationId: ${organizationId} because subscription schedule ${event.data.object.id} status is ${event.data.object.status}`);
          await getBillingSubscriptionRef(organizationId).update({pendingSubscription: admin.firestore.FieldValue.delete()});


          break;
        }
        case "subscription_schedule.created":
        case "subscription_schedule.updated": {
          if (event.data.object.status != "active") {
            console.warn(`Ignoring inactive schedule update ${event.data.object.id}`);
            break;
          }

          const {customer, organizationId} = await stripeCustomerAndOrganizationId(event.data.object.customer);
          if (customer == undefined || organizationId == undefined) {
            console.error(`Failed to retrieve stripe customer ${event.data.object.customer} with organizationId in ${event.data.object.object} event: ${event.data.object.id}`);
            break;
          }

          const schedule = await stripe.subscriptionSchedules.retrieve(event.data.object.id);
          const pendingSubscription = await pendingSubscriptionFromSchedule({customer, organizationId: undefined}, schedule);

          console.debug({pendingSubscription});
          if (pendingSubscription == undefined) {
            console.debug(`Removing pendingSubscription ${schedule.id} from ${organizationId}`);
            await getBillingSubscriptionRef(organizationId).update({pendingSubscription: admin.firestore.FieldValue.delete()});
            console.debug(`Releasing subscriptionSchedule from customerId: ${customer.id} for organizationId: ${organizationId}`);
            await stripe.subscriptionSchedules.release(schedule.id);
          } else {
            console.debug(`Writing pendingSubscription for subscription schedule: ${event.data.object.id}`);
            await getBillingSubscriptionRef(organizationId).update({pendingSubscription});
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
      response.json({received: true});
    } catch (err) {
      console.error("Error processing webhook:", err);
      response.status(400).send(`Webhook Error: ${err.message}`);
    }
  });
