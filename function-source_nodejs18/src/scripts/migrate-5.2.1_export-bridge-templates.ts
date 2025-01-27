import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getAllBridgeSpaceTemplates, getUnrealProjects} from "../lib/documents/firestore";
import * as fs from "node:fs";
import {UnrealProject, UnrealProjectVersion} from "../lib/docTypes";
import {BridgeSpaceTemplate} from "../lib/cmsDocTypes";

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
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  const destinationEnv : string | undefined = process.env["DESTINATION_ENV"];
  if (destinationEnv == undefined) {
    logerror("DESTINATION_ENV not set");
    return;
  }
  const destNgpOrgId = (() => {
    if (destinationEnv == "prod") return "1xHq73UhZliwPyFzrPo0";
    return "lUhC4Ckd1yuaOFf9nEbJ";
  })();
  const authorUserId = (() => {
    if (destinationEnv == "prod") return "y8U0yyFuZXZCaGkNNm6pwUJTBSm1";
    return "FG7TjIChBdMZmkM7vLwM0mdKaPJ3";
  })();

  const destLuxidOrgId = "0Ixjckg4EUUVH3oit8jx";
  const destThirdAcademyOrgId = "PhFf3GXUHBhQLJTFsBRr";
  const destAltEthosOrgId = "axHB5uaoG7q9byOzQKlq";
  const destHksOrgId = "8yJ2XeZGHwANWRogTp1z";

  const getTemplateOrgId = (templateId: string) => {
    if (templateId == "gUup8EEuzj9EzDTUdUJs") return destThirdAcademyOrgId;
    if (templateId == "hNOG68uUEi0dZJliLneq") return destAltEthosOrgId;
    if (templateId == "tcizOXu3OUs0Y2IJfo0J") return destHksOrgId;
    if (templateId == "gvNcDGttWONqqN6p7THP") return destLuxidOrgId;
    return undefined;
  };

  const sourcePublicBridgeTemplates = (await getAllBridgeSpaceTemplates())?.flatMap(([doc, template]) => {
    if (template == undefined || doc == undefined) return [];
    const destOrgId = getTemplateOrgId(doc.id);
    const isPublic = template.public == true;
    if (destOrgId == undefined && !isPublic) {
      logwarn(`Template ${doc.id}:${template.name} excluded. Skipping`);
      return [];
    }
    return [{id: doc.id, spaceTemplate: template, destOrgId}];
  });
  if (sourcePublicBridgeTemplates == undefined || sourcePublicBridgeTemplates.length < 1) {
    logerror("No public bridge templates found");
    return;
  }
  loginfo(`Found ${sourcePublicBridgeTemplates.length} templates`);

  const sourceUnrealProjects = (await getUnrealProjects())?.flatMap(([doc, unrealProject]) => {
    if (unrealProject == undefined || doc == undefined) {
      logwarn("unrealProject undefined");
      return [];
    }
    const template = sourcePublicBridgeTemplates.find((t) => {
      // loginfo(`t.spaceTemplate.unrealProject.unrealProjectId: ${t.spaceTemplate.unrealProject.unrealProjectId} == doc.id: ${doc.id} --- ${t.spaceTemplate.unrealProject.unrealProjectId == doc.id}`);
      return t.spaceTemplate.unrealProject.unrealProjectId == doc.id;
    });
    const requiredByTemplate = template?.id;
    if (requiredByTemplate != undefined) {
      loginfo(`Project ${doc.id}:${unrealProject.name} included as a dependency of ${requiredByTemplate}`);
      return [{doc, unrealProject}];
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
      if (latestCompleteProjectVersionDoc == undefined) return undefined;
      return {path: latestCompleteProjectVersionDoc.ref.path, unrealProjectVersion: latestCompleteProjectVersionDoc.data() as UnrealProjectVersion};
    } catch (e: any) {
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

  const resolveNiceStuff = (templateId: string) => {
    if (templateId == "wclPsXXHbARz7dZ5SxRs") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/4-9.png", name: "Courtyard"};
    if (templateId == "aabdpYcFZHfMpyG9xgB8") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/logo-2022.png", name: "McDonald's"};
    if (templateId == "MOC9DYWsZg3dtc2gVvDm") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/7.png", name: "Penthouse"};
    if (templateId == "ji3g0KfKRl2zrcKCPPiZ") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/naturedome_template.png", name: "Naturedome"};
    if (templateId == "TBTDWJRmmmsXwOMskM1h") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/2.jpg", name: "Mountain Campus"};
    if (templateId == "7QVxoYOx0jQG8YJikM34") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/beach_template.png", name: "Beach"};
    if (templateId == "m1UnYm5fZxfKlh9R2ThW") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/Villa.png", name: "Villa"};
    if (templateId == "xOmn2jNzcg4O2XdCyI2w") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/image35.png", name: "Villa Cypress"};
    if (templateId == "Ac6m24Rs89NyFZpuRDio") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/0.jpg", name: "Classroom"};
    if (templateId == "pmoTnAszZohvxeFVIpF6") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/lighthouse2.png", name: "Lighthouse"};
    if (templateId == "tcizOXu3OUs0Y2IJfo0J") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/HighresScreenshot00001.png", name: "ATL Office"};
    if (templateId == "hNOG68uUEi0dZJliLneq") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/vikram-9.jpeg", name: "Vikram"};
    if (templateId == "gvNcDGttWONqqN6p7THP") return {thumb: "https://storage.googleapis.com/odyssey-art-assets/Luxid.png", name: "Luxid"};
    return undefined;
  };

  const newSpaceTemplates = sourcePublicBridgeTemplates.map((t) => {
    const orgOwner = (t.destOrgId == undefined) ? [destNgpOrgId] : [destNgpOrgId, t.destOrgId];
    const niceThumb = resolveNiceStuff(t.id)?.thumb;
    const niceName = resolveNiceStuff(t.id)?.name;
    const spaceTemplate: BridgeSpaceTemplate = {
      id: t.id,
      public: t.spaceTemplate.public,
      name: (niceName == undefined) ? t.spaceTemplate.name : niceName,
      type: t.spaceTemplate.type,
      thumb: (niceThumb == undefined) ? t.spaceTemplate.thumb : niceThumb,
      orgOwner,
      ueId: "",
      unrealProject: {...t.spaceTemplate.unrealProject, unrealProjectVersionId: "latest"},
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
    const unrealProject: UnrealProject = {
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
    const unrealProjectVersion: UnrealProjectVersion = {
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
  const toWrite : MigrationExport = {
    newSpaceTemplates,
    newUnrealProjects,
    newUnrealProjectVersions,
    destinationEnv,
  };
  fs.writeFileSync(outfile, JSON.stringify(toWrite, undefined, 2));
})();
