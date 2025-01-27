import * as admin from "firebase-admin";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

async function deleteBotParticipants() {
  const fiveMinutesAgo = Date.now() - (60 * 5);
  (await admin.firestore().collectionGroup("deployments").get()).docs.map(async (doc) => {
    if (doc.data().state == "deprovisioning" && doc.updateTime.seconds < fiveMinutesAgo) {
      await doc.ref.update({state: "deprovisioned", updated: admin.firestore.Timestamp.now()});
      console.debug("Forced deployment to deprovisioned: ", doc.ref.path);
    }
  });
}

deleteBotParticipants();
