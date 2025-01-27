import fetch from "node-fetch";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {sleep, inEmulatorEnv, chunkList} from "./lib/misc";
import * as docTypes from "./lib/docTypes";
import * as httpTypes from "./lib/httpTypes";
import * as emailServices from "./lib/emailServices/index";
import * as shortUuid from "short-uuid";
import {customRunWith, customRunWithWarm} from "./shared";
import {uploadFileUrlToCloudStorage} from "./lib/cloudStorage";
import {getSpaceUserRef, deviceWildcardPath, getUserRef, getDevice, getDeviceRef, getOrganizationUserRef, organizationUserWildcardPath, userWildcardPath, spaceUserWildcardPath, getOrganizationUser, getSpaceUser, getUser, getOrganizationUsersRef, getSpaceUsersRef, getSpaceRef, getUserEmailSettings, getEmailProvidersConfiguration, getParticipantBrowserStateUpdateWebRtc, getSpaces, getOrganizationSpaceInvitesRef, getOrganizationInvitesRef, getBillingPublic, getSpace} from "./lib/documents/firestore";
import {checkWebRtcStateOnline} from "./lib/streamingSessions";

const delaySecondsBeforeDeleteDeviceId = () => {
  if (inEmulatorEnv()) {
    return 3;
  } else {
    return 10;
  }
};

const sendSignInLink =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: httpTypes.NewSignInData) => {
      try {
        // verify user exists
        const existingUser = await admin.auth().getUserByEmail(data.email).catch(()=> {
          return undefined;
        });
        if (!existingUser) {
          throw new functions.https.HttpsError("invalid-argument", "No account is associated with this email. Please check your email and try again.");
        }
        // generate sign in link with admin sdk
        const actionCodeSettings = {
          url: await emailServices.generateUrl(`?continueUrl=${data.redirect}`),
          handleCodeInApp: true, // this must be true for link sign in
        };
        const emailLink = await admin.auth().generateSignInWithEmailLink(data.email, actionCodeSettings)
          .catch((error) => {
            console.log(error);
            return undefined;
          });
        if (!emailLink) {
          // link was not generated
          throw new functions.https.HttpsError("invalid-argument", "There was an issue generating the sign in link. Please try again.");
        } else {
          const [, user] = await getUser(existingUser.uid);
          const templateAlias = user?.pending ? "new-account" : "signin-v2" as emailServices.SignInTemplates;
          const [, userEmailSettings] = await getUserEmailSettings(data.email);
          const [, emailProvidersConfiguration] = await getEmailProvidersConfiguration();
          const templateId = "d-d4bc1f539b964563a09376949695cc69";
          await emailServices.sendLogInCode(templateId, data.email, emailLink, templateAlias, emailProvidersConfiguration, userEmailSettings);
          return {result: "Sign in link has been sent."};
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

const anonymousAuthSignin =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: httpTypes.AnonymousAuthSigninRequestData) : Promise<httpTypes.AnonymousAuthSigninResponseData> => {
      try {
        const [spaceDoc, space] = await getSpace(data.organizationId, data.spaceId);
        if (spaceDoc == undefined || space == undefined) {
          throw new functions.https.HttpsError("not-found", "Space not found");
        }
        if (space.allowEmbed != true && space.allowAnonymousUsers != true) {
          throw new functions.https.HttpsError("permission-denied", "Space does not allow anonymous users");
        }
        const userId = shortUuid.generate().toString();
        const email = `${userId}@anonymous.noreply.odyssey.stream`;
        await admin.auth().createUser({email, uid: userId});
        await getUserRef(userId).create({
          email,
          created: admin.firestore.Timestamp.now(),
          anonymous: true,
        } as docTypes.RootUser);
        await getSpaceUserRef(data.organizationId, data.spaceId, userId).create({
          role: "space_visitor",
          updated: admin.firestore.Timestamp.now(),
          created: admin.firestore.Timestamp.now(),
          email,
          anonymous: true,
        } as docTypes.SpaceUser);
        const customToken = await admin.auth().createCustomToken(userId, {anonymous: true});
        return {
          userId: userId,
          customToken,
        };
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

const uploadUserAvatar =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: httpTypes.NewAvatarData) => {
      try {
        // upload avatar glb
        const avatarId = data.fileName.replace(".glb", "");
        const uniqueFileName = `${avatarId}-${shortUuid().new()}`;
        const avatarModelDownloadURL = await uploadFileUrlToCloudStorage(data.avatarUrl, "/avatars", `${uniqueFileName}.glb`)
          .catch((err: any)=> {
            console.error(err);
            return undefined;
          });
        if (!avatarModelDownloadURL) {
          throw new functions.https.HttpsError("cancelled", "Error saving avatar model");
        }
        // upload avatar image
        const imageUrl = `https://api.readyplayer.me/v1/avatars/${avatarId}.png?blendShapes[Wolf3D_Head][mouthSmile]=0.3`;
        const avatarImageDownloadURL = await uploadFileUrlToCloudStorage(imageUrl, "/avatar-images", `${uniqueFileName}.png`)
          .catch((err: any)=> {
            console.error(err);
            return undefined;
          });
        if (!avatarImageDownloadURL) {
          throw new functions.https.HttpsError("cancelled", "Error saving avatar image");
        }
        // get avatar gender
        const avatarJson = `https://api.readyplayer.me/v1/avatars/${avatarId}.json`;
        const json = await fetch(avatarJson).then((res) => res.json());
        const bodyShape = json?.outfitGender === "feminine" ? "1" : "4";
        return await admin.firestore().collection("users").doc(data.userId).update({
          avatarReadyPlayerMeImg: avatarImageDownloadURL,
          bodyShape,
          rpmAvatarId: avatarId,
          avatarReadyPlayerMeUrl: avatarModelDownloadURL,
        });
      } catch (e: any) {
        console.error(e);
        throw new functions.https.HttpsError("internal", "Unknown error");
      }
    });

const idTokenForCustomToken =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: httpTypes.IdTokenForCustomTokenRequestData) => {
      if (data.idToken == undefined || data.idToken == null || data.idToken.length < 1) {
        throw new functions.https.HttpsError("invalid-argument", "idToken not provided or invalid");
      }
      try {
        const verified = await admin.auth().verifyIdToken(data.idToken);
        const customToken = await admin.auth().createCustomToken(verified.uid);
        const response : httpTypes.IdTokenForCustomTokenResponseData = {
          customToken,
        };
        return response;
      } catch (e: any) {
        console.debug(e);
        throw new functions.https.HttpsError("unauthenticated", "Invalid id token");
      }
    });

