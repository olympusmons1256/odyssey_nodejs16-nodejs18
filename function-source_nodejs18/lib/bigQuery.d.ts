import * as functions from "firebase-functions";
export declare const exportRootWrites: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
export declare const exportOneDeepSubCollectionWrites: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
export declare const exportTwoDeepSubCollectionWrites: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
export declare const exportThreeDeepSubCollectionWrites: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
export declare const exportFourDeepSubCollectionWrites: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
