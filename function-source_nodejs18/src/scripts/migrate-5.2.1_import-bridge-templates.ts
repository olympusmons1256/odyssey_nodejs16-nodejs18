import * as fs from "node:fs";
const infile = "./5.2.1-spaceTemplateMigrationForImport.json";
const dataRead = fs.readFileSync(infile, {encoding: "utf8"}).toString();
const data = JSON.parse(dataRead) as MigrationExport;
process.env["DESTINATION_ENV"] = data.destinationEnv;
process.env["GOOGLE_APPLICATION_CREDENTIALS"] = "/home/bramford/git/github.com/New-Game-Plus/odyssey-scratch/firebase-functions-backend@ngp-odyssey" + "-" + data.destinationEnv + ".iam.gserviceaccount.com.json";

import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {UnrealProject, UnrealProjectVersion} from "../lib/docTypes";
import {BridgeSpaceTemplate} from "../lib/cmsDocTypes";
import {getUnrealPluginVersionsRef} from "../lib/documents/firestore";

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


interface MigrationExport {
  newSpaceTemplates: {
    id: string;
    spaceTemplate: BridgeSpaceTemplate;
  }[];
  newUnrealProjects: {
    path: string;
    unrealProject: UnrealProject;
  }[];
  newUnrealProjectVersions: {
    path: string;
    unrealProjectVersion: UnrealProjectVersion;
  }[];
  destinationEnv: string
}

(async () => {
  loginfo(`Importing ${data.newUnrealProjects.length} unreal projects`);
  const newUnrealProjectsResult = await Promise.all(data.newUnrealProjects.map(async (o) => {
    try {
      const created = new admin.firestore.Timestamp((o.unrealProject.created as any)._seconds, (o.unrealProject.created as any)._nanoseconds);
      const unrealProject : UnrealProject = {
        ...o.unrealProject,
        created,
        updated: admin.firestore.Timestamp.now(),
      };
      const ref = admin.firestore().doc(o.path);
      await ref.create(unrealProject);
      return true;
    } catch (e: any) {
      logwarn(e);
      logwarn(`Failed to create unreal project: ${o.path}`);
      return false;
    }
  }));
  const unrealProjectFailures = newUnrealProjectsResult.filter((r) => r == false);
  if (unrealProjectFailures.length > 0) {
    logwarn(`Failed to import ${unrealProjectFailures.length} unreal projects`);
  }

  const latestPluginVersionDoc = (await getUnrealPluginVersionsRef()
    .where("status", "in", ["supported", "supported-5.2"])
    .orderBy("created", "desc")
    .limit(1).get()).docs.pop();

  if (latestPluginVersionDoc == undefined) logwarn("Failed to find latest plugin version");

  loginfo(`Importing ${data.newUnrealProjectVersions.length} unreal project versions`);
  const newUnrealProjectVersionsResult = await Promise.all(data.newUnrealProjectVersions.map(async (o) => {
    try {
      const created = new admin.firestore.Timestamp((o.unrealProjectVersion.created as any)._seconds, (o.unrealProjectVersion.created as any)._nanoseconds);
      const unrealProjectVersion : UnrealProjectVersion = {
        ...o.unrealProjectVersion,
        pluginVersionId: (latestPluginVersionDoc?.id != undefined) ? latestPluginVersionDoc.id : o.unrealProjectVersion.pluginVersionId,
        created,
        updated: admin.firestore.Timestamp.now(),
      };
      const ref = admin.firestore().doc(o.path);
      await ref.create(unrealProjectVersion);
      return true;
    } catch (e: any) {
      logwarn(e);
      logwarn(`Failed to create unreal project version: ${o.path}`);
      return false;
    }
  }));
  const unrealProjectVersionFailures = newUnrealProjectVersionsResult.filter((r) => r == false);
  if (unrealProjectVersionFailures.length > 0) {
    logerror(`Failed to import ${unrealProjectVersionFailures.length} unreal project versions`);
  }

  loginfo(`Importing ${data.newSpaceTemplates.length} space templates`);
  const newSpaceTemplatesResult = await Promise.all(data.newSpaceTemplates.map(async (o) => {
    try {
      const created = (o.spaceTemplate.created == undefined) ? admin.firestore.Timestamp.now() : new admin.firestore.Timestamp((o.spaceTemplate.created as any)._seconds, (o.spaceTemplate.created as any)._nanoseconds);
      const spaceTemplate : BridgeSpaceTemplate = {
        ...o.spaceTemplate,
        created,
        updated: admin.firestore.Timestamp.now(),
      };
      const ref = admin.firestore().collection("spaceTemplates").doc(o.id);
      await ref.create(spaceTemplate);
      return true;
    } catch (e: any) {
      logwarn(e);
      logwarn(`Failed to create space template: ${o.id}`);
      return false;
    }
  }));
  const spaceTemplateFailures = newSpaceTemplatesResult.filter((r) => r == false);
  if (spaceTemplateFailures.length > 0) {
    logerror(`Failed to import ${spaceTemplateFailures.length} templates`);
  }

  const totalFailures = unrealProjectFailures.length + unrealProjectVersionFailures.length + spaceTemplateFailures.length;
  logerror(`Total failures: ${totalFailures}`);
})();
