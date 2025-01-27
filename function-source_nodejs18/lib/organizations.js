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
exports.onWriteOrganizationUsersDenormalizeBillingUsage = exports.onCreateOrganizationAddActiveBillingState = exports.onCreateOrganizationSetDomain = exports.verifyNewDomain = exports.getOrganizationSpaceTemplates = void 0;
/* eslint-disable quotes */
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const shared_1 = require("./shared");
const firestore_1 = require("./lib/documents/firestore");
const organizations_1 = require("./lib/organizations");
const util_1 = require("./lib/bigQueryExport/util");
const firestore_bigquery_change_tracker_1 = require("@newgameplus/firestore-bigquery-change-tracker");
// Return all space templates organization as uploaded
// or has access to
exports.getOrganizationSpaceTemplates = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data) => {
    try {
        const querySnapshot = await admin.firestore().collectionGroup("spaceTemplates")
            .where(data.fieldPath, data.operation, data.value)
            .where("type", "==", "Bridge").get();
        const results = await Promise.all(querySnapshot.docs.map(async (doc) => {
            const spaceTemplateData = doc.data();
            const spaceTemplateItemsSnapshot = await doc.ref.collection("spaceTemplateItems").get();
            const spaceTemplateItems = spaceTemplateItemsSnapshot.docs.flatMap((itemDoc) => {
                if (!itemDoc.exists)
                    return [];
                return [Object.assign(Object.assign({}, itemDoc.data()), { id: itemDoc.id })];
            });
            return Object.assign(Object.assign({}, spaceTemplateData), { id: doc.id, spaceTemplateItems });
        }));
        return results;
    }
    catch (error) {
        console.error('Error getting spaceTemplates:', error);
        return [];
    }
});
// Check organization domain is valid string
// and is not used by another organization
exports.verifyNewDomain = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (domain) => {
    try {
        const validDomain = domain.toLowerCase();
        if (!validDomain) {
            throw new functions.https.HttpsError("invalid-argument", "Empty domain is not allowed.");
        }
        if (validDomain === "create") {
            throw new functions.https.HttpsError("invalid-argument", "Route already in use.");
        }
        // Check passed string is made of letters, numbers, and hyphens
        const domainRegex = /^[\w-]+$/;
        const domainStringCheck = domainRegex.test(validDomain);
        if (!domainStringCheck || domain.length > 30) {
            throw new functions.https.HttpsError("invalid-argument", "Only letters, numbers, and hyphens are allowed in the domain.");
        }
        // Check domain is not already in use
        const domainCheck = await (0, firestore_1.getOrganizationsRef)().where("domain", "==", validDomain).get();
        if (!domainCheck.empty) {
            throw new functions.https.HttpsError("invalid-argument", "Domain is already in use.");
        }
        return { result: "success" };
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
exports.onCreateOrganizationSetDomain = 
// onCreate() organization
// Set organizationId as default domain
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.organizationWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const organizationData = snapshot.data();
    if (!organizationData) {
        return console.warn("no organization data found");
    }
    if (!organizationData.domain) {
        organizationData.domain = organizationId;
    }
    return await (0, firestore_1.getOrganizationRef)(organizationId).set(organizationData, { merge: true });
});
exports.onCreateOrganizationAddActiveBillingState = 
// onCreate() organization
// Set organizationId as default domain
functions
    .runWith(shared_1.customRunWith)
    .firestore
    .document((0, firestore_1.organizationWildcardPath)())
    .onCreate(async (snapshot, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(snapshot.data()));
    const organizationId = context.params.organizationId;
    const organizationData = snapshot.data();
    if (!organizationData) {
        return console.warn("no organization data found");
    }
    if (!organizationData.domain) {
        organizationData.domain = organizationId;
    }
    const [, billingPublic] = await (0, firestore_1.getBillingPublic)(organizationId);
    const hasActiveSubscription = billingPublic != undefined && billingPublic.hasActiveSubscription == true ? true : false;
    return await (0, firestore_1.getBillingPublicRef)(organizationId).set({ hasActiveSubscription }, { merge: true });
});
exports.onWriteOrganizationUsersDenormalizeBillingUsage = functions
    .runWith(shared_1.customRunWithWarm)
    .firestore
    .document((0, firestore_1.organizationUserWildcardPath)())
    .onWrite(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId = context.params.organizationId;
    const changeType = (0, util_1.getChangeType)(change);
    if (changeType == firestore_bigquery_change_tracker_1.ChangeType.DELETE || changeType == firestore_bigquery_change_tracker_1.ChangeType.CREATE) {
        return await (0, organizations_1.updateOrganizationBillingUsage)(organizationId);
    }
    return null;
});
//# sourceMappingURL=organizations.js.map