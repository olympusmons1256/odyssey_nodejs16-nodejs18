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
exports.saveSpaceHistory = void 0;
const admin = __importStar(require("firebase-admin"));
const jsum = __importStar(require("jsum"));
const firestore_1 = require("./documents/firestore");
async function saveSpaceHistory(organizationId, spaceId, timestamp, space, authorUserId, name) {
    const getAuthorUser = async () => {
        if (authorUserId == undefined)
            return undefined;
        const [, user] = await (0, firestore_1.getUser)(authorUserId);
        if (user == undefined)
            return "error-not-found";
        return user;
    };
    try {
        const authorUser = await getAuthorUser();
        if (authorUser == "error-not-found")
            return "error-author-user-not-found";
        const spaceItemDocs = await (0, firestore_1.getSpaceItems)(organizationId, spaceId);
        if (spaceItemDocs == undefined)
            return "error-space-items-not-found";
        const spaceItems = spaceItemDocs.reduce((acc, [doc, item]) => {
            if (doc != undefined && item != undefined) {
                acc[doc.id] = item;
            }
            return acc;
        }, {});
        if (Object.values(spaceItems).length != spaceItemDocs.length) {
            console.error("Some space items are missing from query");
            return "error-internal";
        }
        const getSpaceIfNotSet = async () => {
            if (space != undefined)
                return space;
            const [, spaceLatest] = await (0, firestore_1.getSpace)(organizationId, spaceId);
            return spaceLatest;
        };
        const spaceToUse = await getSpaceIfNotSet();
        if (spaceToUse == undefined) {
            console.error("Couldn't find space", { organizationId, spaceId });
            return "error-not-found";
        }
        const checksum = jsum.digest({ space, spaceItems }, "SHA256", "hex");
        const spaceHistory = {
            name,
            timestamp: admin.firestore.Timestamp.now(),
            authorName: (authorUser != undefined) ? authorUser.name : undefined,
            authorUserId,
            authorType: (authorUser != undefined) ? "user" : "system",
            checksum,
            space: spaceToUse,
        };
        const spaceHistoryDocId = (timestamp != undefined) ? timestamp.toISOString() : new Date().toISOString();
        await (0, firestore_1.getSpaceHistoryCollectionRef)(organizationId, spaceId).doc(spaceHistoryDocId).create(spaceHistory);
        const spaceItemsJson = JSON.stringify(spaceItems);
        const maxDataLength = 1048576 - 1024; // 1MB less 1KB for extra fields in future
        const pages = Array.from(Array(Math.ceil(spaceItemsJson.length / maxDataLength)).keys()).map((v) => {
            const start = maxDataLength * v;
            const end = (maxDataLength * (v + 1)) - 1;
            const data = spaceItemsJson.slice(start, end);
            return {
                data,
            };
        });
        await Promise.all(pages.map(async (page, index) => {
            return await (0, firestore_1.getSpaceItemsHistoryPagesRef)(organizationId, spaceId, spaceHistoryDocId).doc(index.toString()).create(page);
        }));
        return {
            id: spaceHistoryDocId,
            spaceHistory,
            spaceItemsHistoryPages: pages,
        };
    }
    catch (e) {
        console.error(e);
        return "error-internal";
    }
}
exports.saveSpaceHistory = saveSpaceHistory;
//# sourceMappingURL=spaces.js.map