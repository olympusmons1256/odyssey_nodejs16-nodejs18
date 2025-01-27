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
const lodash_1 = require("lodash");
const misc_1 = require("../lib/misc");
(async () => {
    const upvs = (await admin.firestore().collectionGroup("unrealProjectVersions").where("state", "==", "volume-copy-complete").get()).docs;
    console.debug(`Got ${upvs.length} UPVs`);
    const upvsToUpdate = upvs.map((doc) => {
        const upv = doc.data();
        const oldBridgeToolkitFileSettings = upv.bridgeToolkitFileSettings;
        const bridgeToolkitFileSettings = (() => {
            var _a, _b, _c, _d;
            // Legacy projects
            if (oldBridgeToolkitFileSettings === undefined) {
                console.debug(`${doc.ref.path}: Legacy project with no bridgeToolkitFileSettings`);
                return {
                    levels: {},
                    configurator: true,
                    supportsMultiplayer: true,
                    customCharacterClass: false,
                };
            }
            // Pixelstreaming-only projects
            if (oldBridgeToolkitFileSettings.pixelstreamingOnly) {
                console.debug(`${doc.ref.path}: Pixelstreaming-only project`);
                return {
                    levels: oldBridgeToolkitFileSettings.levels,
                    configurator: false,
                    supportsMultiplayer: (_a = oldBridgeToolkitFileSettings.supportsMultiplayer) !== null && _a !== void 0 ? _a : true,
                    customCharacterClass: (_b = oldBridgeToolkitFileSettings.customCharacterClass) !== null && _b !== void 0 ? _b : false,
                };
            }
            // Non-pixelstreaming projects
            console.debug(`${doc.ref.path}: Standard project`);
            return {
                levels: oldBridgeToolkitFileSettings.levels,
                configurator: true,
                supportsMultiplayer: (_c = oldBridgeToolkitFileSettings.supportsMultiplayer) !== null && _c !== void 0 ? _c : true,
                customCharacterClass: (_d = oldBridgeToolkitFileSettings.customCharacterClass) !== null && _d !== void 0 ? _d : false,
            };
        })();
        if (bridgeToolkitFileSettings == undefined) {
            console.debug(`${doc.ref.path}: Unmatched case`);
            return { doc };
        }
        if ((0, lodash_1.isEqual)(upv.bridgeToolkitFileSettings, bridgeToolkitFileSettings)) {
            console.debug(`${doc.ref.path}: No change to object`);
            return { doc };
        }
        const update = Object.assign(Object.assign({}, Object.assign(Object.assign({}, upv), { bridgeToolkitFileSettings })), { oldBridgeToolkitFileSettings, oldBridgeToolkitFileSettingsMigratedAt: admin.firestore.Timestamp.now() });
        return { doc, update };
    });
    const f = async (update) => {
        if (update.update == undefined)
            return;
        console.debug(`Updating ${update.doc.ref.path} with ${JSON.stringify(update.update)}`);
        return update.doc.ref.update(update.update).catch((e) => console.error(`Failed to update ${update.doc.ref.path}: ${e}`)).then(() => console.error(`Successfully updated ${update.doc.ref.path}`));
    };
    return await (0, misc_1.timeChunkedOperation)(upvsToUpdate, 10, 1000, undefined, undefined, f);
})();
//# sourceMappingURL=20231101-migrate-default-bridgetoolkitsettings.js.map