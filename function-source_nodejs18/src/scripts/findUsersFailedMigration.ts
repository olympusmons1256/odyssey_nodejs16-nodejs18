import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getOrganizations, getUsers} from "../lib/documents/firestore";

interface AuthUserInfo {
  id: string
  email: string
  name: string | undefined
}

async function getAllAuthUsers() {
  async function listAllUsers(users: AuthUserInfo[], pageToken: string | undefined) : Promise<AuthUserInfo[]> {
    console.log(`Listing auth users. Have ${users.length} userIds`);
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

async function getAllRootUsers() {
  const userDocs = await getUsers();
  if (userDocs == undefined) {
    return [];
  }
  return Array.from(new Set(userDocs.flatMap(([userDoc, user]) => {
    if (userDoc != undefined && user != undefined) {
      return [{id: userDoc.id, ...user}];
    } else {
      return [];
    }
  })));
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

async function getOrganizationUsers(emails: string[]) {
  const emailsChunked = chunkList(emails, 10);
  return (await Promise.all(emailsChunked.flatMap(async (emailsChunk) => {
    return (await admin.firestore().collectionGroup("organizationUsers").where("email", "in", emailsChunk).get()).docs
      .flatMap((ud) => (ud.exists) ? [ud] : []);
  }))).flat();
}

async function f() {
  const authUsers = await getAllAuthUsers();
  console.log(`Got ${authUsers.length} total auth users`);
  const rootUsers = await getAllRootUsers();
  console.log(`Got ${rootUsers.length} total root users`);

  const missingUsers = authUsers.flatMap((au) => {
    const matchingRootUsers = rootUsers.flatMap((ru) => (ru.id == au.id) ? [ru] : []);
    if (matchingRootUsers.length > 0) {
      return [];
    } else {
      return [au];
    }
  });

  type StringRecord = {
    [key: string]: string
  }


  const organizations = await getOrganizations();
  if (organizations == undefined) {
    console.error("Failed to get organizations, exiting");
    process.exit(1);
  }

  const organizationsWithName = organizations.reduce<StringRecord>((acc, [doc, org]) => {
    if (doc != undefined && org != undefined && org.name != undefined) {
      acc[doc.id] = org.name;
    }
    return acc;
  }, {});

  const missingOrgUsers = await getOrganizationUsers(missingUsers.map((mu) => mu.email));
  if (missingOrgUsers == undefined) {
    console.error("Failed to get organizationusers, exiting");
    process.exit(1);
  }

  const missingOrgUsersToMap = organizations.reduce<StringRecord>((acc, [doc]) => {
    if (doc != undefined && doc.exists == true && doc.ref.parent.parent?.id != undefined) {
      acc[doc.id] = doc.ref.parent.parent?.id;
    }
    return acc;
  }, {});

  missingUsers.forEach((mu) => {
    const muO = {
      email: mu.email,
      id: mu.id,
      orgId: missingOrgUsersToMap[mu.id],
      orgName: organizationsWithName[missingOrgUsersToMap[mu.id]],
    };
    if (muO.id != undefined &&
        muO.email != undefined && muO.email != "" && muO.email != null
    ) console.log(JSON.stringify(muO));
  });
}

f();
