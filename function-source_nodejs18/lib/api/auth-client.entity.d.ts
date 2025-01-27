import { AuthClient as AuthClientDocType } from "../lib/docTypes";
import * as firebaseAdmin from "firebase-admin";
export declare class AuthClient implements AuthClientDocType {
    id: string;
    name: string;
    created: firebaseAdmin.firestore.Timestamp;
    updated: firebaseAdmin.firestore.Timestamp;
    secret: string;
    organizationId: string;
}
