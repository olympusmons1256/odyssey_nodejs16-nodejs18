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
const misc_1 = require("../lib/misc");
const newProjectIds = {
    "Mountain Campus": "42JjBN0QabURvzsRmepg",
    "Naturedome": "XZ4ANw5muyjmjRXLCUPu",
    "Lighthouse": "LSITF0tX5fO3q0afBu5j",
    "Beach": "MzlMWHqKFnFw27rIzSIl",
    "Classroom": "VxCGhTVwuLzseXBkN9CF",
    "Courtyard": "uhoIenJfJIico5OUDGCo",
    "Villa": "4FrvrJe1q27ec6ZFrVI0",
};
function oldProjectToNew(oldProjectId) {
    switch (oldProjectId) {
        case "NQ2g2SfWm3QvZa00KPp9": return { name: "Mountain Campus", newProjectId: newProjectIds["Mountain Campus"], oldProjectId: oldProjectId };
        case "QeiAtPQEGVJVf2uHkRty": return { name: "Naturedome", newProjectId: newProjectIds["Naturedome"], oldProjectId: oldProjectId };
        case "FW7I0VORLDKAbHmgKwVM": return { name: "Lighthouse", newProjectId: newProjectIds["Lighthouse"], oldProjectId: oldProjectId };
        case "VhN9W7e2RaouYaPnhdh7": return { name: "Beach", newProjectId: newProjectIds["Beach"], oldProjectId: oldProjectId };
        case "TC35zrIEtjLLGRpnV1yu": return { name: "Classroom", newProjectId: newProjectIds["Classroom"], oldProjectId: oldProjectId };
        case "eipn2YEBNx4VtbFPQZJG": return { name: "Courtyard", newProjectId: newProjectIds["Courtyard"], oldProjectId: oldProjectId };
        case "Gb6TfcvXRadaOpcgJlDU": return { name: "Villa", newProjectId: newProjectIds["Villa"], oldProjectId: oldProjectId };
        default: return undefined;
    }
}
(async () => {
    const spaceTemplates = await (0, firestore_1.getSpaceTemplates)();
    if (spaceTemplates == undefined)
        throw new Error("Failed to get any space templates");
    console.debug(`Found ${spaceTemplates.length} space templates`);
    /*
    const spacesTemplatesToUpdate = spaceTemplates
      .flatMap(([doc, spaceTemplate]) => {
        if (doc == undefined || spaceTemplate == undefined) {
          return [];
        }
        if (spaceTemplate.unrealProject?.unrealProjectId == undefined) {
          console.debug(`Space template doesn't have an unrealProject.unrealProjectId: ${doc.ref.path}`);
          return [];
        }
        const update = oldProjectToNew(spaceTemplate.unrealProject.unrealProjectId);
        if (update == undefined) {
          return [];
        }
        console.debug(`Space template on outdated ${update.name}: ${doc.ref.path}`);
        return [{doc, update, spaceTemplate}];
      });
    console.debug(`Space template docs to update: ${spacesTemplatesToUpdate.length}`);
  
    const spaceTemplateUpdates = spacesTemplatesToUpdate.map((spaceTemplate) => {
      const unrealProject : SpaceUnrealProject = {
        unrealProjectId: spaceTemplate.update.newId,
        unrealProjectVersionId: "latest",
      };
      return {
        update: {
          ...spaceTemplate.spaceTemplate,
          unrealProject,
          oldUnrealProjectId: spaceTemplate.update.oldProjectId,
          migratedAt: admin.firestore.Timestamp.now(),
        },
        doc: spaceTemplate.doc,
      };
    });
    */
    const spaces = (await admin.firestore().collectionGroup("spaces").get()).docs;
    console.debug(`Space docs found: ${spaces.length}`);
    const spacesToUpdate = spaces
        .flatMap((doc) => {
        var _a;
        if (doc.exists == false) {
            console.debug(`Space doesn't exist: ${doc.ref.path}`);
            return [];
        }
        const space = doc.data();
        if (((_a = space.unrealProject) === null || _a === void 0 ? void 0 : _a.unrealProjectId) == undefined) {
            console.debug(`Space doesn't have an unrealProject.unrealProjectId: ${doc.ref.path}`);
            return [];
        }
        const update = oldProjectToNew(space.unrealProject.unrealProjectId);
        if (update == undefined) {
            return [];
        }
        // console.debug(`Space on outdated ${update.name}: ${doc.ref.path}`);
        return [{ doc, update, space }];
    });
    console.debug(`Spaces to update: ${spacesToUpdate.length}`);
    const newSpaceTemplatesByUnrealProjectId = spaceTemplates.reduce((acc, sT) => {
        var _a;
        const [spaceTemplateDoc, spaceTemplate] = sT;
        if (spaceTemplateDoc == undefined || spaceTemplate == undefined || ((_a = spaceTemplate.unrealProject) === null || _a === void 0 ? void 0 : _a.unrealProjectId) == undefined)
            return acc;
        const newAndOldProjects = oldProjectToNew(spaceTemplate.unrealProject.unrealProjectId);
        if (newAndOldProjects == undefined)
            return acc;
        const newTemplateRecord = spaceTemplates.find((o) => { var _a, _b; return ((_b = (_a = o[1]) === null || _a === void 0 ? void 0 : _a.unrealProject) === null || _b === void 0 ? void 0 : _b.unrealProjectId) == newAndOldProjects.newProjectId; });
        if (newTemplateRecord == undefined)
            return acc;
        const [newTemplateDoc, newTemplate] = newTemplateRecord;
        if (newTemplateDoc == undefined || newTemplate == undefined)
            return acc;
        const newTemplateD = Object.assign(Object.assign({}, newTemplate), { id: newTemplateDoc.id });
        const oldTemplateD = Object.assign(Object.assign({}, spaceTemplate), { id: spaceTemplateDoc.id });
        acc[newAndOldProjects.newProjectId] = { oldTemplate: oldTemplateD, newTemplate: newTemplateD };
        console.debug(`New project: ${spaceTemplate.unrealProject.unrealProjectId} has old template: ${oldTemplateD.id} and new template: ${newTemplateD.id}`);
        return acc;
    }, {});
    const spaceUpdates = spacesToUpdate.flatMap((space) => {
        const newSpaceTemplateId = newSpaceTemplatesByUnrealProjectId[space.update.newProjectId].newTemplate.id;
        const unrealProject = {
            unrealProjectId: space.update.newProjectId,
            unrealProjectVersionId: "latest",
        };
        if (newSpaceTemplateId == undefined) {
            console.debug(`Failed to resolve new spaceTemplateId for: ${space.doc.ref.path}`);
            return [];
        }
        return [{
                update: Object.assign(Object.assign({}, space.space), { unrealProject, oldUnrealProjectId: space.update.oldProjectId, oldSpaceTemplateId: space.space.spaceTemplateId, migratedAt: admin.firestore.Timestamp.now(), spaceTemplateId: newSpaceTemplateId }),
                doc: space.doc,
            }];
    });
    const spaceTemplateUpdates = Object.values(newSpaceTemplatesByUnrealProjectId).flatMap((o) => {
        return [Object.assign(Object.assign({}, o.newTemplate), { thumb: o.oldTemplate.thumb, name: o.oldTemplate.name, public: o.oldTemplate.public, description: o.oldTemplate.description, demoUrl: o.oldTemplate.demoUrl }), Object.assign(Object.assign({}, o.oldTemplate), { public: false }),];
    });
    console.debug(`Space templates to update: ${spaceTemplateUpdates.length}`);
    await (0, misc_1.timeChunkedOperation)(spaceUpdates, 10, 1000, undefined, undefined, async (u) => {
        console.debug(`Updatng space: ${u.doc.ref.path} to`);
        console.debug(u.update);
        await u.doc.ref.update(u.update);
    });
    await (0, misc_1.timeChunkedOperation)(spaceTemplateUpdates, 10, 1000, undefined, undefined, async (u) => {
        const spaceTemplateRef = (0, firestore_1.getSpaceTemplateRef)(u.id);
        console.debug(`Updatng space template: ${spaceTemplateRef.path} to`);
        console.debug(u);
        await spaceTemplateRef.update(u);
    });
})();
//# sourceMappingURL=20240201-use-fixed-example-projects.js.map