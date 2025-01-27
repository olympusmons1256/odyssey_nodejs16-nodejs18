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
exports.createNewOrganizations = exports.createNewOrganization = exports.createAdmins = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("../lib/documents/firestore");
async function createAdmins(organizationId) {
    const ngpAdminEmails = [
        "bram@newgameplus.live",
        "max@newgameplus.live",
        "reid@newgameplus.live",
        "chris@newgameplus.live",
        "briana@newgameplus.live",
        "zac@newgameplus.live",
        "adrian@newgameplus.live",
    ];
    const usersRef = (0, firestore_1.getOrganizationUsersRef)(organizationId);
    const admins = (await Promise.all(ngpAdminEmails.map(async (email) => {
        try {
            const authUser = await admin.auth().getUserByEmail(email);
            return [[authUser.uid, {
                        email,
                        role: "admin",
                        created: admin.firestore.Timestamp.now(),
                        updated: admin.firestore.Timestamp.now(),
                    },
                ]];
        }
        catch (e) {
            return [];
        }
    }))).flat();
    await Promise.all(admins.map(async ([uid, user]) => {
        // console.debug(`Adding admin user to organization ${organizationId}: ${user.email}`);
        await usersRef.doc(uid).set(user);
    }));
}
exports.createAdmins = createAdmins;
async function createNewOrganization(name) {
    const organization = {
        name,
    };
    const organizationRef = await (0, firestore_1.getOrganizationsRef)().add(organization);
    console.debug(`Created organization ${organizationRef.id}: ${name}"`);
    await createAdmins(organizationRef.id);
    console.debug(`Created admin users in organization ${organizationRef.id}: ${name}`);
}
exports.createNewOrganization = createNewOrganization;
async function createNewOrganizations() {
    [
        "Dolby",
        "Simplot",
        "HPF",
    ].forEach((name) => createNewOrganization(name));
}
exports.createNewOrganizations = createNewOrganizations;
createNewOrganizations();
//# sourceMappingURL=createNewOrganization.js.map