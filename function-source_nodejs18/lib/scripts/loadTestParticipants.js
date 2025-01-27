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
const uuid_1 = require("uuid");
const firestore_1 = require("../lib/documents/firestore");
const organizationId = process.env.ORGANIZATION_ID;
const roomId = process.env.ROOM_ID;
const femaleBodyDefault = {
    bodyShape: "1",
    bodyHeight: "0.5",
    clothingTop: { ueId: "F_Buttondown" },
    clothingBottom: { ueId: "F_Slacks" },
    clothingShoes: { ueId: "F_Oxfords" },
};
const maleBodyDefault = {
    bodyShape: "4",
    bodyHeight: "0.5",
    clothingTop: { ueId: "M_Buttondown" },
    clothingBottom: { ueId: "M_Slacks" },
    clothingShoes: { ueId: "M_Oxfords" },
};
const premadeAvatars = [
    Object.assign({ name: "avatar01", img: "https://renderapi.s3.amazonaws.com/nmBIwPLU4.png", glb: "https://d1a370nemizbjq.cloudfront.net/c8f42123-1c82-4e09-a4ee-ed6e573a8621.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar02", img: "https://renderapi.s3.amazonaws.com/UmGMz0nUv.png", glb: "https://d1a370nemizbjq.cloudfront.net/c923ff5b-ae5c-4940-af9c-bd5398e0cb2b.glb" }, femaleBodyDefault),
    Object.assign({ name: "avatar03", img: "https://renderapi.s3.amazonaws.com/rw6E1xGJB.png", glb: "https://d1a370nemizbjq.cloudfront.net/edd9af57-791d-44be-a46a-0e1044ec1742.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar04", img: "https://renderapi.s3.amazonaws.com/VzrycGY44.png", glb: "https://d1a370nemizbjq.cloudfront.net/367d4728-826e-41e7-a63d-fbbf19af75b5.glb" }, femaleBodyDefault),
    Object.assign({ name: "avatar05", img: "https://renderapi.s3.amazonaws.com/VLshxsLOj.png", glb: "https://d1a370nemizbjq.cloudfront.net/53f5670b-82d2-43ea-ad8f-281cf825734c.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar06", img: "https://renderapi.s3.amazonaws.com/knmSw86nD.png", glb: "https://d1a370nemizbjq.cloudfront.net/b0cee677-ca32-490b-900c-5ebc932ad4be.glb" }, femaleBodyDefault),
    Object.assign({ name: "avatar07", img: "https://renderapi.s3.amazonaws.com/nbCxbIwtG.png", glb: "https://d1a370nemizbjq.cloudfront.net/c190292e-5d45-424d-8c40-36fb2e3ea98a.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar08", img: "https://renderapi.s3.amazonaws.com/ryrl5QTHM.png", glb: "https://d1a370nemizbjq.cloudfront.net/a3015682-8c2c-40bf-a3b7-715ccb905f46.glb" }, femaleBodyDefault),
    Object.assign({ name: "avatar09", img: "https://renderapi.s3.amazonaws.com/mrN0Tipp1.png", glb: "https://d1a370nemizbjq.cloudfront.net/efd1416c-c27c-4102-ba68-fa492c21610a.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar10", img: "https://renderapi.s3.amazonaws.com/Mlg6QFCDQ.png", glb: "https://d1a370nemizbjq.cloudfront.net/d8bc602a-ef35-4a92-aef6-0f1158c77b8b.glb" }, femaleBodyDefault),
    Object.assign({ name: "avatar11", img: "https://renderapi.s3.amazonaws.com/lnNXRwXBH.png", glb: "https://d1a370nemizbjq.cloudfront.net/7ee1120c-5b23-4430-af99-a6f1b5018a5f.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar12", img: "https://renderapi.s3.amazonaws.com/fsUSBN1NP.png", glb: "https://d1a370nemizbjq.cloudfront.net/cd0d2638-cb3a-4997-9ee0-cb76ea74fb70.glb" }, femaleBodyDefault),
    Object.assign({ name: "avatar13", img: "https://renderapi.s3.amazonaws.com/cSE0RcMl6.png", glb: "https://d1a370nemizbjq.cloudfront.net/fcf07a2a-f38c-40a9-bdf1-c1454056425b.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar14", img: "https://renderapi.s3.amazonaws.com/GQ9XDry8b.png", glb: "https://d1a370nemizbjq.cloudfront.net/31bdfe52-6127-4a14-9b0e-0b4b3be0cc4d.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar15", img: "https://renderapi.s3.amazonaws.com/XI33onUQr.png", glb: "https://d1a370nemizbjq.cloudfront.net/29f370a9-11c1-4718-9498-401929241133.glb" }, femaleBodyDefault),
    Object.assign({ name: "avatar16", img: "https://renderapi.s3.amazonaws.com/wDzzxN8TY.png", glb: "https://d1a370nemizbjq.cloudfront.net/eedbe667-103d-423f-9437-6124434f5c91.glb" }, femaleBodyDefault),
    Object.assign({ name: "avatar17", img: "https://renderapi.s3.amazonaws.com/1I4LP9dxk.png", glb: "https://d1a370nemizbjq.cloudfront.net/620c27bb-9a53-48e0-8778-3a2da3fab923.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar18", img: "https://renderapi.s3.amazonaws.com/rBGuZqmqT.png", glb: "https://d1a370nemizbjq.cloudfront.net/e9aabaa7-2e57-4c05-bf71-5a31af129223.glb" }, femaleBodyDefault),
    Object.assign({ name: "avatar19", img: "https://renderapi.s3.amazonaws.com/cv73Ss2zJ.png", glb: "https://d1a370nemizbjq.cloudfront.net/6549db82-497e-402b-9075-17789c73b1c0.glb" }, maleBodyDefault),
    Object.assign({ name: "avatar20", img: "https://renderapi.s3.amazonaws.com/c3yzqnkum.png", glb: "https://d1a370nemizbjq.cloudfront.net/cc816ea2-2b8c-4f65-a240-2d591ef90a5f.glb" }, femaleBodyDefault),
];
async function generateRandomUser(organizationId, count) {
    const avatar = premadeAvatars[(count % premadeAvatars.length)];
    const userId = (0, uuid_1.v4)();
    const email = userId + "+bot" + "@newgameplus.live";
    const name = "Bot";
    // user shapes
    const rootUser = {
        email: email,
        name: name,
        created: admin.firestore.Timestamp.now(),
        updated: admin.firestore.Timestamp.now(),
        bot: true,
        avatarReadyPlayerMeUrl: avatar.glb,
        avatarReadyPlayerMeImg: avatar.img,
        bodyShape: avatar.bodyShape,
        bodyHeight: avatar.bodyHeight,
        clothingTop: avatar.clothingTop,
        clothingBottom: avatar.clothingBottom,
        clothingShoes: avatar.clothingShoes,
        userOrganizations: [{ id: organizationId, role: "org_viewer" }],
    };
    const organizationUser = {
        email: email,
        name: name,
        role: "org_viewer",
        bot: true,
        created: admin.firestore.Timestamp.now(),
        updated: admin.firestore.Timestamp.now(),
    };
    const botRootUser = rootUser;
    const botOrgUser = organizationUser;
    // generate user docs
    const rootUserDoc = (0, firestore_1.getUserRef)(userId);
    const organizationUserDoc = (0, firestore_1.getOrganizationUserRef)(organizationId, userId);
    await Promise.all([
        await rootUserDoc.set(botRootUser),
        await organizationUserDoc.set(botOrgUser),
    ]);
    console.log("Created bot user docs in: /" + organizationId);
    return organizationUserDoc;
}
async function setBotCliArgs(userId) {
    const config = {
        // unrealOverrideCliArgs: "-RandomBotProfile networkprofile=true -RandomMove",
        unrealOverrideCliArgs: "-RandomMove",
    };
    await (0, firestore_1.getUserConfigurationOdysseyClientPodRef)(userId).set(config);
    console.log("Set bot user configuration");
}
async function generateRandomParticipant(organizationId, roomId, userId) {
    const deviceId = (0, uuid_1.v4)();
    const participant = {
        stateChanges: [],
        created: admin.firestore.Timestamp.now(),
        updated: admin.firestore.Timestamp.now(),
        userId,
        deviceId,
    };
    const participantBot = participant;
    participantBot.bot = true;
    const participantId = participant.userId + ":" + participant.deviceId;
    console.log("Created participant: /" + organizationId + "/" + roomId + "/" + participantId);
    const doc = admin.firestore()
        .collection("organizations").doc(organizationId)
        .collection("rooms").doc(roomId)
        .collection("participants").doc(participantId);
    return await doc.set(participantBot);
}
async function getRoomShardsUnderThreshold(organizationId, roomId, room) {
    if (room == undefined) {
        console.error("Failed to get room. Using roomId as roomShard");
        return undefined;
    }
    const roomShardIds = () => {
        if (room.shards == undefined || room.shards.length == 0) {
            return [roomId];
        }
        else {
            return [...room.shards, roomId];
        }
    };
    return (await Promise.all(roomShardIds().map(async (shardId) => {
        const [doc, shard] = await (0, firestore_1.getRoom)(organizationId, shardId);
        if (doc == undefined || shard == undefined) {
            console.error("Shard doc or data undefined");
            return [];
        }
        else {
            const shardSlotsAvailable = () => {
                if (shard.currentParticipantCount == undefined) {
                    return 31;
                }
                else if (31 - shard.currentParticipantCount > 0) {
                    return 31 - shard.currentParticipantCount;
                }
                else {
                    return 0;
                }
            };
            return Array.from(Array(shardSlotsAvailable()).keys()).flatMap(() => [[doc.id, shard]]);
        }
    }))).flat();
}
async function loadTest(count) {
    if (organizationId == undefined || organizationId == "") {
        console.error("ORGANIZATION_ID env var not set");
        process.exit(1);
    }
    if (roomId == undefined || roomId == "") {
        console.error("ROOM_ID env var not set");
        process.exit(1);
    }
    console.debug(`Creating ${count} users & participants in `, (0, firestore_1.getRoomRef)(organizationId, roomId).path);
    const [, room] = await (0, firestore_1.getRoom)(organizationId, roomId);
    const shardSlots = await getRoomShardsUnderThreshold(organizationId, roomId, room);
    if (shardSlots == undefined) {
        console.error("Failed to get room shards that are not full");
        process.exit(1);
    }
    console.log("Total shard slots: ", shardSlots.length);
    if (count > shardSlots.length) {
        console.error("Not enough room slots for this number of participants");
        process.exit(1);
    }
    const users = (await Promise.all(Array.from(Array(count).keys()).map(async (n) => {
        return await generateRandomUser(organizationId, n);
    }))).map(async (doc) => {
        await setBotCliArgs(doc.id);
        return doc;
    });
    users.map(async (user, index) => {
        const shard = shardSlots.pop();
        if (shard != undefined) {
            return await generateRandomParticipant(organizationId, shard[0], (await user).id);
        }
        else {
            console.error("Failed to get a shard slot for user: ", index);
            return;
        }
    });
}
const args = process.argv.slice(2);
if (args.length != 1 || args[0] == undefined || args[0] == "") {
    console.error("No load test count provided. Give a number of participants to create.");
    process.exit(1);
}
loadTest(Number.parseInt(args[0]));
//# sourceMappingURL=loadTestParticipants.js.map