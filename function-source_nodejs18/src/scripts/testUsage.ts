import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {triggerRoomParticipantUsageChecksF} from "../participants";

(async function f() {
  await triggerRoomParticipantUsageChecksF({timestamp: new Date().toUTCString()});
})();
