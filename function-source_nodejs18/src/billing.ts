// @ts-nocheck - Node.js 16 compatibility
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {customRunWith, customRunWithWarm} from "../shared";
import {cancelStripeSubscriptionDowngrade, updateStripeSubscription, createNewCustomerAndCheckoutSandbox, generateStripeCheckoutUrl, generateStripeCustomerPortalUrl, invoiceAndPayAutoTopup} from "./lib/stripe/index";
import {createNewOrganizationWithOwner} from "./lib/organizations/index";
import {autoTopupPurchaseWildcardPath, billingFeaturesOverridePath, billingPublicPath, billingSubscriptionPath, billingUsagePath, getBillingAutoTopupsRef, getBillingProductsAvailable, getBillingPublic, getBillingPublicRef, getBillingSubscription, getBillingUsage, getBillingUsageRef, getRoomsRef, productsAvailablePath, streamingCreditsPurchaseWildcardPath} from "./lib/documents/firestore";
import {UpdateAutoTopupRequest, CheckoutSandboxRequest, StripeCustomerPortalRequest, UpdateSubscriptionRequest, SubscribeNewOrganizationRequest, StripeCheckoutRequest, OrganizationUsageRequest, OrganizationUsageResponse, ParticipantAnalyticsResponse, ParticipantAnalyticsRequest} from "./lib/httpTypes";
import {AutoTopup, BillingFeatures, BillingProductsAvailable, BillingPublic, BillingSubscription, BillingUsage, StreamingCreditsPurchase} from "./lib/docTypes";
import _ from "lodash";
import {getUserOrgRole, getOrganizationPermission} from "./lib/organizations";
import {sleep} from "./lib/misc";
import {queryOrganizationParticipantUsage, queryParticipantAnalytics} from "./lib/organizations/usage";
import {getChangeType} from "./lib/bigQueryExport/util";
import {ChangeType} from "@newgameplus/firestore-bigquery-change-tracker";
import {getFirebaseProjectId} from "./lib/firebase";
import {denormalizeBillingFeatures} from "./lib/billing";

const customRunWithWarmStripeKey = {...customRunWithWarm, secrets: ["STRIPE_SECRETKEY"]};
const customRunWithStripeKey = {...customRunWith, secrets: ["STRIPE_SECRETKEY"]};

const createOrganization =
  functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data: SubscribeNewOrganizationRequest, context) => {
      try {
        const userId = context.auth?.uid;

        if (userId == undefined) {
          throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }

        // create organization
        const newOrganizationId = await createNewOrganizationWithOwner(data.organizationDetails.name, userId);
        if (newOrganizationId == undefined) {
          throw new functions.https.HttpsError("internal", "Failed to create new organization. Internal error");
        }

        return newOrganizationId;
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

const checkoutSandbox =
  functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data: CheckoutSandboxRequest, context) => {
      try {
        const userId = context.auth?.uid;

        if (userId == undefined) {
          throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }

        // create stripe customer and send user to checkout sandbox
        const session = await createNewCustomerAndCheckoutSandbox(data.customerData, data.organizationId);
        if (session == "internal-error") {
          throw new functions.https.HttpsError("internal", "Internal server error");
        }

        return session;
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });


const onUpdateProductsAvailableDeserializeFeatures =
functions
  .runWith(customRunWithStripeKey)
  .firestore
  .document(productsAvailablePath())
  .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const productsAvailableBefore = change.before.data() as BillingProductsAvailable;
    const productsAvailableAfter = change.after.data() as BillingProductsAvailable;
    const changedProductIds = Object.entries(productsAvailableAfter.tiers).flatMap(([k, v]) => {
      if (_.isEqual(v.features, productsAvailableBefore.tiers[k].features)) return [k];
      return [];
    });
    console.debug({changedProductIds});
    const organizationsToUpdate = (await Promise.all(changedProductIds.map(async (productId) => {
      const subscriptionDocs = await admin.firestore().collectionGroup("billing")
        .where(admin.firestore.FieldPath.documentId(), "==", "subscription")
        .where("stripeProductId", "==", productId).get();
      return subscriptionDocs.docs.flatMap((doc) => (doc.ref.parent.parent != null) ? [{id: doc.ref.parent.parent.id, productId}] : []);
    }))).flat();

    console.debug({organizationsToUpdate});
    return await Promise.all(organizationsToUpdate.map(async (organization) => await denormalizeBillingFeatures(organization.id)));
  });

