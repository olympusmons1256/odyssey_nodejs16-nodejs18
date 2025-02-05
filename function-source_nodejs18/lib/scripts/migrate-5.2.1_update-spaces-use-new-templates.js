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
function ueIdToSpaceTemplateId(spaceId, ueId) {
    const courtyard = "wclPsXXHbARz7dZ5SxRs";
    const mcdonalds = "aabdpYcFZHfMpyG9xgB8";
    const buildmediaPenthouse = "MOC9DYWsZg3dtc2gVvDm";
    const naturedome = "ji3g0KfKRl2zrcKCPPiZ";
    const mountainCampus = "TBTDWJRmmmsXwOMskM1h";
    const beach = "7QVxoYOx0jQG8YJikM34";
    const villa = "m1UnYm5fZxfKlh9R2ThW";
    // const villaNight = "xOmn2jNzcg4O2XdCyI2w";
    const classroom = "Ac6m24Rs89NyFZpuRDio";
    const lighthouse = "pmoTnAszZohvxeFVIpF6";
    const atlOffice = "tcizOXu3OUs0Y2IJfo0J";
    const vikram = "hNOG68uUEi0dZJliLneq";
    const luxid = "gvNcDGttWONqqN6p7THP";
    const smallOffice = "UCN9LlyiMaXtjd744PeW";
    const defaultTemplateId = mountainCampus;
    if (ueId == undefined) {
        logwarn(`${spaceId} - ueId is undefined. Using undefined`);
        return undefined;
    }
    const match = /([0-9][0-9]*)(-[0-9][0-9]*)*$/.exec(ueId);
    if (match == null || match.length < 2) {
        logwarn(`${spaceId} - ueId: ${ueId} is invalid. Using undefined`);
        return undefined;
    }
    const majorId = match[1];
    switch (majorId) {
        case "0": return classroom;
        case "2": return mountainCampus;
        case "3": return naturedome;
        case "4": return courtyard;
        case "7": return buildmediaPenthouse;
        case "9": return vikram;
        case "10": return beach;
        case "13": return mcdonalds;
        case "15": return naturedome;
        case "16": return smallOffice;
        case "12": return smallOffice;
        case "18": return atlOffice;
        case "19": return luxid;
        // case "23": return villaNight;
        case "23":
        case "24": return villa;
        case "30": return smallOffice;
        case "31": return lighthouse;
        default: {
            logwarn(`${spaceId} - ueId: ${ueId} is unmatched. Defaulting to ${defaultTemplateId}`);
            return defaultTemplateId;
        }
    }
}
(async () => {
    const organizations = await (0, firestore_1.getOrganizations)();
    if (organizations == undefined || organizations.length < 1) {
        logwarn("No organizations found");
        return;
    }
    loginfo(`Found ${organizations.length} organizations`);
    const spaceTemplateDocs = await (0, firestore_1.getSpaceTemplates)();
    if (spaceTemplateDocs == undefined || spaceTemplateDocs.length < 1) {
        logwarn("No spaceTemplates found");
        return;
    }
    loginfo(`Found ${spaceTemplateDocs.length} spaceTemplates`);
    const spaceTemplates = spaceTemplateDocs.flatMap(([doc, spaceTemplate]) => {
        if (doc == undefined || spaceTemplate == undefined)
            return [];
        return {
            doc,
            spaceTemplate,
        };
    });
    const spaceDocs = (await Promise.all(organizations.map(async ([organizationDoc]) => {
        if (organizationDoc == undefined)
            return [];
        const result = await (0, firestore_1.getSpaces)(organizationDoc.id);
        if (result == undefined)
            return [];
        return result;
    }))).flat().flatMap(([spaceDoc, space]) => {
        var _a, _b;
        if (spaceDoc == undefined || space == undefined)
            return [];
        const organizationId = (_a = spaceDoc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
        if (organizationId == undefined) {
            logwarn(`Failed to get organizationId of space: ${spaceDoc.id}`);
            return [];
        }
        return [{
                organizationId: (_b = spaceDoc.ref.parent.parent) === null || _b === void 0 ? void 0 : _b.id,
                doc: spaceDoc,
                space,
            }];
    });
    if (spaceDocs == undefined || spaceDocs.length < 1) {
        logwarn("No project versions found");
        return;
    }
    loginfo(`Found ${spaceDocs.length} space docs`);
    const odysseyArtSpaceDocs = spaceDocs.filter((o) => {
        const spaceTemplateId = ueIdToSpaceTemplateId(o.doc.id, o.space.ueId);
        if (spaceTemplateId == undefined)
            return false;
        if (o.space.oldSpaceTemplateId != undefined && o.space.spaceTemplateId != spaceTemplateId)
            return true;
        return o.space.unrealProject == undefined && o.space.spaceTemplateId != undefined;
    });
    loginfo(`Found ${odysseyArtSpaceDocs.length} odyssey art space docs`);
    const updates = odysseyArtSpaceDocs.map(async (o) => {
        try {
            const newSpaceTemplateId = ueIdToSpaceTemplateId(o.doc.id, o.space.ueId);
            const spaceTemplate = spaceTemplates.find((sT) => sT.doc.id == newSpaceTemplateId);
            if (spaceTemplate == undefined) {
                logerror(`${o.doc.id}: couldn't find suitable space template`);
                return;
            }
            const oldSpaceTemplateId = (o.space.oldSpaceTemplateId != undefined) ? o.space.oldSpaceTemplateId : o.space.spaceTemplateId;
            const update = {
                updated: admin.firestore.Timestamp.now(),
                oldSpaceTemplateId,
                spaceTemplateId: newSpaceTemplateId,
                unrealProject: spaceTemplate === null || spaceTemplate === void 0 ? void 0 : spaceTemplate.spaceTemplate.unrealProject,
            };
            await o.doc.ref.update(update);
            return true;
        }
        catch (e) {
            logerror(e);
            logerror(`Failed to update space: ${o.doc.id}`);
            return false;
        }
    });
    const successful = (await Promise.all(updates)).filter((r) => r == true);
    loginfo(`Successfully updated ${successful.length} spaces`);
})();
//# sourceMappingURL=migrate-5.2.1_update-spaces-use-new-templates.js.map