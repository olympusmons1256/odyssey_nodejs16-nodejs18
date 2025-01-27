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
function logwarn(msg, obj) {
    log("WARN", msg, obj);
}
(async () => {
    const organizations = await (0, firestore_1.getOrganizations)();
    if (organizations == undefined || organizations.length < 1) {
        logwarn("No organizations found");
        return;
    }
    loginfo(`Found ${organizations.length} organizations`);
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
    loginfo(`Got ${spaceDocs.length} space docs`);
    spaceDocs.forEach((o) => {
        if (o.doc.id == "tCpWu8htNK3xTy6HuQhSRe") {
            loginfo(o.doc.id + ": " + JSON.stringify(o.space));
        }
        else {
            loginfo(o.doc.id + " not matched");
        }
    });
})();
//# sourceMappingURL=migrate-5.2.1_check-bad-spaces.js.map