import * as functions from "firebase-functions";
export interface UpdateImageIdsPayload {
    clientImageId?: string;
    clientImageRepo?: string;
    serverImageId?: string;
    serverImageRepo?: string;
    clientMountImageId?: string;
    clientMountImageRepo?: string;
    serverMountImageId?: string;
    serverMountImageRepo?: string;
}
export declare const updateImageIds: functions.CloudFunction<functions.pubsub.Message>;
export declare const updateSystemOdysseyClientPod: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
export declare const updateSystemOdysseyServerPod: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
export declare const updateCoreweaveAvailability: functions.CloudFunction<unknown>;
