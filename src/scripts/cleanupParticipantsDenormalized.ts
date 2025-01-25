import * as admin from "firebase-admin";
import {getParticipantsDenormalizedRef} from "../lib/documents/firestore";

async function f() {
  const organizationDocs = await Promise.all((await admin.firestore().collection("organizations").listDocuments()).map(async (doc) => await doc.get()));
  if (organizationDocs.length < 1) {
    throw new Error("No organizations found");
  }

  const validOrganizationIds = organizationDocs.flatMap((organizationDoc) => {
    const organization = organizationDoc.data();
    return (organization == undefined) ? [] : [organizationDoc.id];
  });
  if (validOrganizationIds.length != organizationDocs.length) {
    throw new Error("At least one organization is undefined");
  }

  const rooms = await Promise.all((await Promise.all(validOrganizationIds.map(async (organizationId) => {
    const orgRooms = await Promise.all((await admin.firestore().collection("organizations").doc(organizationId).collection("rooms").listDocuments()).map(async (doc) => await doc.get()));
    if (orgRooms.length < 1) {
      throw new Error(`No rooms found in organization: ${organizationId}`);
    }
    return orgRooms.map(async (roomDoc) => {
    // TODO: Remove this doc update once stateChanges have been removed accross all environments
      if (roomDoc != undefined) {
        const d = roomDoc.data() as any;
        if (Object.keys(d).includes("stateChanges")) {
          console.log("Deleting stateChanges field from doc: ", roomDoc.ref.path);
          await roomDoc.ref.update({stateChanges: admin.firestore.FieldValue.delete()});
        }
        // TODO: Remove this doc delete once the participantsDenormalized/0 docs been removed accross all environments
        const doc = getParticipantsDenormalizedRef(organizationId, roomDoc.id).doc("0");
        console.debug("Deleting participantsDenormalized doc: ", doc.path);
        await doc.delete();
      }
      return roomDoc?.ref.path;
    });
  }))).flat());

  rooms.forEach((room) => (room == undefined) ? console.log("Undefined room") : console.log("Got room: ", room));
}

f();
