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
const misc_1 = require("../lib/misc");
// const organizationId = "ADPq2FiWV1DtBMDc5oAW";
const organizationId = "ocVzdirLO82xiqbHdNZP";
const chunkSize = 10;
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
function chunkList(l) {
    return l.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / chunkSize);
        console.log("Chunk index: ", chunkIndex);
        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = []; // start a new chunk
        }
        resultArray[chunkIndex].push(item);
        return resultArray;
    }, []);
}
async function chunkByChunk(splitAuthUsers, index) {
    const [users, ...remainingSplitAuthUsers] = splitAuthUsers;
    if (users == undefined) {
        console.log("ERROR: Chunk undefined, skipping & sleeping");
    }
    else {
        users.forEach(async (user) => {
            console.log(`Deleting auth user: ${user.email}`);
            await admin.auth().deleteUser(user.uid);
            console.log(`Deleting user doc: ${user.uid}`);
            await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(user.uid).delete();
        });
        console.log("Finished deleting user chunk, sleeping for 1 second");
    }
    if (remainingSplitAuthUsers.length > 0) {
        await (0, misc_1.sleep)(1000);
        await chunkByChunk(remainingSplitAuthUsers, index + 1);
    }
    else {
        console.log("No more chunks to process");
    }
}
async function deleteAuthUsers() {
    console.log("Getting auth users...");
    const allAuthUsers = await admin.auth().listUsers();
    console.log(`Filtering ${allAuthUsers.users.length} test auth users...`);
    const testAuthUsers = allAuthUsers.users.filter((user) => { var _a; return (_a = user.email) === null || _a === void 0 ? void 0 : _a.match("bram\\+wts[0-9]+"); });
    if (testAuthUsers.length < 1) {
        console.log("No Auth Users left to delete!");
    }
    console.log(`Chunking ${testAuthUsers.length} test auth users...`);
    const splitAuthUsers = chunkList(testAuthUsers);
    await chunkByChunk(splitAuthUsers, 0);
}
async function deleteDanglingUsers() {
    console.log("Getting user docs...");
    async function checkAndDeleteChunk(userDocsChunked, index) {
        const [userDocs, ...remainingSplitUsers] = userDocsChunked;
        if (userDocs == undefined) {
            console.log("ERROR: Chunk undefined, skipping & sleeping");
        }
        else {
            userDocs.forEach(async (userDoc) => {
                console.log(`Fetching user doc: ${userDoc.id}`);
                const user = (await userDoc.get()).data();
                if (user.email.match("bram\\+wts[0-9]+")) {
                    console.log(`Deleting user doc: ${userDoc.id}`);
                    await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(userDoc.id).delete();
                }
                else {
                    console.log(`Keeping user doc: ${userDoc.id} as it didn't match`);
                }
            });
            console.log("Finished deleting user chunk, sleeping for 1 second");
        }
        if (remainingSplitUsers.length > 0) {
            await (0, misc_1.sleep)(1000);
            await checkAndDeleteChunk(remainingSplitUsers, index + 1);
        }
        else {
            console.log("No more chunks to process");
        }
    }
    const allUsers = await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").listDocuments();
    const splitUsers = chunkList(allUsers);
    await checkAndDeleteChunk(splitUsers, 0);
}
async function f() {
    await deleteAuthUsers();
    await deleteDanglingUsers();
}
f();
//# sourceMappingURL=deleteTestUsers.js.map