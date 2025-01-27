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
exports.onWritePluginVersion = void 0;
const firestore_bigquery_change_tracker_1 = require("@newgameplus/firestore-bigquery-change-tracker");
const functions = __importStar(require("firebase-functions"));
const shared_1 = require("./shared");
const util_1 = require("./lib/bigQueryExport/util");
const firestore_1 = require("./lib/documents/firestore");
const deploy_standard_1 = require("./lib/unrealPluginVersions/deploy-standard");
exports.onWritePluginVersion = 
// onWrite() of plugin version
functions
    .runWith(Object.assign(Object.assign({}, shared_1.customRunWith), { timeoutSeconds: 540 }))
    .firestore
    .document((0, firestore_1.unrealPluginVersionWildcardPath)())
    .onWrite(async (change, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    const changeType = (0, util_1.getChangeType)(change);
    if (changeType == firestore_bigquery_change_tracker_1.ChangeType.DELETE || changeType == firestore_bigquery_change_tracker_1.ChangeType.IMPORT) {
        console.debug(`Unreal project version document ${changeType} does nothing.`);
        return;
    }
    console.log("Document data:");
    console.log(JSON.stringify(change.after.data()));
    const unrealPluginVersionId = context.params.unrealPluginVersionId;
    const [, unrealPluginVersion] = await (0, firestore_1.getUnrealPluginVersion)(unrealPluginVersionId);
    if (unrealPluginVersion == undefined) {
        console.warn("UnrealPluginVersion is undefined");
    }
    switch (unrealPluginVersion === null || unrealPluginVersion === void 0 ? void 0 : unrealPluginVersion.status) {
        case "expiring":
            if (unrealPluginVersion === undefined) {
                console.error("Regions not set");
                return;
            }
            await (0, deploy_standard_1.deleteUnrealPluginVersionPvcs)(unrealPluginVersionId, unrealPluginVersion.regions);
            return await (0, firestore_1.getUnrealPluginVersionRef)(unrealPluginVersionId).update({ status: "expired" });
        case "expired":
            console.debug(`Unreal project version expired: ${unrealPluginVersionId}`);
            return;
        default:
            return console.error(`Unhandled unreal project version status ${unrealPluginVersion === null || unrealPluginVersion === void 0 ? void 0 : unrealPluginVersion.status}. Doing nothing.`);
    }
});
//# sourceMappingURL=unrealPluginVersions.js.map