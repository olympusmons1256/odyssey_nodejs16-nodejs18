import {WebClient} from "@slack/web-api";
import {getOrganization, getUnrealProject, getUser} from "./documents/firestore";
import {ChangeType} from "@newgameplus/firestore-bigquery-change-tracker";
import {UnrealProjectVersion} from "./docTypes";
import {capitalize} from "lodash";
import {getFirebaseProjectId, getSlackToken} from "./firebase";

interface SlackEvent {
  docPath: string
  title: string,
  timestamp: Date,
  organization?: {
    name: string
    id?: string
  }
  user?: {
    name: string,
    email: string
    role?: string
  }
  messageBodyMarkdown: string
}

async function sendActivityToSlack(slackEvent: SlackEvent) {
  const slackToken = getSlackToken();
  const firebaseProjectId = getFirebaseProjectId();
  if (slackToken === undefined) throw new Error("Failed to get slack token");
  const slack = new WebClient(slackToken);
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
      }],
  });
}

export async function slackActivityFromUnrealProjectVersion(unrealProjectId: string | undefined, upv: UnrealProjectVersion, changeType: ChangeType, upvDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, timestamp: Date) {
  if (unrealProjectId == undefined) throw new Error("Unable to resolve unrealProjectId");
  const [upDoc, up] = await getUnrealProject(unrealProjectId);
  if (upDoc == undefined || up == undefined) throw new Error("Unable to resolve unrealProject");
  const [organizationDoc, organization] = await getOrganization(up.organizationId);
  if (organizationDoc == undefined || organization == undefined) throw new Error("Unable to resolve organization");
  console.debug("upv.authorUserId:", upv.authorUserId);
  const [authorUserDoc, authorUser] = await getUser(upv.authorUserId);
  if (authorUserDoc == undefined || authorUser == undefined) throw new Error("Unable to resolve author user");
  const projectName = (up.displayName ?? upDoc.id);
  const versionName = (upv.name ?? upv.id);
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
    if (emojis == undefined) return undefined;
    return {state: upv.state, emojis};
  })();

  if (data == undefined || changeType == ChangeType.DELETE) {
    console.debug(`UPV state '${upv.state}' unimportant, not sending to slack: ${upvDocRef.path}`);
    return;
  }

  const stateFormatted = capitalize(data.state).split("-").join(" ");
  const title = `${data.emojis} ${stateFormatted} - ${resourceName}`;
  const messageBodyMarkdown =
    `Author: ${(authorUser.name ?? authorUserDoc.id)} <${authorUser.email}>\n` +
    `UE Project: _${versionName}_\n` +
    `At: _${timestamp.toISOString()}_\n` +
    `Uploaded via: ${upv.uploader == "webClient" ? ":computer:web" : ":bridge_at_night:bridge"}\n`;

  const slackEvent : SlackEvent = {
    docPath: upvDocRef.path,
    title,
    timestamp,
    organization: {
      name: organization.name,
      id: organizationDoc.id,
    },
    user: {
      name: (authorUser.name ?? authorUserDoc.id),
      email: authorUser.email,
    },
    messageBodyMarkdown,
  };
  return await sendActivityToSlack(slackEvent);
}
