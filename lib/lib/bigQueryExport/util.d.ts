import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";
import { Change } from "firebase-functions";
import { ChangeType } from "@newgameplus/firestore-bigquery-change-tracker";
export declare function getChangeType(change: Change<DocumentSnapshot>): ChangeType;
export declare function getDocumentId(change: Change<DocumentSnapshot>): string;