// add user as visitor to space
const addVisitor =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (data: httpTypes.NewVisitorRequestData) => {
      try {
        // test shape
        let bodyData : httpTypes.NewVisitorRequestData;
        try {
          bodyData = data as httpTypes.NewVisitorRequestData;
        } catch (e) {
          console.log("Request data doesn't match for this function. Skipping.", e);
          return;
        }
        // shape of new visitor, if needed
        const userData : docTypes.SpaceUser = {
          email: bodyData.email,
          name: bodyData.userName,
          role: "space_visitor",
          created: admin.firestore.Timestamp.now(),
          updated: admin.firestore.Timestamp.now(),
        };
          // validate user is not already an org or space member
        const organizationUsersCollection = getOrganizationUsersRef(bodyData.orgId);
        const userCheck = await organizationUsersCollection.where("email", "==", userData.email).get();
        if (!userCheck.empty) {
          throw new functions.https.HttpsError("cancelled", "User already exists in this organization.");
        }
        const spaceUsersCollection = getSpaceUsersRef(bodyData.orgId, bodyData.spaceId);
        const visitorCheck = await spaceUsersCollection.where("email", "==", userData.email).get();
        if (!visitorCheck.empty) {
          throw new functions.https.HttpsError("cancelled", "User already exists in this space.");
        } else {
          // otherwise add user to visitors list
          await spaceUsersCollection.doc(bodyData.userId).set(userData);
          return {result: "success"};
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

// frontend uses this method to create a new user
// using this backend method allows for more granular auth checking, rather than using built-in firebase method
const createUser =
functions
  .runWith(customRunWithWarm)
  .https.onCall(async (data: httpTypes.NewUserRequestData) => {
    try {
      if (data.inviteLink) {
        // create user via invite link
        // verify user is creating an account with a valid invite link
        const inviteSnapshot = await admin.firestore().collectionGroup("inviteLinks").where("id", "==", data.inviteLink).get();
        if (inviteSnapshot.empty) {
          throw new functions.https.HttpsError("invalid-argument", "Invite link was not found.");
        }
        const inviteLinkDoc = inviteSnapshot.docs[0];
        if (!inviteLinkDoc.ref.parent.parent) {
          throw new functions.https.HttpsError("cancelled", "Invite document was not found.");
        }
        const inviteDoc = await admin.firestore().doc(inviteLinkDoc.ref.parent.parent.path).get();
        const inviteData = inviteDoc.data() as docTypes.Invite;
        // if invite was emailed, check that email is associated with invite
        if (inviteData.type === "email" && inviteData.email !== data.email) {
          throw new functions.https.HttpsError("cancelled", "The email you have entered is not associated with this invite. Please check the email address you have entered and try again.");
        }
      } else if (data.spaceId && data.orgId) {
        // create user for public space access
        // verify space exists and is public
        const spaceSnapshot = await getSpaceRef(data.orgId, data.spaceId).get().catch(()=> {
          return undefined;
        });
        if (!spaceSnapshot) {
          throw new functions.https.HttpsError("invalid-argument", "Public space was not found.");
        }
        const spaceDoc = spaceSnapshot.data();
        if (!spaceDoc?.isPublic) {
          throw new functions.https.HttpsError("cancelled", "This space is currently closed to the public. If you have access, please sign in to an existing account.");
        }
      }
      // create auth if user does not exist
      let uid : string;
      let isNewUser = false;
      const existingUser = await admin.auth().getUserByEmail(data.email).catch(()=> {
        return undefined;
      });
      if (existingUser) {
        uid = existingUser.uid;
        console.log(`auth already exits, uid: ${uid}`);
      } else {
        const newUser = await admin.auth().createUser({
          email: data.email,
        }).catch((err)=> {
          throw new functions.https.HttpsError("invalid-argument", err);
        });
        uid = newUser?.uid;
        isNewUser = true;
        console.log(`created new auth, uid: ${uid}`);
        await getUserRef(uid).set({
          email: data.email,
          created: admin.firestore.Timestamp.now(),
          pending: true,
        } as docTypes.RootUser);
      }
      // generate sign in token
      const token = await admin.auth().createCustomToken(uid).catch(()=> {
        return undefined;
      });
      return {result: {uid, token, isNewUser}};
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

// onCreate() of user doc
// Add default avatar data
const createUserAddAvatar =
  functions
    .runWith(customRunWith)
    .firestore
    .document(userWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data:");
      console.debug(JSON.stringify(snapshot.data()));

      const userId : string = context.params.userId;
      const userRef = getUserRef(userId);

      console.info("Updating user avatar data: ", userId);
      return await userRef.update({
        bodyShape: "4",
        bodyHeight: "0.5",
        ["clothingTop.ueId"]: "M_Buttondown",
        ["clothingBottom.ueId"]: "M_Slacks",
        ["clothingShoes.ueId"]: "M_Oxfords",
      });
    });

// onUpdate() of User
// Update avatar clothing if user changes
// bodyShape male <> female
const updateUserAvatarClothing =
  functions
    .runWith(customRunWith)
    .firestore
    .document(userWildcardPath())
    .onUpdate(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document before:");
      console.log(JSON.stringify(change.before.data()));
      console.log("Document after:");
      console.log(JSON.stringify(change.after.data()));

      const userId : string = context.params.userId;
      const userRef = getUserRef(userId);
      const bodyShapeBefore = Number(change.before.data().bodyShape) as number;
      const bodyShapeAfter = Number(change.after.data().bodyShape) as number;

      if (bodyShapeBefore == bodyShapeAfter) {
        console.debug("Body shape is not defined or did not change, return");
        return;
      }

      // User updated avatar from female to male
      if (bodyShapeBefore <= 2 && bodyShapeAfter > 2) {
        return await userRef.update({
          ["clothingTop.ueId"]: "M_Buttondown",
          ["clothingBottom.ueId"]: "M_Slacks",
          ["clothingShoes.ueId"]: "M_Oxfords",
        });
      } else if (bodyShapeBefore > 2 && bodyShapeAfter <= 2) {
        return await userRef.update({
          ["clothingTop.ueId"]: "F_Buttondown",
          ["clothingBottom.ueId"]: "F_Slacks",
          ["clothingShoes.ueId"]: "F_Oxfords",
        });
      } else {
        return;
      }
    });

// onUpdate() of User
// Update all denormalized participants, organizations, and spaces referencing that user
const updateUserDenormalizeParticipants =
  functions
    .runWith(customRunWith)
    .firestore
    .document(userWildcardPath())
    .onUpdate(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document before:");
      console.log(JSON.stringify(change.before.data()));
      console.log("Document after:");
      console.log(JSON.stringify(change.after.data()));

      const userId : string = context.params.userId;
      const userBefore = change.before.data() as docTypes.RootUser;
      const userAfter = change.after.data() as docTypes.RootUser;

      if (userAfter.name == userBefore.name && userAfter.email == userBefore.email && userAfter.pending == userBefore.pending && userAfter.avatarReadyPlayerMeImg == userBefore.avatarReadyPlayerMeImg) {
        console.debug("No user fields changed that need to be denormalized");
        return;
      }

      const participantsDenormalizedDocs = await admin.firestore().collectionGroup("participantsDenormalized").where("userId", "==", userId).get();
      const commsParticipantsDocs = await admin.firestore().collectionGroup("commsParticipants").where("userId", "==", userId).get();
      const organizationUserDenormalizedDocs = await admin.firestore().collectionGroup("organizationUsers").where("email", "==", userBefore.email).get();
      const spaceUserDenormalizedDocs = await admin.firestore().collectionGroup("spaceUsers").where("email", "==", userBefore.email).get();

      return await Promise.all([
        participantsDenormalizedDocs.docs.map(async (participantsDenormalizedDoc) => {
          console.debug(`Updating participantDenormalized ${participantsDenormalizedDoc.ref.path}`);
          return await participantsDenormalizedDoc.ref.update({
            updated: userAfter.updated,
            userEmail: userAfter.email,
            userName: userAfter.name,
            avatarReadyPlayerMeImg: userAfter.avatarReadyPlayerMeImg,
          });
        }),
        commsParticipantsDocs.docs.map(async (commsParticipantDoc) => {
          console.debug(`Updating commsParticipant ${commsParticipantDoc.ref.path}`);
          return await commsParticipantDoc.ref.update({
            userName: userAfter.name,
            avatarReadyPlayerMeImg: userAfter.avatarReadyPlayerMeImg,
          });
        }),
        organizationUserDenormalizedDocs.docs.map(async (organizationUserDenormalizedDoc) => {
          console.debug(`Updating organization users ${organizationUserDenormalizedDoc.ref.path}`);
          return await organizationUserDenormalizedDoc.ref.update({
            updated: userAfter.updated,
            email: userAfter.email,
            name: userAfter.name,
            avatarReadyPlayerMeImg: userAfter.avatarReadyPlayerMeImg,
          });
        }),
        spaceUserDenormalizedDocs.docs.map(async (spaceUserDenormalizedDoc) => {
          console.debug(`Updating organization users ${spaceUserDenormalizedDoc.ref.path}`);
          return await spaceUserDenormalizedDoc.ref.update({
            updated: userAfter.updated,
            email: userAfter.email,
            name: userAfter.name,
            avatarReadyPlayerMeImg: userAfter.avatarReadyPlayerMeImg,
            pending: userAfter.pending,
          });
        }),
      ]);
    });

// onUpdate() of user's organization role
// Update users role in users organization array
const updateUsersOrganizationRole =
  functions
    .runWith(customRunWithWarm)
    .firestore
    .document(organizationUserWildcardPath())
    .onUpdate(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document before:");
      console.log(JSON.stringify(change.before.data()));
      console.log("Document after:");
      console.log(JSON.stringify(change.after.data()));

      const organizationId : string = context.params.organizationId;
      const userId : string = context.params.userId;
      const userBefore = change.before.data() as docTypes.OrganizationUser;
      const userAfter = change.after.data() as docTypes.OrganizationUser;

      if (userAfter.role == userBefore.role) {
        console.debug("No user fields changed that need to be denormalized");
      }

      const userRef = getUserRef(userId);
      const [, user] = await getUser(userId);
      if (!user?.userOrganizations) {
        return;
      }

      // Adding space id and role to users organization array
      console.info("Updating user's organization array: ", organizationId);
      return await userRef.update({userOrganizations: user.userOrganizations.map((org) => (org.id === organizationId ? {...org, role: userAfter.role} : org))});
    });

// onUpdate() of user's space role
// Update users role in users spaces array
const updateUsersSpaceRole =
  functions
    .runWith(customRunWith)
    .firestore
    .document(spaceUserWildcardPath())
    .onUpdate(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document before:");
      console.log(JSON.stringify(change.before.data()));
      console.log("Document after:");
      console.log(JSON.stringify(change.after.data()));

      const spaceId : string = context.params.spaceId;
      const userId : string = context.params.userId;
      const userBefore = change.before.data() as docTypes.SpaceUser;
      const userAfter = change.after.data() as docTypes.SpaceUser;

      if (userAfter.role == userBefore.role) {
        console.debug("No user fields changed that need to be denormalized");
      }

      const userRef = getUserRef(userId);
      const [, user] = await getUser(userId);
      if (!user?.userSpaces) {
        return;
      }

      // Adding space id and role to users space array
      console.info("Updating user's space array: ", spaceId);
      return await userRef.update({userSpaces: user.userSpaces.map((space) => (space.id === spaceId ? {...space, role: userAfter.role} : space))});
    });

// onCreate() of organization user doc
// Update users organization array and fill user doc
const createOrgUser =
  functions
    .runWith(customRunWith)
    .firestore
    .document(organizationUserWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data:");
      console.debug(JSON.stringify(snapshot.data()));

      const organizationId : string = context.params.organizationId;
      const userId : string = context.params.userId;

      const [userDoc, userData] = await getUser(userId);
      if (userData == undefined || userDoc == undefined || !userDoc.exists) {
        return;
      }
      const userName = userData.name || "";
      const avatarImg = userData.avatarReadyPlayerMeImg || "";

      const [organizationMemberDoc, organizationMember] = await getOrganizationUser(organizationId, userId);
      if (organizationMember == undefined || organizationMemberDoc == undefined || !organizationMemberDoc.exists) {
        return;
      }

      // Adding organization to user's organization array
      console.info("Updating user's organization array: ", organizationId);
      return Promise.all([
        userDoc.ref.update({userOrganizations: admin.firestore.FieldValue.arrayUnion({id: organizationId, role: organizationMember.role} as docTypes.UserOrganization)}),
        userDoc.ref.update({followingOrganizationIds: admin.firestore.FieldValue.arrayUnion(organizationId)}),
          organizationMemberDoc?.ref.update({name: userName, avatarReadyPlayerMeImg: avatarImg}),
      ]);
    });

