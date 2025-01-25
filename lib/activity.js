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
exports.onWriteUnrealProjectVersion = void 0;
const functions = __importStar(require("firebase-functions"));
const shared_1 = require("./shared");
const firestore_1 = require("./lib/documents/firestore");
const util_1 = require("./lib/bigQueryExport/util");
const activity_1 = require("./lib/activity");
const customRunWithSlackToken = Object.assign(Object.assign({}, shared_1.customRunWith), { secrets: ["SLACK_TOKEN"] });
exports.onWriteUnrealProjectVersion = 
// onWrite() of unreal project version
functions
    .runWith(customRunWithSlackToken)
    .firestore
    .document((0, firestore_1.unrealProjectVersionWildcardPath)())
    .onWrite(async (change, context) => {
    var _a, _b, _c;
    const upv = change.after.data();
    const unrealProjectId = (_a = change.after.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
    const changeType = (0, util_1.getChangeType)(change);
    const upvDocRef = change.after.ref;
    if (((_b = change.after.data()) === null || _b === void 0 ? void 0 : _b.state) == ((_c = change.before.data()) === null || _c === void 0 ? void 0 : _c.state)) {
        console.debug("State didn't change. Nothing to do");
        return;
    }
    const timestamp = new Date(context.timestamp);
    return await (0, activity_1.slackActivityFromUnrealProjectVersion)(unrealProjectId, upv, changeType, upvDocRef, timestamp);
});
//# sourceMappingURL=activity.js.map