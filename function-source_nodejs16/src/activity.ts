import * as functions from "firebase-functions";
import {customRunWith} from "./shared";
import {unrealProjectVersionWildcardPath} from "./lib/documents/firestore";
import {UnrealProjectVersion} from "./lib/docTypes";
import {getChangeType} from "./lib/bigQueryExport/util";
import {slackActivityFromUnrealProjectVersion} from "./lib/activity";

const customRunWithSlackToken = {...customRunWith, secrets: ["SLACK_TOKEN"]};

export const onWriteUnrealProjectVersion =
  // onWrite() of unreal project version
  functions
    .runWith(customRunWithSlackToken)
    .firestore
    .document(unrealProjectVersionWildcardPath())
    .onWrite(async (change, context) => {
      const upv = change.after.data() as UnrealProjectVersion;
      const unrealProjectId = change.after.ref.parent.parent?.id;
      const changeType = getChangeType(change);
      const upvDocRef = change.after.ref;
      if (change.after.data()?.state == change.before.data()?.state) {
        console.debug("State didn't change. Nothing to do");
        return;
      }
      const timestamp = new Date(context.timestamp);
      return await slackActivityFromUnrealProjectVersion(unrealProjectId, upv, changeType, upvDocRef, timestamp);
    });
