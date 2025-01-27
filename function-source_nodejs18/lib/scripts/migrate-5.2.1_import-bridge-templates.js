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
const fs = __importStar(require("node:fs"));
const infile = "./5.2.1-spaceTemplateMigrationForImport.json";
const dataRead = fs.readFileSync(infile, { encoding: "utf8" }).toString();
const data = JSON.parse(dataRead);
process.env["DESTINATION_ENV"] = data.destinationEnv;
process.env["GOOGLE_APPLICATION_CREDENTIALS"] = "/home/bramford/git/github.com/New-Game-Plus/odyssey-scratch/firebase-functions-backend@ngp-odyssey" + "-" + data.destinationEnv + ".iam.gserviceaccount.com.json";
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
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
(async () => {
    loginfo(`Importing ${data.newUnrealProjects.length} unreal projects`);
    const newUnrealProjectsResult = await Promise.all(data.newUnrealProjects.map(async (o) => {
        try {
            const created = new admin.firestore.Timestamp(o.unrealProject.created._seconds, o.unrealProject.created._nanoseconds);
            const unrealProject = Object.assign(Object.assign({}, o.unrealProject), { created, updated: admin.firestore.Timestamp.now() });
            const ref = admin.firestore().doc(o.path);
            await ref.create(unrealProject);
            return true;
        }
        catch (e) {
            logwarn(e);
            logwarn(`Failed to create unreal project: ${o.path}`);
            return false;
        }
    }));
    const unrealProjectFailures = newUnrealProjectsResult.filter((r) => r == false);
    if (unrealProjectFailures.length > 0) {
        logwarn(`Failed to import ${unrealProjectFailures.length} unreal projects`);
    }
    const latestPluginVersionDoc = (await (0, firestore_1.getUnrealPluginVersionsRef)()
        .where("status", "in", ["supported", "supported-5.2"])
        .orderBy("created", "desc")
        .limit(1).get()).docs.pop();
    if (latestPluginVersionDoc == undefined)
        logwarn("Failed to find latest plugin version");
    loginfo(`Importing ${data.newUnrealProjectVersions.length} unreal project versions`);
    const newUnrealProjectVersionsResult = await Promise.all(data.newUnrealProjectVersions.map(async (o) => {
        try {
            const created = new admin.firestore.Timestamp(o.unrealProjectVersion.created._seconds, o.unrealProjectVersion.created._nanoseconds);
            const unrealProjectVersion = Object.assign(Object.assign({}, o.unrealProjectVersion), { pluginVersionId: ((latestPluginVersionDoc === null || latestPluginVersionDoc === void 0 ? void 0 : latestPluginVersionDoc.id) != undefined) ? latestPluginVersionDoc.id : o.unrealProjectVersion.pluginVersionId, created, updated: admin.firestore.Timestamp.now() });
            const ref = admin.firestore().doc(o.path);
            await ref.create(unrealProjectVersion);
            return true;
        }
        catch (e) {
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
            const created = (o.spaceTemplate.created == undefined) ? admin.firestore.Timestamp.now() : new admin.firestore.Timestamp(o.spaceTemplate.created._seconds, o.spaceTemplate.created._nanoseconds);
            const spaceTemplate = Object.assign(Object.assign({}, o.spaceTemplate), { created, updated: admin.firestore.Timestamp.now() });
            const ref = admin.firestore().collection("spaceTemplates").doc(o.id);
            await ref.create(spaceTemplate);
            return true;
        }
        catch (e) {
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
//# sourceMappingURL=migrate-5.2.1_import-bridge-templates.js.map