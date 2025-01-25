import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import {Room} from "../lib/docTypes";
import {getRoomsRef} from "../lib/documents/firestore";

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
  const shards = (await getRoomsRef(organizationId)
    .where("shardOf", "==", roomId)
    .get()).docs;
  return shards.forEach((shard) => {
    const shardRoom = shard.data() as Room;
    if ((shardRoom.currentParticipantCount == undefined || shardRoom.currentParticipantCount == 0) && (shardRoom.state == "deprovisioned" || shardRoom.state == undefined)) {
      console.log("Deleting shard room: ", shard.ref.path);
      shard.ref.delete();
    } else {
      console.log("Not deleting shard room which is either still running or has participants: ", shard.ref.path);
    }
  });
}

f();