// onCreate() of space user doc
// Update users space array and fill user doc
const createSpaceUser =
  functions
    .runWith(customRunWith)
    .firestore
    .document(spaceUserWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data:");
      console.debug(JSON.stringify(snapshot.data()));

      const organizationId : string = context.params.organizationId;
      const spaceId : string = context.params.spaceId;
      const userId : string = context.params.userId;

      const spaceUserRef = getSpaceUserRef(organizationId, spaceId, userId);
      const [, spaceUser] = await getSpaceUser(organizationId, spaceId, userId);
      if (!spaceUser) {
        return;
      }
      const [userDoc, userData] = await getUser(userId);
      if (userData == undefined || userDoc == undefined || !userDoc.exists) {
        return;
      }
      const userName = userData.name || "";
      const avatarImg = userData.avatarReadyPlayerMeImg || "";
      const pending = userData?.pending || false;

      // Adding organization to user's organization array and pending data
      console.info("Updating user's spaces data: ", spaceId);
      return Promise.all([
        spaceUserRef.update({pending, name: userName, avatarReadyPlayerMeImg: avatarImg}),
        userDoc.ref.update({userSpaces: admin.firestore.FieldValue.arrayUnion({id: spaceId, role: spaceUser.role} as docTypes.UserSpace)}),
        userDoc.ref.update({followingOrganizationIds: admin.firestore.FieldValue.arrayUnion(organizationId)}),
      ]);
    });