const onUpdateFeaturesOverrideDenormalize =
functions
  .runWith(customRunWithStripeKey)
  .firestore
  .document(billingFeaturesOverridePath())
  .onWrite(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId: string = context.params.organizationId;
    return await denormalizeBillingFeatures(organizationId);
  });

const getOrganizationParticipantUsage =
  functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data: OrganizationUsageRequest, context) => {
      try {
        const userId = context.auth?.uid;
        if (userId == undefined) {
          throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        if (data.organizationId == undefined) {
          throw new functions.https.HttpsError("invalid-argument", "Missing organizationId parameter");
        }
        if (data.afterTimestamp == undefined) {
          throw new functions.https.HttpsError("invalid-argument", "Missing afterTimestamp parameter");
        }

        if (data.aggregation != undefined && data.aggregation != "sumCreditsUsedBySpaceId") {
          throw new functions.https.HttpsError("invalid-argument", "Value of aggregation is invalid");
        }

        const count = (() => {
          if (data.count == undefined) return 1000;
          try {
            return Number(data.count);
          } catch (e) {
            return "error";
          }
        })();
        if (count == "error") {
          throw new functions.https.HttpsError("invalid-argument", "Invalid count parameter");
        }

        const offset = (() => {
          if (data.offset == undefined) return 0;
          try {
            return Number(data.offset);
          } catch (e) {
            return "error";
          }
        })();
        if (offset == "error") {
          throw new functions.https.HttpsError("invalid-argument", "Invalid offset parameter");
        }

        const after = (() => {
          try {
            if (data.afterTimestamp == undefined) {
              throw new Error("data.afterTimestamp is undefined");
            }
            return new Date(data.afterTimestamp);
          } catch (e) {
            return "error";
          }
        })();
        if (after == "error") {
          throw new functions.https.HttpsError("invalid-argument", "Invalid afterTimestamp parameter");
        }

        const beforeFromParams = (() => {
          if (data.beforeTimestamp == undefined) {
            return undefined;
          }
          try {
            return new Date(data.beforeTimestamp);
          } catch (e) {
            return "error";
          }
        })();
        if (beforeFromParams == "error") {
          throw new functions.https.HttpsError("invalid-argument", "Invalid beforeTimestamp parameter");
        }

        const before = (beforeFromParams != undefined) ? beforeFromParams : new Date();
        const thirtyOneDaysMillis = 60 * 60 * 24 * 1000 * 31;

        if (before.valueOf() - after.valueOf() > thirtyOneDaysMillis) {
          throw new functions.https.HttpsError("invalid-argument", "Exceeded 31-day maximum query time range");
        }

        const userRole = await getUserOrgRole(data.organizationId, userId);
        if (userRole == undefined || (userRole != "org_admin" && userRole != "org_editor" && userRole != "org_owner")) {
          throw new functions.https.HttpsError("permission-denied", "User doesn't have access to the requested organization's usage data");
        }

        const result = await queryOrganizationParticipantUsage({
          offset,
          count,
          projectId: getFirebaseProjectId(),
          after,
          before,
          organizationId: data.organizationId,
          aggregation: data.aggregation,
        });

        const response : OrganizationUsageResponse = {
          organizationId: data.organizationId,
          afterTimestamp: data.afterTimestamp,
          beforeTimestamp: data.beforeTimestamp,
          usageRecords: result.usageRecords,
          aggregation: result.sumCreditsUsedBySpaceId,
          pageSize: count,
        };

        console.debug(`Returning ${result.usageRecords?.length} results for timeframe ${after.toISOString()} ${before.toISOString()}`);

        return response;
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

const getParticipantAnalytics =
  functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data: ParticipantAnalyticsRequest, context) => {
      try {
        const userId = context.auth?.uid;
        if (userId == undefined) {
          throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        if (data.organizationId == undefined) {
          throw new functions.https.HttpsError("invalid-argument", "Missing organizationId parameter");
        }
        if (data.afterTimestamp == undefined) {
          throw new functions.https.HttpsError("invalid-argument", "Missing afterTimestamp parameter");
        }

        const count = (() => {
          if (data.count == undefined) return 1000;
          try {
            return Number(data.count);
          } catch (e) {
            return "error";
          }
        })();
        if (count == "error") {
          throw new functions.https.HttpsError("invalid-argument", "Invalid count parameter");
        }

        const offset = (() => {
          if (data.offset == undefined) return 0;
          try {
            return Number(data.offset);
          } catch (e) {
            return "error";
          }
        })();
        if (offset == "error") {
          throw new functions.https.HttpsError("invalid-argument", "Invalid offset parameter");
        }

        const after = (() => {
          try {
            if (data.afterTimestamp == undefined) {
              throw new Error("data.afterTimestamp is undefined");
            }
            return new Date(data.afterTimestamp);
          } catch (e) {
            return "error";
          }
        })();
        if (after == "error") {
          throw new functions.https.HttpsError("invalid-argument", "Invalid afterTimestamp parameter");
        }

        const beforeFromParams = (() => {
          if (data.beforeTimestamp == undefined) {
            return undefined;
          }
          try {
            return new Date(data.beforeTimestamp);
          } catch (e) {
            return "error";
          }
        })();
        if (beforeFromParams == "error") {
          throw new functions.https.HttpsError("invalid-argument", "Invalid beforeTimestamp parameter");
        }

        const before = (beforeFromParams != undefined) ? beforeFromParams : new Date();
        const thirtyOneDaysMillis = 60 * 60 * 24 * 1000 * 31;

        if (before.valueOf() - after.valueOf() > thirtyOneDaysMillis) {
          throw new functions.https.HttpsError("invalid-argument", "Exceeded 31-day maximum query time range");
        }

        const userRole = await getUserOrgRole(data.organizationId, userId);
        if (userRole == undefined || (userRole != "org_admin" && userRole != "org_editor" && userRole != "org_owner")) {
          throw new functions.https.HttpsError("permission-denied", "User doesn't have access to the requested organization's analytics data");
        }

        const result = await queryParticipantAnalytics({
          offset,
          count,
          projectId: getFirebaseProjectId(),
          after,
          before,
          organizationId: data.organizationId,
        });

        const response : ParticipantAnalyticsResponse = {
          organizationId: data.organizationId,
          afterTimestamp: data.afterTimestamp,
          beforeTimestamp: data.beforeTimestamp,
          results: result.results || [],
          pageSize: count,
        };

        console.debug(`Returning ${result.results?.length} results for timeframe ${after.toISOString()} ${before.toISOString()}`);

        return response;
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

const generateCheckoutUrl =
  functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data: StripeCheckoutRequest, context) => {
      try {
        const userId = context.auth?.uid;
        if (userId == undefined) {
          throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        if (data.customerId == undefined) {
          console.error("No customer id found");
          throw new functions.https.HttpsError("internal", "Internal server error");
        }
        if (data.items == undefined || data.items.length === 0) {
          console.error("No items passed");
          throw new functions.https.HttpsError("internal", "Internal server error");
        }
        const session = await generateStripeCheckoutUrl(data);
        return session;
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

const generateCustomerPortalUrl =
  functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data: StripeCustomerPortalRequest, context) => {
      try {
        const userId = context.auth?.uid;
        if (userId == undefined) {
          throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        if (data.customerId == undefined) {
          console.error("No customer id found");
          throw new functions.https.HttpsError("internal", "Internal server error");
        }
        const session = await generateStripeCustomerPortalUrl(data);
        return session;
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

const updateSubscription =
  functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data: UpdateSubscriptionRequest, context) => {
      try {
        // verify user permissions
        const userId = context.auth?.uid;
        if (userId == undefined) {
          throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        const userOrgRole = await getUserOrgRole(data.organizationId, userId);
        if (userOrgRole == undefined) {
          throw new functions.https.HttpsError("permission-denied", "User role not found");
        }
        const canEditBilling = await getOrganizationPermission({action: "editBilling", userRole: userOrgRole});
        if (!canEditBilling) {
          throw new functions.https.HttpsError("permission-denied", "Permission denied");
        }

        // Initialize stripe
        const stripeKey = getFirebaseProjectId();
        if (!stripeKey) {
          throw new functions.https.HttpsError("internal", "Stripe key not found");
        }
        const stripe = new Stripe(stripeKey, {apiVersion: "2023-10-16"});

        // Get existing subscription and usage
        const [, existingSubscription] = await getBillingSubscription(data.organizationId);
        if (!existingSubscription) {
          throw new functions.https.HttpsError("not-found", "Subscription not found");
        }

        const [, existingUsage] = await getBillingUsage(data.organizationId);
        if (!existingUsage) {
          throw new functions.https.HttpsError("not-found", "Usage not found");
        }

        // Get billing products
        const [, billingProductsAvailable] = await getBillingProductsAvailable();
        if (!billingProductsAvailable || !billingProductsAvailable.tiers) {
          throw new functions.https.HttpsError("internal", "Billing products not found");
        }

        // Get new product subscription
        const newProductId = data.productId || existingSubscription.pendingSubscription?.stripeProductId || existingSubscription.stripeProductId;
        const newProductSubscription = Object.entries(billingProductsAvailable.tiers)
          .flatMap(([k, v]) => k === newProductId ? {...v} : [])
          .pop();

        if (!newProductSubscription) {
          throw new functions.https.HttpsError("not-found", "New product subscription not found");
        }

        // update stripe subscription
        const subscription = await stripe.subscriptions.retrieve(data.subscriptionId);
        if (!subscription) {
          throw new functions.https.HttpsError("not-found", "Subscription not found");
        }

        // @ts-ignore - Node.js 16 compatibility: function accepts multiple arguments
        return await updateStripeSubscription(subscription, data, newProductSubscription, existingUsage);
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          if ((e as Error).message == "no-default-payment-method") {
            throw new functions.https.HttpsError("not-found", "No payment method found. Please add one by managing your account in stripe");
          }
          console.error(e);
          throw new functions.https.HttpsError("internal", "An error occurred. Please try again.");
        }
      }
    });

const cancelSubscriptionDowngrade =
  functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data: UpdateSubscriptionRequest, context) => {
      try {
        // verify user permissions
        const userId = context.auth?.uid;
        if (userId == undefined) {
          throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        const userOrgRole = await getUserOrgRole(data.organizationId, userId);
        if (userOrgRole == undefined) {
          throw new functions.https.HttpsError("permission-denied", "User role not found");
        }
        const canEditBilling = await getOrganizationPermission({action: "editBilling", userRole: userOrgRole});
        if (!canEditBilling) {
          throw new functions.https.HttpsError("permission-denied", "Permission denied");
        }
        // update stripe subscription
        return await cancelStripeSubscriptionDowngrade(data.subscriptionId);
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error(e);
          throw new functions.https.HttpsError("internal", "An error occurred. Please try again.");
        }
      }
    });

const onAggregateBillingStateInactiveUpdateRooms =
  functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document(billingPublicPath())
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const organizationId: string = context.params.organizationId;
      const billingPublic = change.after.data() as BillingPublic;
      if (billingPublic.aggregateBillingState == undefined || billingPublic.aggregateBillingState == "active") {
        return console.debug(`billing/public:aggregateBillingState for ${organizationId} is ${billingPublic.aggregateBillingState}. Doing nothing.`);
      }
      const graceTimeSeconds = 120;
      console.log(`Waiting for ${graceTimeSeconds} seconds beforeFromParams rejecting rooms & participants`);
      await sleep(graceTimeSeconds * 1000);
      const [, latestBillingPublic] = await getBillingPublic(organizationId);
      if (latestBillingPublic == undefined) {
        return console.error(`Failed to get the latest billing/public for ${organizationId}. Doing nothing`);
      }
      if (latestBillingPublic.aggregateBillingState == undefined || latestBillingPublic.aggregateBillingState == "active") {
        return console.debug(`Latest billing/public:aggregateBillingState for ${organizationId} is now ${latestBillingPublic.aggregateBillingState}. Taking no further action`);
      }
      // Reject rooms
      const roomDocs = (await getRoomsRef(organizationId).where("state", "!=", "deprovisioned").get()).docs;
      await Promise.all(roomDocs.map(async (roomDoc) => {
        return await roomDoc.ref.update({updated: admin.firestore.Timestamp.now(), rejectedByBilling: true});
      }));
      console.debug(`Billing rejected ${roomDocs.length} room docs under organizationId: ${organizationId}`);
      return;
    });

async function setAggregateBillingState(config: { organizationId: string; billingPublic?: BillingPublic }) {
  const billingPublic_ = await (async () => {
    if (config.billingPublic != undefined) return config.billingPublic;
    return (await getBillingPublic(config.organizationId))[1];
  })();
  if (billingPublic_ == undefined) {
    console.error(`Failed to get billing/public for organizationId: ${config.organizationId}`);
    return;
  }
  const aggregateBillingState = ((billingPublic_.hasAvailableCredits && billingPublic_.hasActiveSubscription) || billingPublic_.disableBilling === true) ? "active" : "inactive";
  return await getBillingPublicRef(config.organizationId).update({aggregateBillingState});
}

const updateAutoTopupCreditsSettings =
functions
  .runWith(customRunWithWarmStripeKey)
  .https.onCall(async (data: UpdateAutoTopupRequest) => {
    try {
      if (data.organizationId == undefined) {
        throw new functions.https.HttpsError("not-found", "Organization data not passed");
      }
      const [, existingSubscription] = await getBillingUsage(data.organizationId);
      if (existingSubscription == undefined) {
        throw new functions.https.HttpsError("not-found", "Subscription not found");
      }
      // user is disabling auto topup - remove data from subscription
      if (data.enabled == false) {
        return await getBillingUsageRef(data.organizationId).update({autoTopupCredits: admin.firestore.FieldValue.delete()});
      }
      // verify quantity and return
      if (data.quantity < 1 || data.quantity > 999 || data.threshold < 1) {
        throw new functions.https.HttpsError("not-found", "Quantity/threshold invalid");
      }
      return await getBillingUsageRef(data.organizationId).update({autoTopupCredits: {quantity: data.quantity, threshold: data.threshold}});
    } catch (e: any) {
      console.error("Unknown error encountered");
      console.error(e);
      throw new functions.https.HttpsError("internal", "Unknown error");
    }
  });

const onUpdateBillingSubscriptionDenormalizePublic =
  functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document(billingSubscriptionPath())
    .onWrite(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const organizationId: string = context.params.organizationId;
      const {hasActiveSubscription, features} = await (async () => {
        const changeType = getChangeType(change);
        switch (changeType) {
          case ChangeType.DELETE: {
            return {hasActiveSubscription: false, features: undefined};
          }
          case ChangeType.CREATE:
          case ChangeType.UPDATE: {
            const [, productsAvailable] = await getBillingProductsAvailable();
            if (productsAvailable == undefined) {
              throw new Error("Error: Failed to resolve products available");
            }
            const billingSubscription = change.after.data() as BillingSubscription;
            const hasActiveSubscription = billingSubscription.stripeSubscription.status === "active";
            const features: BillingFeatures = productsAvailable.tiers[billingSubscription.stripeProductId]?.features;
            return {hasActiveSubscription, features};
          }
          default: {
            throw new Error(`ChangeType not supported ${changeType.toString()}`);
          }
        }
      })();
      return await getBillingPublicRef(organizationId).set({features, hasActiveSubscription}, {merge: true});
    });

const onUpdateBillingPublicAggregateBillingState =
  functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document(billingPublicPath())
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const organizationId: string = context.params.organizationId;
      const billingPublic = change.after.data() as BillingPublic;
      return await setAggregateBillingState({organizationId, billingPublic});
    });

