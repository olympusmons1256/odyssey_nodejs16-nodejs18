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
exports.calculateParticipantUsage = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("./documents/firestore");
async function calculateParticipantUsage(organizationId, roomId, isFinal, eventTimestamp, participantDoc) {
    var _a;
    try {
        const p = participantDoc.data();
        const lastParticipantUsageDoc = (await (0, firestore_1.getParticipantUsageCollectionRef)(organizationId, roomId, participantDoc.id).orderBy("end", "desc").limit(1).get()).docs.pop();
        if (lastParticipantUsageDoc != undefined)
            console.debug(`Got latest participantUsage doc for participant: ${participantDoc.ref.path}`);
        const lastReachedPodReadyAt = (p.stateChanges == undefined) ? undefined : (_a = [...p.stateChanges]
            .sort((scA, scB) => scB.timestamp.toMillis() - scA.timestamp.toMillis()) // descending order by timestamp
            .find((sc) => sc.state == "ready-deployment")) === null || _a === void 0 ? void 0 : _a.timestamp;
        if (lastReachedPodReadyAt == undefined || lastReachedPodReadyAt.toMillis() < p.created.toMillis()) {
            if (isFinal) {
                console.debug(`Participant never reached ready-deployment state after it was created, no usage recorded: ${participantDoc.ref.path} at ${eventTimestamp}`);
            }
            else {
                console.debug(`Skipping usage check as participant has not reached ready-deployment state since it was created: ${participantDoc.ref.path} at ${eventTimestamp}`);
            }
            return undefined;
        }
        const lastParticipantUsageDocEndedAt = lastParticipantUsageDoc == undefined ? undefined : lastParticipantUsageDoc.data().end;
        const start = (lastParticipantUsageDocEndedAt == undefined || lastParticipantUsageDocEndedAt.toMillis() < lastReachedPodReadyAt.toMillis()) ? lastReachedPodReadyAt : lastParticipantUsageDocEndedAt;
        const startMillis = start.toMillis();
        const eventTimestampMillis = eventTimestamp.valueOf();
        console.debug(`Recording usage check on participant: ${participantDoc.ref.path} since ${start}, at ${eventTimestamp}`);
        const durationMillis = eventTimestampMillis - startMillis;
        const creditsPerHour = 1.0;
        const durationSeconds = durationMillis / 1000;
        const totalDurationMillis = eventTimestampMillis - lastReachedPodReadyAt.toMillis();
        const totalDurationSeconds = totalDurationMillis / 1000;
        const totalCreditsUsed = (totalDurationSeconds / 3600) * creditsPerHour;
        const creditsUsed = (durationSeconds / 3600) * creditsPerHour;
        const participantUsage = {
            start,
            end: admin.firestore.Timestamp.fromDate(eventTimestamp),
            isFinal,
            creditsUsed,
            creditsPerHour,
            totalDurationSeconds: (isFinal == true) ? totalDurationSeconds : undefined,
            totalCreditsUsed: (isFinal == true) ? totalCreditsUsed : undefined,
            durationSeconds,
        };
        return { organizationId, roomId, participantDoc, participantUsage };
    }
    catch (e) {
        console.error(e);
        console.error(`Failed to calculate usage for participant ${participantDoc.id}`);
        return undefined;
    }
}
exports.calculateParticipantUsage = calculateParticipantUsage;
//# sourceMappingURL=participants.js.map