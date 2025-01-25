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
const sharedPassword = "intuit";
// const organizationId = "GYByxtyzprqEuwWzekiK";
const organizationId = "J63FEaaFJFQlMyNMWkW8";
const addChunkSize = 100;
const getChunkSize = 100;
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
        const fixedEmail = record[4].replace(/\s+/, "").toLowerCase();
        const attendee = {
            firstName: record[0],
            lastName: record[1],
            email: fixedEmail,
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
function attendeesToAuthUsers(attendees) {
    return attendees.map((attendee) => {
        return {
            email: attendee.email,
            password: sharedPassword,
            displayName: attendee.firstName + " " + attendee.lastName,
        };
    });
}
function createAuthUsers(authUsers) {
    return authUsers.map(async (authUser) => {
        try {
            return await admin.auth().createUser(authUser);
        }
        catch (e) {
            if (e.errorInfo.code != undefined && e.errorInfo.code == "auth/email-already-exists") {
                // console.log("Auth user already exists: ", authUser.email);
            }
            else {
                console.log(`Failed to create auth user: ${authUser.email} for reason ${e.errorInfo.code}`);
            }
            return undefined;
        }
    });
}
function getAuthUsers(authUsers) {
    return authUsers.map(async (authUser) => {
        try {
            return await admin.auth().getUserByEmail(authUser.email);
        }
        catch (e) {
            console.log("Missing auth user, trying to recreate: ", authUser.email);
            createAuthUsers([authUser]);
            return undefined;
        }
    });
}
function userRecordsToUsers(userRecords) {
    return userRecords.map((userRecord) => {
        return [
            userRecord.uid,
            {
                created: admin.firestore.Timestamp.now(),
                email: userRecord.email,
                name: userRecord.displayName,
                addedByAutomation: true,
                role: "member",
                updated: admin.firestore.Timestamp.now(),
            },
        ];
    });
}
async function createUsers(users) {
    return users.map(async (userWithId) => {
        const [uid, user] = userWithId;
        try {
            return await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(uid).set(user);
        }
        catch (e) {
            console.log(`Failed to create user doc: ${user.email}`);
            return undefined;
        }
    });
}
async function getUsers(users) {
    return users.map(async (user) => {
        if (user == undefined) {
            return undefined;
        }
        try {
            const userDoc = await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(user.uid).get();
            if (!userDoc.exists)
                console.log(`ERROR: Missing user doc, trying to re-create ${user.email}`);
            await createUsers(userRecordsToUsers([user]));
            return userDoc;
        }
        catch (e) {
            console.log(`ERROR: Failed to get user doc ${user.email}`);
            return undefined;
        }
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
async function addChunkByChunk(splitAuthUsers, index) {
    const [authUsers, ...remainingSplitAuthUsers] = splitAuthUsers;
    if (authUsers == undefined || authUsers.length == 0) {
        console.log("Skipping empty or undefined chunk");
    }
    else {
        console.log(new Date(Date.now()));
        console.log(`Working on chunk ${index}`);
        console.log("Creating auth users...");
        const userRecords = ((await Promise.all(createAuthUsers(authUsers)))).flatMap((r) => (r != undefined) ? [r] : []);
        console.log("Creating users...");
        const users = userRecordsToUsers(userRecords);
        console.log("Creating user docs...");
        await Promise.all(await createUsers(users));
        console.log("Finished chunk, sleeping for 1 second");
    }
    if (remainingSplitAuthUsers.length > 0) {
        await (0, misc_1.sleep)(1000);
        await addChunkByChunk(remainingSplitAuthUsers, index + 1);
    }
    else {
        console.log("No more chunks left");
    }
}
async function checkChunkByChunk(splitAuthUsers, index) {
    const [authUsers, ...remainingSplitAuthUsers] = splitAuthUsers;
    if (authUsers == undefined || authUsers.length == 0) {
        console.log("Skipping empty or undefined chunk");
    }
    else {
        console.log(new Date(Date.now()));
        console.log(`Working on chunk ${index}`);
        console.log("Checking auth users...");
        const checkedAuthUsers = await Promise.all(getAuthUsers(authUsers));
        console.log("Checking user docs...");
        await Promise.all(await getUsers(checkedAuthUsers));
        console.log("Finished chunk, sleeping for 1 second");
    }
    if (remainingSplitAuthUsers.length > 0) {
        await (0, misc_1.sleep)(1000);
        await checkChunkByChunk(remainingSplitAuthUsers, index + 1);
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
    console.log("Converting attendees to authUsers...");
    const authUsers = attendeesToAuthUsers(attendees);
    console.log("Splitting auth users into chunks for adding");
    const splitAuthUsers = chunkList(authUsers, addChunkSize);
    console.log(`We now have ${splitAuthUsers.length} lists of ${addChunkSize} authUsers to create`);
    await addChunkByChunk(splitAuthUsers, 0);
    console.log("Splitting auth users into chunks for checking");
    const splitAuthUsersToCheck = chunkList(authUsers, getChunkSize);
    console.log(`We now have ${splitAuthUsersToCheck.length} lists of ${getChunkSize} authUsers to check`);
    await checkChunkByChunk(splitAuthUsersToCheck, 0);
    console.log("Done!");
}
f();
//# sourceMappingURL=registerCsvUsers.js.map