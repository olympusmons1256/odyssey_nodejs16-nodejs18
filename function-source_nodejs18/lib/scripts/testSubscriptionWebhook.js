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
// @ts-nocheck
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const stripe_1 = require("../lib/stripe");
(async () => {
    var _a;
    // const subscriptionId = "sub_1NAmruKs8IWXDckNFDOffywu";
    // const customerId = "cus_NwgEepr1AJoiGV";
    const subscriptionId = "sub_1NDdrGKs8IWXDckNblgCIrhf";
    const customerId = "cus_Nzd7Qz7tocPHmI";
    const eventId = "testing";
    try {
        const result = await (0, stripe_1.organizationBillingStateFromLatestSubscriptionInvoices)({
            eventId,
            subscriptionId,
            customerId,
        });
        console.debug({ pendingSubscription: (_a = result.billingSubscription) === null || _a === void 0 ? void 0 : _a.pendingSubscription });
        return await (0, stripe_1.writeOrganizationBillingStateChanges)(result);
    }
    catch (error) {
        console.error(`Error processing subscription state: ${error}`);
        return { success: false };
    }
})();
//# sourceMappingURL=testSubscriptionWebhook.js.map