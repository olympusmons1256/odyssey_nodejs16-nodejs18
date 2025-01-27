import * as admin from "firebase-admin";
// import * as csv from "csv-parse";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {RootUser, OrganizationUser, OldOrganizationUser} from "../lib/docTypes";
import {sleep} from "../lib/misc";
import {getOldOrganizationUsers, getOrganizations, getOrganizationUserRef, getOrganizationUsers, getUserRef, getUsers} from "../lib/documents/firestore";

function log(level: string, msg: string, obj?: any) {
  const message = `${new Date().toISOString()} - ${level}: ${msg}`;
  if (obj == undefined) {
    console.log(message);
  } else {
    console.log(message, obj);
  }
}

function loginfo(msg: string, obj?: any) {
  log("INFO", msg, obj);
}

function logerror(msg: string, obj?: any) {
  log("ERROR", msg, obj);
}

function logwarn(msg: string, obj?: any) {
  log("WARN", msg, obj);
}

function chunkList<T>(l: Array<T>, chunkSize: number): Array<Array<T>> {
  return l.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index/chunkSize);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, [] as Array<Array<T>>);
}

async function timeChunkedOperation<T, U>(
  items: Array<T>,
  chunkSize: number,
  millis: number,
  flatMapFn?: (value: T) => Promise<Array<U>>,
  arrayFn?: (value: Array<T>) => Promise<Array<U>>,
) : Promise<Array<U>> {
  async function f(chunk: Array<T>) {
    if (flatMapFn == undefined && arrayFn == undefined) {
      logerror("Neither flatMapFn nor arrayFn given");
      return [];
    } else if (flatMapFn != undefined && arrayFn != undefined) {
      logerror("Both flatMapFn and arrayFn given");
      return [];
    } else if (flatMapFn != undefined) {
      return (await Promise.all(chunk.flatMap(async (item) => await flatMapFn(item)))).flat();
    } else if (arrayFn != undefined) {
      return await arrayFn(chunk);
    } else {
      logerror("Unknown error with flatMapFn or arrayFn");
      return [];
    }
  }
  async function chunkPerSecond(chunks: Array<Array<T>>, index: number, result: Array<U>) : Promise<Array<U>> {
    async function processChunk() {
      if (chunk == undefined) {
        logwarn("Skipping empty or undefined chunk");
        return result;
      } else {
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
      await sleep(millis);
      return await chunkPerSecond(remainingChunks, index + 1, results);
    } else {
      return results;
    }
  }

  return await chunkPerSecond(chunkList(items, chunkSize), 0, []);
}

interface UserRecordBase {
  id: string,
  updated: number,
  organizationId: string,
}

interface RootUserRecord extends UserRecordBase {
  rootUser: RootUser,
}

interface OldOrganizationUserRecord extends UserRecordBase {
  oldOrganizationUser: OldOrganizationUser,
}

interface OrganizationUserRecord extends UserRecordBase {
  organizationUser: OrganizationUser,
}

interface AuthUserInfo {
  id: string
  email: string
  name: string | undefined
}

async function getAllAuthUserIds() {
  async function listAllUsers(users: AuthUserInfo[], pageToken: string | undefined) : Promise<AuthUserInfo[]> {
    loginfo(`Listing auth users. Have ${users.length} userIds`);
    const result = await admin.auth().listUsers(1000, pageToken);
    const foundUsers = result.users.map((u) => {
      return {email: u.email || "", id: u.uid, name: u.displayName};
    });
    if (result.pageToken == undefined) {
      return [...users, ...foundUsers];
    } else {
      return await listAllUsers([...users, ...foundUsers], result.pageToken);
    }
  }
  return await listAllUsers([], undefined);
}

async function getAllOldOrganizationUsers() {
  const organizations = await getOrganizations();
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

    const organizationUsers = await getOldOrganizationUsers(organizationDoc.id);
    if (organizationUsers == undefined || organizationUsers.length == 0) {
      logerror("Organization has no users: ", organizationDoc.id);
      return [];
    }
    loginfo(`Got ${organizationUsers.length} user docs in organization ${organizationDoc.id}`);

    const orgUserRecords = organizationUsers.flatMap(([userDoc, user]) => {
      if (userDoc != undefined && user != undefined) {
        const organizationId = userDoc.ref.parent.parent?.id;
        if (organizationId == undefined) {
          logwarn("organizationId is undefined: ", userDoc.ref.path);
          return [];
        }
        const userRecord : OldOrganizationUserRecord = {
          id: userDoc.id,
          updated: (userDoc.updateTime?.toMillis() == undefined) ? 0 : userDoc.updateTime?.toMillis(),
          oldOrganizationUser: user,
          organizationId,
        };
        return [userRecord];
      } else {
        return [];
      }
    });
    loginfo(`Got ${orgUserRecords.length} user records in organization ${organizationDoc.id}`);

    return orgUserRecords;
  }))).flat();
  return userRecords;
}

