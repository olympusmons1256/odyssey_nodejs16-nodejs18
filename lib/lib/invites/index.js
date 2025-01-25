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
exports.sendInviteEmails = exports.inviteUsers = exports.addInvite = void 0;
const admin = __importStar(require("firebase-admin"));
const emailServices = __importStar(require("../emailServices/index"));
const firestore_1 = require("../documents/firestore");
const uuid_1 = require("uuid");
async function addInvite(organizationId, invite, spaceId) {
    function getInvitesCollection() {
        if (spaceId != undefined)
            return (0, firestore_1.getOrganizationSpaceInvitesRef)(organizationId, spaceId);
        else
            return (0, firestore_1.getOrganizationInvitesRef)(organizationId);
    }
    const invitesCollection = getInvitesCollection();
    async function getExistingInviteLink() {
        const existingInviteDocs = await invitesCollection.where("email", "==", invite.email).get();
        if (existingInviteDocs.empty == true || existingInviteDocs.docs.length < 1)
            return undefined;
        const inviteDoc = existingInviteDocs.docs.pop();
        if (inviteDoc == undefined || inviteDoc.exists == false)
            return undefined;
        const inviteLinkDoc = await inviteDoc.ref.collection("inviteLinks").doc("0").get();
        if (inviteLinkDoc.exists == false)
            return undefined;
        const inviteLink = inviteLinkDoc.data();
        return {
            inviteLink: inviteLink.id,
            inviteId: inviteDoc.id,
        };
    }
    const existingInviteLink = await getExistingInviteLink();
    if (existingInviteLink != undefined)
        return existingInviteLink;
    const inviteId = (0, uuid_1.v4)();
    const inviteLink = (0, uuid_1.v4)();
    try {
        await Promise.all([
            invitesCollection.doc(inviteId).set(invite),
            invitesCollection.doc(inviteId).collection("inviteLinks").doc("0").set({ id: inviteLink }),
        ]);
        console.debug("Invite added to organization/space");
        return {
            inviteLink,
            inviteId,
        };
    }
    catch (e) {
        console.error("Error adding invite");
        console.error(e);
        return undefined;
    }
}
exports.addInvite = addInvite;
async function inviteUsers(inviteRequests) {
    const organizationsAndEmails = inviteRequests
        .reduce((acc, ir) => {
        if (ir.orgId != undefined && ir.email != undefined) {
            if (acc[ir.orgId] == undefined) {
                acc[ir.orgId] = [ir.email];
            }
            else {
                acc[ir.orgId] = [...acc[ir.orgId], ir.email];
            }
        }
        return acc;
    }, {});
    const organizationUserDocsWithMatchingEmailFound = (await Promise.all(Object.entries(organizationsAndEmails)
        .map(async ([orgId, emails]) => {
        return { orgId, usersDocs: (await (0, firestore_1.getOrganizationUsersRef)(orgId).where("email", "in", emails).get()).docs.flatMap((d) => (d.exists) ? [d] : []) };
    })));
    const organizationInviteDocsWithMatchingEmailFound = (await Promise.all(Object.entries(organizationsAndEmails)
        .map(async ([orgId, emails]) => {
        return { orgId, usersDocs: (await (0, firestore_1.getOrganizationInvitesRef)(orgId).where("email", "in", emails).get()).docs.flatMap((d) => (d.exists) ? [d] : []) };
    })));
    const organizationInviteRolesFound = organizationInviteDocsWithMatchingEmailFound
        .reduce((acc, o) => {
        if (acc[o.orgId] == undefined) {
            acc[o.orgId] = {};
        }
        o.usersDocs.forEach((u) => {
            const organizationInvite = u.data();
            acc[o.orgId][organizationInvite.email] = organizationInvite.role;
        });
        return acc;
    }, {});
    const organizationsAndEmailsFound = organizationUserDocsWithMatchingEmailFound
        .reduce((acc, o) => {
        acc[o.orgId] = o.usersDocs.map((u) => u.data().email);
        return acc;
    }, {});
    const spacesAndEmails = inviteRequests
        .reduce((acc, ir) => {
        if (ir.orgId != undefined && ir.email != undefined && ir.spaceId != undefined) {
            if (acc[ir.spaceId] == undefined) {
                acc[ir.spaceId] = { emails: [ir.email], orgId: ir.orgId };
            }
            else {
                acc[ir.spaceId] = { emails: [...acc[ir.spaceId].emails, ir.email], orgId: ir.orgId };
            }
        }
        return acc;
    }, {});
    const spacesAndEmailsFound = (await Promise.all(Object.entries(spacesAndEmails)
        .map(async ([spaceId, o]) => {
        return { orgId: o.orgId, spaceId, emails: (await (0, firestore_1.getSpaceUsersRef)(o.orgId, spaceId).where("email", "in", o.emails).where("role", "!=", "space_visitor").get()).docs.flatMap((d) => (d.exists) ? [d.data()] : []) };
    })))
        .reduce((acc, o) => {
        acc[o.spaceId] = { orgId: o.orgId, emails: o.emails.map((u) => u.email) };
        return acc;
    }, {});
    const results = await Promise.all(inviteRequests.map(async (inviteRequest) => {
        const invite = {
            email: inviteRequest.email,
            role: "space_viewer",
            type: "email",
            created: admin.firestore.Timestamp.now(),
            updated: admin.firestore.Timestamp.now(),
        };
        if (inviteRequest.orgRole != undefined)
            invite.role = inviteRequest.orgRole;
        if (inviteRequest.spaceRole != undefined)
            invite.role = inviteRequest.spaceRole;
        const foundInOrg = organizationsAndEmailsFound[inviteRequest.orgId].includes(inviteRequest.email);
        console.debug(organizationInviteRolesFound[inviteRequest.orgId][inviteRequest.email], inviteRequest.orgRole);
        const inviteRoleNeedsToBeUpdated = organizationInviteRolesFound[inviteRequest.orgId][inviteRequest.email] != inviteRequest.orgRole && inviteRequest.orgRole != undefined;
        console.debug(inviteRoleNeedsToBeUpdated);
        const foundInSpace = (inviteRequest.spaceId == undefined) ? false : spacesAndEmailsFound[inviteRequest.spaceId].emails.includes(inviteRequest.email);
        const conditionallyAddInvite = async () => {
            if (inviteRequest.spaceId == undefined && foundInOrg == false) {
                return await addInvite(inviteRequest.orgId, invite);
            }
            else if (inviteRequest.spaceId != undefined && foundInOrg == false && foundInSpace == false) {
                return await addInvite(inviteRequest.orgId, invite, inviteRequest.spaceId);
            }
            else {
                return { inviteLink: undefined, inviteId: undefined };
            }
        };
        const ensureInviteRoleCorrect = async (inviteId) => {
            if (inviteRequest.spaceId == undefined && inviteRoleNeedsToBeUpdated) {
                try {
                    await (0, firestore_1.getOrganizationInviteRef)(inviteRequest.orgId, inviteId).update({
                        role: inviteRequest.orgRole,
                    });
                    return true;
                }
                catch (e) {
                    console.error("Failed to update invite role");
                    return false;
                }
            }
            else {
                return true;
            }
        };
        const addInviteResult = await conditionallyAddInvite();
        const roleCorrect = (addInviteResult == undefined || addInviteResult.inviteId == undefined) ? false : await ensureInviteRoleCorrect(addInviteResult.inviteId);
        const result = {
            foundInSpace,
            foundInOrg,
            inviteRequest,
            invite,
            inviteLink: addInviteResult === null || addInviteResult === void 0 ? void 0 : addInviteResult.inviteLink,
            inviteId: addInviteResult === null || addInviteResult === void 0 ? void 0 : addInviteResult.inviteId,
            roleCorrect,
        };
        return result;
    }));
    return results;
}
exports.inviteUsers = inviteUsers;
async function sendInviteEmails(inviteUserResults) {
    const [, emailProvidersConfiguration] = await (0, firestore_1.getEmailProvidersConfiguration)();
    function getTemplateId(inviteType) {
        switch (inviteType) {
            case "organization":
                return "d-6e3df2d542b546cab58e29cef6cc2933";
            case "space":
                return "d-05fb2f89fef84eafb0a65b1751967e7e";
        }
    }
    function getTemplateData(inviteType, inviteRequest) {
        switch (inviteType) {
            case "organization":
                return {
                    Sender: inviteRequest.inviterName,
                    Organization: inviteRequest.orgName,
                };
            case "space":
                return {
                    Sender: inviteRequest.inviterName,
                    Organization: inviteRequest.orgName,
                    Space: inviteRequest.spaceName,
                };
        }
    }
    const results = await Promise.all(inviteUserResults.map(async (inviteUserResult) => {
        const [, userEmailSettings] = await (0, firestore_1.getUserEmailSettings)(inviteUserResult.inviteRequest.email);
        const inviteType = inviteUserResult.inviteRequest.spaceId == undefined ? "organization" : "space";
        const templateId = getTemplateId(inviteType);
        const templateData = getTemplateData(inviteType, inviteUserResult.inviteRequest);
        if (inviteUserResult.inviteLink == undefined) {
            return {
                success: false,
                inviteUserResult,
            };
        }
        const sendInviteEmail = async (inviteLink) => {
            switch (inviteType) {
                case "organization":
                    return await emailServices.sendInviteEmail("organization-invite", templateData, templateId, inviteUserResult.inviteRequest.email, inviteLink, emailProvidersConfiguration, userEmailSettings);
                case "space":
                    return await emailServices.sendInviteEmail("space-invite", templateData, templateId, inviteUserResult.inviteRequest.email, inviteLink, emailProvidersConfiguration, userEmailSettings);
            }
        };
        const result = await sendInviteEmail(inviteUserResult.inviteLink);
        return {
            success: result,
            inviteUserResult,
        };
    }));
    return results;
}
exports.sendInviteEmails = sendInviteEmails;
//# sourceMappingURL=index.js.map