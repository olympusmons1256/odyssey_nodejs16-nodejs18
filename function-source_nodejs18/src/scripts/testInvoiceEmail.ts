import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import {emailStripeInvoice} from "../lib/stripe";

(async () => {
  const okResult = await emailStripeInvoice("in_1NGxT6Ks8IWXDckN7rJ7YUew");
  // const failureResult = await emailStripeInvoice("in_1NGvnNKs8IWXDckNqRs2k3vk");
  console.debug({okResult});
})();
