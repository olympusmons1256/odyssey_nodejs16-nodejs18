import * as functions from "firebase-functions";
import * as httpTypes from "./lib/httpTypes";
import {customRunWithWarm} from "./shared";
import {getStreamCredentials, signParticipantJwtToken} from "./lib/stream/token";

export const getStreamKey =
functions
  .runWith(customRunWithWarm)
  .https.onCall((_, context) => {
    try {
      const userId = context.auth?.uid;

      if (userId == undefined) {
        throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
      }

      const consumerKey = getStreamCredentials().consumerKey;

      if (consumerKey == undefined) {
        console.error("Stream key undefined");
        throw new functions.https.HttpsError("internal", "An internal error occurred");
      } else {
        return {consumerKey} as httpTypes.StreamKeyResponseData;
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

export const getJwtToken =
functions
  .runWith(customRunWithWarm)
  .https.onCall(async (_, context) => {
    try {
      const userId = context.auth?.uid;

      if (userId == undefined) {
        throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
      }

      const jwtToken = await signParticipantJwtToken(userId);

      if (jwtToken == undefined) {
        console.error("Stream jwtToken undefined");
        throw new functions.https.HttpsError("internal", "An internal error occurred");
      } else {
        return {jwtToken} as httpTypes.StreamJwtResponseData;
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