// onUpdate() of Rtdb device
// Update matching firestore device doc
const createRtdbUserDeviceStatus =
  functions
    .runWith(customRunWith)
    .database.ref("/users/{userId}/devices/{deviceId}")
    .onCreate(async (snapshot, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document:");
      console.log(JSON.stringify(snapshot.val()));

      const userId : string = context.params.userId;
      const deviceId : string = context.params.deviceId;

      const firestoreDeviceRef = getDeviceRef(userId, deviceId);
      // TODO: Remove verbosely informative helper comments which came from the reference presence sample
      // Then use other event data to create a reference to the corresponding Firestore document.

      const rtdbDevice = snapshot.val() as docTypes.RtdbDevice;
      // It is likely that the Realtime Database change that triggered
      // this event has already been overwritten by a fast change in
      // online / offline status, so we'll re-read the current data
      // and compare the timestamps.
      const latestRtdbDevice = (await snapshot.ref.once("value")).val() as docTypes.RtdbDevice;
      console.debug("Latest RTDB Device: ", latestRtdbDevice);
      // If the current timestamp for this data is newer than
      // the data that triggered this event, we exit this function.
      if (latestRtdbDevice.lastChanged > rtdbDevice.lastChanged) {
        return console.info("RtdbDevice has been updated since this was triggered, not updating firestore");
      }

      // Otherwise, we convert the lastChanged field to a Date
      const firestoreDevice = {
        lastChanged: admin.firestore.Timestamp.fromMillis(latestRtdbDevice.lastChanged),
        state: latestRtdbDevice.state,
      } as docTypes.Device;

      // ... and write it to Firestore.
      console.info("Updating Device in firestore to: ", firestoreDevice);
      return await firestoreDeviceRef.set(firestoreDevice);
    });

