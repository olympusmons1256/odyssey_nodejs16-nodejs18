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
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const firestore_1 = require("../lib/documents/firestore");
const misc_1 = require("../lib/misc");
async function f() {
    const createdDocs = [];
    const participants = (0, firestore_1.getParticipantsRef)("WASawul3Mkg61Ia0schw", "2DSPxPFcB3dXBvt297DDTr");
    participants.onSnapshot((participants) => {
        participants.docs.map((participantDoc) => {
            var _a;
            const roomDoc = participantDoc.ref.parent.parent;
            if (roomDoc == undefined || roomDoc == null)
                throw new Error("Room invalid");
            const organizationDoc = roomDoc === null || roomDoc === void 0 ? void 0 : roomDoc.parent.parent;
            if (organizationDoc == undefined || organizationDoc == null)
                throw new Error("Organization invalid");
            const isNew = !createdDocs.includes(participantDoc.id);
            const participant = participantDoc.data();
            console.log(JSON.stringify(Object.assign(Object.assign({}, participant), { id: participantDoc.id, isNew, deleted: !participantDoc.exists, timestamp: (_a = participantDoc.updateTime.toDate()) !== null && _a !== void 0 ? _a : new Date() })));
            if (isNew) {
                (0, firestore_1.getDeviceRef)(participant.userId, participant.deviceId).onSnapshot((deviceDoc) => {
                    var _a, _b;
                    const device = deviceDoc.data();
                    console.log(JSON.stringify(Object.assign(Object.assign({}, device), { deleted: !deviceDoc.exists, timestamp: (_b = (_a = deviceDoc.updateTime) === null || _a === void 0 ? void 0 : _a.toDate()) !== null && _b !== void 0 ? _b : new Date() })));
                });
                (0, firestore_1.getParticipantBrowserStateUpdateWebRtcRef)(organizationDoc.id, roomDoc.id, participantDoc.id).onSnapshot((webRtcDoc) => {
                    var _a, _b, _c;
                    const webRtc = webRtcDoc.data();
                    console.log(JSON.stringify(Object.assign(Object.assign({}, webRtc), { updated: webRtc.updated.toDate(), participantId: (_a = webRtcDoc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id, deleted: !webRtcDoc.exists, timestamp: (_c = (_b = webRtcDoc.updateTime) === null || _b === void 0 ? void 0 : _b.toDate()) !== null && _c !== void 0 ? _c : new Date() })));
                });
                createdDocs.push(participantDoc.id);
            }
        });
    });
    await (0, misc_1.sleepForever)();
}
f();
//# sourceMappingURL=watch-participant.js.map