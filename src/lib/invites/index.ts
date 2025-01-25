import * as admin from "firebase-admin";
import * as docTypes from "../docTypes";
import * as emailServices from "../emailServices/index";
import {getEmailProvidersConfiguration, getOrganizationInviteRef, getOrganizationInvitesRef, getOrganizationSpaceInvitesRef, getOrganizationUsersRef, getSpaceUsersRef, getUserEmailSettings} from "../documents/firestore";
import {v4 as uuidv4} from "uuid";

export interface InviteRequest {
  email: string,
  inviterName: string
  orgId: string,
  orgName: string,
  orgRole?: docTypes.OrganizationRoles,
  spaceId?: string,
  spaceName?: string
  spaceRole?: docTypes.SpaceRoles,
}

type OrganizationsAndEmails = {
  [key: string]: string[]
}

type OrganizationsAndEmailInviteRoles = {
  [key: string]: {
    [key: string]: docTypes.UserRoles
  }
}

type SpacesAndEmails = {
  [key: string]: {
    orgId: string,
    emails: string[]
  }
}

export interface InviteUserResult {
  inviteRequest: InviteRequest
  inviteLink?: string
  inviteId?: string
  invite: docTypes.Invite
  roleCorrect: boolean
  foundInOrg: boolean
  foundInSpace: boolean
}

export interface AddInviteResult {
  inviteLink?: string
  inviteId?: string
}

export async function addInvite(organizationId: string, invite: docTypes.Invite, spaceId?: string) : Promise<AddInviteResult | undefined> {
  function getInvitesCollection() {
    if (spaceId != undefined) return getOrganizationSpaceInvitesRef(organizationId, spaceId);
    else return getOrganizationInvitesRef(organizationId);
  }

  const invitesCollection = getInvitesCollection();

  async function getExistingInviteLink() : Promise<AddInviteResult | undefined> {
    const existingInviteDocs = await invitesCollection.where("email", "==", invite.email).get();
    if (existingInviteDocs.empty == true || existingInviteDocs.docs.length < 1) return undefined;

    const inviteDoc = existingInviteDocs.docs.pop();
    if (inviteDoc == undefined || inviteDoc.exists == false) return undefined;

    const inviteLinkDoc = await inviteDoc.ref.collection("inviteLinks").doc("0").get();
    if (inviteLinkDoc.exists == false) return undefined;

    const inviteLink = inviteLinkDoc.data() as docTypes.InviteLink;
    return {
      inviteLink: inviteLink.id,
      inviteId: inviteDoc.id,
    };
  }

  const existingInviteLink = await getExistingInviteLink();
  if (existingInviteLink != undefined) return existingInviteLink;

  const inviteId = uuidv4();
  const inviteLink = uuidv4();

  try {
    await Promise.all([
      invitesCollection.doc(inviteId).set(invite),
      invitesCollection.doc(inviteId).collection("inviteLinks").doc("0").set({id: inviteLink}),
    ]);
    console.debug("Invite added to organization/space");
    return {
      inviteLink,
      inviteId,
    };
  } catch (e: any) {
    console.error("Error adding invite");
    console.error(e);
    return undefined;
  }
}

