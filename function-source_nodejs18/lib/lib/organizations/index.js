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
exports.createNewOrganizationWithOwner = void 0;
const firestore_1 = require("../documents/firestore");
const users_1 = require("../users");
const uuid_1 = require("uuid");
const admin = __importStar(require("firebase-admin"));
async function createNewOrganizationWithOwner(name, ownerId) {
    try {
        // define organization data
        const organizationId = (0, uuid_1.v4)();
        const organizationDomain = organizationId;
        const organization = {
            created: admin.firestore.Timestamp.now(),
            updated: admin.firestore.Timestamp.now(),
            name,
            domain: organizationDomain,
        };
        // create organization and assign organization owner
        await (0, firestore_1.getOrganizationRef)(organizationId).set(organization);
        await (0, users_1.addOrganizationUser)(organizationId, ownerId, "org_owner");
        return organizationId;
    }
    catch (e) {
        console.error("Failed to create new organization");
        console.error({ name, ownerId });
        console.error(e);
        return undefined;
    }
}
exports.createNewOrganizationWithOwner = createNewOrganizationWithOwner;
//# sourceMappingURL=index.js.map