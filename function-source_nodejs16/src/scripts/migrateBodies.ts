import * as admin from "firebase-admin";
// import * as csv from "csv-parse";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {sleep} from "../lib/misc";

function log(level: string, msg: string, obj?: any) {
  const message = `${new Date().toISOString()} - ${level}: ${msg}`;
  if (obj == undefined) {
    console.log(message);
  } else {
    console.log(message, obj);
  }
}

function loginfo(msg: string, obj?: any) {
  log("INFO", msg, obj);
}

function logerror(msg: string, obj?: any) {
  log("ERROR", msg, obj);
}

function logwarn(msg: string, obj?: any) {
  log("WARN", msg, obj);
}

function chunkList<T>(l: Array<T>, chunkSize: number): Array<Array<T>> {
  return l.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index/chunkSize);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, [] as Array<Array<T>>);
}

async function timeChunkedOperation<T, U>(
  items: Array<T>,
  chunkSize: number,
  millis: number,
  flatMapFn?: (value: T) => Promise<Array<U>>,
  arrayFn?: (value: Array<T>) => Promise<Array<U>>,
) : Promise<Array<U>> {
  async function f(chunk: Array<T>) {
    if (flatMapFn == undefined && arrayFn == undefined) {
      logerror("Neither flatMapFn nor arrayFn given");
      return [];
    } else if (flatMapFn != undefined && arrayFn != undefined) {
      logerror("Both flatMapFn and arrayFn given");
      return [];
    } else if (flatMapFn != undefined) {
      return (await Promise.all(chunk.flatMap(async (item) => await flatMapFn(item)))).flat();
    } else if (arrayFn != undefined) {
      return await arrayFn(chunk);
    } else {
      logerror("Unknown error with flatMapFn or arrayFn");
      return [];
    }
  }
  async function chunkPerSecond(chunks: Array<Array<T>>, index: number, result: Array<U>) : Promise<Array<U>> {
    async function processChunk() {
      if (chunk == undefined) {
        logwarn("Skipping empty or undefined chunk");
        return result;
      } else {
        loginfo(`Working on chunk ${index} of length ${chunk.length}`);
        const chunkResult = await f(chunk);
        loginfo("Finished chunk");
        return [...result, ...chunkResult];
      }
    }

    const [chunk, ...remainingChunks] = chunks;
    const results = await processChunk();
    if (remainingChunks.length > 0) {
      loginfo(`Sleeping for ${millis / 1000} seconds`);
      await sleep(millis);
      return await chunkPerSecond(remainingChunks, index + 1, results);
    } else {
      return results;
    }
  }

  return await chunkPerSecond(chunkList(items, chunkSize), 0, []);
}

async function updateUserBodies(docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]) {
  async function f(userDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) {
    try {
      const userData = userDoc.data();
      const bodyShape = userData.bodyShape || 0;
      if (bodyShape === "10" || bodyShape === "13" || bodyShape === "16") {
        return [await userDoc.ref.update({
          bodyShape: "0",
          bodyHeight: "0.5",
          ["clothingTop.ueId"]: "F_Buttondown",
          ["clothingBottom.ueId"]: "F_Slacks",
          ["clothingShoes.ueId"]: "F_Oxfords",
        })];
      } else if (bodyShape === "9" || bodyShape === "12" || bodyShape === "15") {
        return [await userDoc.ref.update({
          bodyShape: "1",
          bodyHeight: "0.5",
          ["clothingTop.ueId"]: "F_Buttondown",
          ["clothingBottom.ueId"]: "F_Slacks",
          ["clothingShoes.ueId"]: "F_Oxfords",
        })];
      } else if (bodyShape === "11" || bodyShape === "14" || bodyShape === "17") {
        return [await userDoc.ref.update({
          bodyShape: "2",
          bodyHeight: "0.5",
          ["clothingTop.ueId"]: "F_Buttondown",
          ["clothingBottom.ueId"]: "F_Slacks",
          ["clothingShoes.ueId"]: "F_Oxfords",
        })];
      } else if (bodyShape === "4" || bodyShape === "1" || bodyShape === "7") {
        return [await userDoc.ref.update({
          bodyShape: "3",
          bodyHeight: "0.5",
          ["clothingTop.ueId"]: "M_Buttondown",
          ["clothingBottom.ueId"]: "M_Slacks",
          ["clothingShoes.ueId"]: "M_Oxfords",
        })];
      } else if (bodyShape === "2" || bodyShape === "5" || bodyShape === "8") {
        return [await userDoc.ref.update({
          bodyShape: "5",
          bodyHeight: "0.5",
          ["clothingTop.ueId"]: "M_Buttondown",
          ["clothingBottom.ueId"]: "M_Slacks",
          ["clothingShoes.ueId"]: "M_Oxfords",
        })];
      } else {
        return [await userDoc.ref.update({
          bodyShape: "4",
          bodyHeight: "0.5",
          ["clothingTop.ueId"]: "M_Buttondown",
          ["clothingBottom.ueId"]: "M_Slacks",
          ["clothingShoes.ueId"]: "M_Oxfords",
        })];
      }
    } catch (e: any) {
      logerror(e);
      return [];
    }
  }

  return timeChunkedOperation<FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>, FirebaseFirestore.WriteResult>(docs, 100, 1000, f);
}

async function run() {
  const users = await admin.firestore().collection("users").get();
  loginfo(`Got ${users.docs.length} user bodies to migrate`);
  const result = await updateUserBodies(users.docs);
  loginfo(`Migrated ${result.length} user bodies`);
}
run();
