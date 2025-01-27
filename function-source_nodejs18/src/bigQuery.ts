// @ts-nocheck - Node.js 16 compatibility
import * as functions from "firebase-functions";
import {
  ChangeType,
  FirestoreBigQueryEventHistoryTracker,
//  FirestoreEventHistoryTracker,
} from "@newgameplus/firestore-bigquery-change-tracker";

import * as logs from "./lib/bigQueryExport/logs";
import {getChangeType, getDocumentId} from "./lib/bigQueryExport/util";
import {getFirebaseProjectId} from "./lib/firebase";
import {inEmulatorEnv} from "./lib/misc";

function createEventTracker(projectId: string, collectionId: string) : FirestoreBigQueryEventHistoryTracker {
  return new FirestoreBigQueryEventHistoryTracker(
    {
      tableId: collectionId,
      datasetId: "firestore_export",
      datasetLocation: "us",
      backupTableId: undefined,
      transformFunction: undefined,
      timePartitioning: "DAY",
      timePartitioningField: undefined,
      timePartitioningFieldType: undefined,
      timePartitioningFirestoreField: undefined,
      clustering: null,
      wildcardIds: true,
      bqProjectId: projectId,
    }
  );
}

function generateWildcardPaths(change: functions.Change<functions.firestore.DocumentSnapshot>) {
  function getCollection(ref : FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>) {
    const parent = ref.parent.id;
    if (parent.endsWith("s")) {
      return parent.slice(0, parent.length - 1) + "Id";
    } else {
      return parent;
    }
  }

  function recParent(ref : FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, o: { [key: string]: string }) : { [key: string]: string; } {
    const key = getCollection(ref);
    o[key] = ref.id;
    if (ref.parent.parent == null) {
      return o;
    } else {
      return recParent(ref.parent.parent, o);
    }
  }

  return recParent(change.after.ref, {});
}

function isExcludedFromBigQueryExport(change: functions.Change<functions.firestore.DocumentSnapshot>) {
  if (change.after.ref.parent.id == "browserStateUpdates") {
    return true;
  }
  return false;
}

async function genericOnWrite(change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) {
  try {
    if (inEmulatorEnv()) {
      return console.info("Running in emulator, skipping BigQuery export");
    }
    if (isExcludedFromBigQueryExport(change)) {
      return console.info("Excluded from BigQuery export");
    }
    const collectionId = change.after.ref.parent.id;
    if (collectionId == undefined || collectionId == null || collectionId == "") {
      throw new Error(`CollectionId: ${collectionId} invalid`);
    }
    const changeType = getChangeType(change);
    const documentId = getDocumentId(change);
    const projectId = getFirebaseProjectId();
    const eventTracker = createEventTracker(projectId, collectionId);
    const pathParams = generateWildcardPaths(change);
    const getData = () => {
      if (changeType == ChangeType.DELETE) {
        return {};
      } else if (change.after.data() == undefined) {
        return undefined;
      } else return change.after.data();
    };
    const data = getData();
    if (data == undefined) {
      throw new Error("change.after.data() is undefined");
    }
    console.debug("Inserting change into BigQuery");
    return await eventTracker.record([
      {
        timestamp: context.timestamp, // This is a Cloud Firestore commit timestamp with microsecond precision.
        operation: changeType,
        documentName: context.resource.name,
        documentId: documentId,
        pathParams: {...pathParams, documentId},
        eventId: context.eventId,
        data: changeType != ChangeType.DELETE ? data : {},
      },
    ]);
  } catch (err: any) {
    return logs.error(err);
  }
}

export const exportRootWrites =
  functions
    .firestore
    .document("{rootCollection}/{rootDocId}").onWrite(async (change, context) => {
      return genericOnWrite(change, context);
    });

export const exportOneDeepSubCollectionWrites =
  functions
    .firestore
    .document("{rootCollection}/{rootDocId}/{oneDeepSubCollectionId}/{oneDeepSubCollectionDocId}").onWrite(async (change, context) => {
      return genericOnWrite(change, context);
    });

export const exportTwoDeepSubCollectionWrites =
  functions
    .firestore
    .document("{rootCollection}/{rootDocId}/{oneDeepSubCollectionId}/{oneDeepSubCollectionDocId}/{twoDeepSubCollectionId}/{twoDeepSubCollectionDocId}").onWrite(async (change, context) => {
      return genericOnWrite(change, context);
    });

export const exportThreeDeepSubCollectionWrites =
  functions
    .firestore
    .document("{rootCollection}/{rootDocId}/{oneDeepSubCollectionId}/{oneDeepSubCollectionDocId}/{twoDeepSubCollectionId}/{twoDeepSubCollectionDocId}/{threeDeepSubCollectionId}/{threeDeepSubCollectionDocId}").onWrite(async (change, context) => {
      return genericOnWrite(change, context);
    });

export const exportFourDeepSubCollectionWrites =
  functions
    .firestore
    .document("{rootCollection}/{rootDocId}/{oneDeepSubCollectionId}/{oneDeepSubCollectionDocId}/{twoDeepSubCollectionId}/{twoDeepSubCollectionDocId}/{threeDeepSubCollectionId}/{threeDeepSubCollectionDocId}/{fourDeepSubCollectionId}/{fourDeepSubCollectionDocId}").onWrite(async (change, context) => {
      return genericOnWrite(change, context);
    });
