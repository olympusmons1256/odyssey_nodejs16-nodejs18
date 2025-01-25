import * as functions from "firebase-functions";
import {customRunWith} from "./shared";
import * as admin from "firebase-admin";
import {getOrganizationsRef, getRoomRef, getOrganizationUsersRef} from "./lib/documents/firestore";
import {Organization, User} from "./lib/docTypes";

interface CreateNewOrganizationPayload {
  name: string
}

interface SetRoomLevelIdPayload {
  organizationId: string
  roomId: string
  levelId: string
}

type AdminUser = [string, User]

async function createAdmins(organizationId: string) {
  const ngpAdminEmails = [
    "bram@newgameplus.live",
    "max@newgameplus.live",
    "reid@newgameplus.live",
    "chris@newgameplus.live",
    "briana@newgameplus.live",
    "zac@newgameplus.live",
    "adrian@newgameplus.live",
  ];

  const usersRef = getOrganizationUsersRef(organizationId);
  const admins = (await Promise.all(ngpAdminEmails.map(async (email) => {
    try {
      const authUser = await admin.auth().getUserByEmail(email);
      return [[authUser.uid, {
        email,
        role: "admin",
        created: admin.firestore.Timestamp.now(),
        updated: admin.firestore.Timestamp.now(),
      } as User,
      ] as AdminUser];
    } catch (e: any) {
      return [];
    }
  }))).flat();
  await Promise.all(admins.map(async ([uid, user]) => {
    // console.debug(`Adding admin user to organization ${organizationId}: ${user.email}`);
    await usersRef.doc(uid).set(user);
  }));
}

async function createOrganizationAndAdmins(name: string) {
  const organization: Organization = {
    name,
  };
  const organizationRef = await getOrganizationsRef().add(organization);
  console.debug(`Created organization ${organizationRef.id}: ${name}"`);
  await createAdmins(organizationRef.id);
  console.debug(`Created admin users in organization ${organizationRef.id}: ${name}`);
}

// onPublish to createNewOrganization topic
// Create the new organization along with NG+ admin users
export const createNewOrganization =
  functions
    .runWith(customRunWith)
    .pubsub.topic("createNewOrganization")
    .onPublish(async (data, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(data));

      const payload = data.json as CreateNewOrganizationPayload;
      if (payload.name == null || payload.name == undefined) {
        throw new Error("organization name not specified or invalid");
      }

      return await createOrganizationAndAdmins(payload.name);
    });


// onPublish to setRoomLevelId topic
// Set the levelId of the room to the given value
export const setRoomLevelId =
  functions
    .runWith(customRunWith)
    .pubsub.topic("setRoomLevelId")
    .onPublish(async (data, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(data));

      const payload = data.json as SetRoomLevelIdPayload;
      if (payload.organizationId == null || payload.organizationId == undefined) {
        throw new Error("organizationId not specified or invalid");
      }
      if (payload.roomId == null || payload.roomId == undefined) {
        throw new Error("roomId not specified or invalid");
      }
      if (payload.levelId == null || payload.levelId == undefined) {
        throw new Error("levelId not specified or invalid");
      }

      return await getRoomRef(payload.organizationId, payload.roomId).update({levelId: payload.levelId});
    });

