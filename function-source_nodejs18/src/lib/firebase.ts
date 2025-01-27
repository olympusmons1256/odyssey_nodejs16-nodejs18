import * as functions from "firebase-functions";

export interface FirebaseConfig {
  databaseURL: string
  storageBucket: string
  projectId: string
}

export function getFirebaseProjectId() : string {
  const firebaseConfigEnv = process.env.FIREBASE_CONFIG;
  if (firebaseConfigEnv === undefined) {
    return "emulator";
  }
  return (JSON.parse(firebaseConfigEnv) as FirebaseConfig).projectId;
}

export function getFirebaseProjectStorage() : string {
  const firebaseConfigEnv = process.env.FIREBASE_CONFIG;
  if (firebaseConfigEnv === undefined) {
    return "ngp-odyssey.appspot.com";
  }
  return (JSON.parse(firebaseConfigEnv) as FirebaseConfig).storageBucket;
}

export function getStripeSecretKey() : string | undefined {
  const key = process.env["STRIPE_SECRETKEY"];
  if (key == undefined) console.error("Functions secret 'STRIPE_SECRETKEY' is undefined");
  return key;
}

export function getSlackToken() : string | undefined {
  const key = process.env["SLACK_TOKEN"];
  if (key == undefined) console.error("Functions secret 'SLACK_TOKEN' is undefined");
  return key;
}

export function getStripeWebhookSigningKey() : string | undefined {
  const key = process.env["STRIPE_WEBHOOK_SIGNING_KEY"];
  if (key == undefined) console.error("Functions secret 'STRIPE_WEBHOOK_SIGNING_KEY' is undefined");
  return key;
}

export function getPostmarkKey() : string | undefined {
  const key = functions.config().postmark.key;
  if (key == undefined) console.error("Functions config 'postmark.key' is undefined");
  return key;
}

export function getEnvUrl(env: string) {
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

export function projectToEnvName(projectId: string) {
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
