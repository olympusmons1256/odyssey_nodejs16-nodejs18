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
const organizationId = process.env.ORGANIZATION_ID;
const roomId = process.env.ROOM_ID;
async function deleteBotParticipants(organizationId, roomId, max) {
    const participants = await (0, firestore_1.getParticipants)(organizationId, roomId);
    if (participants == undefined) {
        console.log("No participants found");
        return [];
    }
    else {
        return (await Promise.all(participants.slice(0, max).map(async (r) => {
            const [doc, p] = r;
            const data = doc === null || doc === void 0 ? void 0 : doc.data();
            if (p != undefined && data != undefined && data.bot == true) {
                console.log("Deleting participant " + (doc === null || doc === void 0 ? void 0 : doc.id));
                try {
                    await (doc === null || doc === void 0 ? void 0 : doc.ref.delete());
                    return [p];
                }
                catch (e) {
                    return [];
                }
            }
            else {
                return [];
            }
        }))).flat();
    }
}
async function deleteBotUser(organizationId, participant) {
    const [memberDoc, member] = await (0, firestore_1.getOrganizationUser)(organizationId, participant.userId);
    if (memberDoc == undefined || member == undefined) {
        console.log("Org member from participant not found");
        return;
    }
    const userWithBot = memberDoc.data();
    if (userWithBot.bot != undefined && userWithBot.bot == true) {
        const [userDoc, user] = await (0, firestore_1.getUser)(participant.userId);
        if (userDoc == undefined || user == undefined) {
            console.log("User from participant not found");
            return;
        }
        await memberDoc.ref.delete();
        await userDoc.ref.delete();
        console.debug("Deleted user: ", memberDoc.id);
    }
    else {
        console.debug("User is not a bot: ", memberDoc.id);
    }
}
async function getRoomWithShards(organizationId, roomId) {
    const [, room] = await (0, firestore_1.getRoom)(organizationId, roomId);
    if (room == undefined) {
        console.error("Failed to get room.");
        return [roomId];
    }
    if (room == undefined || room.shards == undefined || room.shards.length == 0) {
        return [roomId];
    }
    else {
        return [roomId, ...room.shards];
    }
}
async function f() {
    if (organizationId == undefined || organizationId == "") {
        console.error("ORGANIZATION_ID env var not set");
        process.exit(1);
    }
    if (roomId == undefined || roomId == "") {
        console.error("ROOM_ID env var not set");
        process.exit(1);
    }
    (await getRoomWithShards(organizationId, roomId)).forEach(async (roomShardId) => {
        (await deleteBotParticipants(organizationId, roomShardId, 3)).forEach(async (p) => await deleteBotUser(organizationId, p));
    });
}
f();
//# sourceMappingURL=deleteTestParticipants.js.map