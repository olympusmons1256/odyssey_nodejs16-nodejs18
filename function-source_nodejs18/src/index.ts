import * as firebaseAdmin from "firebase-admin";
firebaseAdmin.initializeApp();
firebaseAdmin.firestore().settings({ignoreUndefinedProperties: true});

import * as users from "./users";
import * as bigQuery from "./bigQuery";
import * as invites from "./invites";
import * as organizations from "./organizations";
import * as rooms from "./rooms";
import * as spaces from "./spaces";
import * as configuration from "./configuration";
import * as lifecycles from "./lifecycles";
import * as dolby from "./dolby";
import * as admin from "./admin";
import * as stream from "./stream";
import * as participants from "./participants";
import * as cms from "./cms";
import * as unrealProjects from "./unrealProjects";
import * as consents from "./consents";
import * as billing from "./billing";
import * as unrealPluginVersions from "./unrealPluginVersions";
import * as activity from "./activity";
import {stripeWebhookHandler} from "./stripe-webhook-handler";
import {api} from "./api/main";
// TODO: Enable tests on all environments except production
// import * as tests from "./tests";
// GKE disabled for now as we're not using it for clients or servers
// import * as gke from "./gke";

export {
  admin,
  api,
  bigQuery,
  configuration,
  dolby,
  invites,
  lifecycles,
  organizations,
  participants,
  rooms,
  spaces,
  stream,
  users,
  cms,
  unrealProjects,
  consents,
  billing,
  stripeWebhookHandler,
  unrealPluginVersions,
  activity,
};
