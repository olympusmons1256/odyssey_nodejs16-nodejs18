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
const misc_1 = require("../lib/misc");
(async () => {
    const spaceItemDocs = (await admin.firestore().collectionGroup("spaceItems").get()).docs;
    console.debug(`Space item docs found: ${spaceItemDocs.length}`);
    const spaceItemDocsToDelete = spaceItemDocs
        .flatMap((spaceItemDoc) => {
        const spaceItem = spaceItemDoc.data();
        if (spaceItemDoc.id != "BridgeToolkitSettings" && spaceItem.type == "BridgeToolkitSettings") {
            return [spaceItemDoc];
        }
        return [];
    });
    console.debug(`Space item docs to delete: ${spaceItemDocsToDelete.length}`);
    return await (0, misc_1.timeChunkedOperation)(spaceItemDocsToDelete, 10, 1000, undefined, undefined, async (spaceItemDoc) => {
        await spaceItemDoc.ref.delete();
        console.debug(`Deleted space item doc: ${spaceItemDoc.ref.path}`);
    });
})();
//# sourceMappingURL=20231111-migrate-delete-bad-bridgetoolkitsettings-space-items.js.map