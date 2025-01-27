import * as admin from "firebase-admin";
import {OrganizationRoles, OrganizationUser} from "../docTypes";
import {getOrganizationUserRef, getUser} from "../documents/firestore";

export async function addOrganizationUser(organizationId: string, userId: string, role: OrganizationRoles) {
  try {
    const [userDoc, user] = await getUser(userId);
    if (userDoc == undefined || user == undefined) {
      console.error(`User with id '${userId}' does not exist`);
      return undefined;
    }
    const now = admin.firestore.Timestamp.now();
    const organizationUser: OrganizationUser = {
      created: now,
      updated: now,
      email: user.email,
      name: user.name,
      role,
    };
    const organizationUserRef = await getOrganizationUserRef(organizationId, userId).create(organizationUser);
    return organizationUserRef;
  } catch (e: any) {
    console.error("Failed to add organizationUser", {organizationId, userId, role});
    console.error(e);
    return {undefined};
  }
}
