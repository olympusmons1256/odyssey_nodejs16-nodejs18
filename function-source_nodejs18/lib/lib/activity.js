"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slackActivityFromUnrealProjectVersion = void 0;
const web_api_1 = require("@slack/web-api");
const firestore_1 = require("./documents/firestore");
const firestore_bigquery_change_tracker_1 = require("@newgameplus/firestore-bigquery-change-tracker");
const lodash_1 = require("lodash");
const firebase_1 = require("./firebase");
async function sendActivityToSlack(slackEvent) {
    const slackToken = (0, firebase_1.getSlackToken)();
    const firebaseProjectId = (0, firebase_1.getFirebaseProjectId)();
    if (slackToken === undefined)
        throw new Error("Failed to get slack token");
    const slack = new web_api_1.WebClient(slackToken);
    // eslint-disable-next-line camelcase
    const docUrl = `https://console.firebase.google.com/u/0/project/${firebaseProjectId}/firestore/data/` + encodeURIComponent(slackEvent.docPath);
    const channel = firebaseProjectId == "ngp-odyssey-prod" ? "#activity" : "#activity-dev";
    return await slack.chat.postMessage({
        channel,
        mrkdwn: true,
        unfurl_links: false,
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: slackEvent.title,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: slackEvent.messageBodyMarkdown + `<${docUrl}|Firestore doc>`,
                },
            }
        ],
    });
}
async function slackActivityFromUnrealProjectVersion(unrealProjectId, upv, changeType, upvDocRef, timestamp) {
    var _a, _b, _c, _d;
    if (unrealProjectId == undefined)
        throw new Error("Unable to resolve unrealProjectId");
    const [upDoc, up] = await (0, firestore_1.getUnrealProject)(unrealProjectId);
    if (upDoc == undefined || up == undefined)
        throw new Error("Unable to resolve unrealProject");
    const [organizationDoc, organization] = await (0, firestore_1.getOrganization)(up.organizationId);
    if (organizationDoc == undefined || organization == undefined)
        throw new Error("Unable to resolve organization");
    console.debug("upv.authorUserId:", upv.authorUserId);
    const [authorUserDoc, authorUser] = await (0, firestore_1.getUser)(upv.authorUserId);
    if (authorUserDoc == undefined || authorUser == undefined)
        throw new Error("Unable to resolve author user");
    const projectName = ((_a = up.displayName) !== null && _a !== void 0 ? _a : upDoc.id);
    const versionName = ((_b = upv.name) !== null && _b !== void 0 ? _b : upv.id);
    const buildNumber = (await upvDocRef.parent.where("created", "<", upv.created.toDate()).get()).size + 1;
    const resourceName = `${organization.name} / ${projectName} (#${buildNumber})`;
    const data = (() => {
        const emojis = (() => {
            switch (upv.state) {
                case "upload-complete": return ":large_green_circle: :inbox_tray:";
                case "package-validator-complete": return ":thumbsup:";
                case "package-validator-failed": return ":thumbsdown:";
                case "package-validator-retrying": return ":recycle: :thumbsdown:";
                case "builder-upload-complete": return ":house:";
                case "volume-copy-complete": return ":tada:";
                case "volume-copy-retrying": return ":recycle: :card_file_box:";
                case "volume-copy-pvcs-failed":
                case "volume-copy-failed": return ":red_circle: :card_file_box:";
                case "volume-copy-pods-failed": return ":no_entry: :card_file_box:";
                case "builder-pod-failed-to-create": return ":no_entry: :slot_machine:";
                case "builder-retrying": return ":recycle: :derelict_house_building:";
                case "builder-pod-failed":
                case "builder-failed": return ":bangbang: :derelict_house_building:";
                case "builder-upload-failed": return ":no_entry: :plug:";
                case "new": return ":heavy_plus_sign: :package:";
                default: return undefined;
            }
        })();
        if (emojis == undefined)
            return undefined;
        return { state: upv.state, emojis };
    })();
    if (data == undefined || changeType == firestore_bigquery_change_tracker_1.ChangeType.DELETE) {
        console.debug(`UPV state '${upv.state}' unimportant, not sending to slack: ${upvDocRef.path}`);
        return;
    }
    const stateFormatted = (0, lodash_1.capitalize)(data.state).split("-").join(" ");
    const title = `${data.emojis} ${stateFormatted} - ${resourceName}`;
    const messageBodyMarkdown = `Author: ${((_c = authorUser.name) !== null && _c !== void 0 ? _c : authorUserDoc.id)} <${authorUser.email}>\n` +
        `UE Project: _${versionName}_\n` +
        `At: _${timestamp.toISOString()}_\n` +
        `Uploaded via: ${upv.uploader == "webClient" ? ":computer:web" : ":bridge_at_night:bridge"}\n`;
    const slackEvent = {
        docPath: upvDocRef.path,
        title,
        timestamp,
        organization: {
            name: organization.name,
            id: organizationDoc.id,
        },
        user: {
            name: ((_d = authorUser.name) !== null && _d !== void 0 ? _d : authorUserDoc.id),
            email: authorUser.email,
        },
        messageBodyMarkdown,
    };
    return await sendActivityToSlack(slackEvent);
}
exports.slackActivityFromUnrealProjectVersion = slackActivityFromUnrealProjectVersion;
//# sourceMappingURL=activity.js.map