// onUpdate() of Rtdb device
// Update matching firestore device doc
const updateRtdbUserDeviceStatus =
  functions
    .runWith(customRunWith)
    .database.ref("/users/{userId}/devices/{deviceId}")
    .onUpdate(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document before:");
      console.log(JSON.stringify(change.before.val()));
      console.log("Document after:");
      console.log(JSON.stringify(change.after.val()));

      const userId : string = context.params.userId;
      const deviceId : string = context.params.deviceId;

      const firestoreDeviceRef = getDeviceRef(userId, deviceId);
      // TODO: Remove verbosely informative helper comments which came from the reference presence sample
      // Then use other event data to create a reference to the corresponding Firestore document.

      const rtdbDevice = change.after.val() as docTypes.RtdbDevice;
      // It is likely that the Realtime Database change that triggered
      // this event has already been overwritten by a fast change in
      // online / offline status, so we'll re-read the current data
      // and compare the timestamps.
      const latestRtdbDevice = (await change.after.ref.once("value")).val() as docTypes.RtdbDevice;
      console.debug("Latest RTDB Device: ", latestRtdbDevice);
      // If the current timestamp for this data is newer than
      // the data that triggered this event, we exit this function.
      if (latestRtdbDevice.lastChanged > rtdbDevice.lastChanged) {
        return console.info("RtdbDevice has been updated since this was triggered, not updating firestore");
      }

      // Otherwise, we convert the lastChanged field to a Date
      const firestoreDevice = {
        lastChanged: admin.firestore.Timestamp.fromMillis(latestRtdbDevice.lastChanged),
        state: latestRtdbDevice.state,
      } as docTypes.Device;

      // ... and write it to Firestore.
      console.info("Updating Device in firestore to: ", firestoreDevice);
      return await firestoreDeviceRef.set(firestoreDevice);
    });

