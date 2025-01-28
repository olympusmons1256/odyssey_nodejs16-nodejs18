import * as admin from "firebase-admin";
import * as fs from "fs";
import * as parse from "csv-parse/lib/sync";
import {sleep} from "../lib/misc";
import * as validate from "validate.js";
import {User} from "../lib/docTypes";

const organizationId = "ocVzdirLO82xiqbHdNZP";
const deleteChunkSize = 9;

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

interface Attendee {
  firstName: string,
  lastName: string,
  company: string,
  email: string,
  status: string,
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
    const fixedEmail = record[3].replace(/\s+/, "").toLocaleLowerCase();
    const attendee = {
      firstName: record[0],
      lastName: record[1],
      company: record[2],
      email: fixedEmail,
      status: record[4],
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

interface DeletableUser {
  uid: string,
  email: string
}

async function getAuthUsers(attendees: (Attendee | undefined)[]) {
  return (await Promise.all(attendees.map(async (attendee) => {
    if (attendee == undefined) {
      console.log("Skipping undefined attendee");
      return undefined;
    } else {
      try {
        const authUser = await admin.auth().getUserByEmail(attendee.email);
        return {
          uid: authUser.uid,
          email: authUser.email,
        } as DeletableUser;
      } catch (e : any) {
        console.log(`Failed to get auth user: ${attendee.email} for reason ${e.errorInfo.code}`);
        return undefined;
      }
    }
  })))
    .flatMap((attendee) => (attendee == undefined) ? [] : [attendee] );
}

type UserWithId = [User, string]

async function getUserDocs(attendees: (Attendee | undefined)[]) {
  const attendeeEmails = attendees.flatMap((a) => (a != undefined) ? [a.email] : []);
  const usersWithIds = await Promise.all((await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").listDocuments()).map(async (userDoc) => {
    const user = (await userDoc.get()).data() as User;
    const uid = userDoc.id;
    return [user, uid] as UserWithId;
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
        } as DeletableUser;
      } else {
        console.log(`Unable to find user doc: ${email}`);
        return undefined;
      }
    } else {
      console.log(`Unable to find user doc: ${email}`);
      return undefined;
    }
  })
    .flatMap((attendee) => (attendee == undefined) ? [] : [attendee] );
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

async function deleteAuthUserAndOrgUser(deletableUser: DeletableUser) {
  const deleteAuthUser = await admin.auth().deleteUser(deletableUser.uid)
    .catch((e : any) => {
      console.log(`Failed to delete auth user: ${deletableUser.email} for reason ${e.errorInfo.code}`);
    });
  const deleteUserDoc = await admin.firestore().collection("organizations").doc(organizationId).collection("organizationUsers").doc(deletableUser.uid).delete()
    .then(() => {
      console.log("Deleted user doc: ", deletableUser.uid);
    })
    .catch((e : any) => {
      console.log(`Failed to delete user doc: ${deletableUser.uid} for reason ${e.errorInfo.code}`);
    });
  return await Promise.all([deleteAuthUser, deleteUserDoc]);
}

async function f() {
  async function deleteChunkByChunk(split: DeletableUser[][], index: number) {
    const [users, ...remaining] = split;
    if (users == undefined) {
      console.log("ERROR: Chunk undefined, skipping & sleeping");
    } else {
      Promise.all(users.map(async (user) => {
        await deleteAuthUserAndOrgUser(user);
      }));
      console.log("Finished deleting user chunk, sleeping for 1 second");
    }
    if (remaining.length > 0) {
      await sleep(1000);
      await deleteChunkByChunk(remaining, index + 1);
    } else {
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
  const split = chunkList<DeletableUser>(deduped, deleteChunkSize);
  if (split.length > 0) {
    console.log(`We now have ${split.length} lists of ${deleteChunkSize} auth users to delete`);
    await deleteChunkByChunk(split, 0);
  } else {
    console.log("No auth users to delete");
  }

  console.log("Done!");
}

f();
