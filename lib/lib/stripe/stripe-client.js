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
exports.validateStripeWebhook = exports.getStripe = exports.StripeError = void 0;
const stripe_1 = require("stripe");
const functions = __importStar(require("firebase-functions"));
let stripeInstance;
class StripeError extends Error {
    constructor(message) {
        super(message);
        this.name = "StripeError";
    }
}
exports.StripeError = StripeError;
async function getStripe() {
    var _a;
    if (stripeInstance)
        return stripeInstance;
    const stripeKey = (_a = functions.config().stripe) === null || _a === void 0 ? void 0 : _a.key;
    if (!stripeKey) {
        throw new StripeError("Stripe key not found in config");
    }
    stripeInstance = new stripe_1.Stripe(stripeKey, {
        apiVersion: "2023-10-16",
        typescript: true,
    });
    return stripeInstance;
}
exports.getStripe = getStripe;
async function validateStripeWebhook(payload, signature, webhookSecret) {
    try {
        const stripe = await getStripe();
        return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }
    catch (err) {
        throw new StripeError(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
}
exports.validateStripeWebhook = validateStripeWebhook;
//# sourceMappingURL=stripe-client.js.map