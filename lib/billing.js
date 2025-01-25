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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reads = exports.updates = exports.creates = void 0;
// @ts-nocheck - Node.js 16 compatibility
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("./shared");
const index_1 = require("./lib/stripe/index");
const index_2 = require("./lib/organizations/index");
const firestore_1 = require("./lib/documents/firestore");
const lodash_1 = __importDefault(require("lodash"));
const organizations_1 = require("./lib/organizations");
const misc_1 = require("./lib/misc");
const usage_1 = require("./lib/organizations/usage");
const util_1 = require("./lib/bigQueryExport/util");
const firestore_bigquery_change_tracker_1 = require("@newgameplus/firestore-bigquery-change-tracker");
const firebase_1 = require("./lib/firebase");
const billing_1 = require("./lib/billing");
const customRunWithWarmStripeKey = Object.assign(Object.assign({}, shared_1.customRunWithWarm), { secrets: ["STRIPE_SECRETKEY"] });
const customRunWithStripeKey = Object.assign(Object.assign({}, shared_1.customRunWith), { secrets: ["STRIPE_SECRETKEY"] });
const createOrganization = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data, context) => {
    var _a;
    try {
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (userId == undefined) {
            throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        // create organization
        const newOrganizationId = await (0, index_2.createNewOrganizationWithOwner)(data.organizationDetails.name, userId);
        if (newOrganizationId == undefined) {
            throw new functions.https.HttpsError("internal", "Failed to create new organization. Internal error");
        }
        return newOrganizationId;
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            console.error("Unknown error encountered");
            console.error(e);
            throw new functions.https.HttpsError("internal", "Unknown error");
        }
    }
});
const checkoutSandbox = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data, context) => {
    var _a;
    try {
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (userId == undefined) {
            throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        // create stripe customer and send user to checkout sandbox
        const session = await (0, index_1.createNewCustomerAndCheckoutSandbox)(data.customerData, data.organizationId);
        if (session == "internal-error") {
            throw new functions.https.HttpsError("internal", "Internal server error");
        }
        return session;
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            console.error("Unknown error encountered");
            console.error(e);
            throw new functions.https.HttpsError("internal", "Unknown error");
        }
    }
});
const onUpdateProductsAvailableDeserializeFeatures = functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document((0, firestore_1.productsAvailablePath)())
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const productsAvailableBefore = change.before.data();
    const productsAvailableAfter = change.after.data();
    const changedProductIds = Object.entries(productsAvailableAfter.tiers).flatMap(([k, v]) => {
        if (lodash_1.default.isEqual(v.features, productsAvailableBefore.tiers[k].features))
            return [k];
        return [];
    });
    console.debug({ changedProductIds });
    const organizationsToUpdate = (await Promise.all(changedProductIds.map(async (productId) => {
        const subscriptionDocs = await admin.firestore().collectionGroup("billing")
            .where(admin.firestore.FieldPath.documentId(), "==", "subscription")
            .where("stripeProductId", "==", productId).get();
        return subscriptionDocs.docs.flatMap((doc) => (doc.ref.parent.parent != null) ? [{ id: doc.ref.parent.parent.id, productId }] : []);
    }))).flat();
    console.debug({ organizationsToUpdate });
    return await Promise.all(organizationsToUpdate.map(async (organization) => await (0, billing_1.denormalizeBillingFeatures)(organization.id)));
});
const onUpdateFeaturesOverrideDenormalize = functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document((0, firestore_1.billingFeaturesOverridePath)())
    .onWrite(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    return await (0, billing_1.denormalizeBillingFeatures)(organizationId);
});
const getOrganizationParticipantUsage = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data, context) => {
    var _a, _b;
    try {
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
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
            if (data.count == undefined)
                return 1000;
            try {
                return Number(data.count);
            }
            catch (e) {
                return "error";
            }
        })();
        if (count == "error") {
            throw new functions.https.HttpsError("invalid-argument", "Invalid count parameter");
        }
        const offset = (() => {
            if (data.offset == undefined)
                return 0;
            try {
                return Number(data.offset);
            }
            catch (e) {
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
            }
            catch (e) {
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
            }
            catch (e) {
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
        const userRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, userId);
        if (userRole == undefined || (userRole != "org_admin" && userRole != "org_editor" && userRole != "org_owner")) {
            throw new functions.https.HttpsError("permission-denied", "User doesn't have access to the requested organization's usage data");
        }
        const result = await (0, usage_1.queryOrganizationParticipantUsage)({
            offset,
            count,
            projectId: (0, firebase_1.getFirebaseProjectId)(),
            after,
            before,
            organizationId: data.organizationId,
            aggregation: data.aggregation,
        });
        const response = {
            organizationId: data.organizationId,
            afterTimestamp: data.afterTimestamp,
            beforeTimestamp: data.beforeTimestamp,
            usageRecords: result.usageRecords,
            aggregation: result.sumCreditsUsedBySpaceId,
            pageSize: count,
        };
        console.debug(`Returning ${(_b = result.usageRecords) === null || _b === void 0 ? void 0 : _b.length} results for timeframe ${after.toISOString()} ${before.toISOString()}`);
        return response;
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            console.error("Unknown error encountered");
            console.error(e);
            throw new functions.https.HttpsError("internal", "Unknown error");
        }
    }
});
const getParticipantAnalytics = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data, context) => {
    var _a, _b;
    try {
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
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
            if (data.count == undefined)
                return 1000;
            try {
                return Number(data.count);
            }
            catch (e) {
                return "error";
            }
        })();
        if (count == "error") {
            throw new functions.https.HttpsError("invalid-argument", "Invalid count parameter");
        }
        const offset = (() => {
            if (data.offset == undefined)
                return 0;
            try {
                return Number(data.offset);
            }
            catch (e) {
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
            }
            catch (e) {
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
            }
            catch (e) {
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
        const userRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, userId);
        if (userRole == undefined || (userRole != "org_admin" && userRole != "org_editor" && userRole != "org_owner")) {
            throw new functions.https.HttpsError("permission-denied", "User doesn't have access to the requested organization's analytics data");
        }
        const result = await (0, usage_1.queryParticipantAnalytics)({
            offset,
            count,
            projectId: (0, firebase_1.getFirebaseProjectId)(),
            after,
            before,
            organizationId: data.organizationId,
        });
        const response = {
            organizationId: data.organizationId,
            afterTimestamp: data.afterTimestamp,
            beforeTimestamp: data.beforeTimestamp,
            results: result.results || [],
            pageSize: count,
        };
        console.debug(`Returning ${(_b = result.results) === null || _b === void 0 ? void 0 : _b.length} results for timeframe ${after.toISOString()} ${before.toISOString()}`);
        return response;
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            console.error("Unknown error encountered");
            console.error(e);
            throw new functions.https.HttpsError("internal", "Unknown error");
        }
    }
});
const generateCheckoutUrl = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data, context) => {
    var _a;
    try {
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
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
        const session = await (0, index_1.generateStripeCheckoutUrl)(data);
        return session;
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            console.error("Unknown error encountered");
            console.error(e);
            throw new functions.https.HttpsError("internal", "Unknown error");
        }
    }
});
const generateCustomerPortalUrl = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data, context) => {
    var _a;
    try {
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (userId == undefined) {
            throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        if (data.customerId == undefined) {
            console.error("No customer id found");
            throw new functions.https.HttpsError("internal", "Internal server error");
        }
        const session = await (0, index_1.generateStripeCustomerPortalUrl)(data);
        return session;
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            console.error("Unknown error encountered");
            console.error(e);
            throw new functions.https.HttpsError("internal", "Unknown error");
        }
    }
});
const updateSubscription = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data, context) => {
    var _a, _b;
    try {
        // verify user permissions
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (userId == undefined) {
            throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, userId);
        if (userOrgRole == undefined) {
            throw new functions.https.HttpsError("permission-denied", "User role not found");
        }
        const canEditBilling = await (0, organizations_1.getOrganizationPermission)({ action: "editBilling", userRole: userOrgRole });
        if (!canEditBilling) {
            throw new functions.https.HttpsError("permission-denied", "Permission denied");
        }
        // Initialize stripe
        const stripeKey = (0, firebase_1.getFirebaseProjectId)();
        if (!stripeKey) {
            throw new functions.https.HttpsError("internal", "Stripe key not found");
        }
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        // Get existing subscription and usage
        const [, existingSubscription] = await (0, firestore_1.getBillingSubscription)(data.organizationId);
        if (!existingSubscription) {
            throw new functions.https.HttpsError("not-found", "Subscription not found");
        }
        const [, existingUsage] = await (0, firestore_1.getBillingUsage)(data.organizationId);
        if (!existingUsage) {
            throw new functions.https.HttpsError("not-found", "Usage not found");
        }
        // Get billing products
        const [, billingProductsAvailable] = await (0, firestore_1.getBillingProductsAvailable)();
        if (!billingProductsAvailable || !billingProductsAvailable.tiers) {
            throw new functions.https.HttpsError("internal", "Billing products not found");
        }
        // Get new product subscription
        const newProductId = data.productId || ((_b = existingSubscription.pendingSubscription) === null || _b === void 0 ? void 0 : _b.stripeProductId) || existingSubscription.stripeProductId;
        const newProductSubscription = Object.entries(billingProductsAvailable.tiers)
            .flatMap(([k, v]) => k === newProductId ? Object.assign({}, v) : [])
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
        return await (0, index_1.updateStripeSubscription)(subscription, data, newProductSubscription, existingUsage);
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            if (e.message == "no-default-payment-method") {
                throw new functions.https.HttpsError("not-found", "No payment method found. Please add one by managing your account in stripe");
            }
            console.error(e);
            throw new functions.https.HttpsError("internal", "An error occurred. Please try again.");
        }
    }
});
const cancelSubscriptionDowngrade = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data, context) => {
    var _a;
    try {
        // verify user permissions
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (userId == undefined) {
            throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        const userOrgRole = await (0, organizations_1.getUserOrgRole)(data.organizationId, userId);
        if (userOrgRole == undefined) {
            throw new functions.https.HttpsError("permission-denied", "User role not found");
        }
        const canEditBilling = await (0, organizations_1.getOrganizationPermission)({ action: "editBilling", userRole: userOrgRole });
        if (!canEditBilling) {
            throw new functions.https.HttpsError("permission-denied", "Permission denied");
        }
        // update stripe subscription
        return await (0, index_1.cancelStripeSubscriptionDowngrade)(data.subscriptionId);
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            console.error(e);
            throw new functions.https.HttpsError("internal", "An error occurred. Please try again.");
        }
    }
});
const onAggregateBillingStateInactiveUpdateRooms = functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document((0, firestore_1.billingPublicPath)())
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const billingPublic = change.after.data();
    if (billingPublic.aggregateBillingState == undefined || billingPublic.aggregateBillingState == "active") {
        return console.debug(`billing/public:aggregateBillingState for ${organizationId} is ${billingPublic.aggregateBillingState}. Doing nothing.`);
    }
    const graceTimeSeconds = 120;
    console.log(`Waiting for ${graceTimeSeconds} seconds beforeFromParams rejecting rooms & participants`);
    await (0, misc_1.sleep)(graceTimeSeconds * 1000);
    const [, latestBillingPublic] = await (0, firestore_1.getBillingPublic)(organizationId);
    if (latestBillingPublic == undefined) {
        return console.error(`Failed to get the latest billing/public for ${organizationId}. Doing nothing`);
    }
    if (latestBillingPublic.aggregateBillingState == undefined || latestBillingPublic.aggregateBillingState == "active") {
        return console.debug(`Latest billing/public:aggregateBillingState for ${organizationId} is now ${latestBillingPublic.aggregateBillingState}. Taking no further action`);
    }
    // Reject rooms
    const roomDocs = (await (0, firestore_1.getRoomsRef)(organizationId).where("state", "!=", "deprovisioned").get()).docs;
    await Promise.all(roomDocs.map(async (roomDoc) => {
        return await roomDoc.ref.update({ updated: admin.firestore.Timestamp.now(), rejectedByBilling: true });
    }));
    console.debug(`Billing rejected ${roomDocs.length} room docs under organizationId: ${organizationId}`);
    return;
});
async function setAggregateBillingState(config) {
    const billingPublic_ = await (async () => {
        if (config.billingPublic != undefined)
            return config.billingPublic;
        return (await (0, firestore_1.getBillingPublic)(config.organizationId))[1];
    })();
    if (billingPublic_ == undefined) {
        console.error(`Failed to get billing/public for organizationId: ${config.organizationId}`);
        return;
    }
    const aggregateBillingState = ((billingPublic_.hasAvailableCredits && billingPublic_.hasActiveSubscription) || billingPublic_.disableBilling === true) ? "active" : "inactive";
    return await (0, firestore_1.getBillingPublicRef)(config.organizationId).update({ aggregateBillingState });
}
const updateAutoTopupCreditsSettings = functions
    .runWith(customRunWithWarmStripeKey)
    .https.onCall(async (data) => {
    try {
        if (data.organizationId == undefined) {
            throw new functions.https.HttpsError("not-found", "Organization data not passed");
        }
        const [, existingSubscription] = await (0, firestore_1.getBillingUsage)(data.organizationId);
        if (existingSubscription == undefined) {
            throw new functions.https.HttpsError("not-found", "Subscription not found");
        }
        // user is disabling auto topup - remove data from subscription
        if (data.enabled == false) {
            return await (0, firestore_1.getBillingUsageRef)(data.organizationId).update({ autoTopupCredits: admin.firestore.FieldValue.delete() });
        }
        // verify quantity and return
        if (data.quantity < 1 || data.quantity > 999 || data.threshold < 1) {
            throw new functions.https.HttpsError("not-found", "Quantity/threshold invalid");
        }
        return await (0, firestore_1.getBillingUsageRef)(data.organizationId).update({ autoTopupCredits: { quantity: data.quantity, threshold: data.threshold } });
    }
    catch (e) {
        console.error("Unknown error encountered");
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
    }
});
const onUpdateBillingSubscriptionDenormalizePublic = functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document((0, firestore_1.billingSubscriptionPath)())
    .onWrite(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const { hasActiveSubscription, features } = await (async () => {
        var _a;
        const changeType = (0, util_1.getChangeType)(change);
        switch (changeType) {
            case firestore_bigquery_change_tracker_1.ChangeType.DELETE: {
                return { hasActiveSubscription: false, features: undefined };
            }
            case firestore_bigquery_change_tracker_1.ChangeType.CREATE:
            case firestore_bigquery_change_tracker_1.ChangeType.UPDATE: {
                const [, productsAvailable] = await (0, firestore_1.getBillingProductsAvailable)();
                if (productsAvailable == undefined) {
                    throw new Error("Error: Failed to resolve products available");
                }
                const billingSubscription = change.after.data();
                const hasActiveSubscription = billingSubscription.stripeSubscription.status === "active";
                const features = (_a = productsAvailable.tiers[billingSubscription.stripeProductId]) === null || _a === void 0 ? void 0 : _a.features;
                return { hasActiveSubscription, features };
            }
            default: {
                throw new Error(`ChangeType not supported ${changeType.toString()}`);
            }
        }
    })();
    return await (0, firestore_1.getBillingPublicRef)(organizationId).set({ features, hasActiveSubscription }, { merge: true });
});
const onUpdateBillingPublicAggregateBillingState = functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document((0, firestore_1.billingPublicPath)())
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const billingPublic = change.after.data();
    return await setAggregateBillingState({ organizationId, billingPublic });
});
const denormalizeBillingUsageToBillingPublic = functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document((0, firestore_1.billingUsagePath)())
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const usage = change.after.data();
    const hasAvailableCredits = (() => {
        if (usage.availableCredits <= 0) {
            console.info(`Organization: ${organizationId} now has less than zero credits: ${usage.availableCredits}`);
            return false;
        }
        console.info(`Organization: ${organizationId} now has more than zero credits: ${usage.availableCredits}`);
        return true;
    })();
    const billingPublicUpdate = { hasAvailableCredits };
    console.debug(`Updating billing/public: ${billingPublicUpdate}`);
    return await (0, firestore_1.getBillingPublicRef)(organizationId).set(billingPublicUpdate, { merge: true });
});
const onCreateStreamingCreditsPurchase = functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document((0, firestore_1.streamingCreditsPurchaseWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document:");
    console.log(JSON.stringify(snapshot.data()));
    const streamingCreditsPurchase = snapshot.data();
    const organizationId = context.params.organizationId;
    await (0, firestore_1.getBillingUsageRef)(organizationId).set({ updated: admin.firestore.Timestamp.now(), availableCredits: admin.firestore.FieldValue.increment(streamingCreditsPurchase.quantity) }, { merge: true });
});
const onUpdateUsageTriggerAutoTopup = functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document((0, firestore_1.billingUsagePath)())
    .onUpdate(async (change, context) => {
    console.debug("Document context:");
    console.debug(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const billingUsage = change.after.data();
    if (billingUsage.autoTopupCredits == undefined)
        return;
    if (billingUsage.availableCredits > billingUsage.autoTopupCredits.threshold)
        return;
    const oneMinuteAgo = Date.now() - 60000;
    const lastTopupDoc = (await (0, firestore_1.getBillingAutoTopupsRef)(organizationId).orderBy("createdAt", "desc").limit(1).get()).docs.pop();
    if (lastTopupDoc != undefined) {
        const lastTopup = lastTopupDoc.data();
        if (lastTopup.createdAt.toMillis() >= oneMinuteAgo) {
            console.debug("There has already been an autotopup in the last minute. Doing nothing");
            return;
        }
    }
    const timestamp = admin.firestore.Timestamp.fromDate(new Date(context.timestamp));
    const autoTopup = {
        createdAt: timestamp,
        updatedAt: timestamp,
        availableCredits: billingUsage.availableCredits,
        quantity: billingUsage.autoTopupCredits.quantity,
        state: "new",
    };
    return await (0, firestore_1.getBillingAutoTopupsRef)(organizationId).add(autoTopup);
});
const onCreateAutoTopup = functions
    .runWith(customRunWithStripeKey)
    .firestore
    .document((0, firestore_1.autoTopupPurchaseWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const autoTopupId = context.params.autoTopupId;
    const autoTopup = snapshot.data();
    const [, productsAvailable] = await (0, firestore_1.getBillingProductsAvailable)();
    if (productsAvailable == undefined) {
        console.error("Failed to get products/available");
        return await snapshot.ref.update({ state: "failed", updatedAt: admin.firestore.Timestamp.now() });
    }
    const [, billingUsage] = await (0, firestore_1.getBillingUsage)(organizationId);
    if (billingUsage == undefined) {
        console.error(`Organization has no billing/usage document: ${organizationId}`);
        return await snapshot.ref.update({ state: "failed", updatedAt: admin.firestore.Timestamp.now() });
    }
    if (billingUsage.autoTopupCredits == undefined) {
        console.error(`Organization is not configured to auto topup: ${organizationId}`);
        return await snapshot.ref.update({ state: "failed", updatedAt: admin.firestore.Timestamp.now() });
    }
    const [, billingSubscription] = await (0, firestore_1.getBillingSubscription)(organizationId);
    if (billingSubscription == undefined) {
        console.error(`Organization has no billing/subscription document: ${organizationId}`);
        return await snapshot.ref.update({ state: "failed", updatedAt: admin.firestore.Timestamp.now() });
    }
    const streamingCreditsPriceId = Object.entries(productsAvailable.extras).flatMap(([id, o]) => (o.type == "streaming-credits") ? [id] : []).pop();
    if (streamingCreditsPriceId == undefined) {
        console.error("Failed to find streaming credits price in products/available");
        return await snapshot.ref.update({ state: "failed", updatedAt: admin.firestore.Timestamp.now() });
    }
    const invoiceResult = await (0, index_1.invoiceAndPayAutoTopup)(billingSubscription.stripeCustomerId, autoTopup.quantity, streamingCreditsPriceId, autoTopupId);
    if (invoiceResult == "stripe-key-not-found" || invoiceResult == "failed-to-pay-invoice") {
        console.error(`Failed autoTopup ${autoTopupId} with reason: ${invoiceResult}`);
        return await snapshot.ref.update({ state: "failed", updatedAt: admin.firestore.Timestamp.now() });
    }
    return await snapshot.ref.update({ stripeInvoiceId: invoiceResult.id, state: "paid", updatedAt: admin.firestore.Timestamp.now() });
});
exports.creates = {
    checkoutSandbox,
    createOrganization,
    onCreateStreamingCreditsPurchase,
    onCreateAutoTopup,
    generateCheckoutUrl,
    generateCustomerPortalUrl,
};
exports.updates = {
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
exports.reads = {
    getOrganizationParticipantUsage,
    getParticipantAnalytics,
};
//# sourceMappingURL=billing.js.map