import * as functions from "firebase-functions";
export declare const reads: {
    getUserWritableOrganizations: functions.HttpsFunction & functions.Runnable<any>;
};
export declare const creates: {
    addVisitor: functions.HttpsFunction & functions.Runnable<any>;
    createOrgUser: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    createRtdbUserDeviceStatus: functions.CloudFunction<functions.database.DataSnapshot>;
    createSpaceUser: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    createUser: functions.HttpsFunction & functions.Runnable<any>;
    createUserAddAvatar: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    sendSignInLink: functions.HttpsFunction & functions.Runnable<any>;
    uploadUserAvatar: functions.HttpsFunction & functions.Runnable<any>;
    idTokenForCustomToken: functions.HttpsFunction & functions.Runnable<any>;
    anonymousAuthSignin: functions.HttpsFunction & functions.Runnable<any>;
};
export declare const updates: {
    updateRtdbUserDeviceStatus: functions.CloudFunction<functions.Change<functions.database.DataSnapshot>>;
    updateUserAvatarClothing: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    updateUserDenormalizeParticipants: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    updateUserDeviceStatus: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    updateUsersOrganizationRole: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    updateUsersSpaceRole: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
};
export declare const deletes: {
    deleteDevice: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deleteOrganizationUser: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deleteRtdbUserDeviceStatus: functions.CloudFunction<functions.database.DataSnapshot>;
    deleteSpaceUser: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deleteUserDeviceStatus: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedUserDeleteSubcollections: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
};
