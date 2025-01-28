import {ChangeType} from "@newgameplus/firestore-bigquery-change-tracker";
import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {slackActivityFromUnrealProjectVersion} from "../lib/activity";
import {UnrealProjectVersion} from "../lib/docTypes";
import {getUnrealProjectVersionsRef} from "../lib/documents/firestore";
import {sleepForever} from "../lib/misc";

(async () => {
  const knownDocs : string[] = [];
  // admin.firestore().collectionGroup("unrealProjectVersions").onSnapshot((upvDocs) => {
  getUnrealProjectVersionsRef("bEFmovJumRLngfGAJw54").onSnapshot((upvDocs) => {
    upvDocs.forEach((upvDoc) => {
      const upv = upvDoc.data() as UnrealProjectVersion;
      const unrealProjectId = upvDoc.ref.parent.parent?.id;
      const isCreate = !knownDocs.includes(upvDoc.id);
      knownDocs.push(upvDoc.id);
      const changeType = (() => {
        if (isCreate) return ChangeType.CREATE;
        if (upvDoc.exists) return ChangeType.UPDATE;
        return ChangeType.DELETE;
      })();
      const timestamp = new Date();
      return slackActivityFromUnrealProjectVersion(unrealProjectId, upv, changeType, upvDoc.ref, timestamp);
    });
  });
  await sleepForever();
})();

