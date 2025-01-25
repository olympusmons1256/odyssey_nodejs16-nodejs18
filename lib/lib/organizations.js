"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCanViewSpace = exports.updateOrganizationBillingUsage = exports.getOrganizationPermission = exports.getUserOrgRole = void 0;
const firestore_1 = require("./documents/firestore");
const misc_1 = require("./misc");
const firebase_1 = require("./firebase");
async function getUserOrgRole(organizationId, userId) {
    var _a;
    const [, user] = await (0, firestore_1.getUser)(userId);
    if (user == undefined || user.userOrganizations == undefined)
        return undefined;
    return (_a = user.userOrganizations.filter((uO) => uO.id == organizationId).pop()) === null || _a === void 0 ? void 0 : _a.role;
}
exports.getUserOrgRole = getUserOrgRole;
// return boolean based on passed organization role/action
async function getOrganizationPermission(query) {
    const [, permissions] = await (0, firestore_1.getPermissions)(query.userRole);
    if (permissions == undefined) {
        console.error("Permissions for user role not found");
        return false;
    }
    const organizationActions = permissions.organization;
    if (organizationActions && organizationActions.length > 0) {
        return organizationActions === null || organizationActions === void 0 ? void 0 : organizationActions.includes(query.action);
    }
    return false;
}
exports.getOrganizationPermission = getOrganizationPermission;
async function updateOrganizationBillingUsage(organizationId) {
    var _a;
    const projectId = (0, firebase_1.getFirebaseProjectId)();
    const isProd = (0, misc_1.isProductionFirebaseProject)(projectId);
    const publishedSpacesUsed = (await (0, firestore_1.getSpacesRef)(organizationId).where("isPublic", "==", true).get()).size;
    const organizationMemberCount = ((_a = (await (0, firestore_1.getOrganizationUsers)(organizationId))) === null || _a === void 0 ? void 0 : _a.flatMap(([, organizationUser]) => {
        if (organizationUser == undefined || organizationUser.email == undefined)
            return [];
        return (isProd && (0, misc_1.isOdysseyStaffEmail)(organizationUser.email)) ? [] : [organizationUser];
    }).length) || 0;
    const workspaceSeatsUsed = organizationMemberCount;
    return await (0, firestore_1.getBillingUsageRef)(organizationId).set({ workspaceSeatsUsed, publishedSpacesUsed }, { merge: true });
}
exports.updateOrganizationBillingUsage = updateOrganizationBillingUsage;
async function userCanViewSpace(organizationId, spaceId, userId) {
    var _a;
    const isBillingActive = ((_a = (await (0, firestore_1.getBillingPublic)(organizationId))[1]) === null || _a === void 0 ? void 0 : _a.aggregateBillingState) === "active";
    if (!isBillingActive)
        return { result: false, reason: "organization-billing-inactive" };
    const userOrgRole = await getUserOrgRole(organizationId, userId);
    const spaceRole = (await (0, firestore_1.getSpaceUser)(organizationId, spaceId, userId))[1];
    const space = (await (0, firestore_1.getSpace)(organizationId, spaceId))[1];
    if (space == undefined)
        return { result: false, reason: "space-not-found" };
    if (spaceRole == undefined && userOrgRole == undefined && space.isPublic !== true) {
        return { result: false, reason: "permission-denied" };
    }
    return { result: true };
}
exports.userCanViewSpace = userCanViewSpace;
//# sourceMappingURL=organizations.js.map