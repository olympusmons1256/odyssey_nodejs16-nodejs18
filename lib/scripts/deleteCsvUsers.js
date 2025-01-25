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
const organizationId = "ocVzdirLO82xiqbHdNZP";
const deleteChunkSize = 9;
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
        const fixedEmail = record[3].replace(/\s+/, "").toLocaleLowerCase();
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
async function getAuthUsers(attendees) {
    return (await Promise.all(attendees.map(async (attendee) => {
        if (attendee == undefined) {
            console.log("Skipping undefined attendee");
            return undefined;
        }
        else {
            try {
                const authUser = await admin.auth().getUserByEmail(attendee.email);
                return {
                    uid: authUser.uid,
                    email: authUser.email,
                };
            }
            catch (e) {
                console.log(`Failed to get auth user: ${attendee.email} for reason ${e.errorInfo.code}`);
                return undefined;
            }
        }
    })))
        .flatMap((attendee) => (attendee == undefined) ? [] : [attendee]);
}
async function getUserDocs(attendees) {
    const attendeeEmails = attendees.flatMap((a) => (a != undefined) ? [a.email] : []);
    const usersWithIds = await Promise.all((await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").listDocuments()).map(async (userDoc) => {
        const user = (await userDoc.get()).data();
        const uid = userDoc.id;
        return [user, uid];
    }));
    const userEmails = usersWithIds.map(([user]) => user.email);
    return attendeeEmails.map((email) => {
        if (userEmails.includes(email)) {
            const userWithId = usersWithIds.find(([user]) => user.email == email);
            if (userWithId != undefined) {
                const [user, uid] = userWithId;
                return {
                    email: user.email,
                    uid,
                };
            }
            else {
                console.log(`Unable to find user doc: ${email}`);
                return undefined;
            }
        }
        else {
            console.log(`Unable to find user doc: ${email}`);
            return undefined;
        }
    })
        .flatMap((attendee) => (attendee == undefined) ? [] : [attendee]);
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
async function deleteAuthUserAndOrgUser(deletableUser) {
    const deleteAuthUser = await admin.auth().deleteUser(deletableUser.uid)
        .catch((e) => {
        console.log(`Failed to delete auth user: ${deletableUser.email} for reason ${e.errorInfo.code}`);
    });
    const deleteUserDoc = await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(deletableUser.uid).delete()
        .then(() => {
        console.log("Deleted user doc: ", deletableUser.uid);
    })
        .catch((e) => {
        console.log(`Failed to delete user doc: ${deletableUser.uid} for reason ${e.errorInfo.code}`);
    });
    return await Promise.all([deleteAuthUser, deleteUserDoc]);
}
async function f() {
    async function deleteChunkByChunk(split, index) {
        const [users, ...remaining] = split;
        if (users == undefined) {
            console.log("ERROR: Chunk undefined, skipping & sleeping");
        }
        else {
            Promise.all(users.map(async (user) => {
                await deleteAuthUserAndOrgUser(user);
            }));
            console.log("Finished deleting user chunk, sleeping for 1 second");
        }
        if (remaining.length > 0) {
            await (0, misc_1.sleep)(1000);
            await deleteChunkByChunk(remaining, index + 1);
        }
        else {
            console.log("No more chunks to process");
        }
    }
    console.log("Reading CSV...");
    const records = await readCsv();
    console.log("Converting records to attendees...");
    const attendees = recordsToAttendees(records).flatMap((r) => (r != undefined) ? [r] : []);
    console.log("Getting auth users...");
    const authUsers = await getAuthUsers(attendees);
    console.log("Getting user docs...");
    const userDocs = await getUserDocs(attendees);
    const merged = [...authUsers, ...userDocs];
    // Dedupe
    const deduped = merged.filter((x, i, a) => a.indexOf(x) == i);
    console.log("Splitting users into chunks for deletion");
    const split = chunkList(deduped, deleteChunkSize);
    if (split.length > 0) {
        console.log(`We now have ${split.length} lists of ${deleteChunkSize} auth users to delete`);
        await deleteChunkByChunk(split, 0);
    }
    else {
        console.log("No auth users to delete");
    }
    console.log("Done!");
}
f();
//# sourceMappingURL=deleteCsvUsers.js.map