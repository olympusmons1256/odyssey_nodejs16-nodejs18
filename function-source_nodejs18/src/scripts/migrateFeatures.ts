import * as admin from "firebase-admin";
import {BillingFeatures} from "../lib/docTypes";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import {getBillingFeaturesOverrideRef, getBillingPublic, getOrganizations} from "../lib/documents/firestore";

(async () => {
  const organizationDocs = await getOrganizations();
  if (organizationDocs == undefined) {
    throw new Error("Failed to get organizations");
  }
  await Promise.all(organizationDocs.map(async (oDoc) => {
    const [organizationDoc, organization] = oDoc;
    if (organizationDoc == undefined || organization == undefined) {
      console.error("Undefined organization");
      return undefined;
    }
    const [, billingPublic] = await getBillingPublic(organizationDoc.id);
    if (billingPublic?.disableBilling == true) {
      const defaultFeatures : BillingFeatures = {
        bridge: true,
        restApi: true,
        sharding: true,
        analytics: true,
        publishSpace: true,
        inWorldStreams: true,
      };
      console.debug(`Setting featuresOverride for enterprise org '${organizationDoc.id}: ${organization.name}'`);
      return await getBillingFeaturesOverrideRef(organizationDoc.id).set(defaultFeatures, {merge: true});
    } else {
      console.debug(`Skipping '${organizationDoc.id}: ${organization.name}' as it is a subscription organization`);
      return null;
    }
  }));
})();
