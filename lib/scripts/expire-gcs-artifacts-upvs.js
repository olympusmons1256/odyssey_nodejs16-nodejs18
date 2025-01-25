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
const process = __importStar(require("process"));
const readline = __importStar(require("readline"));
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const shared_1 = require("../lib/unrealProjects/shared");
const firestore_1 = require("../lib/documents/firestore");
async function waitForEnter() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const linePromise = new Promise((resolve) => {
        rl.on("line", () => {
            rl.close();
            resolve();
        });
    });
    console.log("Press Enter to continue...");
    await linePromise;
}
async function f() {
    const sevenDaysAgo = admin.firestore.Timestamp.now().toMillis() - (7 * 24 * 60 * 60000);
    const expireableUPVs = await (0, shared_1.getAllExpirableUnrealProjectVersions)(false);
    expireableUPVs.sort(([upvDoc1], [upvDoc2]) => {
        var _a, _b;
        const upvDoc1ProjectId = (_a = upvDoc1 === null || upvDoc1 === void 0 ? void 0 : upvDoc1.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
        const upvDoc2ProjectId = (_b = upvDoc2 === null || upvDoc2 === void 0 ? void 0 : upvDoc2.ref.parent.parent) === null || _b === void 0 ? void 0 : _b.id;
        if (upvDoc1ProjectId === undefined)
            return -1;
        if (upvDoc2ProjectId === undefined)
            return 1;
        if (upvDoc1ProjectId > upvDoc2ProjectId)
            return -1;
        return 1;
    });
    const upvsChecked = expireableUPVs.flatMap((expirableUpv) => {
        var _a;
        const [upvDoc, upv] = expirableUpv;
        if (upvDoc === undefined || upv === undefined) {
            console.error("Something is wrong");
            return [];
        }
        if ((upv === null || upv === void 0 ? void 0 : upv.updated.toMillis()) >= sevenDaysAgo) {
            console.error(`${upvDoc === null || upvDoc === void 0 ? void 0 : upvDoc.ref.path} is younger than 7 days old`);
            return [];
        }
        if ((upv === null || upv === void 0 ? void 0 : upv.state) == "volume-copy-complete" || (upv === null || upv === void 0 ? void 0 : upv.state) == "expired") {
            console.error(`${upvDoc === null || upvDoc === void 0 ? void 0 : upvDoc.ref.path} has an invalid state`);
            return [];
        }
        // console.log({path: upvDoc?.ref.path, state: upv?.state, updated: upv?.updated.toDate().toISOString()});
        const upId = (_a = upvDoc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
        if (upId === undefined)
            return [];
        return [{ expirableUpv, documentPath: upvDoc.ref.path, state: upv.state, upId, updated: upv.updated.toDate().toISOString() }];
    });
    const upvsWithUPInfo = (await Promise.all(upvsChecked.map(async (upv) => {
        const upInfo = await (0, firestore_1.getUnrealProject)(upv.upId);
        const [upDoc, up] = upInfo;
        if (upDoc === undefined || up === undefined) {
            console.error(`Unreal Project: ${upv.upId} does not exist. Inspect: ${upv.documentPath} to manually expire`);
            return undefined;
        }
        return {
            expirableUpv: upv.expirableUpv,
            documentPath: upv.documentPath,
            state: upv.state,
            updated: upv.updated,
            upId: upv.upId,
            upName: up.name,
            upDisplayName: up.displayName,
            orgId: up.organizationId,
        };
    }))).flatMap((upv) => upv === undefined ? [] : [upv]);
    const upvsWithOrgInfo = (await Promise.all(upvsWithUPInfo.map(async (upv) => {
        const orgInfo = await (0, firestore_1.getOrganization)(upv.orgId);
        const [orgDoc, org] = orgInfo;
        if (orgDoc === undefined || org === undefined) {
            console.error(`Organization: ${upv.orgId} does not exist. Inspect ${upv.documentPath} to manually expire`);
            return undefined;
        }
        return {
            expirableUpv: upv.expirableUpv,
            documentPath: upv.documentPath,
            state: upv.state,
            updated: upv.updated,
            upId: upv.upId,
            upName: upv.upName,
            upDisplayName: upv.upDisplayName,
            orgId: upv.orgId,
            orgName: org.name,
        };
    }))).flatMap((upv) => upv === undefined ? [] : [upv]);
    const latestUPVsListed = (await Promise.all([...new Set(upvsChecked.map((res) => res.upId))]
        .map(async (upId) => {
        const latestUPV = await (0, shared_1.getLatestUnrealProjectVersion)(upId);
        if (latestUPV === undefined)
            return undefined;
        return latestUPV;
    }))).flatMap((upv) => upv === undefined ? [] : [upv]);
    const upvsWithDerivedSpaceInfo = await Promise.all(upvsWithOrgInfo.flatMap(async (upv) => {
        const isLatestUPV = latestUPVsListed.filter((latestUPV) => { var _a; return latestUPV.doc.id === ((_a = upv.expirableUpv[0]) === null || _a === void 0 ? void 0 : _a.id); }).length > 0;
        if (isLatestUPV === false) {
            return {
                expirableUpv: upv.expirableUpv,
                documentPath: upv.documentPath,
                state: upv.state,
                updated: upv.updated,
                upId: upv.upId,
                upName: upv.upName,
                upDisplayName: upv.upDisplayName,
                orgId: upv.orgId,
                orgName: upv.orgName,
                isLatestUPV,
                derivedSpaceIds: [],
            };
        }
        const derivedSpaces = await (0, firestore_1.getDerivedSpacesWithUnrealProject)(upv.upId);
        if (derivedSpaces === undefined) {
            return {
                expirableUpv: upv.expirableUpv,
                documentPath: upv.documentPath,
                state: upv.state,
                updated: upv.updated,
                upId: upv.upId,
                upName: upv.upName,
                upDisplayName: upv.upDisplayName,
                orgId: upv.orgId,
                orgName: upv.orgName,
                isLatestUPV,
                derivedSpaceIds: [],
            };
        }
        const derivedSpaceIds = derivedSpaces.flatMap((dSpace) => {
            const [spaceDoc, space] = dSpace;
            if (spaceDoc === undefined || space === undefined)
                return [];
            return [spaceDoc.id];
        });
        return {
            expirableUpv: upv.expirableUpv,
            documentPath: upv.documentPath,
            state: upv.state,
            updated: upv.updated,
            upId: upv.upId,
            upName: upv.upName,
            upDisplayName: upv.upDisplayName,
            orgId: upv.orgId,
            orgName: upv.orgName,
            isLatestUPV,
            derivedSpaceIds,
        };
    }));
    const nonDependentUpvs = upvsWithDerivedSpaceInfo.flatMap((upv) => {
        if (upv.derivedSpaceIds.length > 0) {
            console.error(`Unreal Project Version has derived spaced. Inspect: ${upv.documentPath} to manually expire`);
            return [];
        }
        if (upv.isLatestUPV === true) {
            console.error(`Unreal Project Version is the latest version. Inspect: ${upv.documentPath} to manually expire`);
            return [];
        }
        return [upv];
    });
    nonDependentUpvs.forEach((upv) => console.log({
        path: upv.documentPath,
        state: upv.state,
        updated: upv.updated,
        upId: upv.upId,
        upName: upv.upName,
        upDisplayName: upv.upDisplayName,
        orgId: upv.orgId,
        orgName: upv.orgName,
        isLatestUPV: upv.isLatestUPV,
        derivedSpaceIds: upv.derivedSpaceIds,
    }));
    console.log(`Unreal Project Versions returned: ${expireableUPVs.length}`);
    console.log(`Unreal Project Versions passing second check: ${nonDependentUpvs.length}`);
    await waitForEnter();
    console.log("Expiring Unreal Project Versions...");
    const toDelete = nonDependentUpvs.map((upv) => upv.expirableUpv).reverse().slice(0, 100);
    if (toDelete === undefined)
        return;
    await (0, shared_1.expireUnrealProjectVersions)(toDelete);
}
f();
//# sourceMappingURL=expire-gcs-artifacts-upvs.js.map