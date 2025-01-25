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
(async () => {
    const organizationDocs = await (0, firestore_1.getOrganizations)();
    if (organizationDocs == undefined) {
        throw new Error("Failed to get organizations");
    }
    await Promise.all(organizationDocs.map(async (oDoc) => {
        const [organizationDoc, organization] = oDoc;
        if (organizationDoc == undefined || organization == undefined) {
            console.error("Undefined organization");
            return undefined;
        }
        const [, billingPublic] = await (0, firestore_1.getBillingPublic)(organizationDoc.id);
        if ((billingPublic === null || billingPublic === void 0 ? void 0 : billingPublic.disableBilling) == true) {
            const defaultFeatures = {
                bridge: true,
                restApi: true,
                sharding: true,
                analytics: true,
                publishSpace: true,
                inWorldStreams: true,
            };
            console.debug(`Setting featuresOverride for enterprise org '${organizationDoc.id}: ${organization.name}'`);
            return await (0, firestore_1.getBillingFeaturesOverrideRef)(organizationDoc.id).set(defaultFeatures, { merge: true });
        }
        else {
            console.debug(`Skipping '${organizationDoc.id}: ${organization.name}' as it is a subscription organization`);
            return null;
        }
    }));
})();
//# sourceMappingURL=migrateFeatures.js.map