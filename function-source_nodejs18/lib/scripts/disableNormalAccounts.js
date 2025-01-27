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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const sync_1 = require("csv-parse/sync");
const misc_1 = require("../lib/misc");
const validate_js_1 = __importDefault(require("validate.js"));
const utils_1 = require("../lib/utils");
// const organizationId = "ADPq2FiWV1DtBMDc5oAW";
const organizationId = "Mu3mBkY5xKskkW6Yvlh9";
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
async function readCsv() {
    // Read the csv file
    const content = await fs.promises.readFile("./usersToRegister.csv");
    // Parse the CSV content
    const records = (0, sync_1.parse)(content, {
        delimiter: ",",
    });
    return records;
}
function recordsToAttendees(records) {
    return records.map((record) => {
        const fixedEmail = record[3].replace(/\s+/, "");
        const attendee = {
            firstName: record[0],
            lastName: record[1],
            company: record[2],
            email: fixedEmail,
            status: record[4],
        };
        const constraints = {
            email: {
                email: true,
            },
        };
        const validation = (0, validate_js_1.default)(attendee, constraints);
        if (validation != undefined) {
            console.log("Invalid email, skipping: ", attendee);
            return undefined;
        }
        return attendee;
    });
}
async function findOldUserDocs(attendee) {
    const docs = (await admin.firestore().collectionGroup("users").where("email", "==", attendee.email).get()).docs;
    const oldDocs = docs.flatMap((doc) => { var _a; return (((_a = doc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id) == organizationId) ? [] : [doc]; });
    console.log(`Found ${oldDocs.length} old user docs for ${attendee.email}`);
    return oldDocs;
}
async function disableOldDoc(doc) {
    const user = doc.data();
    console.log(`Disabling old doc ${doc.ref.path} for email ${user.email}`);
    user.email = "__disabled__" + user.email;
    return doc.ref.update((0, utils_1.toFirestoreUpdateData)(user));
}
async function disableOldUserDocs(attendees) {
    return attendees.map(async (attendee) => {
        return (await findOldUserDocs(attendee)).map(async (doc) => await disableOldDoc(doc));
    });
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
async function disableChunkByChunk(splitAttendees, index) {
    const [attendees, ...remainingAttendees] = splitAttendees;
    if (attendees == undefined || attendees.length == 0) {
        console.log("Skipping empty or undefined chunk");
    }
    else {
        console.log(new Date(Date.now()));
        console.log(`Working on chunk ${index}`);
        console.log("Checking auth users...");
        await Promise.all(await disableOldUserDocs(attendees));
        console.log("Finished chunk, sleeping for 1 second");
    }
    if (remainingAttendees.length > 0) {
        await (0, misc_1.sleep)(1000);
        await disableChunkByChunk(remainingAttendees, index + 1);
    }
    else {
        console.log("No more chunks left");
    }
}
async function f() {
    console.log("Reading CSV...");
    const records = await readCsv();
    console.log("Converting records to attendees...");
    const attendees = recordsToAttendees(records).flatMap((r) => (r != undefined) ? [r] : []);
    const splitAttendees = chunkList(attendees, 10);
    console.log("Splitting attendees into chunks for disabling");
    console.log(`We now have ${splitAttendees.length} lists of ${10} attendees to disable`);
    await disableChunkByChunk(splitAttendees, 0);
    console.log("Done!");
}
f();
//# sourceMappingURL=disableNormalAccounts.js.map