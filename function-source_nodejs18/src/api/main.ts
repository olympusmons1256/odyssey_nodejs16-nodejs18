// @ts-nocheck - Node.js 16 compatibility
import * as firebaseAdmin from "firebase-admin";
if (firebaseAdmin.apps.length === 0) {
  firebaseAdmin.initializeApp();
  firebaseAdmin.firestore().settings({ignoreUndefinedProperties: true});
}

import {NestFactory} from "@nestjs/core";
import {ExpressAdapter, NestExpressApplication} from "@nestjs/platform-express";
import express from "express";
import * as functions from "firebase-functions";
import {AppModule} from "./app.module";
import {SwaggerModule, DocumentBuilder} from "@nestjs/swagger";
import {ValidationPipe} from "@nestjs/common";
import {inEmulatorEnv, sleep} from "../lib/misc";
import {RewriteApiPathMiddleware} from "./rewrite-api-path.middleware";
import {customRunWith} from "../shared";

let serverInitialized = false;
const server: express.Express = express();

export const createNestServer = async (expressInstance: express.Express) => {
  const port = process.env.NEST_PORT;
  const adapter = new ExpressAdapter(expressInstance);
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule, adapter, {logger: ["debug", "warn", "error", "verbose", "log"]},
  );
  const rewriteApiPathMiddleware = new RewriteApiPathMiddleware();
  app.use(rewriteApiPathMiddleware.use);
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(new ValidationPipe({
    disableErrorMessages: false,
    enableDebugMessages: true,
    forbidUnknownValues: false,
  }));
  const openApiConfig = new DocumentBuilder()
    .setTitle("Odyssey")
    .setDescription("The Odyssey Public REST API")
    .setVersion("0.1")
    .addBearerAuth();
  if (port != undefined && Number(port)) {
    openApiConfig.addServer("http://localhost:" + port + "/api");
  }
  if (inEmulatorEnv()) {
    openApiConfig.addServer("http://localhost:5005/ngp-odyssey/us-central1/api");
  }
  const document = SwaggerModule.createDocument(app, openApiConfig.build());
  SwaggerModule.setup("api", app, document);

  app.enableCors();
  if (port != undefined && Number(port)) {
    app.listen(port);
  } else {
    app.init();
  }
};

async function startupIfLocal() {
  const port = process.env.NEST_PORT;
  if (port != undefined && Number(port)) {
    if (serverInitialized == false) {
      try {
        await createNestServer(server);
        serverInitialized = true;
        console.log("Waiting 500ms for Nest to be ready");
        await sleep(500);
      } catch (e: any) {
        console.error("Nest broken", e);
      }
    }
  }
}

const apiRunWith = {...customRunWith};
apiRunWith.timeoutSeconds = 540;

export const api: functions.HttpsFunction =
  functions
    .runWith(apiRunWith)
    .https.onRequest(async (req, resp) => {
      if (serverInitialized == false) {
        try {
          await createNestServer(server);
          serverInitialized = true;
          console.log("Waiting 500ms for Nest to be ready");
          await sleep(500);
          console.log("Nest Ready");
          server(req, resp);
        } catch (e: any) {
          console.error("Nest broken", e);
          throw new functions.https.HttpsError("internal", "API is not available");
        }
      } else {
        server(req, resp);
      }
    });

startupIfLocal();
