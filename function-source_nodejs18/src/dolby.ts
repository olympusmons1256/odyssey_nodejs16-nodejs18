import * as functions from "firebase-functions";
import * as httpTypes from "./lib/httpTypes";
import {customRunWithWarm} from "./shared";
import {signParticipantJwtToken} from "./lib/dolby/token";
import {getCommsParticipantRef} from "./lib/documents/firestore";

export const getJwtToken =
functions
  .runWith(customRunWithWarm)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .https.onCall(async (_, context) => {
    try {
      const userId = context.auth?.uid;

      if (userId == undefined) {
        throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
      }

      const jwtToken = await signParticipantJwtToken();

      if (jwtToken == undefined) {
        console.error("Dolby jwtToken undefined");
        throw new functions.https.HttpsError("internal", "An internal error occurred");
      } else {
        return {jwtToken} as httpTypes.DolbyJwtResponseData;
      }
    } catch (e: any) {
      if (e instanceof functions.auth.HttpsError) {
        throw e;
      } else {
        console.error("Unknown error encountered");
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
      }
    }
  });

export const updateParticipantAudioChannel =
// update participants audio channel
functions
  .runWith(customRunWithWarm)
  .https.onCall(async (data: httpTypes.AudioChannelUpdateRequestData) => {
    try {
      return getCommsParticipantRef(data.organizationId, data.roomId, data.participantId).update({audioChannelId: data.audioChannelId});
    } catch (e: any) {
      console.error("Unknown error encountered");
      console.error(e);
      throw new functions.https.HttpsError("cancelled", "Could not update audio channel");
    }
  });