export async function inviteUsers(inviteRequests: InviteRequest[]) {
  const organizationsAndEmails = inviteRequests
    .reduce((acc, ir) => {
      if (ir.orgId != undefined && ir.email != undefined) {
        if (acc[ir.orgId] == undefined) {
          acc[ir.orgId] = [ir.email];
        } else {
          acc[ir.orgId] = [...acc[ir.orgId], ir.email];
        }
      }
      return acc;
    }, <OrganizationsAndEmails>{});

  const organizationUserDocsWithMatchingEmailFound =
    (await Promise.all(Object.entries(organizationsAndEmails)
      .map(async ([orgId, emails]) => {
        return {orgId, usersDocs: (await getOrganizationUsersRef(orgId).where("email", "in", emails).get()).docs.flatMap((d) => (d.exists) ? [d] : [])};
      })
    ));

  const organizationInviteDocsWithMatchingEmailFound =
    (await Promise.all(Object.entries(organizationsAndEmails)
      .map(async ([orgId, emails]) => {
        return {orgId, usersDocs: (await getOrganizationInvitesRef(orgId).where("email", "in", emails).get()).docs.flatMap((d) => (d.exists) ? [d] : [])};
      })
    ));

  const organizationInviteRolesFound =
    organizationInviteDocsWithMatchingEmailFound
      .reduce((acc, o) => {
        if (acc[o.orgId] == undefined) {
          acc[o.orgId] = {};
        }
        o.usersDocs.forEach((u) => {
          const organizationInvite = u.data() as docTypes.Invite;
          acc[o.orgId][organizationInvite.email] = organizationInvite.role;
        });
        return acc;
      }, <OrganizationsAndEmailInviteRoles>{});

  const organizationsAndEmailsFound =
    organizationUserDocsWithMatchingEmailFound
      .reduce((acc, o) => {
        acc[o.orgId] = o.usersDocs.map((u) => (u.data() as docTypes.OrganizationUser).email);
        return acc;
      }, <OrganizationsAndEmails>{});

  const spacesAndEmails = inviteRequests
    .reduce((acc, ir) => {
      if (ir.orgId != undefined && ir.email != undefined && ir.spaceId != undefined) {
        if (acc[ir.spaceId] == undefined) {
          acc[ir.spaceId] = {emails: [ir.email], orgId: ir.orgId};
        } else {
          acc[ir.spaceId] = {emails: [...acc[ir.spaceId].emails, ir.email], orgId: ir.orgId};
        }
      }
      return acc;
    }, <SpacesAndEmails>{});

  const spacesAndEmailsFound =
    (await Promise.all(Object.entries(spacesAndEmails)
      .map(async ([spaceId, o]) => {
        return {orgId: o.orgId, spaceId, emails: (await getSpaceUsersRef(o.orgId, spaceId).where("email", "in", o.emails).where("role", "!=", "space_visitor").get()).docs.flatMap((d) => (d.exists) ? [d.data() as docTypes.SpaceUser] : [])};
      })
    ))
      .reduce((acc, o) => {
        acc[o.spaceId] = {orgId: o.orgId, emails: o.emails.map((u) => u.email)};
        return acc;
      }, <SpacesAndEmails>{});

  const results : InviteUserResult[] = await Promise.all(inviteRequests.map(async (inviteRequest) => {
    const invite : docTypes.Invite = {
      email: inviteRequest.email,
      role: "space_viewer",
      type: "email",
      created: admin.firestore.Timestamp.now(),
      updated: admin.firestore.Timestamp.now(),
    };
    if (inviteRequest.orgRole != undefined) invite.role = inviteRequest.orgRole;
    if (inviteRequest.spaceRole != undefined) invite.role = inviteRequest.spaceRole;
    const foundInOrg = organizationsAndEmailsFound[inviteRequest.orgId].includes(inviteRequest.email);
    console.debug(organizationInviteRolesFound[inviteRequest.orgId][inviteRequest.email], inviteRequest.orgRole);
    const inviteRoleNeedsToBeUpdated = organizationInviteRolesFound[inviteRequest.orgId][inviteRequest.email] != inviteRequest.orgRole && inviteRequest.orgRole != undefined;
    console.debug(inviteRoleNeedsToBeUpdated);
    const foundInSpace = (inviteRequest.spaceId == undefined) ? false : spacesAndEmailsFound[inviteRequest.spaceId].emails.includes(inviteRequest.email);

    const conditionallyAddInvite = async () : Promise<AddInviteResult | undefined> => {
      if (inviteRequest.spaceId == undefined && foundInOrg == false) {
        return await addInvite(inviteRequest.orgId, invite);
      } else if (inviteRequest.spaceId != undefined && foundInOrg == false && foundInSpace == false) {
        return await addInvite(inviteRequest.orgId, invite, inviteRequest.spaceId);
      } else {
        return {inviteLink: undefined, inviteId: undefined};
      }
    };

    const ensureInviteRoleCorrect = async (inviteId: string) => {
      if (inviteRequest.spaceId == undefined && inviteRoleNeedsToBeUpdated) {
        try {
          await getOrganizationInviteRef(inviteRequest.orgId, inviteId).update({
            role: inviteRequest.orgRole,
          });
          return true;
        } catch (e: any) {
          console.error("Failed to update invite role");
          return false;
        }
      } else {
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
      inviteLink: addInviteResult?.inviteLink,
      inviteId: addInviteResult?.inviteId,
      roleCorrect,
    };
    return result;
  }));
  return results;
}

export interface EmailInviteUserResult {
  inviteUserResult: InviteUserResult
  success: boolean
}

export async function sendInviteEmails(inviteUserResults: InviteUserResult[]) {
  const [, emailProvidersConfiguration] = await getEmailProvidersConfiguration();

  function getTemplateId(inviteType: "organization" | "space") {
    switch (inviteType) {
      case "organization":
        return "d-6e3df2d542b546cab58e29cef6cc2933";
      case "space":
        return "d-05fb2f89fef84eafb0a65b1751967e7e";
    }
  }

  function getTemplateData(inviteType: "organization" | "space", inviteRequest: InviteRequest) : emailServices.EmailTemplateData {
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
    const [, userEmailSettings] = await getUserEmailSettings(inviteUserResult.inviteRequest.email);
    const inviteType = inviteUserResult.inviteRequest.spaceId == undefined ? "organization" : "space";
    const templateId = getTemplateId(inviteType);
    const templateData = getTemplateData(inviteType, inviteUserResult.inviteRequest);
    if (inviteUserResult.inviteLink == undefined) {
      return {
        success: false,
        inviteUserResult,
      } as EmailInviteUserResult;
    }
    const sendInviteEmail = async (inviteLink: string) => {
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
    } as EmailInviteUserResult;
  }));

  return results;
}
