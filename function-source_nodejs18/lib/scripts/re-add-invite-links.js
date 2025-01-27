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
const firestore_1 = require("../lib/documents/firestore");
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
async function readCsv() {
    // Read the csv file
    const content = await fs.promises.readFile("./invitesToReadd.csv");
    // Parse the CSV content
    const records = (0, sync_1.parse)(content, {
        delimiter: ",",
    });
    return records;
}
function recordsToInvites(records) {
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
            return { index, record, invite: undefined, inviteLink: undefined, error: "invalid-invite-link" };
        }
        const now = admin.firestore.Timestamp.now();
        const invite = {
            role: "space_viewer",
            type: "email",
            email: fixedEmail,
            created: now,
            updated: now,
        };
        const inviteLink = {
            id: inviteLinkId,
        };
        const constraints = {
            email: {
                email: true,
            },
        };
        const validation = (0, validate_js_1.default)(invite, constraints);
        if (validation != undefined) {
            console.log("Invalid email, skipping: ", invite);
            return { index, record, invite: undefined, inviteLink: undefined, error: "invalid-email" };
        }
        return { index, record, invite, inviteLink };
    });
}
async function writeInvitesAndLinks(toAdd) {
    const organizationId = "gmXIaiR8ZrXPRqaJ3a3i";
    // const organizationId = "lUhC4Ckd1yuaOFf9nEbJ";
    const spaceId = "08bkGul2kBVIX1K12zJ2";
    // const spaceId = "AtasiCLkzG8l4x76Pb4M";
    const emails = toAdd.map((r) => r.invite.email);
    const spaceInvitesCollection = (0, firestore_1.getOrganizationSpaceInvitesRef)(organizationId, spaceId);
    const alreadyInvitedEmails = (await spaceInvitesCollection.where("email", "in", emails).get()).docs.flatMap((d) => d.data().email);
    return (await Promise.all(toAdd.map(async (r) => {
        if (alreadyInvitedEmails.includes(r.invite.email)) {
            return Object.assign(Object.assign({}, r), { result: "already-exists" });
        }
        else {
            try {
                const inviteDoc = await spaceInvitesCollection.add(r.invite);
                await inviteDoc.collection("inviteLinks").doc("0").set(r.inviteLink);
                return Object.assign(Object.assign({}, r), { result: "added" });
            }
            catch (e) {
                console.error(e);
                return Object.assign(Object.assign({}, r), { result: "error" });
            }
        }
    })));
}
async function writeInvitesAndLinksLoop(toAdd, results) {
    const [thisGroup, remaining] = splitArrayAtIndex(10, toAdd);
    const thisGroupResults = await writeInvitesAndLinks(thisGroup);
    const latestResults = [...results, ...thisGroupResults];
    if (remaining.length > 0) {
        return await writeInvitesAndLinksLoop(remaining, latestResults);
    }
    else {
        return latestResults;
    }
}
function splitArrayAtIndex(index, a) {
    if (a.length > index)
        return [a.slice(0, index), a.slice(index)];
    else
        return [a, []];
}
async function f() {
    const records = await readCsv();
    const recordResults = recordsToInvites(records);
    const recordsFiltered = recordResults.reduce((acc, r) => {
        const emailsToAdd = acc.toAdd.map((r) => r.invite.email);
        if (r.invite != undefined && r.invite != undefined && emailsToAdd.includes(r.invite.email)) {
            const updatedRecord = Object.assign(Object.assign({}, r), { error: "duplicate-email" });
            const toNotAddNew = [...acc.toNotAdd, updatedRecord];
            return { toAdd: acc.toAdd, toNotAdd: toNotAddNew };
        }
        else if (r.error == undefined && r.invite != undefined && r.inviteLink != undefined) {
            const toAddNew = [...acc.toAdd, {
                    index: r.index,
                    invite: r.invite,
                    inviteLink: r.inviteLink,
                }];
            return { toAdd: toAddNew, toNotAdd: acc.toNotAdd };
        }
        else {
            const toNotAddNew = [...acc.toNotAdd, r];
            return { toAdd: acc.toAdd, toNotAdd: toNotAddNew };
        }
    }, { toAdd: [], toNotAdd: [] });
    console.debug(`Records total/add/skip: ${records.length}/${recordsFiltered.toAdd.length}/${recordsFiltered.toNotAdd.length}`);
    const finalResults = await writeInvitesAndLinksLoop(recordsFiltered.toAdd, []);
    recordsFiltered.toNotAdd.forEach((r) => console.log(`${r.index} - skipped - ${r.record[0]}`));
    finalResults.forEach((r) => console.log(`${r.index} - ${r.result} - ${r.invite.email}`));
}
f();
//# sourceMappingURL=re-add-invite-links.js.map