export async function getAllOrganizationUsers() {
  const organizations = await getOrganizations();
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

    const organizationUsers = await getOrganizationUsers(organizationDoc.id);
    if (organizationUsers == undefined || organizationUsers.length == 0) {
      logerror("Organization has no users: ", organizationDoc.id);
      return [];
    }
    loginfo(`Got ${organizationUsers.length} user docs in organization ${organizationDoc.id}`);

    const orgUserRecords = organizationUsers.flatMap(([userDoc, user]) => {
      if (userDoc != undefined && user != undefined) {
        const organizationId = userDoc.ref.parent.parent?.id;
        if (organizationId == undefined) {
          logwarn("organizationId is undefined: ", userDoc.ref.path);
          return [];
        }
        const userRecord : OrganizationUserRecord = {
          id: userDoc.id,
          updated: (userDoc.updateTime?.toMillis() == undefined) ? 0 : userDoc.updateTime?.toMillis(),
          organizationUser: user,
          organizationId,
        };
        return [userRecord];
      } else {
        return [];
      }
    });
    loginfo(`Got ${orgUserRecords.length} user records in organization ${organizationDoc.id}`);

    return orgUserRecords;
  }))).flat();
  return userRecords;
}

async function getAllRootUserIds() {
  const userDocs = await getUsers();
  if (userDocs == undefined) {
    return [];
  }
  return Array.from(new Set(userDocs.flatMap(([userDoc, user]) => {
    if (userDoc != undefined && user != undefined) {
      return [userDoc.id];
    } else {
      return [];
    }
  })));
}

type SplitUserRecords = [OldOrganizationUserRecord[], OldOrganizationUserRecord[]];
function splitGuests(users: OldOrganizationUserRecord[]) : SplitUserRecords {
  return users.reduce<SplitUserRecords>((acc, userRecord) => {
    const [users, guests] = acc;
    if (userRecord.oldOrganizationUser == undefined) {
      logwarn("oldOrganizationUser missing: ", userRecord.organizationId + "/" + userRecord.id);
    } else if (
      userRecord.oldOrganizationUser.email.match(new RegExp("guest\\.[a-zA-Z0-9]+\\@(odyssey\\.stream|newgameplus\\.live)")) ||
      (userRecord.oldOrganizationUser.bot != undefined && userRecord.oldOrganizationUser.bot == true)
    ) {
      guests.push(userRecord);
    } else {
      users.push(userRecord);
    }
    return [users, guests];
  }, [[], []] as SplitUserRecords);
}


type SplitAuthUsers = [AuthUserInfo[], AuthUserInfo[]];
function splitAuthUsers(authUsers: AuthUserInfo[]) : SplitAuthUsers {
  return authUsers.reduce<SplitAuthUsers>((acc, authUser) => {
    const [users, guests] = acc;
    if (
      authUser.email.match(new RegExp("guest\\.[a-zA-Z0-9]+\\@(odyssey\\.stream|newgameplus\\.live)")) ||
      authUser.email == "-" ||
      authUser.email == ""
    ) {
      guests.push(authUser);
    } else {
      users.push(authUser);
    }
    return [users, guests];
  }, [[], []] as SplitAuthUsers);
}

function splitAddedOrganizationUsers(users: OldOrganizationUserRecord[], existingOrganizationUsers: OrganizationUserRecord[]) : SplitUserRecords {
  return users.reduce<SplitUserRecords>((acc, userRecord) => {
    const [addedUsers, notAddedUsers] = acc;
    if (existingOrganizationUsers.find((eU) => eU.id == userRecord.id) != undefined) {
      addedUsers.push(userRecord);
    } else {
      notAddedUsers.push(userRecord);
    }
    return [addedUsers, notAddedUsers];
  }, [[], []] as SplitUserRecords);
}


function splitAddedRootUsers(users: OldOrganizationUserRecord[], rootUsers: string[]) : SplitUserRecords {
  return users.reduce<SplitUserRecords>((acc, userRecord) => {
    const [addedUsers, notAddedUsers] = acc;
    if (rootUsers.find((rU) => rU == userRecord.id) != undefined) {
      addedUsers.push(userRecord);
    } else {
      notAddedUsers.push(userRecord);
    }
    return [addedUsers, notAddedUsers];
  }, [[], []] as SplitUserRecords);
}

