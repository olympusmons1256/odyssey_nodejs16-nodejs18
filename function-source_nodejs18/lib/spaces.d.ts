import * as functions from "firebase-functions";
export declare const reads: {
    getRuntimeLogs: functions.HttpsFunction & functions.Runnable<any>;
};
export declare const writes: {
    onSpaceWrite: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
};
