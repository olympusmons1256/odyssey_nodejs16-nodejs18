import * as functions from "firebase-functions";
export declare const creates: {
    createNewInviteLink: functions.HttpsFunction & functions.Runnable<any>;
    inviteOrganizationUser: functions.HttpsFunction & functions.Runnable<any>;
    inviteSpaceGuest: functions.HttpsFunction & functions.Runnable<any>;
};
export declare const updates: {
    acceptInvite: functions.HttpsFunction & functions.Runnable<any>;
    rejectInvite: functions.HttpsFunction & functions.Runnable<any>;
};
export declare const reads: {
    getInviteLinkFromInvitePath: functions.HttpsFunction & functions.Runnable<any>;
    getDataFromInvite: functions.HttpsFunction & functions.Runnable<any>;
};
export declare const deletes: {
    deletedOrganizationInviteSubcollections: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedSpaceInviteSubcollections: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
};
