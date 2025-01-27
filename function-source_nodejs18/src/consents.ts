import * as functions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import {getConsent, getConsentsRef} from "./lib/documents/firestore";
import * as httpTypes from "./lib/httpTypes";
import {customRunWithWarm} from "./shared";
import * as crypto from "crypto";

export const answerConsent =
functions
  .runWith(customRunWithWarm)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .https.onCall(async (answer: httpTypes.ConsentAnswerRequestData, context) => {
    try {
      const userId = context.auth?.uid;

      if (userId == undefined) {
        throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
      }

      if (answer.consentId == undefined || answer.consentId == null || answer.consentId.length < 1) {
        throw new functions.https.HttpsError("invalid-argument", "Must provide 'consentId'");
      }

      if (answer.allow == undefined) {
        throw new functions.https.HttpsError("invalid-argument", "Must provide 'allow'");
      }
      const [consentDoc, consent] = await getConsent(answer.consentId);

      if (consent == undefined || consentDoc == undefined) {
        throw new functions.https.HttpsError("not-found", "Not found");
      }

      if (answer.allow == false) {
        await consentDoc.ref.delete();
        return {};
      }

      const code = crypto.randomBytes(3).toString("hex").toUpperCase();

      // Expire in 5 minutes
      const expiresAt = Date.now() + (300 * 1000);
      await consentDoc.ref.update({
        code,
        userId,
        expiresAt: expiresAt,
      });
      const response : httpTypes.ConsentAnswerResponseData = {
        code,
      };
      return response;
    } catch (e: any) {
      console.error("Unknown error encountered");
      console.error(e);
      throw new functions.https.HttpsError("internal", "Unknown error");
    }
  });

export const newConsent =
functions
  .runWith(customRunWithWarm)
  .https.onCall(async () => {
    try {
      const consentDoc = await getConsentsRef().add({});
      const response : httpTypes.NewConsentResponseData = {id: consentDoc.id};
      return response;
    } catch (e: any) {
      console.error("Unknown error encountered");
      console.error(e);
      throw new functions.https.HttpsError("internal", "Unknown error");
    }
  });

export const getCustomTokenForConsent =
functions
  .runWith(customRunWithWarm)
  .https.onCall(async (data: httpTypes.CustomTokenFromConsentRequestData) => {
    try {
      if (data.consentId == undefined || data.consentId == null || data.consentId.length < 1) {
        throw new functions.https.HttpsError("invalid-argument", "Must provide 'consentId'");
      }
      if (data.code == undefined || data.code == null || data.code.length < 1) {
        throw new functions.https.HttpsError("invalid-argument", "Must provide 'code'");
      }
      const [, consent] = await getConsent(data.consentId);
      if (consent == undefined) {
        throw new functions.https.HttpsError("not-found", "Not Found");
      }

      if (consent.code == undefined || consent.code == null || consent.code.length < 1) {
        throw new functions.https.HttpsError("failed-precondition", "Consent missing code");
      }
      if (consent.userId == undefined || consent.userId == null || consent.userId.length < 1) {
        throw new functions.https.HttpsError("failed-precondition", "Consent missing userId");
      }
      if (consent.expiresAt == undefined) {
        throw new functions.https.HttpsError("failed-precondition", "Consent missing expiresAt");
      }
      if (consent.expiresAt < Date.now()) {
        throw new functions.https.HttpsError("failed-precondition", "Consent has expired");
      }

      if (consent.code != data.code) {
        throw new functions.https.HttpsError("invalid-argument", "Code does not match consent");
      }

      const customToken = await firebaseAdmin.auth().createCustomToken(consent.userId);
      const response : httpTypes.CustomTokenFromConsentResponseData = {
        customToken,
      };
      return response;
    } catch (e: any) {
      console.error("Unknown error encountered");
      console.error(e);
      throw new functions.https.HttpsError("internal", "Unknown error");
    }
  });
