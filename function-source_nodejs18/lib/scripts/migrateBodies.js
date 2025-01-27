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
            await (0, misc_1.sleep)(millis);
            return await chunkPerSecond(remainingChunks, index + 1, results);
        }
        else {
            return results;
        }
    }
    return await chunkPerSecond(chunkList(items, chunkSize), 0, []);
}
async function updateUserBodies(docs) {
    async function f(userDoc) {
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
            }
            else if (bodyShape === "9" || bodyShape === "12" || bodyShape === "15") {
                return [await userDoc.ref.update({
                        bodyShape: "1",
                        bodyHeight: "0.5",
                        ["clothingTop.ueId"]: "F_Buttondown",
                        ["clothingBottom.ueId"]: "F_Slacks",
                        ["clothingShoes.ueId"]: "F_Oxfords",
                    })];
            }
            else if (bodyShape === "11" || bodyShape === "14" || bodyShape === "17") {
                return [await userDoc.ref.update({
                        bodyShape: "2",
                        bodyHeight: "0.5",
                        ["clothingTop.ueId"]: "F_Buttondown",
                        ["clothingBottom.ueId"]: "F_Slacks",
                        ["clothingShoes.ueId"]: "F_Oxfords",
                    })];
            }
            else if (bodyShape === "4" || bodyShape === "1" || bodyShape === "7") {
                return [await userDoc.ref.update({
                        bodyShape: "3",
                        bodyHeight: "0.5",
                        ["clothingTop.ueId"]: "M_Buttondown",
                        ["clothingBottom.ueId"]: "M_Slacks",
                        ["clothingShoes.ueId"]: "M_Oxfords",
                    })];
            }
            else if (bodyShape === "2" || bodyShape === "5" || bodyShape === "8") {
                return [await userDoc.ref.update({
                        bodyShape: "5",
                        bodyHeight: "0.5",
                        ["clothingTop.ueId"]: "M_Buttondown",
                        ["clothingBottom.ueId"]: "M_Slacks",
                        ["clothingShoes.ueId"]: "M_Oxfords",
                    })];
            }
            else {
                return [await userDoc.ref.update({
                        bodyShape: "4",
                        bodyHeight: "0.5",
                        ["clothingTop.ueId"]: "M_Buttondown",
                        ["clothingBottom.ueId"]: "M_Slacks",
                        ["clothingShoes.ueId"]: "M_Oxfords",
                    })];
            }
        }
        catch (e) {
            logerror(e);
            return [];
        }
    }
    return timeChunkedOperation(docs, 100, 1000, f);
}
async function run() {
    const users = await admin.firestore().collection("users").get();
    loginfo(`Got ${users.docs.length} user bodies to migrate`);
    const result = await updateUserBodies(users.docs);
    loginfo(`Migrated ${result.length} user bodies`);
}
run();
//# sourceMappingURL=migrateBodies.js.map