const denormalizeBillingUsageToBillingPublic =
  functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document(billingUsagePath())
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const organizationId = context.params.organizationId;
      const usage = change.after.data() as BillingUsage;

      const hasAvailableCredits = (() => {
        if (usage.availableCredits <= 0) {
          console.info(`Organization: ${organizationId} now has less than zero credits: ${usage.availableCredits}`);
          return false;
        }
        console.info(`Organization: ${organizationId} now has more than zero credits: ${usage.availableCredits}`);
        return true;
      })();

      const billingPublicUpdate = {hasAvailableCredits};

      console.debug(`Updating billing/public: ${billingPublicUpdate}`);
      return await getBillingPublicRef(organizationId).set(billingPublicUpdate, {merge: true});
    });

const onCreateStreamingCreditsPurchase =
  functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document(streamingCreditsPurchaseWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document:");
      console.log(JSON.stringify(snapshot.data()));
      const streamingCreditsPurchase = snapshot.data() as StreamingCreditsPurchase;
      const organizationId: string = context.params.organizationId;
      await getBillingUsageRef(organizationId).set({updated: admin.firestore.Timestamp.now(), availableCredits: admin.firestore.FieldValue.increment(streamingCreditsPurchase.quantity)}, {merge: true});
    });

const onUpdateUsageTriggerAutoTopup =
  functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document(billingUsagePath())
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const organizationId: string = context.params.organizationId;
      const billingUsage = change.after.data() as BillingUsage;
      if (billingUsage.autoTopupCredits == undefined) return;
      if (billingUsage.availableCredits > billingUsage.autoTopupCredits.threshold) return;
      const oneMinuteAgo = Date.now() - 60000;
      const lastTopupDoc = (await getBillingAutoTopupsRef(organizationId).orderBy("createdAt", "desc").limit(1).get()).docs.pop();
      if (lastTopupDoc != undefined) {
        const lastTopup = lastTopupDoc.data() as AutoTopup;
        if (lastTopup.createdAt.toMillis() >= oneMinuteAgo) {
          console.debug("There has already been an autotopup in the last minute. Doing nothing");
          return;
        }
      }
      const timestamp = admin.firestore.Timestamp.fromDate(new Date(context.timestamp));
      const autoTopup : AutoTopup = {
        createdAt: timestamp,
        updatedAt: timestamp,
        availableCredits: billingUsage.availableCredits,
        quantity: billingUsage.autoTopupCredits.quantity,
        state: "new",
      };
      return await getBillingAutoTopupsRef(organizationId).add(autoTopup);
    });

