import * as admin from "firebase-admin";
import * as fs from "fs";
import {parse} from "csv-parse/sync";
import {User} from "../lib/docTypes";
import {sleep} from "../lib/misc";
import validate from "validate.js";
import { toFirestoreUpdateData } from "../lib/utils";

// const organizationId = "ADPq2FiWV1DtBMDc5oAW";
const organizationId = "Mu3mBkY5xKskkW6Yvlh9";

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
    const fixedEmail = record[3].replace(/\s+/, "");
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


async function findOldUserDocs(attendee: Attendee) {
  const docs = (await admin.firestore().collectionGroup("users").where("email", "==", attendee.email).get()).docs;
  const oldDocs = docs.flatMap((doc) => (doc.ref.parent.parent?.id == organizationId) ? [] : [doc]);
  console.log(`Found ${oldDocs.length} old user docs for ${attendee.email}`);
  return oldDocs;
}

async function disableOldDoc(doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) {
  const user = doc.data() as User;
  console.log(`Disabling old doc ${doc.ref.path} for email ${user.email}`);
  user.email = "__disabled__" + user.email;
  return doc.ref.update(toFirestoreUpdateData(user));
}

async function disableOldUserDocs(attendees: Attendee[]) {
  return attendees.map(async (attendee) => {
    return (await findOldUserDocs(attendee)).map(async (doc) => await disableOldDoc(doc));
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

async function disableChunkByChunk(splitAttendees: Attendee[][], index: number) {
  const [attendees, ...remainingAttendees] = splitAttendees;
  if (attendees == undefined || attendees.length == 0) {
    console.log("Skipping empty or undefined chunk");
  } else {
    console.log(new Date(Date.now()));
    console.log(`Working on chunk ${index}`);
    console.log("Checking auth users...");
    await Promise.all(await disableOldUserDocs(attendees));
    console.log("Finished chunk, sleeping for 1 second");
  }
  if (remainingAttendees.length > 0) {
    await sleep(1000);
    await disableChunkByChunk(remainingAttendees, index + 1);
  } else {
    console.log("No more chunks left");
  }
}

async function f() {
  console.log("Reading CSV...");
  const records = await readCsv();
  console.log("Converting records to attendees...");
  const attendees = recordsToAttendees(records).flatMap((r) => (r != undefined) ? [r] : []);
  const splitAttendees = chunkList<Attendee>(attendees, 10);
  console.log("Splitting attendees into chunks for disabling");
  console.log(`We now have ${splitAttendees.length} lists of ${10} attendees to disable`);
  await disableChunkByChunk(splitAttendees, 0);
  console.log("Done!");
}

f();
