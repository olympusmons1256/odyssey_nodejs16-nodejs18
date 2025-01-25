// update user/invite roles
// organization members -> editors
// space guests -> viewers

import * as admin from "firebase-admin";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

async function run() {
  // update all organization members to organization editors
  const organizationUsers = await admin.firestore().collectionGroup("organizationUsers").get()
    .catch(((err) => {
      console.log(err);
      return undefined;
    }));
  if (organizationUsers == undefined || organizationUsers.empty) {
    console.log("No organization users found");
    return;
  } else {
    console.log(`Found ${organizationUsers.docs.length} organization users`);
    organizationUsers.forEach(async (user) => {
      const userData = user.data();
      if (!userData) {
        console.log(`Problem pulling data for user: ${user.id}`);
      } else if (!userData.role) {
        await user.ref.update({role: "org_viewer"});
      } else if (userData.role === "member") {
        await user.ref.update({role: "org_editor"});
      } else if (!userData.role.startsWith("org_")) {
        await user.ref.update({role: `org_${userData.role}`});
      }
    });
  }

  // update all space guests to space viewers
  const spaceUsers = await admin.firestore().collectionGroup("spaceUsers").get()
    .catch(((err) => {
      console.log(err);
      return undefined;
    }));
  if (spaceUsers == undefined || spaceUsers.empty) {
    console.log("No space users found");
  } else {
    console.log(`Found ${spaceUsers.docs.length} space users`);
    spaceUsers.forEach(async (user) => {
      const userData = user.data();
      if (!userData) {
        console.log(`Problem pulling data for user: ${user.id}`);
      } else if (!userData.role || userData.role === "guest") {
        await user.ref.update({role: "space_viewer"});
      } else if (!userData.role.startsWith("space_")) {
        await user.ref.update({role: `space_${userData.role}`});
      }
    });
  }

  // update all member invites to editor invites, all guest invites to viewer invites
  const userInvites = await admin.firestore().collectionGroup("invites").get()
    .catch(((err) => {
      console.log(err);
      return undefined;
    }));
  if (userInvites == undefined || userInvites.empty) {
    console.log("No invites found");
  } else {
    console.log(`Found ${userInvites.docs.length} user invites`);
    userInvites.forEach(async (invite) => {
      const inviteData = invite.data();
      if (!inviteData) {
        console.log(`Problem pulling data for invite: ${invite.id}`);
      } else if (invite.ref.path.includes("/spaces")) {
        if (!inviteData.role || inviteData.role === "guest") {
          await invite.ref.update({role: "space_viewer"});
        } else if (!inviteData.role.startsWith("space_")) {
          await invite.ref.update({role: `space_${inviteData.role}`});
        }
      } else {
        if (!inviteData.role) {
          await invite.ref.update({role: "org_viewer"});
        } else if (inviteData.role === "member") {
          await invite.ref.update({role: "org_editor"});
        } else if (!inviteData.role.startsWith("org_")) {
          await invite.ref.update({role: `org_${inviteData.role}`});
        }
      }
    });
  }

  console.log("DONE");
}

run();
