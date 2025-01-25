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
    console.debug(process.argv);
    const operation = process.argv[2];
    if (operation != "enable" && operation != "disable") {
        logerror("Must specify CLI arg 'enable' or 'disable'");
        process.exit(1);
    }
    const newUnrealEngineVersion = "5.2.1";
    const unrealProjects = await (0, firestore_1.getUnrealProjects)();
    if (unrealProjects == undefined || unrealProjects.length < 1) {
        logwarn("No projects found");
        return;
    }
    loginfo(`Found ${unrealProjects.length} unreal projects`);
    const oldStateValue = (() => {
        if (operation == "enable")
            return "volume-copy-complete" + "-" + newUnrealEngineVersion;
        return "volume-copy-complete";
    })();
    const newStateValue = (() => {
        if (operation == "enable")
            return "volume-copy-complete";
        return "volume-copy-complete" + "-" + newUnrealEngineVersion;
    })();
    const unrealProjectVersionDocs = (await Promise.all(unrealProjects.map(async ([unrealProjectDoc]) => {
        if (unrealProjectDoc == undefined)
            return [];
        const result = await (0, firestore_1.getUnrealProjectVersions)(unrealProjectDoc.id, [{ fieldPath: "unrealEngineVersion", opStr: "==", value: newUnrealEngineVersion }, { fieldPath: "state", opStr: "==", value: oldStateValue }]);
        if (result == undefined)
            return [];
        return result;
    }))).flat().flatMap(([unrealProjectVersionDoc, unrealProjectVersion]) => {
        if (unrealProjectVersionDoc == undefined || unrealProjectVersion == undefined)
            return [];
        return [{
                doc: unrealProjectVersionDoc,
                unrealProjectVersion,
            }];
    });
    if (unrealProjectVersionDocs == undefined || unrealProjectVersionDocs.length < 1) {
        logwarn("No project versions found");
        return;
    }
    loginfo(`Found ${unrealProjects.length} unreal project versions`);
    const updates = unrealProjectVersionDocs.map(async (o) => {
        try {
            await o.doc.ref.update({ state: newStateValue });
            return true;
        }
        catch (e) {
            logerror(`Failed to update project version: ${o.doc.id}`);
            return false;
        }
    });
    const successful = (await Promise.all(updates)).filter((r) => r == true);
    loginfo(`Successfully updated ${successful.length} project versions`);
})();
//# sourceMappingURL=migrate-5.2.1_disable-or-enable-rebuilds.js.map