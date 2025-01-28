import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import {getBillingRef, getOrganizationsRef} from "../lib/documents/firestore";
import {timeChunkedOperation} from "../lib/misc";

async function getBillingDocs(value: string) {
  return (await getBillingRef(value).get()).docs;
}

(async function f() {
  const organizationIds = (await getOrganizationsRef().get()).docs.map((o) => o.id);
  const billingDocs = await timeChunkedOperation(organizationIds, 1, 1000, getBillingDocs);
  return await timeChunkedOperation(billingDocs, 100, 1000, undefined, (async (values) => {
    return await Promise.all(values.map(async (billingDoc) => {
      if (/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-[0-9][0-9]/.test(billingDoc.id)) {
        console.debug(`Deleting matched doc: ${billingDoc.ref.path}`);
        try {
          await billingDoc.ref.delete();
          return true;
        } catch (e: any) {
          console.error(`Failed to delete doc: ${billingDoc.ref.path}`);
          return false;
        }
      } else {
        console.debug(`Doc did not match regex: ${billingDoc.ref.path}`);
      }
    }));
  }));
})();
