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
const admin = __importStar(require("firebase-admin"));
// import {Participant} from "../lib/docTypes";
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
async function updateAllUsers(organizationId) {
    const docs = await admin.firestore()
        .collection("organizations").doc(organizationId)
        .collection("organizationUsers").listDocuments();
    console.log(`Got ${docs.length} user docs to update in ${organizationId}`);
    docs.forEach(async (doc) => {
        console.log("Updating user doc: ", doc.id);
        await doc.update({ avatarReadyPlayerMeComplete: true });
    });
}
updateAllUsers("1xHq73UhZliwPyFzrPo0");
updateAllUsers("d1hPVSxq8oXsmUFQNtoU");
updateAllUsers("du8gniLmfHsmtH30qYWK");
//# sourceMappingURL=updateRPMC.js.map