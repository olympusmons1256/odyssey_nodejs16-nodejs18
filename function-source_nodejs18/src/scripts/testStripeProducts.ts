import * as admin from "firebase-admin";
import {syncLatestStripeProductsToFirestore} from "../lib/stripe";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

(async function f() {
  await syncLatestStripeProductsToFirestore();
})();
