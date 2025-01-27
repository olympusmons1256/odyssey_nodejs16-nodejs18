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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.createNestServer = void 0;
// @ts-nocheck - Node.js 16 compatibility
const firebaseAdmin = __importStar(require("firebase-admin"));
if (firebaseAdmin.apps.length === 0) {
    firebaseAdmin.initializeApp();
    firebaseAdmin.firestore().settings({ ignoreUndefinedProperties: true });
}
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const express_1 = __importDefault(require("express"));
const functions = __importStar(require("firebase-functions"));
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const misc_1 = require("../lib/misc");
const rewrite_api_path_middleware_1 = require("./rewrite-api-path.middleware");
const shared_1 = require("../shared");
let serverInitialized = false;
const server = (0, express_1.default)();
const createNestServer = async (expressInstance) => {
    const port = process.env.NEST_PORT;
    const adapter = new platform_express_1.ExpressAdapter(expressInstance);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter, { logger: ["debug", "warn", "error", "verbose", "log"] });
    const rewriteApiPathMiddleware = new rewrite_api_path_middleware_1.RewriteApiPathMiddleware();
    app.use(rewriteApiPathMiddleware.use);
    app.setGlobalPrefix("v1");
    app.useGlobalPipes(new common_1.ValidationPipe({
        disableErrorMessages: false,
        enableDebugMessages: true,
        forbidUnknownValues: false,
    }));
    const openApiConfig = new swagger_1.DocumentBuilder()
        .setTitle("Odyssey")
        .setDescription("The Odyssey Public REST API")
        .setVersion("0.1")
        .addBearerAuth();
    if (port != undefined && Number(port)) {
        openApiConfig.addServer("http://localhost:" + port + "/api");
    }
    if ((0, misc_1.inEmulatorEnv)()) {
        openApiConfig.addServer("http://localhost:5005/ngp-odyssey/us-central1/api");
    }
    const document = swagger_1.SwaggerModule.createDocument(app, openApiConfig.build());
    swagger_1.SwaggerModule.setup("api", app, document);
    app.enableCors();
    if (port != undefined && Number(port)) {
        app.listen(port);
    }
    else {
        app.init();
    }
};
exports.createNestServer = createNestServer;
async function startupIfLocal() {
    const port = process.env.NEST_PORT;
    if (port != undefined && Number(port)) {
        if (serverInitialized == false) {
            try {
                await (0, exports.createNestServer)(server);
                serverInitialized = true;
                console.log("Waiting 500ms for Nest to be ready");
                await (0, misc_1.sleep)(500);
            }
            catch (e) {
                console.error("Nest broken", e);
            }
        }
    }
}
const apiRunWith = Object.assign({}, shared_1.customRunWith);
apiRunWith.timeoutSeconds = 540;
exports.api = functions
    .runWith(apiRunWith)
    .https.onRequest(async (req, resp) => {
    if (serverInitialized == false) {
        try {
            await (0, exports.createNestServer)(server);
            serverInitialized = true;
            console.log("Waiting 500ms for Nest to be ready");
            await (0, misc_1.sleep)(500);
            console.log("Nest Ready");
            server(req, resp);
        }
        catch (e) {
            console.error("Nest broken", e);
            throw new functions.https.HttpsError("internal", "API is not available");
        }
    }
    else {
        server(req, resp);
    }
});
startupIfLocal();
//# sourceMappingURL=main.js.map