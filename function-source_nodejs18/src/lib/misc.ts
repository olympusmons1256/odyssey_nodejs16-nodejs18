import * as fs from "fs";
import {promisify} from "util";
import * as crypto from "crypto";
import * as http from "http";


export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleepForever(): Promise<never> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await sleep(1000000);
  }
}

export function md5sum(data : Buffer) : string {
  const hash = crypto.createHash("md5");
  hash.update(data);
  return hash.digest("hex").toString();
}

export function stringify(value: any) {
  switch (typeof value) {
    case "string": case "object": return JSON.stringify(value);
    default: return String(value);
  }
}

// Load knative spec from filesystem
export async function readFile(path: string) {
  const fsReadFileP = promisify(fs.readFile);
  return await fsReadFileP(path, "utf8");
}

export function isProductionFirebaseProject(projectId: string) {
  return projectId == "ngp-odyssey-prod";
}

export function inEmulatorEnv() {
  return (
    (process.env.VUE_APP_FIREBASE_ENV != undefined && process.env.VUE_APP_FIREBASE_ENV.includes("emulator")) ||
    (process.env.NODE_ENV != undefined && process.env.NODE_ENV.includes("emulator"))
  );
}

export function dedupList<T>(l: Array<T>) {
  return l.filter((x, i, a) => a.indexOf(x) == i);
}

export function isOdysseyStaffEmail(email: string) {
  return /.*@(odyssey\.stream|newgameplus\.live)/.test(email);
}

export function getMedian(numbers: number[]) {
  const mid = Math.floor(numbers.length / 2);
  const sorted = [...numbers].sort((a, b) => a - b);
  const midElement = sorted[mid];
  if (midElement == undefined) return undefined;
  const oddMidElement = sorted[mid - 1];
  if (sorted.length % 2 !== 0) return sorted[mid];
  if (oddMidElement == undefined) return undefined;
  return (oddMidElement + midElement) / 2;
}

export function chunkList<T>(l: Array<T>, chunkSize: number): Array<Array<T>> {
  return l.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index/chunkSize);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    const chunk = resultArray[chunkIndex];
    if (chunk != undefined) chunk.push(item);

    return resultArray;
  }, [] as Array<Array<T>>);
}

export function uniqueByReduce<T>(array: T[]): T[] {
  return array.reduce((acc: T[], current: T) => (!acc.includes(current)) ? [...acc, current] : acc, []);
}

export function lastItemInArray<T>(array: T[]): T | undefined {
  return (array.length > 0) ? array.reverse()[0] : undefined;
}

export async function timeChunkedOperation<T, U>(
  items: Array<T>,
  chunkSize: number,
  millis: number,
  flatMapFn?: (value: T) => Promise<Array<U>>,
  arrayFn?: (value: Array<T>) => Promise<Array<U>>,
  mapFn?: (value: T) => Promise<U>,
) : Promise<Array<U>> {
  async function f(chunk: Array<T>) {
    const flatMapFnGiven = flatMapFn != undefined;
    const arrayFnGiven = arrayFn != undefined;
    const mapFnGiven = mapFn != undefined;
    const fns = [flatMapFnGiven, arrayFnGiven, mapFnGiven];
    const fnsGiven = fns.filter((f) => f);
    if (fnsGiven.length != 1) {
      throw new Error("Only one of flatMapFn, arrayFn or mapFn given");
    }
    if (flatMapFnGiven) {
      return (await Promise.all(chunk.flatMap(async (item) => await flatMapFn(item)))).flat();
    }
    if (arrayFnGiven) {
      return await arrayFn(chunk);
    }
    if (mapFnGiven) {
      return await Promise.all(chunk.map(async (o) => mapFn(o)));
    }
    console.error("Unknown error in timeChunkedOperation");
    return [];
  }
  async function chunkPerSecond(chunks: Array<Array<T>>, index: number, result: Array<U>) : Promise<Array<U>> {
    async function processChunk() {
      if (chunk == undefined) {
        // console.debug("Skipping empty or undefined chunk");
        return result;
      } else {
        console.debug(`Working on chunk ${index} of length ${chunk.length}`);
        const chunkResult = await f(chunk);
        // console.debug("Finished chunk");
        return [...result, ...chunkResult];
      }
    }

    const [chunk, ...remainingChunks] = chunks;
    const results = await processChunk();
    if (remainingChunks.length > 0) {
      // console.debug(`Sleeping for ${millis / 1000} seconds`);
      await sleep(millis);
      return await chunkPerSecond(remainingChunks, index + 1, results);
    } else {
      return results;
    }
  }

  return await chunkPerSecond(chunkList(items, chunkSize), 0, []);
}

export type K8sResponse = { body: any; response: http.IncomingMessage; }

export async function logHttpResponse(responsePromise: Promise<K8sResponse>) {
// export async function logIncomingMessage(incoming: Promise<Hallo>) {
  return await responsePromise
    .then((response) => {
      if (response.response.statusCode == undefined) {
        console.error("Didn't receive status code in response");
      } else {
        if (response.response.statusCode < 200 || response.response.statusCode >= 400) {
          console.error("Error status code: ", response.response.statusCode);
          console.error("Error status message: ", response.response.statusMessage);
        } else {
          console.error("Response status code: ", response.response.statusCode);
          console.error("Response status message: ", response.response.statusMessage);
        }
      }
      return response;
    })
    .catch((e) => {
      console.error("Error during http response");
      console.error(e);
      throw e;
    });
}

export function yearMonthDay() {
  const now = new Date(Date.now());
  return now.getFullYear().toString() + "-" + (now.getMonth() + 1).toString() + "-" + now.getDate();
}

export function getBillingPeriod(date: Date) {
  const year = date.getUTCFullYear().toString();
  const month = `${year}-${date.getUTCMonth().toLocaleString("en-US", {minimumIntegerDigits: 2})}`;
  const day = `${month}-${date.getUTCDate().toLocaleString("en-US", {minimumIntegerDigits: 2})}`;
  const hour = `${day}-${date.getUTCHours().toLocaleString("en-US", {minimumIntegerDigits: 2})}`;
  return {
    year,
    month,
    day,
    hour,
  };
}

export function formatVolumeName(projectName: string, imageId: string, workloadRegion: string) {
  function typeShort() {
    switch (projectName) {
      case "Odyssey":
      case "OdysseyArt":
        return "ody-";
      case "ThirdPersonTemplate":
        return "third-person-template-";
      default:
        return "plugin-";
    }
  }

  return (typeShort() + imageId.replace(new RegExp("_", "g"), "-") + "-" + workloadRegion).toLowerCase();
}

export function convertSpaceSeparatedStringToArray(v: string) {
  try {
    return [...v.split(" ")];
  } catch (e: any) {
    console.error(`Failed to parse space separated array from '${v}'`);
    console.error(e);
    return [];
  }
}
export function tryStringToNumber(s: string | undefined) {
  try {
    return Number(s);
  } catch (e: any) {
    console.error(e);
    return undefined;
  }
}
