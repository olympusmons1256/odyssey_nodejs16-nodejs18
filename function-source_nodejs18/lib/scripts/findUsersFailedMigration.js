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
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const firestore_1 = require("../lib/documents/firestore");
async function getAllAuthUsers() {
    async function listAllUsers(users, pageToken) {
        console.log(`Listing auth users. Have ${users.length} userIds`);
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
async function getAllRootUsers() {
    const userDocs = await (0, firestore_1.getUsers)();
    if (userDocs == undefined) {
        return [];
    }
    return Array.from(new Set(userDocs.flatMap(([userDoc, user]) => {
        if (userDoc != undefined && user != undefined) {
            return [Object.assign({ id: userDoc.id }, user)];
        }
        else {
            return [];
        }
    })));
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
async function getOrganizationUsers(emails) {
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
        }
        else {
            return [au];
        }
    });
    const organizations = await (0, firestore_1.getOrganizations)();
    if (organizations == undefined) {
        console.error("Failed to get organizations, exiting");
        process.exit(1);
    }
    const organizationsWithName = organizations.reduce((acc, [doc, org]) => {
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
    const missingOrgUsersToMap = organizations.reduce((acc, [doc]) => {
        var _a, _b;
        if (doc != undefined && doc.exists == true && ((_a = doc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id) != undefined) {
            acc[doc.id] = (_b = doc.ref.parent.parent) === null || _b === void 0 ? void 0 : _b.id;
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
            muO.email != undefined && muO.email != "" && muO.email != null)
            console.log(JSON.stringify(muO));
    });
}
f();
//# sourceMappingURL=findUsersFailedMigration.js.map