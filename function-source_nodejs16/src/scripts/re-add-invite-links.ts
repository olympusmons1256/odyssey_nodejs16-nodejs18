import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import * as fs from "fs";
import * as parse from "csv-parse/lib/sync";
import * as validate from "validate.js";
import * as docTypes from "../lib/docTypes";
import {getOrganizationSpaceInvitesRef} from "../lib/documents/firestore";

interface RecordResult {
  index: number
  record: string[]
  invite?: docTypes.Invite
  inviteLink?: docTypes.InviteLink
  error?: "duplicate-email" | "invalid-email" | "save-failed" | "invalid-invite-link"
}

interface InviteRecordToAdd {
  index: number
  invite: docTypes.Invite
  inviteLink: docTypes.InviteLink
}

interface InviteRecordToAddResult extends InviteRecordToAdd {
  invite: docTypes.Invite
  inviteLink: docTypes.InviteLink
  result: "added" | "already-exists" | "error"
}


async function readCsv() {
  // Read the csv file
  const content = await fs.promises.readFile("./invitesToReadd.csv");
  // Parse the CSV content
  const records : Array<Array<string>> = parse(content, {
    delimiter: ",",
  });

  return records;
}

function recordsToInvites(records: Array<Array<string>>) {
  return records.map((record, index) => {
    const formatEmail = record[0].replace(/\s+/, "").toLowerCase();
    const regexEmail = /^.*<(.*)>.*/;
    const match = formatEmail.match(regexEmail);
    const fixedEmail = (match != null && match.length > 1) ? match[1] : formatEmail;


    const regexInviteId = /^.*id=(.*)/;
    const inviteIdMatch = record[3].match(regexInviteId);
    const inviteLinkId = (inviteIdMatch != null && inviteIdMatch.length > 1) ? inviteIdMatch[1] : undefined;

    if (inviteLinkId == undefined) {
      console.log("Invalid invite link, skipping: ", index);
      return {index, record, invite: undefined, inviteLink: undefined, error: "invalid-invite-link"} as RecordResult;
    }

    const now = admin.firestore.Timestamp.now();

    const invite : docTypes.Invite = {
      role: "space_viewer",
      type: "email",
      email: fixedEmail,
      created: now,
      updated: now,
    };

    const inviteLink: docTypes.InviteLink = {
      id: inviteLinkId,
    };

    const constraints = {
      email: {
        email: true,
      },
    };

    const validation = validate(invite, constraints);
    if (validation != undefined) {
      console.log("Invalid email, skipping: ", invite);
      return {index, record, invite: undefined, inviteLink: undefined, error: "invalid-email"} as RecordResult;
    }
    return {index, record, invite, inviteLink};
  });
}

async function writeInvitesAndLinks(toAdd: InviteRecordToAdd[]) {
  const organizationId = "gmXIaiR8ZrXPRqaJ3a3i";
  // const organizationId = "lUhC4Ckd1yuaOFf9nEbJ";
  const spaceId = "08bkGul2kBVIX1K12zJ2";
  // const spaceId = "AtasiCLkzG8l4x76Pb4M";
  const emails = toAdd.map((r) => r.invite.email);
  const spaceInvitesCollection = getOrganizationSpaceInvitesRef(organizationId, spaceId);
  const alreadyInvitedEmails = (await spaceInvitesCollection.where("email", "in", emails).get()).docs.flatMap((d) => d.data().email as string);
  return (await Promise.all(toAdd.map(async (r) => {
    if (alreadyInvitedEmails.includes(r.invite.email)) {
      return {
        ...r,
        result: "already-exists",
      } as InviteRecordToAddResult;
    } else {
      try {
        const inviteDoc = await spaceInvitesCollection.add(r.invite);
        await inviteDoc.collection("inviteLinks").doc("0").set(r.inviteLink);
        return {
          ...r,
          result: "added",
        } as InviteRecordToAddResult;
      } catch (e: any) {
        console.error(e);
        return {
          ...r,
          result: "error",
        } as InviteRecordToAddResult;
      }
    }
  })));
}

async function writeInvitesAndLinksLoop(toAdd: InviteRecordToAdd[], results: InviteRecordToAddResult[]) : Promise<InviteRecordToAddResult[]> {
  const [thisGroup, remaining] = splitArrayAtIndex(10, toAdd);
  const thisGroupResults = await writeInvitesAndLinks(thisGroup);
  const latestResults = [...results, ...thisGroupResults];
  if (remaining.length > 0) {
    return await writeInvitesAndLinksLoop(remaining, latestResults);
  } else {
    return latestResults;
  }
}

function splitArrayAtIndex<T>(index: number, a: T[]) : T[][] {
  if (a.length > index) return [a.slice(0, index), a.slice(index)];
  else return [a, []];
}

async function f() {
  const records = await readCsv();
  const recordResults = recordsToInvites(records);
  const recordsFiltered = recordResults.reduce<{toAdd: InviteRecordToAdd[], toNotAdd: RecordResult[]}>((acc, r) => {
    const emailsToAdd = acc.toAdd.map((r) => r.invite.email);
    if (r.invite != undefined && r.invite != undefined && emailsToAdd.includes(r.invite.email)) {
      const updatedRecord: RecordResult = {...r, error: "duplicate-email"};
      const toNotAddNew = [...acc.toNotAdd, updatedRecord];
      return {toAdd: acc.toAdd, toNotAdd: toNotAddNew};
    } else if (r.error == undefined && r.invite != undefined && r.inviteLink != undefined) {
      const toAddNew = [...acc.toAdd, {
        index: r.index,
        invite: r.invite,
        inviteLink: r.inviteLink,
      } as InviteRecordToAdd];
      return {toAdd: toAddNew, toNotAdd: acc.toNotAdd};
    } else {
      const toNotAddNew = [...acc.toNotAdd, r];
      return {toAdd: acc.toAdd, toNotAdd: toNotAddNew};
    }
  }, {toAdd: [], toNotAdd: []});

  console.debug(`Records total/add/skip: ${records.length}/${recordsFiltered.toAdd.length}/${recordsFiltered.toNotAdd.length}`);

  const finalResults = await writeInvitesAndLinksLoop(recordsFiltered.toAdd, []);

  recordsFiltered.toNotAdd.forEach((r) => console.log(`${r.index} - skipped - ${r.record[0]}`));
  finalResults.forEach((r) => console.log(`${r.index} - ${r.result} - ${r.invite.email}`));
}

f();
