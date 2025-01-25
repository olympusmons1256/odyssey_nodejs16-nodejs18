import * as admin from "firebase-admin";
import * as fs from "fs";
import {parse} from "csv-parse/sync";
import {User} from "../lib/docTypes";
import {sleep} from "../lib/misc";
import validate from "validate.js";

const sharedPassword = "intuit";
// const organizationId = "GYByxtyzprqEuwWzekiK";
const organizationId = "J63FEaaFJFQlMyNMWkW8";
const addChunkSize = 100;
const getChunkSize = 100;

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

interface Attendee {
  firstName: string,
  lastName: string,
  email: string,
}

interface AuthUser {
  email: string,
  password: string,
}

async function readCsv() {
  // Read the csv file
  const content = await fs.promises.readFile("./usersToRegister.csv");
  // Parse the CSV content
  const records : Array<Array<string>> = parse(content, {
    delimiter: ",",
  });

  return records;
}

function recordsToAttendees(records: Array<Array<string>>) {
  return records.map((record) => {
    const fixedEmail = record[4].replace(/\s+/, "").toLowerCase();
    const attendee = {
      firstName: record[0],
      lastName: record[1],
      email: fixedEmail,
    } as Attendee;
    const constraints = {
      email: {
        email: true,
      },
    };
    const validation = validate(attendee, constraints);
    if (validation != undefined) {
      console.log("Invalid email, skipping: ", attendee);
      return undefined;
    }
    return attendee;
  });
}

function attendeesToAuthUsers(attendees: Attendee[]) {
  return attendees.map((attendee) => {
    return {
      email: attendee.email,
      password: sharedPassword,
      displayName: attendee.firstName + " " + attendee.lastName,
    } as AuthUser;
  });
}

function createAuthUsers(authUsers: AuthUser[]) {
  return authUsers.map(async (authUser) => {
    try {
      return await admin.auth().createUser(authUser);
    } catch (e : any) {
      if (e.errorInfo.code != undefined && e.errorInfo.code == "auth/email-already-exists") {
        // console.log("Auth user already exists: ", authUser.email);
      } else {
        console.log(`Failed to create auth user: ${authUser.email} for reason ${e.errorInfo.code}`);
      }
      return undefined;
    }
  });
}

function getAuthUsers(authUsers: AuthUser[]) {
  return authUsers.map(async (authUser) => {
    try {
      return await admin.auth().getUserByEmail(authUser.email);
    } catch (e) {
      console.log("Missing auth user, trying to recreate: ", authUser.email);
      createAuthUsers([authUser]);
      return undefined;
    }
  });
}

type UserWithId = [string, User];

function userRecordsToUsers(userRecords: admin.auth.UserRecord[]) {
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
      } as User,
    ] as UserWithId;
  });
}

async function createUsers(users: UserWithId[]) {
  return users.map(async (userWithId) => {
    const [uid, user] = userWithId;
    try {
      return await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(uid).set(user);
    } catch (e) {
      console.log(`Failed to create user doc: ${user.email}`);
      return undefined;
    }
  });
}

async function getUsers(users: (admin.auth.UserRecord | undefined)[]) {
  return users.map(async (user) => {
    if (user == undefined) {
      return undefined;
    }
    try {
      const userDoc = await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(user.uid).get();
      if (!userDoc.exists) console.log(`ERROR: Missing user doc, trying to re-create ${user.email}`);
      await createUsers(userRecordsToUsers([user]));
      return userDoc;
    } catch (e) {
      console.log(`ERROR: Failed to get user doc ${user.email}`);
      return undefined;
    }
  });
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

async function addChunkByChunk(splitAuthUsers: AuthUser[][], index: number) {
  const [authUsers, ...remainingSplitAuthUsers] = splitAuthUsers;
  if (authUsers == undefined || authUsers.length == 0) {
    console.log("Skipping empty or undefined chunk");
  } else {
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
    await sleep(1000);
    await addChunkByChunk(remainingSplitAuthUsers, index + 1);
  } else {
    console.log("No more chunks left");
  }
}

async function checkChunkByChunk(splitAuthUsers: AuthUser[][], index: number) {
  const [authUsers, ...remainingSplitAuthUsers] = splitAuthUsers;
  if (authUsers == undefined || authUsers.length == 0) {
    console.log("Skipping empty or undefined chunk");
  } else {
    console.log(new Date(Date.now()));
    console.log(`Working on chunk ${index}`);
    console.log("Checking auth users...");
    const checkedAuthUsers = await Promise.all(getAuthUsers(authUsers));
    console.log("Checking user docs...");
    await Promise.all(await getUsers(checkedAuthUsers));
    console.log("Finished chunk, sleeping for 1 second");
  }
  if (remainingSplitAuthUsers.length > 0) {
    await sleep(1000);
    await checkChunkByChunk(remainingSplitAuthUsers, index + 1);
  } else {
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
  const splitAuthUsers = chunkList<AuthUser>(authUsers, addChunkSize);
  console.log(`We now have ${splitAuthUsers.length} lists of ${addChunkSize} authUsers to create`);
  await addChunkByChunk(splitAuthUsers, 0);

  console.log("Splitting auth users into chunks for checking");
  const splitAuthUsersToCheck = chunkList<AuthUser>(authUsers, getChunkSize);
  console.log(`We now have ${splitAuthUsersToCheck.length} lists of ${getChunkSize} authUsers to check`);
  await checkChunkByChunk(splitAuthUsersToCheck, 0);
  console.log("Done!");
}

f();
