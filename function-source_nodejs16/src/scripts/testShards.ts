
import * as admin from "firebase-admin";
import {getRoomsRef} from "../lib/documents/firestore";

const originalRoomDoc = {
  id: "qqmp64e3KTIEDEKzi7oK",
};
const organizationId = "lUhC4Ckd1yuaOFf9nEbJ";

async function f() {
  const fiveSecondsAgo = admin.firestore.Timestamp.fromMillis((admin.firestore.Timestamp.now().seconds - 5) * 1000);
  const shardsCreatedWithinFiveSeconds = (await getRoomsRef(organizationId)
    .where("created", ">", fiveSecondsAgo)
    .where("shardOf", "==", originalRoomDoc.id)
    .get()).docs;
  return shardsCreatedWithinFiveSeconds.forEach((shard) => console.log(shard.ref.path));
}

f();
