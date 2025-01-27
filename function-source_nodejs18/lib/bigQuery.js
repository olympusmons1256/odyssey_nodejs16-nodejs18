"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportFourDeepSubCollectionWrites = exports.exportThreeDeepSubCollectionWrites = exports.exportTwoDeepSubCollectionWrites = exports.exportOneDeepSubCollectionWrites = exports.exportRootWrites = void 0;
// @ts-nocheck - Node.js 16 compatibility
const functions = __importStar(require("firebase-functions"));
const firestore_bigquery_change_tracker_1 = require("@newgameplus/firestore-bigquery-change-tracker");
const logs = __importStar(require("./lib/bigQueryExport/logs"));
const util_1 = require("./lib/bigQueryExport/util");
const firebase_1 = require("./lib/firebase");
const misc_1 = require("./lib/misc");
function createEventTracker(projectId, collectionId) {
    return new firestore_bigquery_change_tracker_1.FirestoreBigQueryEventHistoryTracker({
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
    });
}
function generateWildcardPaths(change) {
    function getCollection(ref) {
        const parent = ref.parent.id;
        if (parent.endsWith("s")) {
            return parent.slice(0, parent.length - 1) + "Id";
        }
        else {
            return parent;
        }
    }
    function recParent(ref, o) {
        const key = getCollection(ref);
        o[key] = ref.id;
        if (ref.parent.parent == null) {
            return o;
        }
        else {
            return recParent(ref.parent.parent, o);
        }
    }
    return recParent(change.after.ref, {});
}
function isExcludedFromBigQueryExport(change) {
    if (change.after.ref.parent.id == "browserStateUpdates") {
        return true;
    }
    return false;
}
async function genericOnWrite(change, context) {
    try {
        if ((0, misc_1.inEmulatorEnv)()) {
            return console.info("Running in emulator, skipping BigQuery export");
        }
        if (isExcludedFromBigQueryExport(change)) {
            return console.info("Excluded from BigQuery export");
        }
        const collectionId = change.after.ref.parent.id;
        if (collectionId == undefined || collectionId == null || collectionId == "") {
            throw new Error(`CollectionId: ${collectionId} invalid`);
        }
        const changeType = (0, util_1.getChangeType)(change);
        const documentId = (0, util_1.getDocumentId)(change);
        const projectId = (0, firebase_1.getFirebaseProjectId)();
        const eventTracker = createEventTracker(projectId, collectionId);
        const pathParams = generateWildcardPaths(change);
        const getData = () => {
            if (changeType == firestore_bigquery_change_tracker_1.ChangeType.DELETE) {
                return {};
            }
            else if (change.after.data() == undefined) {
                return undefined;
            }
            else
                return change.after.data();
        };
        const data = getData();
        if (data == undefined) {
            throw new Error("change.after.data() is undefined");
        }
        console.debug("Inserting change into BigQuery");
        return await eventTracker.record([
            {
                timestamp: context.timestamp,
                operation: changeType,
                documentName: context.resource.name,
                documentId: documentId,
                pathParams: Object.assign(Object.assign({}, pathParams), { documentId }),
                eventId: context.eventId,
                data: changeType != firestore_bigquery_change_tracker_1.ChangeType.DELETE ? data : {},
            },
        ]);
    }
    catch (err) {
        return logs.error(err);
    }
}
exports.exportRootWrites = functions
    .firestore
    .document("{rootCollection}/{rootDocId}").onWrite(async (change, context) => {
    return genericOnWrite(change, context);
});
exports.exportOneDeepSubCollectionWrites = functions
    .firestore
    .document("{rootCollection}/{rootDocId}/{oneDeepSubCollectionId}/{oneDeepSubCollectionDocId}").onWrite(async (change, context) => {
    return genericOnWrite(change, context);
});
exports.exportTwoDeepSubCollectionWrites = functions
    .firestore
    .document("{rootCollection}/{rootDocId}/{oneDeepSubCollectionId}/{oneDeepSubCollectionDocId}/{twoDeepSubCollectionId}/{twoDeepSubCollectionDocId}").onWrite(async (change, context) => {
    return genericOnWrite(change, context);
});
exports.exportThreeDeepSubCollectionWrites = functions
    .firestore
    .document("{rootCollection}/{rootDocId}/{oneDeepSubCollectionId}/{oneDeepSubCollectionDocId}/{twoDeepSubCollectionId}/{twoDeepSubCollectionDocId}/{threeDeepSubCollectionId}/{threeDeepSubCollectionDocId}").onWrite(async (change, context) => {
    return genericOnWrite(change, context);
});
exports.exportFourDeepSubCollectionWrites = functions
    .firestore
    .document("{rootCollection}/{rootDocId}/{oneDeepSubCollectionId}/{oneDeepSubCollectionDocId}/{twoDeepSubCollectionId}/{twoDeepSubCollectionDocId}/{threeDeepSubCollectionId}/{threeDeepSubCollectionDocId}/{fourDeepSubCollectionId}/{fourDeepSubCollectionDocId}").onWrite(async (change, context) => {
    return genericOnWrite(change, context);
});
//# sourceMappingURL=bigQuery.js.map