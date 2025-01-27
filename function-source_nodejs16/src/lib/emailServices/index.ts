import * as functions from "firebase-functions";
import * as sgMail from "@sendgrid/mail";
import * as misc from "../misc";
import * as postmark from "postmark";
import {EmailProvidersConfiguration, UserEmailSettings} from "../systemDocTypes";

const sender = {
  name: "Team Odyssey",
  email: "team@" + getEmailDomain(),
};

export interface EmailTemplateData {
  Sender: string
  Organization: string
  Space?: string
}

export type SignInTemplates = "signin-v2" | "new-account"

function getHostingDomain() {
  if (misc.inEmulatorEnv()) return "localhost";
  else if (functions.config().env.hostingdomain != undefined) return functions.config().env.hostingdomain as string;
  else if (functions.config().env.publicdomain != undefined) return functions.config().env.publicdomain as string;
  else return "odyssey.newgameplus.live";
}

function getEmailDomain() {
  if (functions.config().env.emaildomain != undefined) return functions.config().env.emaildomain as string;
  else return "newgameplus.live";
}

const postmarkFromSender = sender.name + "<" + sender.email + ">";

export async function generateUrl(urlParams: string) {
  const hostingDomain = getHostingDomain();
  if (urlParams.includes("localhost")) return `http://localhost:8080/${urlParams}`;
  else if (misc.inEmulatorEnv()) return `http://${hostingDomain}:8080/${urlParams}`;
  else return `https://${hostingDomain}/${urlParams}`;
}

// send invite email
export async function sendInviteEmail(postmarkStream: string, templateData: EmailTemplateData, templateId: string, userEmail: string, inviteLink: string, emailProvidersConfiguration?: EmailProvidersConfiguration, userEmailSettings?: UserEmailSettings) {
  async function sendViaSendgrid() {
    const inviteUrl = await generateUrl(`invite?id=${inviteLink}`);
    sgMail.setApiKey(functions.config().sendgrid.key);
    console.debug("Sending invite email via sendgrid");
    const msg : sgMail.MailDataRequired = {
      to: userEmail,
      from: sender,
      dynamicTemplateData: {
        ...templateData,
        Link: inviteUrl,
      },
      templateId,
      asm: {
        groupId: 24969,
        groupsToDisplay: [24969],
      },
    };
    try {
      await sgMail.send(msg);
      return true;
    } catch (e: any) {
      console.error("Error sending mail via sendgrid");
      console.error(e);
      return false;
    }
  }
  async function sendViaPostmark() {
    try {
      const postmarkClient = new postmark.ServerClient(functions.config().postmark.key);
      console.debug("Sending invite email via postmark");
      const inviteUrl = await generateUrl(`invite?id=${inviteLink}`);
      const payload = {
        From: postmarkFromSender,
        To: userEmail,
        ReplyTo: sender.email,
        TemplateAlias: "invite-v2",
        MessageStream: postmarkStream,
        TemplateModel: {
          Sender: templateData.Sender,
          Entity: (templateData.Space != undefined) ? templateData.Space : templateData.Organization,
          ActionUrl: inviteUrl,
        },
      };
      const result = await postmarkClient.sendEmailWithTemplate(payload);
      return result.ErrorCode == 0;
    } catch (e: any) {
      console.error("Error sending email via postmark");
      console.error(e);
      return false;
    }
  }
  if (userEmailSettings == undefined && emailProvidersConfiguration == undefined) {
    console.warn("No system or user specific email settings. Defaulting to postmark only");
    return await sendViaPostmark();
  }
  if (userEmailSettings != undefined) {
    console.debug("Resolved userEmailSettings");
    console.debug(userEmailSettings);
    return (await Promise.all([
      userEmailSettings.sendgrid.enabled ? await sendViaSendgrid() : true,
      userEmailSettings.postmark.enabled ? await sendViaPostmark() : true,
    ])).every((r) => r == true);
  } else if (emailProvidersConfiguration != undefined) {
    console.debug("Failed to resolve userEmailSettings, using system emailProvidersConfiguration");
    console.debug(emailProvidersConfiguration);
    return (await Promise.all([
      emailProvidersConfiguration.sendgrid.enabled ? await sendViaSendgrid() : true,
      emailProvidersConfiguration.postmark.enabled ? await sendViaPostmark() : true,
    ])).every((r) => r == true);
  }
}

// send log in email
export async function sendLogInCode(templateId: string, userEmail: string, logInLink: string, templateAlias: SignInTemplates, emailProvidersConfiguration?: EmailProvidersConfiguration, userEmailSettings?: UserEmailSettings) {
  console.log("Log in email sent");
  async function sendViaSendgrid() {
    console.debug("Sending login email via sendgrid");
    sgMail.setApiKey(functions.config().sendgrid.key);
    const msg = {
      to: userEmail,
      from: sender,
      dynamicTemplateData: {
        Link: logInLink,
      },
      templateId,
      asm: {
        groupId: 24969,
        groupsToDisplay: [24969],
      },
    };
    return await sgMail.send(msg).catch((err:any)=> {
      console.error("Error sending mail via sendgrid");
      console.error(err);
      return;
    });
  }
  async function sendViaPostmark() {
    try {
      const postmarkClient = new postmark.ServerClient(functions.config().postmark.key);
      console.debug("Sending login email via postmark");
      return await postmarkClient.sendEmailWithTemplate({
        From: postmarkFromSender,
        To: userEmail,
        ReplyTo: sender.email,
        MessageStream: "sign-in-link",
        TemplateAlias: templateAlias,
        TemplateModel: {
          Sender: sender.email,
          ActionUrl: logInLink,
        },
      });
    } catch (e: any) {
      console.error("Eror sending email via postmark");
      console.error(e);
      return;
    }
  }
  if (userEmailSettings == undefined && emailProvidersConfiguration == undefined) {
    console.warn("No system or user specific email settings. Defaulting to postmark only");
    await sendViaPostmark();
  }
  if (userEmailSettings != undefined) {
    console.debug("Resolved userEmailSettings");
    console.debug(userEmailSettings);
    userEmailSettings.sendgrid.enabled && await sendViaSendgrid();
    userEmailSettings.postmark.enabled && await sendViaPostmark();
  } else if (emailProvidersConfiguration != undefined) {
    console.debug("Failed to resolve userEmailSettings, using system emailProvidersConfiguration");
    console.debug(emailProvidersConfiguration);
    emailProvidersConfiguration.postmark.enabled && await sendViaPostmark();
    emailProvidersConfiguration.sendgrid.enabled && await sendViaSendgrid();
  }
}
