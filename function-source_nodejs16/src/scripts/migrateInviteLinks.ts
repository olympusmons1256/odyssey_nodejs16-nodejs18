import * as admin from "firebase-admin";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

async function run() {
  // loop through all organizations
  const organizationQuery = await admin.firestore().collection("organizations").get();
  for (const organizationDoc of organizationQuery.docs) {
    // if organization has open shared invite links, add
    // allowSharedInviteLinks flag to organization document
    const sharedInviteLinks = await admin.firestore().collection(`organizations/${organizationDoc.id}/invites`).where("type", "==", "link").get();
    if (!sharedInviteLinks.empty) {
      await organizationDoc.ref.update({allowSharedInviteLinks: true});
      console.log("organization shared invites exist");
    }
    // get open organization invite links
    const organizationInvitesQuery = await admin.firestore().collection(`organizations/${organizationDoc.id}/invites`).get();
    // loop through invite links
    for (const inviteDoc of organizationInvitesQuery.docs) {
      const inviteData = inviteDoc.data();
      if (inviteData.inviteLink) {
        const inviteLink = inviteData.inviteLink;
        // create and add invite link to inviteLink subcollection
        await inviteDoc.ref.collection("inviteLinks").doc("0").set({id: inviteLink})
          .catch((err) => {
            console.log(`org: organizationDoc.id invite: inviteDoc.id ${err}`);
          });
        // remove inviteLink from invite doc
        await inviteDoc.ref.update({inviteLink: admin.firestore.FieldValue.delete()});
      }
    }
    // get organization spaces
    const organizationSpacesQuery = await admin.firestore().collection(`organizations/${organizationDoc.id}/spaces`).get();
    // loop through spaces in organization
    for (const spaceDoc of organizationSpacesQuery.docs) {
      // if space has open shared invite links, add
      // allowSharedInviteLinks flag to space document
      const sharedSpaceInviteLinks = await admin.firestore().collection(`organizations/${organizationDoc.id}/spaces/${spaceDoc.id}/invites`).where("type", "==", "link").get();
      if (!sharedSpaceInviteLinks.empty) {
        await spaceDoc.ref.update({allowSharedInviteLinks: true});
      }
      // get open space invite links
      const spaceInvitesQuery = await admin.firestore().collection(`organizations/${organizationDoc.id}/spaces/${spaceDoc.id}/invites`).get();
      // loop through invite links
      for (const inviteDoc of spaceInvitesQuery.docs) {
        const inviteData = inviteDoc.data();
        if (inviteData.inviteLink) {
          const inviteLink = inviteData.inviteLink;
          // create and add invite link to inviteLink subcollection
          await inviteDoc.ref.collection("inviteLinks").doc("0").set({id: inviteLink})
            .catch((err) => {
              console.log(`org: organizationDoc.id invite: inviteDoc.id ${err}`);
            });
          // remove inviteLink from invite doc
          await inviteDoc.ref.update({inviteLink: admin.firestore.FieldValue.delete()});
        }
      }
    }
  }
}

run();
