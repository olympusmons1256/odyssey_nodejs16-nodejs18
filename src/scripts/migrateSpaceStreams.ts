import * as admin from "firebase-admin";
// import * as csv from "csv-parse";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {sleep} from "../lib/misc";
import {getOrganizations, getSpaces} from "../lib/documents/firestore";
import {addSpaceStreamingInfo, checkInitialSpaceStreamExists} from "../lib/spaceStreams";

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
        // loginfo(`Working on chunk ${index} of length ${chunk.length}`);
        const chunkResult = await f(chunk);
        // loginfo("Finished chunk");
        return [...result, ...chunkResult];
      }
    }

    const [chunk, ...remainingChunks] = chunks;
    const results = await processChunk();
    if (remainingChunks.length > 0) {
      // loginfo(`Sleeping for ${millis / 1000} seconds`);
      await sleep(millis);
      return await chunkPerSecond(remainingChunks, index + 1, results);
    } else {
      return results;
    }
  }

  return await chunkPerSecond(chunkList(items, chunkSize), 0, []);
}


interface SpaceWithOrg {
  organizationId: string
  spaceId: string
}

async function getAllSpaces() {
  const organizations = await getOrganizations();
  if (organizations == undefined || organizations.length == 0) {
    logerror("No organizations found");
    return [];
  }
  loginfo(`Got ${organizations.length} organizations`);

  const organizationSpaces = (await Promise.all(organizations.flatMap(async ([orgDoc]) => {
    if (orgDoc?.exists != true) return [];
    const spaces = await getSpaces(orgDoc.id);
    if (spaces == undefined) return [];
    return spaces.flatMap(([doc]) => (doc == undefined || doc.exists == false) ? [] : [{organizationId: orgDoc.id, spaceId: doc.id} as SpaceWithOrg]);
  }))).flat();

  loginfo(`Got ${organizationSpaces.length} spaces`);
  return organizationSpaces;
}

async function ensureSpacesHaveStreamingInfo(spaces: SpaceWithOrg[]) {
  const spacesWithoutStreams = (await Promise.all(spaces.flatMap(async (s) => {
    const exists = await checkInitialSpaceStreamExists(s.organizationId, s.spaceId);
    if (exists) {
      loginfo(`Space stream already exists for ${s.organizationId}/${s.spaceId}`);
      return [];
    } else {
      loginfo(`Space does not exist for ${s.organizationId}/${s.spaceId}`);
      return [s];
    }
  }))).flat();
  return await Promise.all(spacesWithoutStreams.map(async (s) => {
    try {
      return await addSpaceStreamingInfo(s.organizationId, s.spaceId);
    } catch (e: any) {
      logerror(`Failed to add space stream info for ${s.organizationId}/${s.spaceId}`);
      logerror(e);
    }
  }));
}

async function f() {
  const spaces = await getAllSpaces();
  await timeChunkedOperation(spaces, 10, 1000, undefined, ensureSpacesHaveStreamingInfo);
}

f();
