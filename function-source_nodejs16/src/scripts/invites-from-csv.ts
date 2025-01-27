import * as admin from "firebase-admin";
// import * as csv from "csv-parse";
import * as fs from "fs";
import * as parse from "csv-parse/lib/sync";
import * as validate from "validate.js";
import {default as axios} from "axios";
import {IInviteUsersResultDto} from "../api/organizations/dto/invite.dto";
import {createArrayCsvWriter} from "csv-writer";
import {getEnvUrl} from "../lib/firebase";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

// const envUrl = "https://app-dev.odyssey.stream";
// const envUrl = "https://app-testing.odyssey.stream";
//

const restApiClientEnv = process.env["ODYSSEY_REST_API_ENV"];
if (restApiClientEnv == undefined || restApiClientEnv == null) {
  console.error("Env var ODYSSEY_REST_API_ENV not set");
  process.exit(1);
}
const restApiClientId = process.env["ODYSSEY_REST_API_CLIENT_ID"];
if (restApiClientId == undefined || restApiClientId == null) {
  console.error("Env var ODYSSEY_REST_API_CLIENT_ID not set");
  process.exit(1);
}
const restApiClientSecret = process.env["ODYSSEY_REST_API_CLIENT_SECRET"];
if (restApiClientSecret == undefined || restApiClientSecret == null) {
  console.error("Env var ODYSSEY_REST_API_CLIENT_SECRET not set");
  process.exit(1);
}

const restApiOrganizationId = process.env["ODYSSEY_REST_API_ORGANIZATION_ID"];
if (restApiOrganizationId == undefined || restApiOrganizationId == null) {
  console.error("Env var ODYSSEY_REST_API_ORGANIZATION_ID not set");
  process.exit(1);
}

const restApiSpaceId = process.env["ODYSSEY_REST_API_SPACE_ID"];
if (restApiSpaceId == undefined || restApiSpaceId == null) {
  console.warn("Env var ODYSSEY_REST_API_SPACE_ID not set");
}

const envUrl = getEnvUrl(restApiClientEnv);

interface Attendee {
  firstName: string,
  lastName: string,
  email: string,
}

interface RecordResult {
  index: number
  result?: string
  attendee?: Attendee
  record: string[]
  error?: "invalidEmail" | "post-failed" | "invite-user-error"
}

async function readCsv() {
  // Read the csv file
  const content = await fs.promises.readFile("./usersToInvite.csv");
  // Parse the CSV content
  const records : Array<Array<string>> = parse(content, {
    delimiter: ",",
  });

  return records;
}

function recordsToAttendees(records: Array<Array<string>>) {
  return records.map((record, index) => {
    const formatEmail = record[0].replace(/\s+/, "").toLowerCase();
    const regexEmail = /^.*<(.*)>.*/;
    const match = formatEmail.match(regexEmail);
    const fixedEmail = (match != null && match.length > 1) ? match[1] : formatEmail;
    const attendee = {
      firstName: record[1],
      lastName: record[2],
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
      return {index, record, error: "invalidEmail"} as RecordResult;
    }
    return {index, record, attendee};
  });
}

function splitArrayAtIndex<T>(index: number, a: T[]) : T[][] {
  if (a.length > index) return [a.slice(0, index), a.slice(index)];
  else return [a, []];
}

async function inviteEmails(token: string, emails: string[], organizationId: string, spaceId: string | undefined) {
  if (spaceId == undefined) {
    return await inviteUsersToOrganization(token, emails, organizationId);
  } else {
    return await inviteUsersToSpace(token, emails, organizationId, spaceId);
  }
}

