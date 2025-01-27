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
(async () => {
    const spaces = (await admin.firestore().collectionGroup("spaces").get()).docs;
    console.debug(`Space docs found: ${spaces.length}`);
    const spacesMissingSpaceTemplateId = spaces
        .flatMap((doc) => {
        const space = doc.data();
        if (space.spaceTemplateId == undefined || space.spaceTemplateId == "") {
            console.debug(`Space has missing spaceTemplateId: ${doc.ref.path}`);
            return [{ doc, space }];
        }
        return [];
    });
    console.debug(`Space docs to update: ${spacesMissingSpaceTemplateId.length}`);
    const spaceTemplates = await (0, firestore_1.getSpaceTemplates)();
    if (spaceTemplates == undefined)
        throw new Error("Failed to get any space templates");
    const spaceTemplatesByUnrealProjectId = spaceTemplates === null || spaceTemplates === void 0 ? void 0 : spaceTemplates.reduce((acc, sT) => {
        var _a, _b;
        const [spaceTemplateDoc, spaceTemplate] = sT;
        if (spaceTemplateDoc == undefined || spaceTemplate == undefined || ((_a = spaceTemplate.unrealProject) === null || _a === void 0 ? void 0 : _a.unrealProjectId) == undefined) {
            console.debug(`SpaceTemplate is invalid: ${(_b = sT[0]) === null || _b === void 0 ? void 0 : _b.ref.path}`);
            return acc;
        }
        acc[spaceTemplate.unrealProject.unrealProjectId] = spaceTemplateDoc.id;
        return acc;
    }, {});
    const spaceUpdates = spacesMissingSpaceTemplateId.flatMap((space) => {
        var _a;
        const unrealProjectId = (_a = space.space.unrealProject) === null || _a === void 0 ? void 0 : _a.unrealProjectId;
        if (unrealProjectId == undefined) {
            console.debug(`Space is missing unrealProject.unrealProjectId: ${space.doc.ref.path}`);
            return [];
        }
        const spaceTemplateId = spaceTemplatesByUnrealProjectId[unrealProjectId];
        if (spaceTemplateId == undefined) {
            console.debug(`Failed to resolve new spaceTemplateId for: ${space.doc.ref.path}`);
            return [];
        }
        return [{
                update: Object.assign(Object.assign({}, space.space), { spaceTemplateId }),
                doc: space.doc,
            }];
    });
    const unrealProjectsToRedenormalize = spaceUpdates.flatMap((s) => { var _a, _b; return ((_a = s.update.unrealProject) === null || _a === void 0 ? void 0 : _a.unrealProjectId) ? [(_b = s.update.unrealProject) === null || _b === void 0 ? void 0 : _b.unrealProjectId] : []; });
    await (0, misc_1.timeChunkedOperation)(spaceUpdates, 10, 1000, undefined, undefined, async (spaceUpdate) => {
        console.debug(`Updatng space: ${spaceUpdate.doc.ref.path}`);
        await spaceUpdate.doc.ref.update(spaceUpdate.update);
    });
    await (0, misc_1.timeChunkedOperation)(unrealProjectsToRedenormalize, 10, 1000, undefined, undefined, async (unrealProjectId) => {
        const latestProjectVersionDoc = (await (0, firestore_1.getUnrealProjectRef)(unrealProjectId).collection("unrealProjectVersions")
            .orderBy("created", "desc")
            .limit(1).get()).docs.pop();
        if (latestProjectVersionDoc == undefined || latestProjectVersionDoc.exists != true)
            return console.error(`Failed to get latest project version for unrealProjectId: ${unrealProjectId}`);
        console.debug(`Updating UPV ${latestProjectVersionDoc.ref.path} for redenormalization of spaceTemplate ${spaceTemplatesByUnrealProjectId[unrealProjectId]}`);
        await latestProjectVersionDoc.ref.update({ state: "re-denormalize" });
        await (0, misc_1.sleep)(1000);
        await latestProjectVersionDoc.ref.update({ state: "volume-copy-complete" });
    });
})();
//# sourceMappingURL=20231114-migrate-fix-spaces-missing-spaceTemplateId.js.map