// onDelete() of Rtdb device
// Dlete matching firestore device doc
const deleteRtdbUserDeviceStatus =
  functions
    .runWith(customRunWith)
    .database.ref("/users/{userId}/devices/{deviceId}")
    .onDelete(async (_, context) => {
      const userId : string = context.params.userId;
      const deviceId : string = context.params.deviceId;
      const deviceDocRef = getDeviceRef(userId, deviceId);
      console.debug("Device RTDB doc deleted, deleting firestore doc: ", deviceDocRef.path);
      return await deviceDocRef.delete();
    });

// onDelete() of firestore device
// Delete matching database device
const deleteUserDeviceStatus =
  functions
    .runWith(customRunWith)
    .firestore
    .document(deviceWildcardPath())
    .onDelete(async (_, context) => {
      const userId : string = context.params.userId;
      const deviceId : string = context.params.deviceId;
      const rtdbDeviceRef = admin.database().ref(`/users/${userId}/devices/${deviceId}`);
      return await rtdbDeviceRef.remove();
    });

// onUpdate() of firestore device
// If state is 'offline', wait 30 seconds then refresh doc
// If state doc is unchanged (i.e. state is still 'offline' and it hasn't been updated), delete the doc
const updateUserDeviceStatus =
  functions
    .runWith(customRunWith)
    .firestore.document(deviceWildcardPath())
    .onUpdate(async (change, context) => {
      const userId : string = context.params.userId;
      const deviceId : string = context.params.deviceId;
      const deviceAfter = change.after.data() as docTypes.Device;
      if (deviceAfter.state == undefined) {
        return console.error("'state' field is undefined");
      } else if (deviceAfter.lastChanged == undefined) {
        return console.error("'lastChanged' field is undefined");
      } else if (deviceAfter.state == "offline") {
        const sleepTimeSeconds = delaySecondsBeforeDeleteDeviceId();
        const sleepTimeMs = sleepTimeSeconds * 1000;
        console.log(`Waiting ${sleepTimeSeconds} seconds before checking status again...`);
        await sleep(sleepTimeMs);

        console.log("Checking status again...");
        const [latestDeviceDoc, latestDevice] = await getDevice(userId, deviceId);
        if (latestDeviceDoc == undefined || latestDevice == undefined) {
          return console.error("Device undefined");
        }

        if (latestDevice.state == undefined) {
          throw Error("`latestUserStatusData.state` is undefined");
        } else if (latestDevice.state != "offline") {
          console.log("Device now online, skipping deletion");
          return;
        } else if (latestDevice.lastChanged.seconds > deviceAfter.lastChanged.seconds) {
          console.log("Device more recently updated, skipping deletion");
          return;
        } else {
          console.log("Deleting device status doc");
          return await latestDeviceDoc.ref.delete();
        }
      } else {
        return;
      }
    });

