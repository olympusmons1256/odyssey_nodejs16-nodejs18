import * as functions from "firebase-functions";
export declare const getOrganizationSpaceTemplates: functions.HttpsFunction & functions.Runnable<any>;
export declare const verifyNewDomain: functions.HttpsFunction & functions.Runnable<any>;
export declare const onCreateOrganizationSetDomain: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
export declare const onCreateOrganizationAddActiveBillingState: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
export declare const onWriteOrganizationUsersDenormalizeBillingUsage: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
