import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {Participant} from "../lib/docTypes";
import {getParticipants, getRoom, getOrganizationUser, getUser} from "../lib/documents/firestore";

const organizationId = process.env.ORGANIZATION_ID;
const roomId = process.env.ROOM_ID;

async function deleteBotParticipants(organizationId: string, roomId: string, max: number) {
  const participants = await getParticipants(organizationId, roomId);
  if (participants == undefined) {
    console.log("No participants found");
    return [];
  } else {
    return (await Promise.all(participants.slice(0, max).map(async (r) => {
      const [doc, p] = r;
      const data = doc?.data();
      if (p != undefined && data != undefined && data.bot == true) {
        console.log("Deleting participant " + doc?.id);
        try {
          await doc?.ref.delete();
          return [p];
        } catch (e: any) {
          return [];
        }
      } else {
        return [];
      }
    }))).flat();
  }
}

async function deleteBotUser(organizationId: string, participant: Participant) {
  const [memberDoc, member] = await getOrganizationUser(organizationId, participant.userId);
  if (memberDoc == undefined || member == undefined) {
    console.log("Org member from participant not found");
    return;
  }
  const userWithBot : any = memberDoc.data();
  if (userWithBot.bot != undefined && userWithBot.bot == true) {
    const [userDoc, user] = await getUser(participant.userId);
    if (userDoc == undefined || user == undefined) {
      console.log("User from participant not found");
      return;
    }
    await memberDoc.ref.delete();
    await userDoc.ref.delete();
    console.debug("Deleted user: ", memberDoc.id);
  } else {
    console.debug("User is not a bot: ", memberDoc.id);
  }
}

async function getRoomWithShards(organizationId: string, roomId: string) {
  const [, room] = await getRoom(organizationId, roomId );
  if (room == undefined) {
    console.error("Failed to get room.");
    return [roomId];
  }
  if (room == undefined || room.shards == undefined || room.shards.length == 0) {
    return [roomId];
  } else {
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
