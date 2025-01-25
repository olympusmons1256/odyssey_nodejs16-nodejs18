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
async function f() {
    const organizationId = process.env.ORGANIZATION_ID;
    const roomId = process.env.ROOM_ID;
    if (organizationId == undefined || organizationId == "") {
        console.error("ORGANIZATION_ID env var not set");
        process.exit(1);
    }
    if (roomId == undefined || roomId == "") {
        console.error("ROOM_ID env var not set");
        process.exit(1);
    }
    const shards = (await (0, firestore_1.getRoomsRef)(organizationId)
        .where("shardOf", "==", roomId)
        .get()).docs;
    return shards.forEach((shard) => {
        const shardRoom = shard.data();
        if ((shardRoom.currentParticipantCount == undefined || shardRoom.currentParticipantCount == 0) && (shardRoom.state == "deprovisioned" || shardRoom.state == undefined)) {
            console.log("Deleting shard room: ", shard.ref.path);
            shard.ref.delete();
        }
        else {
            console.log("Not deleting shard room which is either still running or has participants: ", shard.ref.path);
        }
    });
}
f();
//# sourceMappingURL=deleteShards.js.map