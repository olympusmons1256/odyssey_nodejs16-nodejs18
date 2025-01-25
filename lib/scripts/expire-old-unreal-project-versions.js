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
async function expireOldUnrealProjectVersions() {
    const query = await admin.firestore().collection("unrealProjects")
        .get();
    const result = query.docs.flatMap(async (doc) => {
        const result = await admin.firestore().collection("unrealProjects")
            .doc(doc.id)
            .collection("unrealProjectVersions")
            .where("state", "==", "volume-copy-complete")
            .orderBy("created", "desc")
            .get();
        if (result.docs === undefined || result.docs.length <= 0)
            return [];
        return result.docs.slice(2);
    });
    return await Promise.all((await Promise.all(result))
        .flatMap((item) => item === undefined || item.length <= 0 ? [] : item)
        .map(async (doc) => await doc.ref.update({ state: "volume-copy-expiring" })));
}
expireOldUnrealProjectVersions();
//# sourceMappingURL=expire-old-unreal-project-versions.js.map