import * as functions from "firebase-functions";
import { ParticipantUsageCheckOperation } from "./lib/systemDocTypes";
export declare function triggerRoomParticipantUsageChecksF(context: {
    timestamp: string;
}): Promise<void[]>;
export declare function roomParticipantsUsageCheck(eventTimestamp: Date, participantUsageCheck: ParticipantUsageCheckOperation, organizationId: string, roomId: string, participantUsageCheckId: string): Promise<void>;
export declare const creates: {
    createParticipant: functions.HttpsFunction & functions.Runnable<any>;
    newParticipantDenormalize: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    newParticipantIncrementCount: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    newAdminIncrementCount: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    newParticipantNewRoomShard: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    newParticipantNewDeployments: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    newParticipantAddHistory: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    newDeploymentNewStreamingSession: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    newCommsParticipant: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    onCreateParticipantUsageCheckRoom: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
};
export declare const updates: {
    updateDeploymentStateReact: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    onUpdateParticipantCountScaleGameServer: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    onUpdateParticipantRejectedByBilling: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    triggerRoomParticipantUsageChecks: functions.CloudFunction<unknown>;
    onUsageChecksCompleteUpdateOrgUsage: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    afkCheck: functions.HttpsFunction & functions.Runnable<any>;
};
export declare const deletes: {
    deletedParticipantDenormalize: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedCommsParticipant: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedParticipantDecrementCount: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedParticipantDeprovisionDeployments: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedParticipantAddHistory: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedAdminDecrementCount: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedBrowserStateUpdateDeleteParticipant: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedParticipantFinalUsage: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedParticipantAddCompleted: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
};
