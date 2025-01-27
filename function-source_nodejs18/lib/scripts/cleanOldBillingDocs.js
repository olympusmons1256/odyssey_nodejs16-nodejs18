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
const misc_1 = require("../lib/misc");
async function getBillingDocs(value) {
    return (await (0, firestore_1.getBillingRef)(value).get()).docs;
}
(async function f() {
    const organizationIds = (await (0, firestore_1.getOrganizationsRef)().get()).docs.map((o) => o.id);
    const billingDocs = await (0, misc_1.timeChunkedOperation)(organizationIds, 1, 1000, getBillingDocs);
    return await (0, misc_1.timeChunkedOperation)(billingDocs, 100, 1000, undefined, (async (values) => {
        return await Promise.all(values.map(async (billingDoc) => {
            if (/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-[0-9][0-9]/.test(billingDoc.id)) {
                console.debug(`Deleting matched doc: ${billingDoc.ref.path}`);
                try {
                    await billingDoc.ref.delete();
                    return true;
                }
                catch (e) {
                    console.error(`Failed to delete doc: ${billingDoc.ref.path}`);
                    return false;
                }
            }
            else {
                console.debug(`Doc did not match regex: ${billingDoc.ref.path}`);
                return false;
            }
        }));
    }));
})();
//# sourceMappingURL=cleanOldBillingDocs.js.map