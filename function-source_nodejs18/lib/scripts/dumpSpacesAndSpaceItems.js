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
const fs = __importStar(require("node:fs"));
const firestore_1 = require("../lib/documents/firestore");
function log(level, msg, obj) {
    const message = `${new Date().toISOString()} - ${level}: ${msg}`;
    if (obj == undefined) {
        console.error(message);
    }
    else {
        console.error(message, obj);
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
    const organizationId = process.env["ORGANIZATION_ID"];
    if (organizationId == undefined) {
        logerror("Must specify ORGANIZATION_ID");
        process.exit(1);
    }
    const [organizationDoc, organization] = await (0, firestore_1.getOrganization)(organizationId);
    if (organizationDoc == undefined || organization == undefined) {
        logerror(`Organization ${organizationId} not found`);
        process.exit(1);
    }
    // const irisHallOrgId = "89A7mkSxFRM7tNydH2xcqd";
    // const irisHallOrgId = "lUhC4Ckd1yuaOFf9nEbJ";
    const spaces = await (0, firestore_1.getSpaces)(organizationId);
    if (spaces == undefined || spaces.length < 1) {
        logerror("No spaces found");
        return;
    }
    const spacesWithSpaceItems = (await Promise.all(spaces.map(async ([spaceDoc, space]) => {
        if (spaceDoc == undefined || space == undefined) {
            logwarn("Space undefined");
            return undefined;
        }
        const spaceItems = await (0, firestore_1.getSpaceItems)(organizationId, spaceDoc.id);
        if (spaceItems == undefined) {
            return undefined;
        }
        const spaceItemsFiltered = spaceItems.flatMap(([spaceItemDoc, spaceItem]) => {
            if (spaceItemDoc == undefined ||
                spaceItem == undefined ||
                spaceItemDoc.id === "BridgeToolkitSettings" ||
                spaceItem.type === "BridgeToolkitSettings")
                return [];
            return {
                id: spaceItemDoc.id,
                spaceItem,
            };
        });
        loginfo(`Got ${spaceItemsFiltered.length} space items in space ${spaceDoc.ref.path}`);
        return {
            space: {
                id: spaceDoc.id,
                name: space.name,
                created: space.created,
                updated: space.updated,
                isPublic: space.isPublic,
                allowEmbed: space.allowEmbed,
            },
            items: spaceItemsFiltered,
        };
    }))).flatMap((v) => v == undefined ? [] : v);
    const outfile = `/tmp/odyssey-spaces-with-spaceItems-${organizationDoc.id}-${Date.now()}.json`;
    loginfo("Writing spaces & spaceItems to JSON file");
    fs.writeFileSync(outfile, JSON.stringify(spacesWithSpaceItems, undefined, 2));
})();
//# sourceMappingURL=dumpSpacesAndSpaceItems.js.map