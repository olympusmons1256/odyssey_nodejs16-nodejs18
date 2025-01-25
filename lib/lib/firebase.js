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
exports.projectToEnvName = exports.getEnvUrl = exports.getPostmarkKey = exports.getStripeWebhookSigningKey = exports.getSlackToken = exports.getStripeSecretKey = exports.getFirebaseProjectStorage = exports.getFirebaseProjectId = void 0;
const functions = __importStar(require("firebase-functions"));
function getFirebaseProjectId() {
    const firebaseConfigEnv = process.env.FIREBASE_CONFIG;
    if (firebaseConfigEnv === undefined) {
        return "emulator";
    }
    return JSON.parse(firebaseConfigEnv).projectId;
}
exports.getFirebaseProjectId = getFirebaseProjectId;
function getFirebaseProjectStorage() {
    const firebaseConfigEnv = process.env.FIREBASE_CONFIG;
    if (firebaseConfigEnv === undefined) {
        return "ngp-odyssey.appspot.com";
    }
    return JSON.parse(firebaseConfigEnv).storageBucket;
}
exports.getFirebaseProjectStorage = getFirebaseProjectStorage;
function getStripeSecretKey() {
    const key = process.env["STRIPE_SECRETKEY"];
    if (key == undefined)
        console.error("Functions secret 'STRIPE_SECRETKEY' is undefined");
    return key;
}
exports.getStripeSecretKey = getStripeSecretKey;
function getSlackToken() {
    const key = process.env["SLACK_TOKEN"];
    if (key == undefined)
        console.error("Functions secret 'SLACK_TOKEN' is undefined");
    return key;
}
exports.getSlackToken = getSlackToken;
function getStripeWebhookSigningKey() {
    const key = process.env["STRIPE_WEBHOOK_SIGNING_KEY"];
    if (key == undefined)
        console.error("Functions secret 'STRIPE_WEBHOOK_SIGNING_KEY' is undefined");
    return key;
}
exports.getStripeWebhookSigningKey = getStripeWebhookSigningKey;
function getPostmarkKey() {
    const key = functions.config().postmark.key;
    if (key == undefined)
        console.error("Functions config 'postmark.key' is undefined");
    return key;
}
exports.getPostmarkKey = getPostmarkKey;
function getEnvUrl(env) {
    switch (env) {
        case "prod":
        case "ngp-odyssey-prod":
            return "https://app.odyssey.stream";
        case "ngp-odyssey":
        case "dev":
            return "https://app-dev.odyssey.stream";
        case "ngp-odyssey-testing":
        case "testing":
            return "https://app-testing.odyssey.stream";
        case "emulator":
            return "http://localhost:8080";
        default:
            console.error(`Environment '${env}' is invalid. Use one of 'prod', 'testing', 'dev' or 'emulator'`);
            process.exit(1);
    }
}
exports.getEnvUrl = getEnvUrl;
function projectToEnvName(projectId) {
    switch (projectId) {
        case "ngp-odyssey-prod":
            return "prod";
        case "ngp-odyssey":
            return "dev";
        case "ngp-odyssey-testing":
            return "testing";
        case "emulator":
            return "emulator";
        default:
            console.error(`Project '${projectId}' is unknown`);
            return undefined;
    }
}
exports.projectToEnvName = projectToEnvName;
//# sourceMappingURL=firebase.js.map