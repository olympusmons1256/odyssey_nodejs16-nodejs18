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
(async () => {
    const spaceTemplates = await (0, firestore_1.getSpaceTemplates)();
    if (spaceTemplates == undefined)
        return [];
    console.log(`Got ${spaceTemplates.length} space templates`);
    const spaceTemplatesFiltered = spaceTemplates.flatMap(([doc, spaceTemplate]) => {
        if (doc == undefined || spaceTemplate == undefined)
            return [];
        if (spaceTemplate.unrealProject == undefined)
            return [];
        if (spaceTemplate.ueId != undefined && spaceTemplate.ueId != "")
            return [];
        return [{
                id: doc.id,
                name: spaceTemplate.name,
                created: spaceTemplate.created,
            }];
    });
    console.log(`Got ${spaceTemplatesFiltered.length} space templates that match`);
    return console.log(JSON.stringify(spaceTemplatesFiltered, undefined, 2));
})();
//# sourceMappingURL=migrate-5.2.1_search-bridge-space-templates.js.map