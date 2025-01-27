import * as functions from "firebase-functions";
export declare const creates: {
    checkoutSandbox: functions.HttpsFunction & functions.Runnable<any>;
    createOrganization: functions.HttpsFunction & functions.Runnable<any>;
    onCreateStreamingCreditsPurchase: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    onCreateAutoTopup: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    generateCheckoutUrl: functions.HttpsFunction & functions.Runnable<any>;
    generateCustomerPortalUrl: functions.HttpsFunction & functions.Runnable<any>;
};
export declare const updates: {
    cancelSubscriptionDowngrade: functions.HttpsFunction & functions.Runnable<any>;
    onUpdateProductsAvailableDeserializeFeatures: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    updateSubscription: functions.HttpsFunction & functions.Runnable<any>;
    denormalizeBillingUsageToBillingPublic: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    onUpdateUsageTriggerAutoTopup: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    onUpdateBillingPublicAggregateBillingState: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    onUpdateBillingSubscriptionDenormalizePublic: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
    onAggregateBillingStateInactiveUpdateRooms: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    updateAutoTopupCreditsSettings: functions.HttpsFunction & functions.Runnable<any>;
    onUpdateFeaturesOverrideDenormalize: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
};
export declare const reads: {
    getOrganizationParticipantUsage: functions.HttpsFunction & functions.Runnable<any>;
    getParticipantAnalytics: functions.HttpsFunction & functions.Runnable<any>;
};
