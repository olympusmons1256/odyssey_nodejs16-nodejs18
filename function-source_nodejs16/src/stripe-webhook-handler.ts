// eslint-disable-next-line spaced-comment
/// <reference types="stripe-event-types" />
import * as functions from "firebase-functions";
import Stripe from "stripe";
import {emailStripeInvoice, organizationBillingStateFromLatestSubscriptionInvoices, pendingSubscriptionFromSchedule, stripeCustomerAndOrganzationId, syncLatestStripeProductsToFirestore, writeOrganizationBillingStateChanges} from "./lib/stripe";
import * as docTypes from "./lib/docTypes";
import {customRunWithWarm} from "./shared";
import * as admin from "firebase-admin";
import {getBillingSubscriptionRef, getBillingStreamingCreditsPurchasesRef} from "./lib/documents/firestore";
import {getStripeSecretKey, getStripeWebhookSigningKey} from "./lib/firebase";

function getStripeSubscriptionId(subscription: string | Stripe.Subscription | null) {
  if (typeof(subscription) == "string") return subscription;
  if (subscription == null || subscription == undefined) return undefined;
  return subscription.id;
}

const customRunWithWarmStripeKey = {...customRunWithWarm, secrets: ["STRIPE_SECRETKEY", "STRIPE_WEBHOOK_SIGNING_KEY"]};
export const stripeWebhookHandler: functions.HttpsFunction =
functions
  .runWith(customRunWithWarmStripeKey)
  .https.onRequest(async (request, response) => {
    // console.debug({request});
    const stripeKey = getStripeSecretKey();
    if (stripeKey == undefined) {
      console.error("Stripe key not found");
      response.status(500);
      response.send("Internal error");
      return;
    }

    const webhookSigningKey = getStripeWebhookSigningKey();
    if (webhookSigningKey == undefined) {
      console.error("Stripe webhook signing key not found");
      response.status(500);
      response.send("Internal error");
      return;
    }

    const stripe = new Stripe(stripeKey, {apiVersion: "2022-11-15"});

    const signature = request.headers["stripe-signature"];
    if (signature == undefined) {
      response.status(400);
      response.send("No signature provided");
      return;
    }

    const event = await (async () => {
      try {
        return stripe.webhooks.constructEvent(
          request.rawBody,
          signature,
          webhookSigningKey
        ) as Stripe.DiscriminatedEvent;
      } catch (e: any) {
        console.error(e);
        response.status(400).send("Signature validation failed");
        return undefined;
      }
    })();

    if (event == undefined) {
      return;
    }

    console.debug(`Received event: ${event.type}`);
    // console.debug(event);

    switch (event.type) {
      case "invoice.payment_failed":
      case "invoice.paid": {
        if (event.data.object.object == "invoice") {
          try {
            const emailInvoiceResult = await emailStripeInvoice(event.data.object.id);
            if (emailInvoiceResult != true) throw new Error(`Failed to email invoice ${event.data.object.id}`);
          } catch (e: any) {
            console.error(e);
          }
          const {customer, organizationId} = await stripeCustomerAndOrganzationId(event.data.object.customer);
          if (customer == undefined || organizationId == undefined) {
            console.error(`Failed to retrieve stripe customer ${event.data.object.customer} with organizationId in ${event.data.object.object} event: ${event.data.object.id}`);
            break;
          }

          const customerId = customer.id;

          const addStreamingCredits = (async () => {
            if (event.data.object.status != "paid") {
              return;
            }

            const hasStreamingCredits = event.data.object.lines.data.find((li) => li.price?.metadata.priceType == "streaming-credits") != undefined;
            if (hasStreamingCredits == false) {
              console.debug(`Invoice does not include any streaming credits: ${event.data.object.id}`);
              return;
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

            return await getBillingStreamingCreditsPurchasesRef(organizationId).doc(event.data.object.id).create(streamingCreditsPurchase);
          })();

          const setOrganizationBillingState = (async () => {
            const subscriptionId = getStripeSubscriptionId(event.data.object.subscription);
            if (subscriptionId == undefined) {
              console.warn(`Invoice contains no subscription: ${event.data.object.id}`);
              return;
            }
            const stateToChange = await organizationBillingStateFromLatestSubscriptionInvoices({
              eventId: event.id,
              subscriptionId,
              customerId,
            });

            if (typeof(stateToChange) == "string") {
              console.error(`Error from organizationBillingStateFromLatestSubscriptionInvoices ${event.id}: ${stateToChange}`);
              return;
            }

            return await writeOrganizationBillingStateChanges(stateToChange);
          })();

          const result = await Promise.allSettled([
            addStreamingCredits,
            setOrganizationBillingState,
          ]);
          result.forEach((e) => {
            if (e.status == "rejected") {
              console.dir(e.reason, {depth: null});
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
        if (updateResult == 1) {
          console.error("Failed to sync stripe products to firestore");
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        // HACK: Debug log the entire event
        console.debug(JSON.stringify(event));

        const {customer, organizationId} = await stripeCustomerAndOrganzationId(event.data.object.customer);
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
          eventId: event.id,
          paymentMethodId,
          subscriptionId: event.data.object.id,
          customerId: customer.id,
        });

        if (typeof(stateToChange) == "string") {
          console.error(`Error from organizationBillingStateFromLatestSubscriptionInvoices ${event.id}: ${stateToChange}`);
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
        const {organizationId} = await stripeCustomerAndOrganzationId(event.data.object.customer);
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

        const {customer, organizationId} = await stripeCustomerAndOrganzationId(event.data.object.customer);
        if (customer == undefined || organizationId == undefined) {
          console.error(`Failed to retrieve stripe customer ${event.data.object.customer} with organizationId in ${event.data.object.object} event: ${event.data.object.id}`);
          break;
        }

        const schedule = await stripe.subscriptionSchedules.retrieve(event.data.object.id);
        const pendingSubscription = await pendingSubscriptionFromSchedule(customer, schedule);

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
  });
