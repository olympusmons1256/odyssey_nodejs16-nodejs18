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
// import * as csv from "csv-parse";
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const misc_1 = require("../lib/misc");
const firestore_1 = require("../lib/documents/firestore");
const spaceStreams_1 = require("../lib/spaceStreams");
function log(level, msg, obj) {
    const message = `${new Date().toISOString()} - ${level}: ${msg}`;
    if (obj == undefined) {
        console.log(message);
    }
    else {
        console.log(message, obj);
    }
}
function loginfo(msg, obj) {
    log("INFO", msg, obj);
}
function logerror(msg, obj) {
    log("ERROR", msg, obj);
}
function logwarn(msg, obj) {
    log("WARN", msg, obj);
}
function chunkList(l, chunkSize) {
    return l.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / chunkSize);
        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = []; // start a new chunk
        }
        resultArray[chunkIndex].push(item);
        return resultArray;
    }, []);
}
async function timeChunkedOperation(items, chunkSize, millis, flatMapFn, arrayFn) {
    async function f(chunk) {
        if (flatMapFn == undefined && arrayFn == undefined) {
            logerror("Neither flatMapFn nor arrayFn given");
            return [];
        }
        else if (flatMapFn != undefined && arrayFn != undefined) {
            logerror("Both flatMapFn and arrayFn given");
            return [];
        }
        else if (flatMapFn != undefined) {
            return (await Promise.all(chunk.flatMap(async (item) => await flatMapFn(item)))).flat();
        }
        else if (arrayFn != undefined) {
            return await arrayFn(chunk);
        }
        else {
            logerror("Unknown error with flatMapFn or arrayFn");
            return [];
        }
    }
    async function chunkPerSecond(chunks, index, result) {
        async function processChunk() {
            if (chunk == undefined) {
                logwarn("Skipping empty or undefined chunk");
                return result;
            }
            else {
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
            await (0, misc_1.sleep)(millis);
            return await chunkPerSecond(remainingChunks, index + 1, results);
        }
        else {
            return results;
        }
    }
    return await chunkPerSecond(chunkList(items, chunkSize), 0, []);
}
async function getAllSpaces() {
    const organizations = await (0, firestore_1.getOrganizations)();
    if (organizations == undefined || organizations.length == 0) {
        logerror("No organizations found");
        return [];
    }
    loginfo(`Got ${organizations.length} organizations`);
    const organizationSpaces = (await Promise.all(organizations.flatMap(async ([orgDoc]) => {
        if ((orgDoc === null || orgDoc === void 0 ? void 0 : orgDoc.exists) != true)
            return [];
        const spaces = await (0, firestore_1.getSpaces)(orgDoc.id);
        if (spaces == undefined)
            return [];
        return spaces.flatMap(([doc]) => (doc == undefined || doc.exists == false) ? [] : [{ organizationId: orgDoc.id, spaceId: doc.id }]);
    }))).flat();
    loginfo(`Got ${organizationSpaces.length} spaces`);
    return organizationSpaces;
}
async function ensureSpacesHaveStreamingInfo(spaces) {
    const spacesWithoutStreams = (await Promise.all(spaces.flatMap(async (s) => {
        const exists = await (0, spaceStreams_1.checkInitialSpaceStreamExists)(s.organizationId, s.spaceId);
        if (exists) {
            loginfo(`Space stream already exists for ${s.organizationId}/${s.spaceId}`);
            return [];
        }
        else {
            loginfo(`Space does not exist for ${s.organizationId}/${s.spaceId}`);
            return [s];
        }
    }))).flat();
    return await Promise.all(spacesWithoutStreams.map(async (s) => {
        try {
            return await (0, spaceStreams_1.addSpaceStreamingInfo)(s.organizationId, s.spaceId);
        }
        catch (e) {
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
//# sourceMappingURL=migrateSpaceStreams.js.map