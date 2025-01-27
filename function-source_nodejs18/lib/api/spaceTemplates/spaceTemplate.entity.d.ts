import { SpaceTemplate as SpaceTemplateDocType } from "../../lib/cmsDocTypes";
import * as firebaseAdmin from "firebase-admin";
export declare class SpaceTemplate implements SpaceTemplateDocType {
    id: string;
    name: string;
    type: string;
    ueId: string;
    thumb: string;
    public: boolean;
    created?: firebaseAdmin.firestore.Timestamp;
    orgOwner: string[];
    pakState: "not-packaged" | "ready";
    updated?: firebaseAdmin.firestore.Timestamp;
    description: string;
}