// onDelete() of space user doc
// Update users space array and existing invite
const deleteSpaceUser =
  functions
    .runWith(customRunWith)
    .firestore
    .document(spaceUserWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data:");
      console.debug(JSON.stringify(snapshot.data()));

      const organizationId : string = context.params.organizationId;
      const spaceId : string = context.params.spaceId;
      const userId : string = context.params.userId;

      const userRef = getUserRef(userId);
      const [, user] = await getUser(userId);

      if (!user?.userSpaces) {
        return;
      }

      // delete any existing space invite
      const userInvite = await getOrganizationSpaceInvitesRef(organizationId, spaceId).where("email", "==", user.email).get();
      if (!userInvite.empty) {
        await userInvite.docs[0].ref.delete();
      }

      // Delete space from user's space array
      console.info("Updating user's space array: ", spaceId);
      return await userRef.update({userSpaces: admin.firestore.FieldValue.arrayRemove(user.userSpaces.find((space) => space.id === spaceId))});
    });

// onDelete() of firestore device
// Delete all participants created by the device
const deleteDevice =
  functions
    .runWith(customRunWith)
    .firestore.document(deviceWildcardPath())
    .onDelete(async (_, context) => {
      const userId : string = context.params.userId;
      const deviceId : string = context.params.deviceId;
      console.debug(`Querying all participants with userId: ${userId}, deviceId: ${deviceId}`);
      const participants = await admin.firestore()
        .collectionGroup("participants")
        .where("userId", "==", userId)
        .where("deviceId", "==", deviceId)
        .get();
      console.debug(`Got ${participants.docs.length} participants with userId: ${userId}, deviceId: ${deviceId}`);

      const participantsToDelete = (await Promise.all(participants.docs.flatMap(async (doc) => {
        const organizationId = doc.ref.parent.parent?.parent?.parent?.id;
        const roomId = doc.ref.parent.parent?.id;
        if (organizationId == undefined || roomId == undefined) return [];
        const participantId = doc.id;
        const fifteenSecondsAgo = admin.firestore.Timestamp.now().seconds - 15;
        try {
          const participantBrowserStateUpdateWebRtc = await getParticipantBrowserStateUpdateWebRtc(organizationId, roomId, participantId);
          const [webRtcStateDoc] = participantBrowserStateUpdateWebRtc;
          const webRtcOnline = checkWebRtcStateOnline(participantBrowserStateUpdateWebRtc, fifteenSecondsAgo);
          if (!webRtcOnline) {
            console.debug("WebRtc offline: ", webRtcStateDoc?.ref.path);
            return [doc];
          } else {
            return [];
          }
        } catch (e: any) {
          console.error("Failed to check if participant webrtc state online, assuming online: ", participantId);
          return [];
        }
      }))).flat();
      console.debug(`Got ${participantsToDelete.length} participants with offline webrtc for userId: ${userId}, deviceId: ${deviceId}`);
      return await Promise.all(participantsToDelete.map(async (doc) => {
        console.log(`Deleting participant: ${doc.ref.path}`);
        await doc.ref.delete();
      }));
    });

