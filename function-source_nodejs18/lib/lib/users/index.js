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
exports.addOrganizationUser = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("../documents/firestore");
async function addOrganizationUser(organizationId, userId, role) {
    try {
        const [userDoc, user] = await (0, firestore_1.getUser)(userId);
        if (userDoc == undefined || user == undefined) {
            console.error(`User with id '${userId}' does not exist`);
            return undefined;
        }
        const now = admin.firestore.Timestamp.now();
        const organizationUser = {
            created: now,
            updated: now,
            email: user.email,
            name: user.name,
            role,
        };
        const organizationUserRef = await (0, firestore_1.getOrganizationUserRef)(organizationId, userId).create(organizationUser);
        return organizationUserRef;
    }
    catch (e) {
        console.error("Failed to add organizationUser", { organizationId, userId, role });
        console.error(e);
        return { undefined };
    }
}
exports.addOrganizationUser = addOrganizationUser;
//# sourceMappingURL=index.js.map