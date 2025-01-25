import * as functions from "firebase-functions";
export declare const creates: {
    newRoomAddId: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    onCreateRoomAddToSpace: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    onCreateSpaceAddNewRoom: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    onCreateRoomCreateHistoricRoom: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    onCreateSpaceCopyTemplateSpaceItems: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    onCreateSpaceAddStreamingInfo: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    onCreateSpaceCopySpaceItems: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
};
export declare const reads: {
    decryptSpaceStreamPrivate: functions.HttpsFunction & functions.Runnable<any>;
};
export declare const updates: {
    onUpdateRoomStateReact: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    onUpdateSpaceUpdateRooms: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    onUpdateRoomUpdateHistoricRoom: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    onUpdateRoomUpdateShards: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    onUpdateRoomUpdateSpaceParticipantSum: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
    saveSpaceHistoryOnSpaceWrite: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
    saveSpaceHistoryOnSpaceItemWrite: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
    onWriteSpaceDenormalizeBillingUsage: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
    onUpdateRoomRejectedByBilling: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
};
export declare const deletes: {
    deletedSpaceDeleteRoom: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedRoomDeleteShards: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedRoomRemoveShardFromOriginal: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedRoomDeleteGameServer: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    deletedRoomDeleteSubcollections: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    onDeleteRoomRemoveFromSpace: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
};
