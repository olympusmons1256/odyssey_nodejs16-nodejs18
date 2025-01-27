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
const validate_js_1 = __importDefault(require("validate.js"));
const axios_1 = __importDefault(require("axios"));
const csv_writer_1 = require("csv-writer");
const firebase_1 = require("../lib/firebase");
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
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
const envUrl = (0, firebase_1.getEnvUrl)(restApiClientEnv);
async function readCsv() {
    // Read the csv file
    const content = await fs.promises.readFile("./usersToInvite.csv");
    // Parse the CSV content
    const records = (0, sync_1.parse)(content, {
        delimiter: ",",
    });
    return records;
}
function recordsToAttendees(records) {
    return records.map((record, index) => {
        const formatEmail = record[0].replace(/\s+/, "").toLowerCase();
        const regexEmail = /^.*<(.*)>.*/;
        const match = formatEmail.match(regexEmail);
        const fixedEmail = (match != null && match.length > 1) ? match[1] : formatEmail;
        const attendee = {
            firstName: record[1],
            lastName: record[2],
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
            return { index, record, error: "invalidEmail" };
        }
        return { index, record, attendee };
    });
}
function splitArrayAtIndex(index, a) {
    if (a.length > index)
        return [a.slice(0, index), a.slice(index)];
    else
        return [a, []];
}
async function inviteEmails(token, emails, organizationId, spaceId) {
    if (spaceId == undefined) {
        return await inviteUsersToOrganization(token, emails, organizationId);
    }
    else {
        return await inviteUsersToSpace(token, emails, organizationId, spaceId);
    }
}
async function inviteAttendees(token, attendeesToInvite, results) {
    var _a;
    const [validAttendees, invalidAttendees] = attendeesToInvite.reduce(([valid, invalid], r) => {
        if (r.attendee != undefined && r.error == undefined && r.result == undefined) {
            return [[...valid, r], invalid];
        }
        else {
            return [valid, [...invalid, r]];
        }
    }, [[], []]);
    if (invalidAttendees.length > 0)
        console.debug(`Found ${invalidAttendees.length} invalid attendees`);
    const resultsWithInvalid = [...results, ...invalidAttendees];
    if (validAttendees.length < 1) {
        console.debug("No more attendees to invite");
        return resultsWithInvalid;
    }
    const [attendeesInvitedThisTime, remaining] = splitArrayAtIndex(10, validAttendees);
    const emails = attendeesInvitedThisTime.map((r) => { var _a; return (((_a = r.attendee) === null || _a === void 0 ? void 0 : _a.email) == undefined) ? "" : r.attendee.email; });
    console.debug(`Inviting ${emails.length} more attendees`);
    const emailResults = (_a = (await inviteEmails(token, emails, restApiOrganizationId, restApiSpaceId))) === null || _a === void 0 ? void 0 : _a.results.map((r, index) => {
        if (r.inviteLink != undefined) {
            return Object.assign(Object.assign({}, attendeesInvitedThisTime[index]), { result: envUrl + "/invite?id=" + r.inviteLink });
        }
        else {
            return Object.assign(Object.assign({}, attendeesInvitedThisTime[index]), { error: "invite-user-error" });
        }
    });
    if (emailResults == undefined) {
        const emailR = attendeesInvitedThisTime.map((r) => {
            return Object.assign(Object.assign({}, r), { error: "post-failed" });
        });
        const concatResults = [...resultsWithInvalid, ...emailR];
        if (remaining.length < 1)
            return concatResults;
        else
            return await inviteAttendees(token, remaining, concatResults);
    }
    const concatResults = [...resultsWithInvalid, ...emailResults];
    if (remaining.length < 1)
        return concatResults;
    else
        return await inviteAttendees(token, remaining, concatResults);
}
async function inviteUsersToSpace(token, emails, organizationId, spaceId) {
    const data = {
        users: emails.map((email) => {
            return { email };
        }),
        sendInviteEmails: false,
    };
    const endpoint = `/api/v1/organizations/${organizationId}/spaces/${spaceId}/inviteUsers`;
    try {
        const result = await axios_1.default.post(envUrl + endpoint, data, {
            headers: {
                Authorization: "Bearer " + token,
            },
        });
        return result.data;
    }
    catch (e) {
        if (e.response.data.message != undefined && e.response.data.statusCode != undefined)
            console.error(`Error: POST ${endpoint} ${e.response.data.statusCode}: `, e.response.data.message);
        if (e.response.data.errorCount == undefined || e.response.data.results == undefined)
            return undefined;
        else
            return e.response.data;
    }
}
async function inviteUsersToOrganization(token, emails, organizationId) {
    const data = {
        users: emails.map((email) => {
            return { email, organizationRole: "member" };
        }),
        sendInviteEmails: false,
    };
    const endpoint = `/api/v1/organizations/${organizationId}/inviteUsers`;
    try {
        const result = await axios_1.default.post(envUrl + endpoint, data, {
            headers: {
                Authorization: "Bearer " + token,
            },
        });
        return result.data;
    }
    catch (e) {
        if (e.response.data.message != undefined && e.response.data.statusCode != undefined)
            console.error(`Error: POST ${endpoint} ${e.response.data.statusCode}: `, e.response.data.message);
        if (e.response.data.errorCount == undefined || e.response.data.results == undefined)
            return undefined;
        else
            return e.response.data;
    }
}
async function loginWithAuthClient() {
    const data = {
        client_id: restApiClientId,
        client_secret: restApiClientSecret,
        grant_type: "client_credentials",
        scope: "organization",
    };
    const endpoint = "/api/v1/auth/token";
    try {
        const result = await axios_1.default.post(envUrl + endpoint, data);
        return result.data.access_token;
    }
    catch (e) {
        if (e.response.data.message != undefined && e.response.data.statusCode != undefined)
            console.error(`Error: POST ${endpoint} ${e.response.data.statusCode}: `, e.response.data.message);
        return undefined;
    }
}
async function writeResultsToCsv(path, results) {
    const entries = results.map((v) => [...v.record, v.result, v.error]);
    const csvWriter = (0, csv_writer_1.createArrayCsvWriter)({
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
//# sourceMappingURL=invites-from-csv.js.map