// onDelete() of a user
// Remove user from all spaces and org invites, and remove organization from org array
const deleteOrganizationUser =
  functions
    .runWith(customRunWith)
    .firestore
    .document(organizationUserWildcardPath())
    .onDelete(async (_, context) => {
      const organizationId : string = context.params.organizationId;
      const userId : string = context.params.userId;

      const userRef = getUserRef(userId);
      const [, user] = await getUser(userId);
      if (!user?.userOrganizations) {
        console.log("Error pulling user data");
        return;
      }

      const spaceDocs = await getSpaces(organizationId);
      if (spaceDocs == undefined) {
        console.log("Error pulling organization spaces");
        return;
      }

      // delete existing organization invite
      const userInvite = await getOrganizationInvitesRef(organizationId).where("email", "==", user.email).get();
      if (!userInvite.empty) {
        await userInvite.docs[0].ref.delete();
      }

      // Delete organization from user's organization array
      return await Promise.all([
        userRef.update({userOrganizations: admin.firestore.FieldValue.arrayRemove(user.userOrganizations.find((org) => org.id === organizationId))}),
        spaceDocs.map(async (doc) => {
          const space = doc[0];
          if (space == undefined) {
            return;
          }
          const spaceId = space.id;
          const spaceMember = getSpaceUserRef(organizationId, spaceId, userId);
          if (spaceMember == undefined) {
            return;
          }
          await spaceMember.delete();
        }),
      ]);
    });

// onDelete() of a user
// Delete all the user's subcollection documents
const deletedUserDeleteSubcollections =
  functions
    .runWith(customRunWith)
    .firestore
    .document(organizationUserWildcardPath())
    .onDelete(async (_, context) => {
      const organizationId : string = context.params.organizationId;
      const userId : string = context.params.userId;
      const subcollections = await getOrganizationUserRef(organizationId, userId).listCollections();

      // TODO: Implement an actual recursive function to ensure n-depth subcollection docs are deleted
      return subcollections.flatMap(async (subcollection) => {
        return (await subcollection.listDocuments()).map((doc) => doc.delete());
      });
    });

const getUserWritableOrganizations =
  functions
    .runWith(customRunWithWarm)
    .https.onCall(async (_, context) => {
      console.debug("Retrieving organizations with write access...");
      const userId = context.auth?.uid;
      if (userId == undefined) {
        throw new functions.https.HttpsError("permission-denied", "User not logged in");
      }
      if (userId == undefined) {
        console.error("currentUser.uid is not set");
        return {organizationIdsAndNames: []};
      }
      try {
        const [, user] = await getUser(userId);
        if (user == undefined || user.userOrganizations == undefined) {
          console.debug("Failed to retrieve root user doc or userOrganizations field is empty");
          return {organizationIdsAndNames: []};
        }
        const organizationIds = user.userOrganizations.flatMap((org) => {
          if (org.role == "org_owner" || org.role == "org_editor" || org.role == "org_admin") {
            return [org.id];
          }
          return [];
        });
        const organizationIdsWithFeatureOverridesFilter = (await Promise.all(organizationIds.flatMap(async (orgId) => {
          const [, billingPublic] = await getBillingPublic(orgId);
          if (billingPublic === undefined) return [];
          const billingFeatures = billingPublic.features;
          if (!billingPublic.disableBilling && !billingFeatures?.bridge) return [];
          return [orgId];
        }))).flat();

        const organizationIdsAndNames = (await Promise.all(chunkList(organizationIdsWithFeatureOverridesFilter, 10).map(async (orgIds) => {
          return (await admin.firestore().collection("organizations").where(admin.firestore.FieldPath.documentId(), "in", orgIds).get())
            .docs.flatMap((doc) => {
              const organization = doc.data() as docTypes.Organization | undefined;
              if (organization == undefined) return [];
              return [{id: doc.id, name: organization.name}];
            });
        }))).flat();

        return {organizationIdsAndNames};
      } catch (e:any) {
        console.error("Failed for unknown reason ", e);
        return {organizationIdsAndNames: []};
      }
    });

export const reads = {
  getUserWritableOrganizations,
};
export const creates = {
  addVisitor,
  createOrgUser,
  createRtdbUserDeviceStatus,
  createSpaceUser,
  createUser,
  createUserAddAvatar,
  sendSignInLink,
  uploadUserAvatar,
  idTokenForCustomToken,
  anonymousAuthSignin,
};
export const updates = {
  updateRtdbUserDeviceStatus,
  updateUserAvatarClothing,
  updateUserDenormalizeParticipants,
  updateUserDeviceStatus,
  updateUsersOrganizationRole,
  updateUsersSpaceRole,
};
export const deletes = {
  deleteDevice,
  deleteOrganizationUser,
  deleteRtdbUserDeviceStatus,
  deleteSpaceUser,
  deleteUserDeviceStatus,
  deletedUserDeleteSubcollections,
};
