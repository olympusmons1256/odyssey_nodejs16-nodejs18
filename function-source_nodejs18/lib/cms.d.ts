import * as functions from "firebase-functions";
export declare const writes: {
    writeSpaceTemplateItemChanges: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
};
export declare const creates: {
    onCreateRuntimeModelUpdateModelUrl: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    newSpaceConfiguratorItemDefineDefaultValue: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
    newSpaceItemIncrementCount: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
};
export declare const deletes: {
    deletedSpaceItemIncrementCount: functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;
};
