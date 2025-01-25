import * as functions from "firebase-functions";
export declare const deleteParticipantDenormalizeToGkeParticipants: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
export declare const createParticipantDenormalizeToGkeParticipants: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
export declare const clientNodeImagePullDaemonsetGke: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
export declare const updateWorkloadClusterProviderGke: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
export declare const updateGkeParticipantsDenormalizedAutoscaleNodePools: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
