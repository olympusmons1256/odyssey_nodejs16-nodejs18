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
(async () => {
    const oldPluginEngineVersion = "5.0.3";
    const pluginVersions = await (0, firestore_1.getUnrealPluginVersions)();
    if (pluginVersions == undefined || pluginVersions.length < 1) {
        logwarn("No plugin versions found");
        return;
    }
    loginfo(`Found ${pluginVersions.length}`);
    const pluginVersionsToUpdate = pluginVersions.flatMap(([doc, pluginVersion]) => {
        if (pluginVersion == undefined || doc == undefined) {
            logwarn("Plugin version undefined");
            return [];
        }
        if (pluginVersion.unrealEngineVersion != undefined) {
            logwarn(`Plugin version already has unrealEngineVersion: ${pluginVersion.unrealEngineVersion} - ${doc.id}`);
            return [];
        }
        return [{ doc, pluginVersion }];
    });
    loginfo(`Found ${pluginVersionsToUpdate.length} to update`);
    const updates = pluginVersionsToUpdate.map(async (o) => {
        try {
            await o.doc.ref.update({ unrealEngineVersion: oldPluginEngineVersion });
            return true;
        }
        catch (e) {
            logerror(`Failed to update plugin version: ${o.doc.id}`);
            return false;
        }
    });
    const successful = (await Promise.all(updates)).filter((r) => r == true);
    loginfo(`Successfully updated ${successful.length} plugin versions`);
})();
//# sourceMappingURL=migrate-5.2.1_add-version-to-old-plugin-versions.js.map