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
const firestore_1 = require("../lib/documents/firestore");
const originalRoomDoc = {
    id: "qqmp64e3KTIEDEKzi7oK",
};
const organizationId = "lUhC4Ckd1yuaOFf9nEbJ";
async function f() {
    const fiveSecondsAgo = admin.firestore.Timestamp.fromMillis((admin.firestore.Timestamp.now().seconds - 5) * 1000);
    const shardsCreatedWithinFiveSeconds = (await (0, firestore_1.getRoomsRef)(organizationId)
        .where("created", ">", fiveSecondsAgo)
        .where("shardOf", "==", originalRoomDoc.id)
        .get()).docs;
    return shardsCreatedWithinFiveSeconds.forEach((shard) => console.log(shard.ref.path));
}
f();
//# sourceMappingURL=testShards.js.map