/* eslint-disable quotes */
import * as admin from "firebase-admin";
import * as docTypes from "./lib/docTypes";
import * as functions from "firebase-functions";
import {customRunWith, customRunWithWarm} from "./shared";
import {getBillingPublic, getBillingPublicRef, getOrganizationsRef, getOrganizationRef, organizationWildcardPath, organizationUserWildcardPath} from "./lib/documents/firestore";
import {updateOrganizationBillingUsage} from "./lib/organizations";
import {getChangeType} from "./lib/bigQueryExport/util";
import {ChangeType} from "@newgameplus/firestore-bigquery-change-tracker";
import {SpaceItem, SpaceTemplate} from "./lib/cmsDocTypes";
import {FilteredSpaceTemplates, SpaceTemplatesWithSpaceItems} from "./lib/httpTypes";

// Return all space templates organization as uploaded
// or has access to
export const getOrganizationSpaceTemplates =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: FilteredSpaceTemplates) => {
      try {
        const querySnapshot = await admin.firestore().collectionGroup("spaceTemplates")
          .where(data.fieldPath, data.operation, data.value)
          .where("type", "==", "Bridge").get();
        const results : SpaceTemplatesWithSpaceItems[] = await Promise.all(querySnapshot.docs.map(async (doc) => {
          const spaceTemplateData = doc.data() as SpaceTemplate;
          const spaceTemplateItemsSnapshot = await doc.ref.collection("spaceTemplateItems").get();
          const spaceTemplateItems = spaceTemplateItemsSnapshot.docs.flatMap((itemDoc) => {
            if (!itemDoc.exists) return [];
            return [{...(itemDoc.data() as SpaceItem), id: itemDoc.id}];
          });
          return {...spaceTemplateData, id: doc.id, spaceTemplateItems};
        }));
        return results;
      } catch (error) {
        console.error('Error getting spaceTemplates:', error);
        return [];
      }
    });

// Check organization domain is valid string
// and is not used by another organization
export const verifyNewDomain =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (domain: string) => {
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
        const domainCheck = await getOrganizationsRef().where("domain", "==", validDomain).get();
        if (!domainCheck.empty) {
          throw new functions.https.HttpsError("invalid-argument", "Domain is already in use.");
        }
        return {result: "success"};
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

export const onCreateOrganizationSetDomain =
  // onCreate() organization
  // Set organizationId as default domain
  functions
    .runWith(customRunWith)
    .firestore
    .document(organizationWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId : string = context.params.organizationId;
      const organizationData = snapshot.data() as docTypes.Organization;

      if (!organizationData) {
        return console.warn("no organization data found");
      }

      if (!organizationData.domain) {
        organizationData.domain = organizationId;
      }

      return await getOrganizationRef(organizationId).set(organizationData, {merge: true});
    });

export const onCreateOrganizationAddActiveBillingState =
  // onCreate() organization
  // Set organizationId as default domain
  functions
    .runWith(customRunWith)
    .firestore
    .document(organizationWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(snapshot.data()));
      const organizationId : string = context.params.organizationId;
      const organizationData = snapshot.data() as docTypes.Organization;

      if (!organizationData) {
        return console.warn("no organization data found");
      }

      if (!organizationData.domain) {
        organizationData.domain = organizationId;
      }

      const [, billingPublic] = await getBillingPublic(organizationId);
      const hasActiveSubscription = billingPublic != undefined && billingPublic.hasActiveSubscription == true ? true : false;

      return await getBillingPublicRef(organizationId).set({hasActiveSubscription}, {merge: true});
    });

export const onWriteOrganizationUsersDenormalizeBillingUsage =
functions
  .runWith(customRunWithWarm)
  .firestore
  .document(organizationUserWildcardPath())
  .onWrite(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.debug("Document data before:");
    console.debug(JSON.stringify(change.before.data()));
    console.debug("Document data after:");
    console.debug(JSON.stringify(change.after.data()));
    const organizationId : string = context.params.organizationId;
    const changeType = getChangeType(change);
    if (changeType == ChangeType.DELETE || changeType == ChangeType.CREATE) {
      return await updateOrganizationBillingUsage(organizationId);
    }
  });
