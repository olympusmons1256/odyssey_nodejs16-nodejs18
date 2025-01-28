import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as docTypes from "./lib/docTypes";
import * as httpTypes from "./lib/httpTypes";
import * as shortUuid from "short-uuid";
import {customRunWith, customRunWithWarm} from "./shared";
import {organizationInviteWildcardPath, spaceInviteWildcardPath, getOrganizationInviteRef, getOrganizationSpaceInviteRef, getBillingUsage, getBillingPublic} from "./lib/documents/firestore";
import {InviteRequest, inviteUsers, sendInviteEmails} from "./lib/invites";
import {OrgSpace} from "./lib/cmsDocTypes";

// Retrieves invite link for invite document
// Returns invite link
const getInviteLinkFromInvitePath =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (path: string) => {
      try {
        const inviteCheck = await admin.firestore().collection(`${path}/inviteLinks`).doc("0").get();
        if (!inviteCheck.exists) {
          throw new functions.https.HttpsError("not-found", "Invite link was not found.");
        }
        const inviteLinkData = inviteCheck.data();
        if (!inviteLinkData) {
          throw new functions.https.HttpsError("not-found", "Invite link has no data.");
        }
        return {result: inviteLinkData.id};
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

// Retrieves data from invite
// Returns organization/space data along with email assoicated with invite
const getDataFromInvite =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (inviteLink: string) => {
      try {
        // Pull invite data if invite is found
        const inviteLinkCheck = await admin.firestore().collectionGroup("inviteLinks").where("id", "==", inviteLink).get();

        if (inviteLinkCheck.empty || inviteLinkCheck.docs.length < 1) {
          throw new functions.https.HttpsError("not-found", "Invite link was not found.");
        }

        const inviteLinkDoc = inviteLinkCheck.docs[0];

        const inviteDocRef = inviteLinkDoc.ref.parent.parent;
        if (!inviteDocRef) {
          throw new functions.https.HttpsError("not-found", "Invite document was not found.");
        }
        const inviteDoc = await inviteDocRef.get();
        const invite = inviteDoc.data() as docTypes.Invite;

        if (invite.type === "link") {
          throw new functions.https.HttpsError("not-found", "Shared invite links are no longer supported.");
        }

        if (!inviteDocRef.parent.parent) {
          throw new functions.https.HttpsError("not-found", "Invite parent was not found.");
        }

        if (inviteDocRef.parent.parent.path.includes("/spaces/")) {
          const spaceDocRef = inviteDocRef.parent.parent;
          const spaceDoc = await spaceDocRef.get();
          if (!spaceDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Space document was not found.");
          }

          const spaceData = spaceDoc.data() as OrgSpace;

          const organizationDocRef = spaceDocRef.parent.parent;
          if (!organizationDocRef) {
            throw new functions.https.HttpsError("not-found", "Organization document was not found.");
          }
          const organizationDoc = await organizationDocRef.get();
          if (!organizationDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Organization document was not found.");
          }
          const organization = organizationDoc.data() as docTypes.Organization;
          const orgData = {...organization, id: organizationDoc.id};
          return {
            result: {
              type: invite.type || "",
              authSkip: invite.authSkip || false,
              email: invite.email,
              orgData,
              spaceData,
              accepted: invite.accepted !== undefined,
            },
          };
        } else {
          const organizationDocRef = inviteDocRef.parent.parent;
          const organizationDoc = await organizationDocRef.get();
          if (!organizationDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Organization document was not found.");
          }
          const organization = organizationDoc.data() as docTypes.Organization;
          const orgData = {...organization, id: organizationDoc.id};
          const [, billingUsage] = await getBillingUsage(organizationDoc.id);
          if (billingUsage == undefined) {
            throw new functions.https.HttpsError("not-found", `Organization has no billing/usage document: ${organizationDoc.id}`);
          }
          const [, billingPublic] = await getBillingPublic(organizationDoc.id);
          if (billingPublic == undefined) {
            throw new functions.https.HttpsError("not-found", `Organization has no billing/public document: ${organizationDoc.id}`);
          }
          const workspaceSeatsSubscribed = billingUsage.workspaceSeatsSubscribed ?? 0;
          const workspaceSeatsGifted = billingUsage.workspaceSeatsGifted ?? 0;
          const workspaceSeatsTotal = workspaceSeatsSubscribed + workspaceSeatsGifted;
          if (billingPublic.disableBilling != true && billingUsage.workspaceSeatsUsed >= workspaceSeatsTotal) {
            throw new functions.https.HttpsError("not-found", `No available workspace seats. Please notify the administrators of ${orgData.name} of this error.`);
          }
          return {
            result: {
              type: invite.type || "",
              authSkip: invite.authSkip || false,
              email: invite.email,
              orgData,
              accepted: invite.accepted !== undefined,
            },
          };
        }
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

// Creates or modifies existing
// shareable organization or space invite link
const createNewInviteLink =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: httpTypes.NewInviteLinkData) => {
      try {
        const inviteLink = shortUuid().new();
        const invitesPath = admin.firestore().collection(data.path);
        const inviteDoc = await invitesPath
          .where("type", "==", "link")
          .where("role", "==", data.role)
          .get();
        if (!inviteDoc || inviteDoc.empty) {
          // Create invite if one was not found
          const inviteDocId = shortUuid().new();
          try {
            await invitesPath.doc(inviteDocId).set({
              created: admin.firestore.Timestamp.now(),
              updated: admin.firestore.Timestamp.now(),
              role: data.role,
              type: "link",
            });
          } catch (e: any) {
            console.warn(e);
            throw new functions.https.HttpsError("cancelled", "Error creating new invite doc.");
          }
          try {
            await invitesPath.doc(inviteDocId).collection("inviteLinks").doc("0").set({id: inviteLink});
          } catch (e: any) {
            console.warn(e);
            throw new functions.https.HttpsError("cancelled", "Error adding new invite link.");
          }
        } else {
          // Edit existing invite link
          const invite = inviteDoc.docs[0];
          const inviteLinkPath = `${invite.ref.path}/inviteLinks`;
          try {
            await admin.firestore().collection(inviteLinkPath).doc("0").update({id: inviteLink});
          } catch (e: any) {
            console.warn(e);
            throw new functions.https.HttpsError("cancelled", "Error updating invite link.");
          }
        }
        // Return invite link
        return {result: inviteLink};
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

// Admin of organization invites new member
// Creates invite record and sends email
const inviteOrganizationUser =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: httpTypes.NewOrgInviteRequestData) => {
      // Test shape
      try {
        let bodyData : httpTypes.NewOrgInviteRequestData;
        try {
          bodyData = data as httpTypes.NewOrgInviteRequestData;
        } catch (e) {
          console.log("Request data doesn't match for this function. Skipping.", e);
          return;
        }

        const [, billingUsage] = await getBillingUsage(bodyData.orgId);
        if (billingUsage == undefined) {
          throw new functions.https.HttpsError("not-found", `Organization has no billing/usage document: ${bodyData.orgId}`);
        }
        const [, billingPublic] = await getBillingPublic(bodyData.orgId);
        if (billingPublic == undefined) {
          throw new functions.https.HttpsError("not-found", `Organization has no billing/public document: ${bodyData.orgId}`);
        }
        const workspaceSeatsSubscribed = billingUsage.workspaceSeatsSubscribed ?? 0;
        const workspaceSeatsGifted = billingUsage.workspaceSeatsGifted ?? 0;
        const workspaceSeatsTotal = workspaceSeatsSubscribed + workspaceSeatsGifted;
        if (billingPublic.disableBilling != true && billingUsage.workspaceSeatsUsed >= workspaceSeatsTotal) {
          throw new functions.https.HttpsError("not-found", "No available workspace seats. Please modify your subscription to continue.");
        }

        const inviteRequest: InviteRequest = {
          email: bodyData.email,
          orgId: bodyData.orgId,
          orgName: bodyData.orgName,
          inviterName: bodyData.inviterName,
          orgRole: bodyData.role,
          spaceId: undefined,
          spaceName: undefined,
        };

        const inviteResult = (await inviteUsers([inviteRequest])).pop();
        if (inviteResult == undefined) {
          throw new functions.https.HttpsError("internal", "Failed to invite user");
        }
        if (inviteResult.foundInOrg == true) {
          throw new functions.https.HttpsError("invalid-argument", "The user already exists in this organization. Cancelling invite.");
        }
        if (inviteResult.roleCorrect == false) {
          throw new functions.https.HttpsError("internal", "Failed to update user role");
        }
        if (inviteResult.inviteLink == undefined) {
          throw new functions.https.HttpsError("internal", "Failed to create user invite");
        }
        const emailResult = (await sendInviteEmails([inviteResult])).pop();
        if (emailResult == undefined) {
          throw new functions.https.HttpsError("internal", "Failed to send email to invited user");
        }
        if (emailResult.success == false) {
          throw new functions.https.HttpsError("internal", "Failed to send email to user");
        }

        return {result: {inviteLink: emailResult.inviteUserResult.inviteLink, email: bodyData.email, role: bodyData.role}};
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

// Admin invites guest to space
// Creates invite record and sends email
const inviteSpaceGuest =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: httpTypes.NewGuestInviteRequestData) => {
      try {
        // Test shape
        let bodyData : httpTypes.NewGuestInviteRequestData;
        try {
          bodyData = data as httpTypes.NewGuestInviteRequestData;
        } catch (e) {
          console.log("Request data doesn't match for this function. Skipping.", e);
          return;
        }

        const inviteRequest: InviteRequest = {
          email: bodyData.email,
          orgId: bodyData.orgId,
          orgName: bodyData.orgName,
          inviterName: bodyData.inviterName,
          orgRole: undefined,
          spaceId: bodyData.spaceId,
          spaceName: bodyData.spaceName,
          spaceRole: bodyData.role,
        };

        const inviteResult = (await inviteUsers([inviteRequest])).pop();
        if (inviteResult == undefined) {
          throw new functions.https.HttpsError("invalid-argument", "Failed to invite user");
        }
        if (inviteResult.foundInSpace == true || inviteResult.foundInOrg == true) {
          throw new functions.https.HttpsError("invalid-argument", "The user already has access to this space. Cancelling invite.");
        }
        if (inviteResult.inviteLink == undefined) {
          throw new functions.https.HttpsError("internal", "Failed to create user invite");
        }
        const emailResult = (await sendInviteEmails([inviteResult])).pop();
        if (emailResult == undefined) {
          throw new functions.https.HttpsError("invalid-argument", "Failed to send email to invited user");
        }
        if (emailResult.success == false) {
          throw new functions.https.HttpsError("internal", "Failed to send invite email to user");
        }

        return {result: {inviteLink: emailResult.inviteUserResult.inviteLink, email: bodyData.email, role: bodyData.role}};
      } catch (e: any) {
        if (e instanceof functions.auth.HttpsError) {
          throw e;
        } else {
          console.error("Unknown error encountered");
          console.error(e);
          throw new functions.https.HttpsError("internal", "Unknown error");
        }
      }
    });

// Finds invite, verifies user has access to invite
// and makes organization/space associations with user doc
const acceptInvite =
functions
  .runWith(customRunWithWarm)
  .https.onCall(async (data: httpTypes.NewOrgInviteData) => {
    try {
      // Search for invite that matches invite link
      const inviteSnapshot = await admin.firestore().collectionGroup("inviteLinks").where("id", "==", data.inviteLink).get();
      if (inviteSnapshot.empty) {
        throw new functions.https.HttpsError("invalid-argument", "Invite link was not found.");
      }
      // Verify user exists in auth
      const existingUser = await admin.auth().getUserByEmail(data.email).catch(()=> {
        return undefined;
      });
      if (!existingUser) {
        throw new functions.https.HttpsError("invalid-argument", "User does not exist. Please sign in to continue.");
      }
      // Verify invite exists
      const inviteLinkDoc = inviteSnapshot.docs[0];
      if (!inviteLinkDoc.ref.parent.parent) {
        throw new functions.https.HttpsError("cancelled", "Invite document was not found.");
      }
      const inviteDoc = await admin.firestore().doc(inviteLinkDoc.ref.parent.parent.path).get();
      const inviteData = inviteDoc.data() as docTypes.Invite;
      // Get space/organization path and data
      // Update room/organization collection
      const inviteParent = inviteDoc.ref.parent.parent;
      if (!inviteParent) {
        throw new functions.https.HttpsError("invalid-argument", "Organization/space was not found.");
      }
      // Check user has permission to follow invite
      if (inviteData.email && inviteData.email !== data.email) {
        // If invite is associated with an email, verify user email is associated with invite
        throw new functions.https.HttpsError("cancelled", "The email associated with this account does not match the email listed on the invite. Please verify your account's email address and try again.");
      } else if (inviteData.type === "link") {
        // If invite is shared invite link, verify organization/space allows shared invite link
        const inviteParentDoc = await inviteParent.get();
        const inviteParentData = inviteParentDoc.data();
        if (!inviteParentData || !inviteParentData.allowSharedInviteLinks) {
          throw new functions.https.HttpsError("cancelled", "The shared invite link you are trying to access has been disabled or removed.");
        }
      }
      // Add user to organization/space user subcollection
      const uid = existingUser.uid as string;
      try {
        const userPath = inviteParent.path.includes("spaces") ? "spaceUsers" : "organizationUsers";
        await inviteParent.collection(userPath).doc(uid).set({
          email: data.email,
          role: inviteData.role,
          created: admin.firestore.Timestamp.now(),
          updated: admin.firestore.Timestamp.now(),
        } as docTypes.User);
      } catch (e: any) {
        console.error("Failed to add new user");
        console.error(e);
        throw new functions.https.HttpsError("internal", "Failed to add new user");
      }
      // Delete invite if it is not a shareable link or tagged as auth skip
      if (inviteData.type !== "link" && !inviteData.authSkip) {
        try {
          const now = admin.firestore.Timestamp.now();
          await inviteDoc.ref.update({updated: now, accepted: now});
        } catch (e: any) {
          console.warn("Failed to delete invite doc");
        }
      }
      return {result: "success"};
    } catch (e: any) {
      if (e instanceof functions.auth.HttpsError) {
        throw e;
      } else {
        console.error("Unknown error encountered");
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
      }
    }
  });

// Finds invite, verifies user has access to invite
// and removes invite from space/organization
const rejectInvite =
functions
  .runWith(customRunWithWarm)
  .https.onCall(async (data: httpTypes.NewOrgInviteData) => {
    try {
      // Search for invite that matches invite link
      const inviteSnapshot = await admin.firestore().collectionGroup("inviteLinks").where("id", "==", data.inviteLink).get();
      if (inviteSnapshot.empty) {
        throw new functions.https.HttpsError("invalid-argument", "Invite link was not found.");
      }
      // Verify user exists in auth
      const existingUser = await admin.auth().getUserByEmail(data.email).catch(()=> {
        return undefined;
      });
      if (!existingUser) {
        throw new functions.https.HttpsError("invalid-argument", "User does not exist. Please sign in to continue.");
      }
      // Verify invite exists
      const inviteLinkDoc = inviteSnapshot.docs[0];
      if (!inviteLinkDoc.ref.parent.parent) {
        throw new functions.https.HttpsError("cancelled", "Invite document was not found.");
      }
      const inviteDoc = await admin.firestore().doc(inviteLinkDoc.ref.parent.parent.path).get();
      const inviteData = inviteDoc.data() as docTypes.Invite;
      // Get space/organization path and data
      // Update room/organization collection
      const inviteParent = inviteDoc.ref.parent.parent;
      if (!inviteParent) {
        throw new functions.https.HttpsError("invalid-argument", "Organization/space was not found.");
      }
      // Check user has permission to reject invite
      if (inviteData.email && inviteData.email !== data.email) {
        if (inviteData.email !== data.email) {
          // If invite is associated with an email, verify user email is associated with invite
          throw new functions.https.HttpsError("cancelled", "The email associated with this account does not match the email listed on the invite. Please verify your account's email address and try again.");
        }
        if (inviteData.authSkip) {
          // User cannot reject an invite that is tagged with authentication skip
          throw new functions.https.HttpsError("cancelled", "This invite cannot be removed. Please contact support to remove this invite.");
        }
      } else if (inviteData.type === "link") {
        throw new functions.https.HttpsError("cancelled", "User cannot reject an invite link.");
      }
      // Delete invite
      try {
        const now = admin.firestore.Timestamp.now();
        await inviteDoc.ref.update({updated: now, rejected: now});
      } catch (e: any) {
        console.warn("Failed to delete invite doc");
      }
      return {result: "success"};
    } catch (e: any) {
      if (e instanceof functions.auth.HttpsError) {
        throw e;
      } else {
        console.error("Unknown error encountered");
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
      }
    }
  });

const deletedOrganizationInviteSubcollections =
  // onDelete() of an organization invite
  // Delete all the invites's subcollection documents
  functions
    .runWith(customRunWith)
    .firestore
    .document(organizationInviteWildcardPath())
    .onDelete(async (_, context) => {
      const organizationId : string = context.params.organizationId;
      const inviteId : string = context.params.inviteId;
      const subcollections = await getOrganizationInviteRef(organizationId, inviteId).listCollections();
      // TODO: Implement an actual recursive function to ensure n-depth subcollection docs are deleted
      return subcollections.flatMap(async (subcollection) => {
        return (await subcollection.listDocuments()).map((doc) => doc.delete());
      });
    });

const deletedSpaceInviteSubcollections =
  // onDelete() of a space invite
  // Delete all the invites's subcollection documents
  functions
    .runWith(customRunWith)
    .firestore
    .document(spaceInviteWildcardPath())
    .onDelete(async (_, context) => {
      const organizationId : string = context.params.organizationId;
      const spaceId : string = context.params.spaceId;
      const inviteId : string = context.params.inviteId;
      const subcollections = await getOrganizationSpaceInviteRef(organizationId, spaceId, inviteId).listCollections();
      // TODO: Implement an actual recursive function to ensure n-depth subcollection docs are deleted
      return subcollections.flatMap(async (subcollection) => {
        return (await subcollection.listDocuments()).map((doc) => doc.delete());
      });
    });

export const creates = {
  createNewInviteLink,
  inviteOrganizationUser,
  inviteSpaceGuest,
};

export const updates = {
  acceptInvite,
  rejectInvite,
};

export const reads = {
  getInviteLinkFromInvitePath,
  getDataFromInvite,
};

export const deletes = {
  deletedOrganizationInviteSubcollections,
  deletedSpaceInviteSubcollections,
};
