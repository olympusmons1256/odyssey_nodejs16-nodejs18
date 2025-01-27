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
const firestore_bigquery_change_tracker_1 = require("@newgameplus/firestore-bigquery-change-tracker");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const activity_1 = require("../lib/activity");
const firestore_1 = require("../lib/documents/firestore");
const misc_1 = require("../lib/misc");
(async () => {
    const knownDocs = [];
    // admin.firestore().collectionGroup("unrealProjectVersions").onSnapshot((upvDocs) => {
    (0, firestore_1.getUnrealProjectVersionsRef)("bEFmovJumRLngfGAJw54").onSnapshot((upvDocs) => {
        upvDocs.forEach((upvDoc) => {
            var _a;
            const upv = upvDoc.data();
            const unrealProjectId = (_a = upvDoc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
            const isCreate = !knownDocs.includes(upvDoc.id);
            knownDocs.push(upvDoc.id);
            const changeType = (() => {
                if (isCreate)
                    return firestore_bigquery_change_tracker_1.ChangeType.CREATE;
                if (upvDoc.exists)
                    return firestore_bigquery_change_tracker_1.ChangeType.UPDATE;
                return firestore_bigquery_change_tracker_1.ChangeType.DELETE;
            })();
            const timestamp = new Date();
            return (0, activity_1.slackActivityFromUnrealProjectVersion)(unrealProjectId, upv, changeType, upvDoc.ref, timestamp);
        });
    });
    await (0, misc_1.sleepForever)();
})();
//# sourceMappingURL=test-activity.js.map