const onCreateAutoTopup =
  functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document(autoTopupPurchaseWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId: string = context.params.organizationId;
      const autoTopupId: string = context.params.autoTopupId;
      const autoTopup = snapshot.data() as AutoTopup;
      const [, productsAvailable] = await getBillingProductsAvailable();
      if (productsAvailable == undefined) {
        console.error("Failed to get products/available");
        return await snapshot.ref.update({state: "failed", updatedAt: admin.firestore.Timestamp.now()});
      }
      const [, billingUsage] = await getBillingUsage(organizationId);
      if (billingUsage == undefined) {
        console.error(`Organization has no billing/usage document: ${organizationId}`);
        return await snapshot.ref.update({state: "failed", updatedAt: admin.firestore.Timestamp.now()});
      }
      if (billingUsage.autoTopupCredits == undefined) {
        console.error(`Organization is not configured to auto topup: ${organizationId}`);
        return await snapshot.ref.update({state: "failed", updatedAt: admin.firestore.Timestamp.now()});
      }

      const [, billingSubscription] = await getBillingSubscription(organizationId);
      if (billingSubscription == undefined) {
        console.error(`Organization has no billing/subscription document: ${organizationId}`);
        return await snapshot.ref.update({state: "failed", updatedAt: admin.firestore.Timestamp.now()});
      }

      const streamingCreditsPriceId = Object.entries(productsAvailable.extras).flatMap(([id, o]) => (o.type == "streaming-credits") ? [id] : []).pop();
      if (streamingCreditsPriceId == undefined) {
        console.error("Failed to find streaming credits price in products/available");
        return await snapshot.ref.update({state: "failed", updatedAt: admin.firestore.Timestamp.now()});
      }
      const invoiceResult = await invoiceAndPayAutoTopup(billingSubscription.stripeCustomerId,
        autoTopup.quantity,
        streamingCreditsPriceId,
        autoTopupId,
      );

      if (invoiceResult == "stripe-key-not-found" || invoiceResult == "failed-to-pay-invoice") {
        console.error(`Failed autoTopup ${autoTopupId} with reason: ${invoiceResult}`);
        return await snapshot.ref.update({state: "failed", updatedAt: admin.firestore.Timestamp.now()});
      }

      return await snapshot.ref.update({stripeInvoiceId: invoiceResult.id, state: "paid", updatedAt: admin.firestore.Timestamp.now()});
    });

export const creates = {
  checkoutSandbox,
  createOrganization,
  onCreateStreamingCreditsPurchase,
  onCreateAutoTopup,
  generateCheckoutUrl,
  generateCustomerPortalUrl,
};

export const updates = {
  cancelSubscriptionDowngrade,
  onUpdateProductsAvailableDeserializeFeatures,
  updateSubscription,
  denormalizeBillingUsageToBillingPublic,
  onUpdateUsageTriggerAutoTopup,
  onUpdateBillingPublicAggregateBillingState,
  onUpdateBillingSubscriptionDenormalizePublic,
  onAggregateBillingStateInactiveUpdateRooms,
  updateAutoTopupCreditsSettings,
  onUpdateFeaturesOverrideDenormalize,
};

export const reads = {
  getOrganizationParticipantUsage,
  getParticipantAnalytics,
};
