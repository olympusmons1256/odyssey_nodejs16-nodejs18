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
exports.activity = exports.unrealPluginVersions = exports.stripeWebhookHandler = exports.billing = exports.consents = exports.unrealProjects = exports.cms = exports.users = exports.stream = exports.spaces = exports.rooms = exports.participants = exports.organizations = exports.lifecycles = exports.invites = exports.dolby = exports.configuration = exports.bigQuery = exports.api = exports.admin = void 0;
const firebaseAdmin = __importStar(require("firebase-admin"));
firebaseAdmin.initializeApp();
firebaseAdmin.firestore().settings({ ignoreUndefinedProperties: true });
const users = __importStar(require("./users"));
exports.users = users;
const bigQuery = __importStar(require("./bigQuery"));
exports.bigQuery = bigQuery;
const invites = __importStar(require("./invites"));
exports.invites = invites;
const organizations = __importStar(require("./organizations"));
exports.organizations = organizations;
const rooms = __importStar(require("./rooms"));
exports.rooms = rooms;
const spaces = __importStar(require("./spaces"));
exports.spaces = spaces;
const configuration = __importStar(require("./configuration"));
exports.configuration = configuration;
const lifecycles = __importStar(require("./lifecycles"));
exports.lifecycles = lifecycles;
const dolby = __importStar(require("./dolby"));
exports.dolby = dolby;
const admin = __importStar(require("./admin"));
exports.admin = admin;
const stream = __importStar(require("./stream"));
exports.stream = stream;
const participants = __importStar(require("./participants"));
exports.participants = participants;
const cms = __importStar(require("./cms"));
exports.cms = cms;
const unrealProjects = __importStar(require("./unrealProjects"));
exports.unrealProjects = unrealProjects;
const consents = __importStar(require("./consents"));
exports.consents = consents;
const billing = __importStar(require("./billing"));
exports.billing = billing;
const unrealPluginVersions = __importStar(require("./unrealPluginVersions"));
exports.unrealPluginVersions = unrealPluginVersions;
const activity = __importStar(require("./activity"));
exports.activity = activity;
const stripe_webhook_handler_1 = require("./stripe-webhook-handler");
Object.defineProperty(exports, "stripeWebhookHandler", { enumerable: true, get: function () { return stripe_webhook_handler_1.stripeWebhookHandler; } });
const main_1 = require("./api/main");
Object.defineProperty(exports, "api", { enumerable: true, get: function () { return main_1.api; } });
//# sourceMappingURL=index.js.map