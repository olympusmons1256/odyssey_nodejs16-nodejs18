import { ChangeType } from "@newgameplus/firestore-bigquery-change-tracker";
import { UnrealProjectVersion } from "./docTypes";
export declare function slackActivityFromUnrealProjectVersion(unrealProjectId: string | undefined, upv: UnrealProjectVersion, changeType: ChangeType, upvDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, timestamp: Date): Promise<import("@slack/web-api").ChatPostMessageResponse | undefined>;
