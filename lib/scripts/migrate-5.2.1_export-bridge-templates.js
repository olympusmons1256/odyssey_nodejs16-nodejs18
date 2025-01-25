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
const fs = __importStar(require("node:fs"));
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
    var _a, _b;
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    const destinationEnv = process.env["DESTINATION_ENV"];
    if (destinationEnv == undefined) {
        logerror("DESTINATION_ENV not set");
        return;
    }
    const destNgpOrgId = (() => {
        if (destinationEnv == "prod")
            return "1xHq73UhZliwPyFzrPo0";
        return "lUhC4Ckd1yuaOFf9nEbJ";
    })();
    const authorUserId = (() => {
        if (destinationEnv == "prod")
            return "y8U0yyFuZXZCaGkNNm6pwUJTBSm1";
        return "FG7TjIChBdMZmkM7vLwM0mdKaPJ3";
    })();
    const destLuxidOrgId = "0Ixjckg4EUUVH3oit8jx";
    const destThirdAcademyOrgId = "PhFf3GXUHBhQLJTFsBRr";
    const destAltEthosOrgId = "axHB5uaoG7q9byOzQKlq";
    const destHksOrgId = "8yJ2XeZGHwANWRogTp1z";
    const getTemplateOrgId = (templateId) => {
        if (templateId == "gUup8EEuzj9EzDTUdUJs")
            return destThirdAcademyOrgId;
        if (templateId == "hNOG68uUEi0dZJliLneq")
            return destAltEthosOrgId;
        if (templateId == "tcizOXu3OUs0Y2IJfo0J")
            return destHksOrgId;
        if (templateId == "gvNcDGttWONqqN6p7THP")
            return destLuxidOrgId;
        return undefined;
    };
    const sourcePublicBridgeTemplates = (_a = (await (0, firestore_1.getAllBridgeSpaceTemplates)())) === null || _a === void 0 ? void 0 : _a.flatMap(([doc, template]) => {
        if (template == undefined || doc == undefined)
            return [];
        const destOrgId = getTemplateOrgId(doc.id);
        const isPublic = template.public == true;
        if (destOrgId == undefined && !isPublic) {
            logwarn(`Template ${doc.id}:${template.name} excluded. Skipping`);
            return [];
        }
        return [{ id: doc.id, spaceTemplate: template, destOrgId }];
    });
    if (sourcePublicBridgeTemplates == undefined || sourcePublicBridgeTemplates.length < 1) {
        logerror("No public bridge templates found");
        return;
    }
    loginfo(`Found ${sourcePublicBridgeTemplates.length} templates`);
    const sourceUnrealProjects = (_b = (await (0, firestore_1.getUnrealProjects)())) === null || _b === void 0 ? void 0 : _b.flatMap(([doc, unrealProject]) => {
        if (unrealProject == undefined || doc == undefined) {
            logwarn("unrealProject undefined");
            return [];
        }
        const template = sourcePublicBridgeTemplates.find((t) => {
            // loginfo(`t.spaceTemplate.unrealProject.unrealProjectId: ${t.spaceTemplate.unrealProject.unrealProjectId} == doc.id: ${doc.id} --- ${t.spaceTemplate.unrealProject.unrealProjectId == doc.id}`);
            return t.spaceTemplate.unrealProject.unrealProjectId == doc.id;
        });
        const requiredByTemplate = template === null || template === void 0 ? void 0 : template.id;
        if (requiredByTemplate != undefined) {
            loginfo(`Project ${doc.id}:${unrealProject.name} included as a dependency of ${requiredByTemplate}`);
            return [{ doc, unrealProject }];
        }
        return [];
    });
    if (sourceUnrealProjects == undefined || sourceUnrealProjects.length < 1) {
        logerror("No unreal projects included");
        return;
    }
    loginfo(`Included ${sourceUnrealProjects.length} unreal projects`);
    const sourceUnrealProjectVersions = (await Promise.all(sourceUnrealProjects.map(async (o) => {
        try {
            const latestCompleteProjectVersionDoc = (await o.doc.ref.collection("unrealProjectVersions")
                .where("state", "==", "volume-copy-complete")
                .orderBy("created", "desc")
                .limit(1).get()).docs.pop();
            if (latestCompleteProjectVersionDoc == undefined)
                return undefined;
            return { path: latestCompleteProjectVersionDoc.ref.path, unrealProjectVersion: latestCompleteProjectVersionDoc.data() };
        }
        catch (e) {
            logerror(e);
            logerror(`Failed to get latest project version for project: ${o.doc.id}`);
            return undefined;
        }
    }))).flatMap((r) => r != undefined ? [r] : []);
    if (sourceUnrealProjectVersions.length < 1) {
        logerror("No unreal project versions included");
        return;
    }
    loginfo(`Included ${sourceUnrealProjectVersions.length} unreal project versions`);
    const resolveNiceStuff = (templateId) => {
        if (templateId == "wclPsXXHbARz7dZ5SxRs")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/4-9.png", name: "Courtyard" };
        if (templateId == "aabdpYcFZHfMpyG9xgB8")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/logo-2022.png", name: "McDonald's" };
        if (templateId == "MOC9DYWsZg3dtc2gVvDm")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/7.png", name: "Penthouse" };
        if (templateId == "ji3g0KfKRl2zrcKCPPiZ")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/naturedome_template.png", name: "Naturedome" };
        if (templateId == "TBTDWJRmmmsXwOMskM1h")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/2.jpg", name: "Mountain Campus" };
        if (templateId == "7QVxoYOx0jQG8YJikM34")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/beach_template.png", name: "Beach" };
        if (templateId == "m1UnYm5fZxfKlh9R2ThW")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/Villa.png", name: "Villa" };
        if (templateId == "xOmn2jNzcg4O2XdCyI2w")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/image35.png", name: "Villa Cypress" };
        if (templateId == "Ac6m24Rs89NyFZpuRDio")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/0.jpg", name: "Classroom" };
        if (templateId == "pmoTnAszZohvxeFVIpF6")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/lighthouse2.png", name: "Lighthouse" };
        if (templateId == "tcizOXu3OUs0Y2IJfo0J")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/HighresScreenshot00001.png", name: "ATL Office" };
        if (templateId == "hNOG68uUEi0dZJliLneq")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/vikram-9.jpeg", name: "Vikram" };
        if (templateId == "gvNcDGttWONqqN6p7THP")
            return { thumb: "https://storage.googleapis.com/odyssey-art-assets/Luxid.png", name: "Luxid" };
        return undefined;
    };
    const newSpaceTemplates = sourcePublicBridgeTemplates.map((t) => {
        var _a, _b;
        const orgOwner = (t.destOrgId == undefined) ? [destNgpOrgId] : [destNgpOrgId, t.destOrgId];
        const niceThumb = (_a = resolveNiceStuff(t.id)) === null || _a === void 0 ? void 0 : _a.thumb;
        const niceName = (_b = resolveNiceStuff(t.id)) === null || _b === void 0 ? void 0 : _b.name;
        const spaceTemplate = {
            id: t.id,
            public: t.spaceTemplate.public,
            name: (niceName == undefined) ? t.spaceTemplate.name : niceName,
            type: t.spaceTemplate.type,
            thumb: (niceThumb == undefined) ? t.spaceTemplate.thumb : niceThumb,
            orgOwner,
            ueId: "",
            unrealProject: Object.assign(Object.assign({}, t.spaceTemplate.unrealProject), { unrealProjectVersionId: "latest" }),
            created: t.spaceTemplate.created,
            updated: t.spaceTemplate.updated,
            description: t.spaceTemplate.description,
        };
        return {
            id: t.id,
            spaceTemplate,
        };
    });
    const newUnrealProjects = sourceUnrealProjects.map((o) => {
        const organizationId = destNgpOrgId;
        const unrealProject = {
            organizationId,
            name: o.unrealProject.name,
            created: o.unrealProject.created,
            updated: o.unrealProject.updated,
        };
        return {
            path: o.doc.ref.path,
            unrealProject,
        };
    });
    const newUnrealProjectVersions = sourceUnrealProjectVersions.map((o) => {
        const unrealProjectVersion = {
            uploader: "bridgeCli",
            target: o.unrealProjectVersion.target,
            state: "builder-upload-complete",
            levelName: o.unrealProjectVersion.levelName,
            levelFilePath: o.unrealProjectVersion.levelFilePath,
            authorUserId,
            packageArchiveUrl: o.unrealProjectVersion.packageArchiveUrl,
            downloadUrl: o.unrealProjectVersion.downloadUrl,
            bridgeToolkitFileSettings: o.unrealProjectVersion.bridgeToolkitFileSettings,
            thumb: o.unrealProjectVersion.thumb,
            packageArchiveSha256Sum: o.unrealProjectVersion.packageArchiveSha256Sum,
            symbolsArchiveUrl: o.unrealProjectVersion.symbolsArchiveUrl,
            symbolsArchiveSha256Sum: o.unrealProjectVersion.symbolsArchiveSha256Sum,
            volumeSizeGb: o.unrealProjectVersion.volumeSizeGb,
            pluginVersionId: o.unrealProjectVersion.pluginVersionId,
            unrealEngineVersion: o.unrealProjectVersion.unrealEngineVersion,
            uploadUrl: o.unrealProjectVersion.uploadUrl,
            uploadSha256Sum: o.unrealProjectVersion.uploadSha256Sum,
            created: o.unrealProjectVersion.created,
            updated: o.unrealProjectVersion.updated,
        };
        return {
            path: o.path,
            unrealProjectVersion,
        };
    });
    const outfile = "./5.2.1-spaceTemplateMigrationForImport.json";
    loginfo(`Writing results to file '${outfile}'`);
    const toWrite = {
        newSpaceTemplates,
        newUnrealProjects,
        newUnrealProjectVersions,
        destinationEnv,
    };
    fs.writeFileSync(outfile, JSON.stringify(toWrite, undefined, 2));
})();
//# sourceMappingURL=migrate-5.2.1_export-bridge-templates.js.map