async function inviteAttendees(token: string, attendeesToInvite: RecordResult[], results: RecordResult[]) : Promise<RecordResult[]> {
  const [validAttendees, invalidAttendees] = attendeesToInvite.reduce<RecordResult[][]>(([valid, invalid], r) => {
    if (r.attendee != undefined && r.error == undefined && r.result == undefined) {
      return [[...valid, r], invalid];
    } else {
      return [valid, [...invalid, r]];
    }
  }, [[], []]);

  if (invalidAttendees.length > 0) console.debug(`Found ${invalidAttendees.length} invalid attendees`);
  const resultsWithInvalid = [...results, ...invalidAttendees];

  if (validAttendees.length < 1) {
    console.debug("No more attendees to invite");
    return resultsWithInvalid;
  }
  const [attendeesInvitedThisTime, remaining] = splitArrayAtIndex(10, validAttendees);
  const emails = attendeesInvitedThisTime.map((r) => (r.attendee?.email == undefined) ? "" : r.attendee.email);
  console.debug(`Inviting ${emails.length} more attendees`);

  const emailResults = (await inviteEmails(token, emails, restApiOrganizationId as string, restApiSpaceId))?.results.map((r, index) => {
    if (r.inviteLink != undefined) {
      return {...attendeesInvitedThisTime[index], result: envUrl + "/invite?id=" + r.inviteLink} as RecordResult;
    } else {
      return {...attendeesInvitedThisTime[index], error: "invite-user-error"} as RecordResult;
    }
  });

  if (emailResults == undefined) {
    const emailR = attendeesInvitedThisTime.map((r) => {
      return {...r, error: "post-failed"} as RecordResult;
    });
    const concatResults = [...resultsWithInvalid, ...emailR];
    if (remaining.length < 1) return concatResults;
    else return await inviteAttendees(token, remaining, concatResults);
  }

  const concatResults = [...resultsWithInvalid, ...emailResults];
  if (remaining.length < 1) return concatResults;
  else return await inviteAttendees(token, remaining, concatResults);
}

async function inviteUsersToSpace(token: string, emails: string[], organizationId: string, spaceId: string) {
  const data: any = {
    users: emails.map((email) => {
      return {email};
    }),
    sendInviteEmails: false,
  };
  const endpoint = `/api/v1/organizations/${organizationId}/spaces/${spaceId}/inviteUsers`;
  try {
    const result = await axios.post(envUrl + endpoint, data, {
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    return result.data as IInviteUsersResultDto;
  } catch (e: any) {
    if (e.response.data.message != undefined && e.response.data.statusCode != undefined) console.error(`Error: POST ${endpoint} ${e.response.data.statusCode}: `, e.response.data.message);
    if (e.response.data.errorCount == undefined || e.response.data.results == undefined) return undefined;
    else return e.response.data as IInviteUsersResultDto;
  }
}

async function inviteUsersToOrganization(token: string, emails: string[], organizationId: string) {
  const data: any = {
    users: emails.map((email) => {
      return {email, organizationRole: "member"};
    }),
    sendInviteEmails: false,
  };
  const endpoint = `/api/v1/organizations/${organizationId}/inviteUsers`;
  try {
    const result = await axios.post(envUrl + endpoint, data, {
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    return result.data as IInviteUsersResultDto;
  } catch (e: any) {
    if (e.response.data.message != undefined && e.response.data.statusCode != undefined) console.error(`Error: POST ${endpoint} ${e.response.data.statusCode}: `, e.response.data.message);
    if (e.response.data.errorCount == undefined || e.response.data.results == undefined) return undefined;
    else return e.response.data as IInviteUsersResultDto;
  }
}

async function loginWithAuthClient() {
  const data: any = {
    client_id: restApiClientId,
    client_secret: restApiClientSecret,
    grant_type: "client_credentials",
    scope: "organization",
  };
  const endpoint = "/api/v1/auth/token";
  try {
    const result = await axios.post(envUrl + endpoint, data);
    return result.data.access_token as string;
  } catch (e: any) {
    if (e.response.data.message != undefined && e.response.data.statusCode != undefined) console.error(`Error: POST ${endpoint} ${e.response.data.statusCode}: `, e.response.data.message);
    return undefined;
  }
}

async function writeResultsToCsv(path: string, results: RecordResult[]): Promise<void> {
  const entries = results.map((v) => [...v.record, v.result, v.error]);
  const csvWriter = createArrayCsvWriter({
    path,
  });
  return await csvWriter.writeRecords(entries);
}

(async () => {
  const accessToken = await loginWithAuthClient();
  if (accessToken == undefined) {
    console.error("Failed to login with token API, quitting");
    process.exit(1);
  }
  console.debug("Reading CSV");
  const csvValues = await readCsv();
  console.debug("Converting to attendees");
  const attendees = recordsToAttendees(csvValues);
  console.debug(`Starting bulk invite of ${attendees.length} attendees`);
  const inviteResults = (await inviteAttendees(accessToken, attendees, [])).sort((a, b) => a.index - b.index);
  console.debug(`Writing ${inviteResults.length} records to CSV`);
  await writeResultsToCsv("./output/inviteUsersResults.csv", inviteResults);
})();
