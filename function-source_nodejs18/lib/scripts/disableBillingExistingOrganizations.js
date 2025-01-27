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
async function run() {
    const organizations = await admin.firestore().collection("organizations").get()
        .catch(((err) => {
        console.log(err);
        return undefined;
    }));
    if (organizations == undefined || organizations.empty) {
        console.log("No organization users found");
        return;
    }
    try {
        const promises = organizations.docs.map((doc) => {
            return admin.firestore().collection("organizations").doc(doc.id).collection("billing").doc("public").set({
                disableBilling: true,
                aggregateBillingState: "active",
            }, { merge: true });
        });
        return await Promise.all(promises);
    }
    catch (err) {
        console.log(`ERROR: ${err}`);
        return null;
    }
}
run();
//# sourceMappingURL=disableBillingExistingOrganizations.js.map