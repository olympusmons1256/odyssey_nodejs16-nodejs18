import * as admin from "firebase-admin";
// import {Participant} from "../lib/docTypes";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

async function updateAllUsers(organizationId: string) {
  const docs = await admin.firestore()
    .collection("organizations").doc(organizationId)
    .collection("organizationUsers").listDocuments();
  console.log(`Got ${docs.length} user docs to update in ${organizationId}`);
  docs.forEach(async (doc) => {
    console.log("Updating user doc: ", doc.id);
    await doc.update({avatarReadyPlayerMeComplete: true});
  });
}

updateAllUsers("1xHq73UhZliwPyFzrPo0");
updateAllUsers("d1hPVSxq8oXsmUFQNtoU");
updateAllUsers("du8gniLmfHsmtH30qYWK");
