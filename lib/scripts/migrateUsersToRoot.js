"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGuestAuthUsers = exports.findMissingUsers = exports.chunkAddOrganizationUsers = exports.chunkAddRootUsers = exports.constructRootUserRecords = exports.getAllOrganizationUsers = void 0;
const admin = __importStar(require("firebase-admin"));
// import * as csv from "csv-parse";
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const misc_1 = require("../lib/misc");
const firestore_1 = require("../lib/documents/firestore");
function log(level, msg, obj) {
    const message = `${new Date().toISOString()} - ${level}: ${msg}`;
    if (obj == undefined) {
        console.log(message);
    }
    else {
        console.log(message, obj);
    }
}
function loginfo(msg, obj) {
    log("INFO", msg, obj);
}
function logerror(msg, obj) {
    log("ERROR", msg, obj);
}
function logwarn(msg, obj) {
    log("WARN", msg, obj);
}
function chunkList(l, chunkSize) {
    return l.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / chunkSize);
        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = []; // start a new chunk
        }
        resultArray[chunkIndex].push(item);
        return resultArray;
    }, []);
}
async function timeChunkedOperation(items, chunkSize, millis, flatMapFn, arrayFn) {
    async function f(chunk) {
        if (flatMapFn == undefined && arrayFn == undefined) {
            logerror("Neither flatMapFn nor arrayFn given");
            return [];
        }
        else if (flatMapFn != undefined && arrayFn != undefined) {
            logerror("Both flatMapFn and arrayFn given");
            return [];
        }
        else if (flatMapFn != undefined) {
            return (await Promise.all(chunk.flatMap(async (item) => await flatMapFn(item)))).flat();
        }
        else if (arrayFn != undefined) {
            return await arrayFn(chunk);
        }
        else {
            logerror("Unknown error with flatMapFn or arrayFn");
            return [];
        }
    }
    async function chunkPerSecond(chunks, index, result) {
        async function processChunk() {
            if (chunk == undefined) {
                logwarn("Skipping empty or undefined chunk");
                return result;
            }
            else {
                loginfo(`Working on chunk ${index} of length ${chunk.length}`);
                const chunkResult = await f(chunk);
                loginfo("Finished chunk");
                return [...result, ...chunkResult];
            }
        }
        const [chunk, ...remainingChunks] = chunks;
        const results = await processChunk();
        if (remainingChunks.length > 0) {
            loginfo(`Sleeping for ${millis / 1000} seconds`);
            await (0, misc_1.sleep)(millis);
            return await chunkPerSecond(remainingChunks, index + 1, results);
        }
        else {
            return results;
        }
    }
    return await chunkPerSecond(chunkList(items, chunkSize), 0, []);
}
async function getAllAuthUserIds() {
    async function listAllUsers(users, pageToken) {
        loginfo(`Listing auth users. Have ${users.length} userIds`);
        const result = await admin.auth().listUsers(1000, pageToken);
        const foundUsers = result.users.map((u) => {
            return { email: u.email || "", id: u.uid, name: u.displayName };
        });
        if (result.pageToken == undefined) {
            return [...users, ...foundUsers];
        }
        else {
            return await listAllUsers([...users, ...foundUsers], result.pageToken);
        }
    }
    return await listAllUsers([], undefined);
}
async function getAllOldOrganizationUsers() {
    const organizations = await (0, firestore_1.getOrganizations)();
    if (organizations == undefined || organizations.length == 0) {
        logerror("No organizations found");
        return [];
    }
    loginfo(`Got ${organizations.length} organizations`);
    const userRecords = (await Promise.all(organizations.map(async ([organizationDoc]) => {
        if (organizationDoc == undefined) {
            logerror("Organization is undefined");
            return [];
        }
        const organizationUsers = await (0, firestore_1.getOldOrganizationUsers)(organizationDoc.id);
        if (organizationUsers == undefined || organizationUsers.length == 0) {
            logerror("Organization has no users: ", organizationDoc.id);
            return [];
        }
        loginfo(`Got ${organizationUsers.length} user docs in organization ${organizationDoc.id}`);
        const orgUserRecords = organizationUsers.flatMap(([userDoc, user]) => {
            var _a, _b, _c;
            if (userDoc != undefined && user != undefined) {
                const organizationId = (_a = userDoc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
                if (organizationId == undefined) {
                    logwarn("organizationId is undefined: ", userDoc.ref.path);
                    return [];
                }
                const userRecord = {
                    id: userDoc.id,
                    updated: (((_b = userDoc.updateTime) === null || _b === void 0 ? void 0 : _b.toMillis()) == undefined) ? 0 : (_c = userDoc.updateTime) === null || _c === void 0 ? void 0 : _c.toMillis(),
                    oldOrganizationUser: user,
                    organizationId,
                };
                return [userRecord];
            }
            else {
                return [];
            }
        });
        loginfo(`Got ${orgUserRecords.length} user records in organization ${organizationDoc.id}`);
        return orgUserRecords;
    }))).flat();
    return userRecords;
}
async function getAllOrganizationUsers() {
    const organizations = await (0, firestore_1.getOrganizations)();
    if (organizations == undefined || organizations.length == 0) {
        logerror("No organizations found");
        return [];
    }
    loginfo(`Got ${organizations.length} organizations`);
    const userRecords = (await Promise.all(organizations.map(async ([organizationDoc]) => {
        if (organizationDoc == undefined) {
            logerror("Organization is undefined");
            return [];
        }
        const organizationUsers = await (0, firestore_1.getOrganizationUsers)(organizationDoc.id);
        if (organizationUsers == undefined || organizationUsers.length == 0) {
            logerror("Organization has no users: ", organizationDoc.id);
            return [];
        }
        loginfo(`Got ${organizationUsers.length} user docs in organization ${organizationDoc.id}`);
        const orgUserRecords = organizationUsers.flatMap(([userDoc, user]) => {
            var _a, _b, _c;
            if (userDoc != undefined && user != undefined) {
                const organizationId = (_a = userDoc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
                if (organizationId == undefined) {
                    logwarn("organizationId is undefined: ", userDoc.ref.path);
                    return [];
                }
                const userRecord = {
                    id: userDoc.id,
                    updated: (((_b = userDoc.updateTime) === null || _b === void 0 ? void 0 : _b.toMillis()) == undefined) ? 0 : (_c = userDoc.updateTime) === null || _c === void 0 ? void 0 : _c.toMillis(),
                    organizationUser: user,
                    organizationId,
                };
                return [userRecord];
            }
            else {
                return [];
            }
        });
        loginfo(`Got ${orgUserRecords.length} user records in organization ${organizationDoc.id}`);
        return orgUserRecords;
    }))).flat();
    return userRecords;
}
exports.getAllOrganizationUsers = getAllOrganizationUsers;
async function getAllRootUserIds() {
    const userDocs = await (0, firestore_1.getUsers)();
    if (userDocs == undefined) {
        return [];
    }
    return Array.from(new Set(userDocs.flatMap(([userDoc, user]) => {
        if (userDoc != undefined && user != undefined) {
            return [userDoc.id];
        }
        else {
            return [];
        }
    })));
}
function splitGuests(users) {
    return users.reduce((acc, userRecord) => {
        const [users, guests] = acc;
        if (userRecord.oldOrganizationUser == undefined) {
            logwarn("oldOrganizationUser missing: ", userRecord.organizationId + "/" + userRecord.id);
        }
        else if (userRecord.oldOrganizationUser.email.match(new RegExp("guest\\.[a-zA-Z0-9]+\\@(odyssey\\.stream|newgameplus\\.live)")) ||
            (userRecord.oldOrganizationUser.bot != undefined && userRecord.oldOrganizationUser.bot == true)) {
            guests.push(userRecord);
        }
        else {
            users.push(userRecord);
        }
        return [users, guests];
    }, [[], []]);
}
function splitAuthUsers(authUsers) {
    return authUsers.reduce((acc, authUser) => {
        const [users, guests] = acc;
        if (authUser.email.match(new RegExp("guest\\.[a-zA-Z0-9]+\\@(odyssey\\.stream|newgameplus\\.live)")) ||
            authUser.email == "-" ||
            authUser.email == "") {
            guests.push(authUser);
        }
        else {
            users.push(authUser);
        }
        return [users, guests];
    }, [[], []]);
}
function splitAddedOrganizationUsers(users, existingOrganizationUsers) {
    return users.reduce((acc, userRecord) => {
        const [addedUsers, notAddedUsers] = acc;
        if (existingOrganizationUsers.find((eU) => eU.id == userRecord.id) != undefined) {
            addedUsers.push(userRecord);
        }
        else {
            notAddedUsers.push(userRecord);
        }
        return [addedUsers, notAddedUsers];
    }, [[], []]);
}
function splitAddedRootUsers(users, rootUsers) {
    return users.reduce((acc, userRecord) => {
        const [addedUsers, notAddedUsers] = acc;
        if (rootUsers.find((rU) => rU == userRecord.id) != undefined) {
            addedUsers.push(userRecord);
        }
        else {
            notAddedUsers.push(userRecord);
        }
        return [addedUsers, notAddedUsers];
    }, [[], []]);
}
function constructRootUserRecords(userRecords) {
    return userRecords.reduce((acc, userRecord) => {
        const allMatchingRecords = userRecords.flatMap((userR) => (userR.id == userRecord.id) ? [userR] : []);
        const latestRecord = allMatchingRecords.sort((c, p) => {
            if (c.oldOrganizationUser.updated == undefined)
                return -1;
            if (p.oldOrganizationUser.updated == undefined)
                return 1;
            try {
                return c.oldOrganizationUser.updated.toMillis() - p.oldOrganizationUser.updated.toMillis();
            }
            catch (e) {
                return -1;
            }
        })[0];
        if (userRecord.id == "FG7TjIChBdMZmkM7vLwM0mdKaPJ3") {
            console.log({
                userRecord,
                allMatchingRecords,
                latestRecord,
            });
        }
        const organizations = allMatchingRecords.map((userR) => {
            return { id: userR.organizationId, role: userR.oldOrganizationUser.role };
        });
        if (latestRecord == undefined) {
            logerror(`Couldn't find latest record for ${userRecord.organizationId + "/" + userRecord.id}`);
            return acc;
        }
        const rootUser = {
            created: latestRecord.oldOrganizationUser.created,
            email: latestRecord.oldOrganizationUser.email,
            updated: admin.firestore.Timestamp.now(),
            bodyShape: latestRecord.oldOrganizationUser.bodyShape,
            name: latestRecord.oldOrganizationUser.name,
            additionalInfo: latestRecord.oldOrganizationUser.additionalInfo,
            avatarReadyPlayerMeUrl: latestRecord.oldOrganizationUser.avatarReadyPlayerMeUrl,
            // userOrganizations: organizations,
            followingOrganizationIds: organizations.map((o) => o.id),
        };
        const rootUserRecord = {
            id: latestRecord.id,
            organizationId: "",
            updated: rootUser.updated.toMillis(),
            rootUser,
        };
        acc.push(rootUserRecord);
        return acc;
    }, []);
}
exports.constructRootUserRecords = constructRootUserRecords;
async function chunkAddRootUsers(users) {
    async function f(userRecord) {
        try {
            await (0, firestore_1.getUserRef)(userRecord.id).set(userRecord.rootUser);
            return [userRecord];
        }
        catch (e) {
            logerror("Error creating user: ", e);
            return [];
        }
    }
    /*
    async function f(userRecord: UserRecord) {
      loginfo(`Would have set user at path: ${getUserRef(userRecord.id).path}`);
      return [userRecord];
    }
    */
    return timeChunkedOperation(users, 100, 1000, f);
}
exports.chunkAddRootUsers = chunkAddRootUsers;
async function chunkAddOrganizationUsers(users) {
    async function f(userRecord) {
        function getRole() {
            if (userRecord.oldOrganizationUser.role == "admin")
                return "admin";
            else
                return "member";
        }
        try {
            const organizationUser = {
                role: getRole(),
                email: userRecord.oldOrganizationUser.email,
                updated: admin.firestore.Timestamp.now(),
                created: userRecord.oldOrganizationUser.created,
                name: userRecord.oldOrganizationUser.name,
                avatarReadyPlayerMeImg: userRecord.oldOrganizationUser.avatarReadyPlayerMeImg,
            };
            await (0, firestore_1.getOrganizationUserRef)(userRecord.organizationId, userRecord.id).set(organizationUser);
            return [userRecord];
        }
        catch (e) {
            logerror("Error creating user: ", e);
            return [];
        }
    }
    /*
    async function fTest(userRecord: UserRecord) {
      loginfo(`Would have set user at path: ${getOrganizationUserRef(userRecord.organizationId, userRecord.id).path}`);
      return [userRecord];
    }
    */
    return timeChunkedOperation(users, 100, 1000, f);
}
exports.chunkAddOrganizationUsers = chunkAddOrganizationUsers;
async function findMissingUsers(users) {
    async function f(userRecord) {
        return (await (0, firestore_1.getUserRef)(userRecord.id).get()).exists ? [] : [userRecord];
    }
    return timeChunkedOperation(users, 100, 1000, f);
}
exports.findMissingUsers = findMissingUsers;
async function deleteGuestAuthUsers(users) {
    async function f(userRecords) {
        const result = await admin.auth().deleteUsers(userRecords.map((uR) => uR.id));
        return result.errors.map((error) => {
            return {
                code: error.error.code,
                message: error.error.message,
                stack: error.error.stack,
            };
        });
    }
    /*
    async function f(userRecords: UserRecord[]) {
      loginfo(`Deleting ${userRecords.length} users`);
      return [];
    }
    */
    return timeChunkedOperation(users, 1000, 1000, undefined, f);
}
exports.deleteGuestAuthUsers = deleteGuestAuthUsers;
async function addAuthUsers(users) {
    async function f(userRecords) {
        function convertToAuthUserImport(userRecord) {
            return {
                uid: userRecord.id,
                email: userRecord.email,
                emailVerified: true,
                displayName: userRecord.name,
            };
        }
        const usersToAdd = userRecords.map((uR) => convertToAuthUserImport(uR));
        const result = await admin.auth().importUsers(usersToAdd);
        return result.errors.map((error) => {
            return {
                code: error.error.code,
                message: error.error.message,
                stack: error.error.stack,
            };
        });
    }
    return timeChunkedOperation(users, 1000, 1000, undefined, f);
}
async function f() {
    // Copy users
    //
    // Get all root users
    const addedRootUserIds = await getAllRootUserIds();
    loginfo(`Got ${addedRootUserIds.length} existing root users`);
    const organizationUsers = await getAllOrganizationUsers();
    loginfo(`Got ${organizationUsers.length} existing organization users`);
    // Get all organization users
    const oldUserRecords = await getAllOldOrganizationUsers();
    loginfo(`Got ${oldUserRecords.length} old user records in total`);
    // Filter out the guests to their own collection
    const [users, guests] = splitGuests(oldUserRecords);
    loginfo(`Got ${users.length} real user records and ${guests.length} guests`);
    // Filter out users who've already been added to the root collection
    const [rootUsersAlreadyAdded, rootUsersNotAdded] = splitAddedRootUsers(users, addedRootUserIds);
    loginfo(`Got ${rootUsersAlreadyAdded.length} root users that have already been added and ${rootUsersNotAdded.length} that have not`);
    // Filter out users who've already been added to the organization collection
    const [organizationUsersAlreadyAdded, organizationUsersNotAdded] = splitAddedOrganizationUsers(users, organizationUsers);
    loginfo(`Got ${organizationUsersAlreadyAdded.length} organization users that have already been added and ${organizationUsersNotAdded.length} that have not`);
    // Reduce to new users object without duplicates, choosing the user most recently updated
    const usersDedup = constructRootUserRecords(rootUsersNotAdded);
    loginfo(`Got ${users.length} real user records excluding duplicates`);
    // Chunk add users to organizations
    const addedOrganizationUsers = await chunkAddOrganizationUsers(organizationUsersNotAdded);
    loginfo(`Added ${addedOrganizationUsers.length} organization users`);
    // Chunk add root users
    const addedUsers = await chunkAddRootUsers(usersDedup);
    loginfo(`Added ${addedUsers.length} users`);
    //
    //
    // Check copied users
    loginfo("Checking copied users");
    if (usersDedup.length != addedUsers.length) {
        const countMissingUsers = usersDedup.length - addedUsers.length;
        logwarn(`Failed to add ${countMissingUsers} users`);
        const missingUsers = await findMissingUsers(usersDedup);
        if (missingUsers.length > 0) {
            const addedMissingUsers = await chunkAddRootUsers(missingUsers);
            loginfo(`Added ${addedMissingUsers.length} missing users`);
            if (addedMissingUsers.length != countMissingUsers) {
                logerror(`There are still ${countMissingUsers - addedMissingUsers.length} missing users. Giving up`);
            }
        }
        else
            logerror("Couldn't find missing users. Giving up.");
        // Any that do not exist, repeat 2-4
    }
    else {
        loginfo("All users added");
    }
    /*
    // Delete guests
    const deleteGuestsErrors = await deleteGuestAuthUsers(guests);
    if (deleteGuestsErrors.length == 0) {
      loginfo("Successfully completed");
    } else {
      logwarn(`Got ${deleteGuestsErrors.length} errors while deleting guest auth users`);
      deleteGuestsErrors.forEach((r) => logwarn(`Guest auth user delete error: code: ${r.code}, message: ${r.message}`));
    }
    */
    const allAuthUsers = await getAllAuthUserIds();
    loginfo(`Got ${allAuthUsers.length} total auth users`);
    const [, invalidAuthUsers] = splitAuthUsers(allAuthUsers);
    loginfo(`Got ${invalidAuthUsers.length} invalid or guest auth users`);
    const authUsersToReAdd = users.map((uD) => {
        const r = {
            id: uD.id,
            name: uD.oldOrganizationUser.name,
            email: uD.oldOrganizationUser.email,
        };
        return r;
    })
        .reduce((acc, r) => {
        if (acc.find((v) => r.id == v.id) == undefined)
            acc.push(r);
        return acc;
    }, [])
        .flatMap((aU) => (allAuthUsers.find((u) => u.id == aU.id) ? [] : [aU]));
    loginfo(`Got ${authUsersToReAdd.length} users to re-add`);
    const addResult = await addAuthUsers(authUsersToReAdd);
    if (addResult.length == 0) {
        loginfo(`Successfully re-added ${authUsersToReAdd.length} auth users`);
    }
    else {
        logwarn(`Got ${addResult.length} errors while adding auth users`);
        addResult.forEach((r) => logwarn(`Auth user add error: code: ${r.code}, message: ${r.message}`));
    }
    /*
    const deletedInvalidOrGuestUsers = await deleteGuestAuthUsers(invalidAuthUsers);
    if (deletedInvalidOrGuestUsers.length == 0) {
      loginfo("Successfully deleted invalid or guest auth users");
    } else {
      logwarn(`Got ${deletedInvalidOrGuestUsers.length} errors while deleting auth users`);
      deletedInvalidOrGuestUsers.forEach((r) => logwarn(`Auth user delete error: code: ${r.code}, message: ${r.message}`));
    }
    */
    // 8. Check for any guests users left over & delete them
}
f();
//# sourceMappingURL=migrateUsersToRoot.js.map