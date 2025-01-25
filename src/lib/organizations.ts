import {getBillingUsageRef, getOrganizationUsers, getSpacesRef, getUser, getPermissions, getBillingPublic, getSpaceUser, getSpace} from "./documents/firestore";
import {isProductionFirebaseProject, isOdysseyStaffEmail} from "./misc";
import {getFirebaseProjectId} from "./firebase";
import {OrganizationActions, UserRoles} from "../lib/docTypes";

export async function getUserOrgRole(organizationId: string, userId: string) {
  const [, user] = await getUser(userId);
  if (user == undefined || user.userOrganizations == undefined) return undefined;
  return user.userOrganizations.filter((uO) => uO.id == organizationId).pop()?.role;
}

// return boolean based on passed organization role/action
export async function getOrganizationPermission(query: {action: OrganizationActions, userRole: UserRoles}) {
  const [, permissions] = await getPermissions(query.userRole);
  if (permissions == undefined) {
    console.error("Permissions for user role not found");
    return false;
  }
  const organizationActions = permissions.organization;
  if (organizationActions && organizationActions.length > 0) {
    return organizationActions?.includes(query.action);
  }
  return false;
}

export async function updateOrganizationBillingUsage(organizationId: string) {
  const projectId = getFirebaseProjectId();
  const isProd = isProductionFirebaseProject(projectId);
  const publishedSpacesUsed = (await getSpacesRef(organizationId).where("isPublic", "==", true).get()).size;
  const organizationMemberCount = (await getOrganizationUsers(organizationId))?.flatMap(([, organizationUser]) => {
    if (organizationUser == undefined || organizationUser.email == undefined) return [];
    return (isProd && isOdysseyStaffEmail(organizationUser.email)) ? [] : [organizationUser];
  }).length || 0;
  const workspaceSeatsUsed = organizationMemberCount;
  return await getBillingUsageRef(organizationId).set({workspaceSeatsUsed, publishedSpacesUsed}, {merge: true});
}

interface UserCanViewSpaceResult {
  result: boolean
  reason?: "organization-billing-inactive" | "space-not-found" | "permission-denied"
}

export async function userCanViewSpace(organizationId: string, spaceId: string, userId: string) : Promise<UserCanViewSpaceResult> {
  const isBillingActive = (await getBillingPublic(organizationId))[1]?.aggregateBillingState === "active";
  if (!isBillingActive) return {result: false, reason: "organization-billing-inactive"};
  const userOrgRole = await getUserOrgRole(organizationId, userId);
  const spaceRole = (await getSpaceUser(organizationId, spaceId, userId))[1];
  const space = (await getSpace(organizationId, spaceId))[1];
  if (space == undefined) return {result: false, reason: "space-not-found"};
  if (spaceRole == undefined && userOrgRole == undefined && space.isPublic !== true) {
    return {result: false, reason: "permission-denied"};
  }
  return {result: true};
}
