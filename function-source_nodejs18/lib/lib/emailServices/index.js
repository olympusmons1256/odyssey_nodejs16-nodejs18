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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLogInCode = exports.sendInviteEmail = exports.generateUrl = void 0;
const functions = __importStar(require("firebase-functions"));
const sgMail = __importStar(require("@sendgrid/mail"));
const misc = __importStar(require("../misc"));
const postmark = __importStar(require("postmark"));
const sender = {
    name: "Team Odyssey",
    email: "team@" + getEmailDomain(),
};
function getHostingDomain() {
    if (misc.inEmulatorEnv())
        return "localhost";
    else if (functions.config().env.hostingdomain != undefined)
        return functions.config().env.hostingdomain;
    else if (functions.config().env.publicdomain != undefined)
        return functions.config().env.publicdomain;
    else
        return "odyssey.newgameplus.live";
}
function getEmailDomain() {
    if (functions.config().env.emaildomain != undefined)
        return functions.config().env.emaildomain;
    else
        return "newgameplus.live";
}
const postmarkFromSender = sender.name + "<" + sender.email + ">";
async function generateUrl(urlParams) {
    const hostingDomain = getHostingDomain();
    if (urlParams.includes("localhost"))
        return `http://localhost:8080/${urlParams}`;
    else if (misc.inEmulatorEnv())
        return `http://${hostingDomain}:8080/${urlParams}`;
    else
        return `https://${hostingDomain}/${urlParams}`;
}
exports.generateUrl = generateUrl;
// send invite email
async function sendInviteEmail(postmarkStream, templateData, templateId, userEmail, inviteLink, emailProvidersConfiguration, userEmailSettings) {
    async function sendViaSendgrid() {
        const inviteUrl = await generateUrl(`invite?id=${inviteLink}`);
        sgMail.setApiKey(functions.config().sendgrid.key);
        console.debug("Sending invite email via sendgrid");
        const msg = {
            to: userEmail,
            from: sender,
            dynamicTemplateData: Object.assign(Object.assign({}, templateData), { Link: inviteUrl }),
            templateId,
            asm: {
                groupId: 24969,
                groupsToDisplay: [24969],
            },
        };
        try {
            await sgMail.send(msg);
            return true;
        }
        catch (e) {
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
        }
        catch (e) {
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
    }
    else if (emailProvidersConfiguration != undefined) {
        console.debug("Failed to resolve userEmailSettings, using system emailProvidersConfiguration");
        console.debug(emailProvidersConfiguration);
        return (await Promise.all([
            emailProvidersConfiguration.sendgrid.enabled ? await sendViaSendgrid() : true,
            emailProvidersConfiguration.postmark.enabled ? await sendViaPostmark() : true,
        ])).every((r) => r == true);
    }
    return false;
}
exports.sendInviteEmail = sendInviteEmail;
// send log in email
async function sendLogInCode(templateId, userEmail, logInLink, templateAlias, emailProvidersConfiguration, userEmailSettings) {
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
        return await sgMail.send(msg).catch((err) => {
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
        }
        catch (e) {
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
    }
    else if (emailProvidersConfiguration != undefined) {
        console.debug("Failed to resolve userEmailSettings, using system emailProvidersConfiguration");
        console.debug(emailProvidersConfiguration);
        emailProvidersConfiguration.postmark.enabled && await sendViaPostmark();
        emailProvidersConfiguration.sendgrid.enabled && await sendViaSendgrid();
    }
}
exports.sendLogInCode = sendLogInCode;
//# sourceMappingURL=index.js.map