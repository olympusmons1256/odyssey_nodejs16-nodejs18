import {Organization, User} from "../lib/docTypes";
import * as admin from "firebase-admin";
import {getOrganizationsRef, getOrganizationUsersRef} from "../lib/documents/firestore";

type AdminUser = [string, User]

export async function createAdmins(organizationId: string) {
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

export async function createNewOrganization(name: string) {
  const organization: Organization = {
    name,
  };
  const organizationRef = await getOrganizationsRef().add(organization);
  console.debug(`Created organization ${organizationRef.id}: ${name}"`);
  await createAdmins(organizationRef.id);
  console.debug(`Created admin users in organization ${organizationRef.id}: ${name}`);
}

export async function createNewOrganizations() {
  [
    "Dolby",
    "Simplot",
    "HPF",
  ].forEach((name) => createNewOrganization(name));
}

createNewOrganizations();
