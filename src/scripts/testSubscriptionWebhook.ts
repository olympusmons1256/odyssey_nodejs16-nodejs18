// @ts-nocheck
import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import {organizationBillingStateFromLatestSubscriptionInvoices, writeOrganizationBillingStateChanges} from "../lib/stripe";

(async () => {
  // const subscriptionId = "sub_1NAmruKs8IWXDckNFDOffywu";
  // const customerId = "cus_NwgEepr1AJoiGV";
  const subscriptionId = "sub_1NDdrGKs8IWXDckNblgCIrhf";
  const customerId = "cus_Nzd7Qz7tocPHmI";
  const eventId = "testing";

  try {
    const result = await organizationBillingStateFromLatestSubscriptionInvoices({
      eventId,
      subscriptionId,
      customerId,
    });

    console.debug({pendingSubscription: result.billingSubscription?.pendingSubscription});

    return await writeOrganizationBillingStateChanges(result);
  } catch (error) {
    console.error(`Error processing subscription state: ${error}`);
    return {success: false};
  }
})();
