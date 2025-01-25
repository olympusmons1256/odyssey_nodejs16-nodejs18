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
exports.updateParticipantAudioChannel = exports.getJwtToken = void 0;
const functions = __importStar(require("firebase-functions"));
const shared_1 = require("./shared");
const token_1 = require("./lib/dolby/token");
const firestore_1 = require("./lib/documents/firestore");
exports.getJwtToken = functions
    .runWith(shared_1.customRunWithWarm)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .https.onCall(async (_, context) => {
    var _a;
    try {
        const userId = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (userId == undefined) {
            throw new functions.https.HttpsError("unauthenticated", "Unauthenticated");
        }
        const jwtToken = await (0, token_1.signParticipantJwtToken)();
        if (jwtToken == undefined) {
            console.error("Dolby jwtToken undefined");
            throw new functions.https.HttpsError("internal", "An internal error occurred");
        }
        else {
            return { jwtToken };
        }
    }
    catch (e) {
        if (e instanceof functions.auth.HttpsError) {
            throw e;
        }
        else {
            console.error("Unknown error encountered");
            console.error(e);
            throw new functions.https.HttpsError("internal", "Unknown error");
        }
    }
});
exports.updateParticipantAudioChannel = 
// update participants audio channel
functions
    .runWith(shared_1.customRunWithWarm)
    .https.onCall(async (data) => {
    try {
        return (0, firestore_1.getCommsParticipantRef)(data.organizationId, data.roomId, data.participantId).update({ audioChannelId: data.audioChannelId });
    }
    catch (e) {
        console.error("Unknown error encountered");
        console.error(e);
        throw new functions.https.HttpsError("cancelled", "Could not update audio channel");
    }
});
//# sourceMappingURL=dolby.js.map