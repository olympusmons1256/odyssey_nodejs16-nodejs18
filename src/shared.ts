// @ts-nocheck - Node.js 16 compatibility
import * as functions from "firebase-functions";
import {getFirebaseProjectId} from "./lib/firebase";

export const firebaseServiceAccount = `firebase-functions-backend@${getFirebaseProjectId()}.iam.gserviceaccount.com`;

export const customRunWith : functions.RuntimeOptions =
      {
        memory: "256MB",
        serviceAccount: firebaseServiceAccount,
        timeoutSeconds: 300,
        vpcConnector: "gke-odyssey",
        vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY",
      };

export const customRunWithWarm : functions.RuntimeOptions =
  {
    minInstances: 1,
    ...customRunWith,
  };

export function customRunWithDefinedMemory(memory: functions.RuntimeOptions["memory"]): functions.RuntimeOptions {
  return {
    ...customRunWith,
    memory,
  };
}
