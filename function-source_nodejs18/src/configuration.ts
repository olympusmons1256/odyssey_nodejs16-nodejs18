import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {UpdatedConfigurationOdysseyServer, UpdatedConfigurationOdysseyClientPod, ConfigurationOdysseyClientPod, ConfigurationOdysseyServer} from "./lib/systemDocTypes";
import {getOdysseyClientPodRef, getOdysseyClientVersionsRef, getOdysseyServerRef, getOdysseyServerVersionsRef} from "./lib/documents/firestore";
import {customRunWith} from "./shared";
import {getLatestAvailabilityFromCoreweave} from "./lib/coreweave/availability";
import {sleep} from "./lib/misc";
import { toFirestoreUpdateData } from "./lib/utils";

export interface UpdateImageIdsPayload {
  clientImageId?: string
  clientImageRepo?: string
  serverImageId?: string
  serverImageRepo?: string
  clientMountImageId?: string
  clientMountImageRepo?: string
  serverMountImageId?: string
  serverMountImageRepo?: string
}

// onPublish to updateImageIds topic
// Update the odysseyClientPod & odysseyServer configurations
export const updateImageIds =
  functions
    .runWith(customRunWith)
    .pubsub.topic("updateImageIds")
    .onPublish(async (data, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      console.log("Document data:");
      console.log(JSON.stringify(data));
      const payload = data.json as UpdateImageIdsPayload;
      if ((payload.clientImageId == null || payload.clientImageId == undefined) && (payload.clientMountImageId == null || payload.clientMountImageId == undefined)) {
        throw new Error("Must specify one clientImageId or clientMountImageId");
      }
      if ((payload.clientImageRepo == null || payload.clientImageRepo == undefined) && (payload.clientMountImageRepo == null || payload.clientMountImageRepo == undefined)) {
        throw new Error("Must specify one clientImageRepo or clientMountImageRepo");
      }
      if ((payload.serverImageId == null || payload.serverImageId == undefined) && (payload.serverMountImageId == null || payload.serverMountImageId == undefined)) {
        throw new Error("Must specify one serverImageId or serverMountImageId");
      }
      if ((payload.serverImageRepo == null || payload.serverImageRepo == undefined) && (payload.serverMountImageRepo == null || payload.serverMountImageRepo == undefined)) {
        throw new Error("Must specify one serverImageRepo or serverMountImageRepo");
      }
      const updatedClient : UpdatedConfigurationOdysseyClientPod = {
        unrealImageRepo: payload.clientImageRepo,
        unrealImageId: payload.clientImageId,
        unrealMountImageRepo: payload.clientMountImageRepo,
        unrealMountImageId: payload.clientMountImageId,
        updated: admin.firestore.Timestamp.now(),
      };
      const updatedServer : UpdatedConfigurationOdysseyServer = {
        unrealImageRepo: payload.serverImageRepo,
        unrealImageId: payload.serverImageId,
        unrealMountImageRepo: payload.serverMountImageRepo,
        unrealMountImageId: payload.serverMountImageId,
        updated: admin.firestore.Timestamp.now(),
      };
      return await Promise.all([
        getOdysseyClientPodRef().update(toFirestoreUpdateData(updatedClient)),
        getOdysseyServerRef().update(toFirestoreUpdateData(updatedServer)),
      ]);
    });

// onUpdate of odyssey client configuration, add to versions collection
export const updateSystemOdysseyClientPod =
  functions
    .runWith(customRunWith)
    .firestore.document(getOdysseyClientPodRef().path)
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const configurationAfter = change.after.data() as ConfigurationOdysseyClientPod;

      if (configurationAfter.unrealImageId != undefined) {
        return await getOdysseyClientVersionsRef().doc(configurationAfter.unrealImageId).create({id: configurationAfter.unrealImageId});
      } else {
        return console.log("unrealImageId not set. Nothing to do");
      }
    });

// onUpdate of odyssey client configuration, add to versions collection
export const updateSystemOdysseyServerPod =
  functions
    .runWith(customRunWith)
    .firestore.document(getOdysseyServerRef().path)
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const configurationAfter = change.after.data() as ConfigurationOdysseyServer;

      if (configurationAfter.unrealImageId != undefined) {
        return await getOdysseyServerVersionsRef().doc(configurationAfter.unrealImageId).create({id: configurationAfter.unrealImageId});
      } else {
        return console.log("unrealImageId not set. Nothing to do");
      }
    });

export const updateCoreweaveAvailability =
  functions
    .runWith(customRunWith)
    .pubsub
    .schedule("every minute")
    .onRun(async (context) => {
      const executedAt = new Date(context.timestamp).getTime();
      async function loop(executions: number): Promise<void> {
        console.debug("Getting latest region availability from coreweave API");
        await getLatestAvailabilityFromCoreweave();
        if (new Date().getTime() < executedAt + 45000 && executions < 4) {
          await sleep(15000);
          return loop(executions + 1);
        }
        return;
      }
      console.debug("Starting coreweave region availability API request loop");
      return await loop(0);
    });
