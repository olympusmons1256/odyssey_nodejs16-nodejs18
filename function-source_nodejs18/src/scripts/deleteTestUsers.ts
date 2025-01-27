import * as admin from "firebase-admin";
import {User} from "../lib/docTypes";
import {sleep} from "../lib/misc";

// const organizationId = "ADPq2FiWV1DtBMDc5oAW";
const organizationId = "ocVzdirLO82xiqbHdNZP";
const chunkSize = 10;

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

function chunkList<T>(l: Array<T>): Array<Array<T>> {
  return l.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index/chunkSize);
    console.log("Chunk index: ", chunkIndex);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, [] as Array<Array<T>>);
}

async function chunkByChunk(splitAuthUsers: admin.auth.UserRecord[][], index: number) {
  const [users, ...remainingSplitAuthUsers] = splitAuthUsers;
  if (users == undefined) {
    console.log("ERROR: Chunk undefined, skipping & sleeping");
  } else {
    users.forEach(async (user) => {
      console.log(`Deleting auth user: ${user.email}`);
      await admin.auth().deleteUser(user.uid);
      console.log(`Deleting user doc: ${user.uid}`);
      await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(user.uid).delete();
    });
    console.log("Finished deleting user chunk, sleeping for 1 second");
  }
  if (remainingSplitAuthUsers.length > 0) {
    await sleep(1000);
    await chunkByChunk(remainingSplitAuthUsers, index + 1);
  } else {
    console.log("No more chunks to process");
  }
}

async function deleteAuthUsers() {
  console.log("Getting auth users...");
  const allAuthUsers = await admin.auth().listUsers();
  console.log(`Filtering ${allAuthUsers.users.length} test auth users...`);
  const testAuthUsers = allAuthUsers.users.filter((user) => user.email?.match("bram\\+wts[0-9]+"));
  if (testAuthUsers.length < 1) {
    console.log("No Auth Users left to delete!");
  }
  console.log(`Chunking ${testAuthUsers.length} test auth users...`);
  const splitAuthUsers = chunkList<admin.auth.UserRecord>(testAuthUsers);
  await chunkByChunk(splitAuthUsers, 0);
}

async function deleteDanglingUsers() {
  console.log("Getting user docs...");
  async function checkAndDeleteChunk(userDocsChunked: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[][], index: number) {
    const [userDocs, ...remainingSplitUsers] = userDocsChunked;
    if (userDocs == undefined) {
      console.log("ERROR: Chunk undefined, skipping & sleeping");
    } else {
      userDocs.forEach(async (userDoc) => {
        console.log(`Fetching user doc: ${userDoc.id}`);
        const user = (await userDoc.get()).data() as User;
        if (user.email.match("bram\\+wts[0-9]+")) {
          console.log(`Deleting user doc: ${userDoc.id}`);
          await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(userDoc.id).delete();
        } else {
          console.log(`Keeping user doc: ${userDoc.id} as it didn't match`);
        }
      });
      console.log("Finished deleting user chunk, sleeping for 1 second");
    }
    if (remainingSplitUsers.length > 0) {
      await sleep(1000);
      await checkAndDeleteChunk(remainingSplitUsers, index + 1);
    } else {
      console.log("No more chunks to process");
    }
  }
  const allUsers = await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").listDocuments();
  const splitUsers = chunkList<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>(allUsers);
  await checkAndDeleteChunk(splitUsers, 0);
}

async function f() {
  await deleteAuthUsers();
  await deleteDanglingUsers();
}

f();
