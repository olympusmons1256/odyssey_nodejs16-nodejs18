"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomTokenForConsent = exports.newConsent = exports.answerConsent = void 0;
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin = __importStar(require("firebase-admin"));
const firestore_1 = require("./lib/documents/firestore");
const shared_1 = require("./shared");
const crypto = __importStar(require("crypto"));
exports.answerConsent = functions
    .runWith(shared_1.customRunWithWarm)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .https.onCall(async (answer, context) => {
    var _a;
    try {
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (userId == undefined) {
            throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        if (answer.consentId == undefined || answer.consentId == null || answer.consentId.length < 1) {
            throw new functions.https.HttpsError("invalid-argument", "Must provide 'consentId'");
        }
        if (answer.allow == undefined) {
            throw new functions.https.HttpsError("invalid-argument", "Must provide 'allow'");
        }
        const [consentDoc, consent] = await (0, firestore_1.getConsent)(answer.consentId);
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
        const response = {
            code,
        };
        return response;
    }
    catch (e) {
        console.error("Unknown error encountered");
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
    }
});
exports.newConsent = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async () => {
    try {
        const consentDoc = await (0, firestore_1.getConsentsRef)().add({});
        const response = { id: consentDoc.id };
        return response;
    }
    catch (e) {
        console.error("Unknown error encountered");
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
    }
});
exports.getCustomTokenForConsent = functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data) => {
    try {
        if (data.consentId == undefined || data.consentId == null || data.consentId.length < 1) {
            throw new functions.https.HttpsError("invalid-argument", "Must provide 'consentId'");
        }
        if (data.code == undefined || data.code == null || data.code.length < 1) {
            throw new functions.https.HttpsError("invalid-argument", "Must provide 'code'");
        }
        const [, consent] = await (0, firestore_1.getConsent)(data.consentId);
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
        const response = {
            customToken,
        };
        return response;
    }
    catch (e) {
        console.error("Unknown error encountered");
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
    }
});
//# sourceMappingURL=consents.js.map