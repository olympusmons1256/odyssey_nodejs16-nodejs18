import {Organization} from "../docTypes";
import {getOrganizationRef} from "../documents/firestore";
import {addOrganizationUser} from "../users";
import * as shortUuid from "short-uuid";
import * as admin from "firebase-admin";

export async function createNewOrganizationWithOwner(name: string, ownerId: string) {
  try {
    // define organization data
    const organizationId = shortUuid().new();
    const organizationDomain = organizationId;
    const organization: Organization = {
      created: admin.firestore.Timestamp.now(),
      updated: admin.firestore.Timestamp.now(),
      name,
      domain: organizationDomain,
    };
    // create organization and assign organization owner
    await getOrganizationRef(organizationId).set(organization);
    await addOrganizationUser(organizationId, ownerId, "org_owner");
    return organizationId;
  } catch (e: any) {
    console.error("Failed to create new organization");
    console.error({name, ownerId});
    console.error(e);
    return undefined;
  }
}
