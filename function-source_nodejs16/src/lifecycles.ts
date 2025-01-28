import * as functions from "firebase-functions";
import firestore from "@google-cloud/firestore";
import * as admin from "firebase-admin";
import {customRunWith} from "./shared";
import {Participant} from "./lib/docTypes";
import {getFirebaseProjectId} from "./lib/firebase";
import {cleanupCoreweave} from "./lib/streamingSessions/resourceCleanup";
import {getParticipantRef} from "./lib/documents/firestore";

async function afkCheckParticipant(doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) {
  const participant = doc.data() as Participant;
  const maxMinutesOld = 180;
  const twoHoursAgo = admin.firestore.Timestamp.now().seconds - (60 * maxMinutesOld);
  if (
    (participant.afkCheck == undefined && participant.created.seconds < twoHoursAgo) ||
    (participant.afkCheck != undefined && participant.afkCheck.seconds < twoHoursAgo)
  ) {
    console.debug(`Deleting participant which hasn't completed an afk check for ${maxMinutesOld} minutes: `, doc.ref.path);
    return doc.ref.delete();
  } else {
    console.log(`Participant doc newer than ${maxMinutesOld} minutes, not checking or applying afk: `, doc.ref.path);
    return;
  }
}

export const afkCheckParticipants =
  // Every 5 minutes
  // Afk check all participants > 2 hours old
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
      const participantsDoc = (await admin.firestore().collectionGroup("participants").orderBy("updated").get()).docs;
      if (participantsDoc.length > 0) {
        console.log("Processing query results for collection group query");
        participantsDoc.forEach(async (doc) => await afkCheckParticipant(doc));
      } else {
        console.log("Collection group query returned no results. Nothing to do");
        return;
      }
    });

async function ageCheckParticipantDenormalized(doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) {
  const maxParticipantAgeMs = 60 * 60 * 24 * 1000;
  const updateTime = doc.updateTime.toMillis();
  const nowMinusMaxAge = Date.now() - maxParticipantAgeMs;
  if (updateTime < nowMinusMaxAge) {
    console.debug({maxParticipantAgeMs, nowMinusMaxAge, updateTime});
    console.debug(`Deleting participantDenormalized: ${doc.ref.path} which was last updated at ${updateTime}: `, doc.id);
    await doc.ref.delete();
    const organizationId = doc.ref.parent.parent?.parent?.parent?.id;
    const roomId = doc.ref.parent.parent?.id;
    if (organizationId != undefined && roomId != undefined) {
      console.debug(`Deleting participant: ${doc.ref.path}`);
      await getParticipantRef(organizationId, roomId, doc.id).delete();
    }
  }
}

export const ageCheckParticipantsDenormalized =
  // Every 5 minutes
  // Delete all participantsDenormalized > 24 hours old
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
      const denormalizardParticipantsDoc = (await admin.firestore().collectionGroup("participantsDenormalized").orderBy("updated").get()).docs;
      if (denormalizardParticipantsDoc.length > 0) {
        console.log("Processing query results for collection group query");
        denormalizardParticipantsDoc.forEach(async (doc) => await ageCheckParticipantDenormalized(doc));
      } else {
        console.log("Collection group query returned no results. Nothing to do");
        return;
      }
    });

async function cleanOldDeprovisioningDeployment(doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) {
  const maxMinutesOld = 120;
  const twoHoursAgo = admin.firestore.Timestamp.now().seconds - (60 * maxMinutesOld);
  if (doc.data().state == "deprovisioning" && doc.updateTime.seconds < twoHoursAgo) {
    await doc.ref.update({state: "deprovisioned", updated: admin.firestore.Timestamp.now()});
    console.debug(`Forced deployment to deprovisioned after ${maxMinutesOld} minutes: `, doc.ref.path);
  }
}

export const cleanOldDeprovisioningDeployments =
  // Every 5 minutes
  // Deprovisioning check for deployments > 2 hours old
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
      const deploymentDocs = (await admin.firestore().collectionGroup("deployments").orderBy("updated").get()).docs;
      if (deploymentDocs.length > 0) {
        console.log("Processing query results from collection group query");
        deploymentDocs.forEach(async (doc) => await cleanOldDeprovisioningDeployment(doc));
      } else {
        console.log("Collection group query returned no results. Nothing to do");
        return;
      }
    });


export const firestoreBackup =
  // Back up entire firestore database on a cron
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every 24 hours")
    .onRun(async () => {
      const client = new firestore.v1.FirestoreAdminClient();
      const projectId = getFirebaseProjectId();
      const bucket = "gs://" + projectId + "-firestore-backups";
      const databaseName = client.databasePath(projectId, "(default)");

      console.debug(`Exporting firestore database '${databaseName}' to bucket '${bucket}'`);
      return client.exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        // Leave collectionIds empty to export all collections
        // or set to a list of collection IDs to export,
        // collectionIds: ['users', 'posts']
        collectionIds: [],
      })
        .then((responses) => {
          const response = responses[0];
          console.log(`Operation Name: ${response["name"]}`);
        })
        .catch((err) => {
          console.error(err);
          throw new Error("Export operation failed");
        });
    });

export const cleanupCoreweaveResources =
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
      return await cleanupCoreweave();
    });

export const deleteOldBrowserStateUpdates =
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every minute")
    .onRun(async () => {
      const oneMinuteAgo = new Date(admin.firestore.Timestamp.now().toMillis() - 60000);
      (await admin.firestore()
        .collectionGroup("browserStateUpdates")
        .where("updated", "<", oneMinuteAgo)
        .get())
        .forEach(async (doc) => {
          if (doc.id == "webRtc") {
            console.debug(`Deleting old ${doc.id} browserStateUpdate: `, doc.ref.path);
            await doc.ref.delete();
          }
        });
    });