export function constructRootUserRecords(userRecords: OldOrganizationUserRecord[]): RootUserRecord[] {
  return userRecords.reduce<RootUserRecord[]>((acc, userRecord) => {
    const allMatchingRecords = userRecords.flatMap((userR) => (userR.id == userRecord.id) ? [userR] : []);
    const latestRecord = allMatchingRecords.sort((c, p) => {
      if (c.oldOrganizationUser.updated == undefined) return -1;
      if (p.oldOrganizationUser.updated == undefined) return 1;
      try {
        return c.oldOrganizationUser.updated.toMillis() - p.oldOrganizationUser.updated.toMillis();
      } catch (e: any) {
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
      return {id: userR.organizationId, role: userR.oldOrganizationUser.role};
    });
    if (latestRecord == undefined) {
      logerror(`Couldn't find latest record for ${userRecord.organizationId + "/" + userRecord.id}`);
      return acc;
    }
    const rootUser : RootUser = {
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
    const rootUserRecord : RootUserRecord = {
      id: latestRecord.id,
      organizationId: "",
      updated: rootUser.updated.toMillis(),
      rootUser,
    };
    acc.push(rootUserRecord);
    return acc;
  }, []);
}

export async function chunkAddRootUsers(users: RootUserRecord[]) {
  async function f(userRecord: RootUserRecord) {
    try {
      await getUserRef(userRecord.id).set(userRecord.rootUser);
      return [userRecord];
    } catch (e: any) {
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
  return timeChunkedOperation<RootUserRecord, RootUserRecord>(users, 100, 1000, f);
}

export async function chunkAddOrganizationUsers(users: OldOrganizationUserRecord[]) {
  async function f(userRecord: OldOrganizationUserRecord) {
    function getRole() {
      if (userRecord.oldOrganizationUser.role == "admin") return "admin";
      else return "member";
    }
    try {
      const organizationUser : OldOrganizationUser = {
        role: getRole(),
        email: userRecord.oldOrganizationUser.email,
        updated: admin.firestore.Timestamp.now(),
        created: userRecord.oldOrganizationUser.created,
        name: userRecord.oldOrganizationUser.name,
        avatarReadyPlayerMeImg: userRecord.oldOrganizationUser.avatarReadyPlayerMeImg,
      };
      await getOrganizationUserRef(userRecord.organizationId, userRecord.id).set(organizationUser);
      return [userRecord];
    } catch (e: any) {
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
  return timeChunkedOperation<OldOrganizationUserRecord, OldOrganizationUserRecord>(users, 100, 1000, f);
}

export async function findMissingUsers(users: RootUserRecord[]) {
  async function f(userRecord: RootUserRecord) {
    return (await getUserRef(userRecord.id).get()).exists ? [] : [userRecord];
  }

  return timeChunkedOperation<RootUserRecord, RootUserRecord>(users, 100, 1000, f);
}

interface AuthUserId {
  id: string
}

export interface DeleteAuthUserError {
  code: string,
  message: string,
  stack?: string,
}

export async function deleteGuestAuthUsers(users: AuthUserId[]) {
  async function f(userRecords: AuthUserId[]) {
    const result = await admin.auth().deleteUsers(userRecords.map((uR) => uR.id));
    return result.errors.map((error) => {
      return {
        code: error.error.code,
        message: error.error.message,
        stack: error.error.stack,
      } as DeleteAuthUserError;
    });
  }
  /*
  async function f(userRecords: UserRecord[]) {
    loginfo(`Deleting ${userRecords.length} users`);
    return [];
  }
  */
  return timeChunkedOperation<AuthUserId, DeleteAuthUserError>(users, 1000, 1000, undefined, f);
}

async function addAuthUsers(users: AuthUserInfo[]) {
  interface AddAuthUserError {
    code: string,
    message: string,
    stack?: string,
  }
  async function f(userRecords: AuthUserInfo[]) {
    function convertToAuthUserImport(userRecord: AuthUserInfo) {
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
      } as AddAuthUserError;
    });
  }
  return timeChunkedOperation<AuthUserInfo, AddAuthUserError>(users, 1000, 1000, undefined, f);
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
    } else logerror("Couldn't find missing users. Giving up.");
  // Any that do not exist, repeat 2-4
  } else {
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
    const r : AuthUserInfo = {
      id: uD.id,
      name: uD.oldOrganizationUser.name,
      email: uD.oldOrganizationUser.email,
    };
    return r;
  })
    . reduce((acc, r) => {
      if (acc.find((v) => r.id == v.id) == undefined) acc.push(r);
      return acc;
    }, [] as AuthUserInfo[])
    .flatMap((aU) => (allAuthUsers.find((u) => u.id == aU.id) ? [] : [aU]));

  loginfo(`Got ${authUsersToReAdd.length} users to re-add`);

  const addResult = await addAuthUsers(authUsersToReAdd);
  if (addResult.length == 0) {
    loginfo(`Successfully re-added ${authUsersToReAdd.length} auth users`);
  } else {
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
