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
exports.setRoomLevelId = exports.createNewOrganization = void 0;
const functions = __importStar(require("firebase-functions"));
const shared_1 = require("./shared");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("./lib/documents/firestore");
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
async function createOrganizationAndAdmins(name) {
    const organization = {
        name,
    };
    const organizationRef = await (0, firestore_1.getOrganizationsRef)().add(organization);
    console.debug(`Created organization ${organizationRef.id}: ${name}"`);
    await createAdmins(organizationRef.id);
    console.debug(`Created admin users in organization ${organizationRef.id}: ${name}`);
}
// onPublish to createNewOrganization topic
// Create the new organization along with NG+ admin users
exports.createNewOrganization = functions
    .runWith(shared_1.customRunWith)
    .pubsub.topic("createNewOrganization")
    .onPublish(async (data, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(data));
    const payload = data.json;
    if (payload.name == null || payload.name == undefined) {
        throw new Error("organization name not specified or invalid");
    }
    return await createOrganizationAndAdmins(payload.name);
});
// onPublish to setRoomLevelId topic
// Set the levelId of the room to the given value
exports.setRoomLevelId = functions
    .runWith(shared_1.customRunWith)
    .pubsub.topic("setRoomLevelId")
    .onPublish(async (data, context) => {
    console.log("Document context:");
    console.log(JSON.stringify(context));
    console.log("Document data:");
    console.log(JSON.stringify(data));
    const payload = data.json;
    if (payload.organizationId == null || payload.organizationId == undefined) {
        throw new Error("organizationId not specified or invalid");
    }
    if (payload.roomId == null || payload.roomId == undefined) {
        throw new Error("roomId not specified or invalid");
    }
    if (payload.levelId == null || payload.levelId == undefined) {
        throw new Error("levelId not specified or invalid");
    }
    return await (0, firestore_1.getRoomRef)(payload.organizationId, payload.roomId).update({ levelId: payload.levelId });
});
//# sourceMappingURL=admin.js.map