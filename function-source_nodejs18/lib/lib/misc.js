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
exports.tryStringToNumber = exports.convertSpaceSeparatedStringToArray = exports.formatVolumeName = exports.getBillingPeriod = exports.yearMonthDay = exports.logHttpResponse = exports.timeChunkedOperation = exports.lastItemInArray = exports.uniqueByReduce = exports.chunkList = exports.getMedian = exports.isOdysseyStaffEmail = exports.dedupList = exports.inEmulatorEnv = exports.isProductionFirebaseProject = exports.readFile = exports.stringify = exports.md5sum = exports.sleepForever = exports.sleep = void 0;
const fs = __importStar(require("fs"));
const util_1 = require("util");
const crypto = __importStar(require("crypto"));
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleep = sleep;
async function sleepForever() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        await sleep(1000000);
    }
}
exports.sleepForever = sleepForever;
function md5sum(data) {
    const hash = crypto.createHash("md5");
    hash.update(data);
    return hash.digest("hex").toString();
}
exports.md5sum = md5sum;
function stringify(value) {
    switch (typeof value) {
        case "string":
        case "object": return JSON.stringify(value);
        default: return String(value);
    }
}
exports.stringify = stringify;
// Load knative spec from filesystem
async function readFile(path) {
    const fsReadFileP = (0, util_1.promisify)(fs.readFile);
    return await fsReadFileP(path, "utf8");
}
exports.readFile = readFile;
function isProductionFirebaseProject(projectId) {
    return projectId == "ngp-odyssey-prod";
}
exports.isProductionFirebaseProject = isProductionFirebaseProject;
function inEmulatorEnv() {
    return ((process.env.VUE_APP_FIREBASE_ENV != undefined && process.env.VUE_APP_FIREBASE_ENV.includes("emulator")) ||
        (process.env.NODE_ENV != undefined && process.env.NODE_ENV.includes("emulator")));
}
exports.inEmulatorEnv = inEmulatorEnv;
function dedupList(l) {
    return l.filter((x, i, a) => a.indexOf(x) == i);
}
exports.dedupList = dedupList;
function isOdysseyStaffEmail(email) {
    return /.*@(odyssey\.stream|newgameplus\.live)/.test(email);
}
exports.isOdysseyStaffEmail = isOdysseyStaffEmail;
function getMedian(numbers) {
    const mid = Math.floor(numbers.length / 2);
    const sorted = [...numbers].sort((a, b) => a - b);
    const midElement = sorted[mid];
    if (midElement == undefined)
        return undefined;
    const oddMidElement = sorted[mid - 1];
    if (sorted.length % 2 !== 0)
        return sorted[mid];
    if (oddMidElement == undefined)
        return undefined;
    return (oddMidElement + midElement) / 2;
}
exports.getMedian = getMedian;
function chunkList(l, chunkSize) {
    return l.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / chunkSize);
        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = []; // start a new chunk
        }
        const chunk = resultArray[chunkIndex];
        if (chunk != undefined)
            chunk.push(item);
        return resultArray;
    }, []);
}
exports.chunkList = chunkList;
function uniqueByReduce(array) {
    return array.reduce((acc, current) => (!acc.includes(current)) ? [...acc, current] : acc, []);
}
exports.uniqueByReduce = uniqueByReduce;
function lastItemInArray(array) {
    return (array.length > 0) ? array.reverse()[0] : undefined;
}
exports.lastItemInArray = lastItemInArray;
async function timeChunkedOperation(items, chunkSize, millis, flatMapFn, arrayFn, mapFn) {
    async function f(chunk) {
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
    async function chunkPerSecond(chunks, index, result) {
        async function processChunk() {
            if (chunk == undefined) {
                // console.debug("Skipping empty or undefined chunk");
                return result;
            }
            else {
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
        }
        else {
            return results;
        }
    }
    return await chunkPerSecond(chunkList(items, chunkSize), 0, []);
}
exports.timeChunkedOperation = timeChunkedOperation;
async function logHttpResponse(responsePromise) {
    // export async function logIncomingMessage(incoming: Promise<Hallo>) {
    return await responsePromise
        .then((response) => {
        if (response.response.statusCode == undefined) {
            console.error("Didn't receive status code in response");
        }
        else {
            if (response.response.statusCode < 200 || response.response.statusCode >= 400) {
                console.error("Error status code: ", response.response.statusCode);
                console.error("Error status message: ", response.response.statusMessage);
            }
            else {
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
exports.logHttpResponse = logHttpResponse;
function yearMonthDay() {
    const now = new Date(Date.now());
    return now.getFullYear().toString() + "-" + (now.getMonth() + 1).toString() + "-" + now.getDate();
}
exports.yearMonthDay = yearMonthDay;
function getBillingPeriod(date) {
    const year = date.getUTCFullYear().toString();
    const month = `${year}-${date.getUTCMonth().toLocaleString("en-US", { minimumIntegerDigits: 2 })}`;
    const day = `${month}-${date.getUTCDate().toLocaleString("en-US", { minimumIntegerDigits: 2 })}`;
    const hour = `${day}-${date.getUTCHours().toLocaleString("en-US", { minimumIntegerDigits: 2 })}`;
    return {
        year,
        month,
        day,
        hour,
    };
}
exports.getBillingPeriod = getBillingPeriod;
function formatVolumeName(projectName, imageId, workloadRegion) {
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
exports.formatVolumeName = formatVolumeName;
function convertSpaceSeparatedStringToArray(v) {
    try {
        return [...v.split(" ")];
    }
    catch (e) {
        console.error(`Failed to parse space separated array from '${v}'`);
        console.error(e);
        return [];
    }
}
exports.convertSpaceSeparatedStringToArray = convertSpaceSeparatedStringToArray;
function tryStringToNumber(s) {
    try {
        return Number(s);
    }
    catch (e) {
        console.error(e);
        return undefined;
    }
}
exports.tryStringToNumber = tryStringToNumber;
//# sourceMappingURL=misc.js.map