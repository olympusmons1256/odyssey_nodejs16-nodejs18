import * as admin from "firebase-admin";
import * as process from "process";
import * as readline from "readline";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {expireUnrealProjectVersions, getAllExpirableUnrealProjectVersions, getLatestUnrealProjectVersion} from "../lib/unrealProjects/shared";
import {getDerivedSpacesWithUnrealProject, GetFirestoreDocResult, getOrganization, getUnrealProject} from "../lib/documents/firestore";
import {UnrealProjectVersion} from "../lib/docTypes";

async function waitForEnter(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const linePromise = new Promise<void>((resolve) => {
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
  const expireableUPVs = await getAllExpirableUnrealProjectVersions(false);

  expireableUPVs.sort(([upvDoc1], [upvDoc2]) => {
    const upvDoc1ProjectId = upvDoc1?.ref.parent.parent?.id;
    const upvDoc2ProjectId = upvDoc2?.ref.parent.parent?.id;
    if (upvDoc1ProjectId === undefined) return -1;
    if (upvDoc2ProjectId === undefined) return 1;
    if (upvDoc1ProjectId > upvDoc2ProjectId) return -1;
    return 1;
  });

  const upvsChecked = expireableUPVs.flatMap((expirableUpv) => {
    const [upvDoc, upv] = expirableUpv;
    if (upvDoc === undefined || upv === undefined) {
      console.error("Something is wrong");
      return [];
    }

    if (upv?.updated.toMillis() >= sevenDaysAgo) {
      console.error(`${upvDoc?.ref.path} is younger than 7 days old`);
      return [];
    }
    if (upv?.state == "volume-copy-complete" || upv?.state == "expired") {
      console.error(`${upvDoc?.ref.path} has an invalid state`);
      return [];
    }

    // console.log({path: upvDoc?.ref.path, state: upv?.state, updated: upv?.updated.toDate().toISOString()});

    const upId = upvDoc.ref.parent.parent?.id;
    if (upId === undefined) return [];
    return [{expirableUpv, documentPath: upvDoc.ref.path, state: upv.state, upId, updated: upv.updated.toDate().toISOString()}];
  });

  const upvsWithUPInfo = (await Promise.all(upvsChecked.map(async (upv) => {
    const upInfo = await getUnrealProject(upv.upId);
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
    const orgInfo = await getOrganization(upv.orgId);
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
      const latestUPV = await getLatestUnrealProjectVersion(upId);
      if (latestUPV === undefined) return undefined;
      return latestUPV;
    }))).flatMap((upv) => upv === undefined ? [] : [upv]);

  const upvsWithDerivedSpaceInfo = await Promise.all(upvsWithOrgInfo.flatMap(async (upv) : Promise<{
    expirableUpv: GetFirestoreDocResult<UnrealProjectVersion>,
    documentPath: string,
    state?: string,
    updated: string,
    upId: string,
    upName?: string,
    upDisplayName?: string,
    orgId: string,
    orgName: string,
    isLatestUPV: boolean,
    derivedSpaceIds: string[],
  }> => {
    const isLatestUPV = latestUPVsListed.filter((latestUPV) => latestUPV.doc.id === upv.expirableUpv[0]?.id).length > 0;
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
    const derivedSpaces = await getDerivedSpacesWithUnrealProject(upv.upId);
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
      if (spaceDoc === undefined || space === undefined) return [];
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
  if (toDelete === undefined) return;
  await expireUnrealProjectVersions(toDelete);
}

f();
