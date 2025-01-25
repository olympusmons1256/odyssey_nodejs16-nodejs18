// @ts-ignore
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as docTypes from "./lib/docTypes";
import * as streamingSessions from "./lib/streamingSessions/index";
import {customRunWith} from "./shared";
import {ClusterProviderConfiguration, ConfigurationOdysseyClientPod, GkeAccelerator, NodeImagePullDaemonSet} from "./lib/systemDocTypes";
import {getClientNodeImagePullDaemonsetRef, getGkeParticipantsDenormalized, getGkeParticipantsDenormalizedRef, participantWildcardPath} from "./lib/documents/firestore";
import {deployNodeImagePullDaemonSet} from "./lib/streamingSessions/imagePull";
import {autoscaleClientNodesGke} from "./lib/clusterProviders";

function resolveGkeAccelerator(configuration : ConfigurationOdysseyClientPod) : GkeAccelerator {
  if (configuration.unrealGkeAccelerator == undefined) {
    console.log("No specific GKE Accelerator provided, defaulting to " + "nvidia-tesla-t4");
    return "nvidia-tesla-t4";
  } else {
    return configuration.unrealGkeAccelerator;
  }
}

export const deleteParticipantDenormalizeToGkeParticipants =
  // onUpdate() of participant
  // Denormalize participant user / device data
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onDelete(async (snapshot, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data:");
      console.debug(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      const [userId, deviceId] = participantId.split(":");

      const configuration = await streamingSessions.getConfigurationOdysseyClientPod(organizationId, roomId, userId);
      if (configuration == undefined) {
        console.error("Unable to resolve odyssey client pod configuration");
        return;
      }

      if (configuration.workloadClusterProviders == undefined) {
        console.error("Unable to resolve workloadClusterProviders configuration");
        return;
      }

      if (configuration.workloadClusterProviders.length == 0) {
        console.error("No workloadClusterProviders configured");
        return;
      }

      if (!configuration.workloadClusterProviders.includes("gke")) {
        console.log("GKE not specified in workloadClusterProviders. Nothing to do");
        return;
      }
      const gkeAccelerator = resolveGkeAccelerator(configuration);

      const [gkeParticipantsDenormalizedDoc, gkeParticipantsDenormalized] = await getGkeParticipantsDenormalized(gkeAccelerator);
      if (gkeParticipantsDenormalizedDoc == undefined || gkeParticipantsDenormalized == undefined) {
        return console.error("gkeParticipantsDenormalizedDoc or gkeParticipantsDenormalized is undefined");
      }

      if (gkeParticipantsDenormalized.participants != undefined) {
        gkeParticipantsDenormalized.participants.forEach((existingParticipant) => {
          if (
            existingParticipant.userId == userId &&
              existingParticipant.deviceId == deviceId &&
              existingParticipant.roomId == roomId &&
              existingParticipant.organizationId == organizationId
          ) {
            console.log("Removing existing participant from denormalized Gke participants");
            gkeParticipantsDenormalizedDoc.ref.update({
              updated: admin.firestore.Timestamp.now(),
              participants: admin.firestore.FieldValue.arrayRemove(existingParticipant),
            });
          }
        });
      }
    });

export const createParticipantDenormalizeToGkeParticipants =
  // onUpdate() of participant
  // Denormalize participant user / device data
  functions
    .runWith(customRunWith)
    .firestore
    .document(participantWildcardPath())
    .onCreate(async (snapshot, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data:");
      console.debug(JSON.stringify(snapshot.data()));
      const organizationId = context.params.organizationId;
      const roomId : string = context.params.roomId;
      const participantId : string = context.params.participantId;
      const [userId, deviceId] = participantId.split(":");
      const participant = snapshot.data() as docTypes.Participant;

      const configuration = await streamingSessions.getConfigurationOdysseyClientPod(organizationId, roomId, userId);
      if (configuration == undefined) {
        console.error("Unable to resolve odyssey client pod configuration");
        return;
      }

      if (configuration.workloadClusterProviders == undefined) {
        console.error("Unable to resolve workloadClusterProviders configuration");
        return;
      }

      if (configuration.workloadClusterProviders.length == 0) {
        console.error("No workloadClusterProviders configured");
        return;
      }

      if (!configuration.workloadClusterProviders.includes("gke")) {
        console.log("GKE not specified in workloadClusterProviders. Nothing to do");
        return;
      }
      const gkeAccelerator = resolveGkeAccelerator(configuration);

      const gkeParticipantDenormalized : docTypes.GkeParticipantDenormalized = {
        created: participant.created,
        updated: participant.updated,
        deviceId,
        userId,
        organizationId,
        roomId,
      };

      return getGkeParticipantsDenormalizedRef(gkeAccelerator).update({
        updated: admin.firestore.Timestamp.now(),
        participants: admin.firestore.FieldValue.arrayUnion(gkeParticipantDenormalized),
      });
    });

export const clientNodeImagePullDaemonsetGke =
  functions
    .runWith(customRunWith)
    .firestore.document("system/configuration/configurations/odysseyClientPod")
    .onUpdate(async (change, context) => {
      const existingConfiguration = change.before.data() as ConfigurationOdysseyClientPod;
      const updatedConfiguration = change.after.data() as ConfigurationOdysseyClientPod;

      if (updatedConfiguration.unrealImageId == null || updatedConfiguration.unrealImageId == undefined) {
        console.log("Skipping execution due to missing field: unrealImageId");
        return;
      }

      if (updatedConfiguration.unrealImageId != undefined && existingConfiguration.unrealImageId != undefined && existingConfiguration.unrealImageId == updatedConfiguration.unrealImageId) {
        console.log("Skipping execution due to unchanged unrealImageId");
        return;
      }

      if (updatedConfiguration.unrealImageRepo === undefined) {
        throw new Error("Missing image repo");
      }

      const doc : NodeImagePullDaemonSet = {
        created: admin.firestore.Timestamp.now(),
        updated: admin.firestore.Timestamp.now(),
        imageId: updatedConfiguration.unrealImageId,
        imageRepo: updatedConfiguration.unrealImageRepo,
        workloadClusterProvider: "gke",
      };

      const deployResult = await deployNodeImagePullDaemonSet(updatedConfiguration, "gke");

      if (deployResult == undefined) {
        doc.state = "failed";
        doc.updated = admin.firestore.Timestamp.now();
      } else {
        const [state] = deployResult;
        doc.state = state;
        doc.updated = admin.firestore.Timestamp.now();
      }

      return await getClientNodeImagePullDaemonsetRef().doc(context.eventId).set(doc);
    });

export const updateWorkloadClusterProviderGke =
  // onCreate() of new participant
  // Denormalize participant user / device data
  functions
    .runWith(customRunWith)
    .firestore.document("system/configuration/workloadClusterProviders/gke")
    .onUpdate(async (change,) => {
      const existingConfiguration = change.before.data() as ClusterProviderConfiguration;
      console.log("Existing configuration: ", existingConfiguration);
      const updatedConfiguration = change.after.data() as ClusterProviderConfiguration;
      console.log("Updated configuration: ", updatedConfiguration);
      if (updatedConfiguration.minNodeCounts == undefined) {
        console.error("Missing minNodeCounts array in updated configuration. Skipping execution as assuming old data");
        return;
      }

      if (existingConfiguration.minNodeCounts == undefined) {
        console.error("Missing minNodeCounts array in existing configuration. Skipping execution as assuming old data");
        return;
      }

      const updatedGkeAcceleratorConfigs = updatedConfiguration.minNodeCounts.flatMap((p) => {
        if (existingConfiguration.minNodeCounts?.includes(p)) {
          return [];
        } else {
          return [p];
        }
      });
      const removedGkeAcceleratorConfigs = existingConfiguration.minNodeCounts.flatMap((p) => {
        if (updatedConfiguration.minNodeCounts?.includes(p)) {
          return [];
        } else {
          return [p];
        }
      });

      if ((updatedGkeAcceleratorConfigs.length + removedGkeAcceleratorConfigs.length) == 0) {
        console.log("No new or removed GkeAcceleratorNodePoolConfigurations, not scaling Gke");
        return;
      } else {
        console.debug(`GkeAcceleratorNodePoolConfiguration - ${updatedGkeAcceleratorConfigs} updated, ${removedGkeAcceleratorConfigs} removed`);

        const uniqueGkeAcceleratorsUpdatedOrRemoved =
            updatedGkeAcceleratorConfigs.concat(removedGkeAcceleratorConfigs)
              .map((gkeAcceleratorConfig) => {
                return gkeAcceleratorConfig.accelerator;
              })
              .reduce((unique, gkeAccelerator) => {
                return unique.includes(gkeAccelerator) ? unique : [...unique, gkeAccelerator];
              }, ([] as Array<GkeAccelerator>));

        return Promise.all(
          uniqueGkeAcceleratorsUpdatedOrRemoved
            .map(async (gkeAccelerator) => {
              console.log(`Autoscaling Gke Nodes with ${gkeAccelerator}`);
              return await autoscaleClientNodesGke(gkeAccelerator);
            })
        );
      }
    });

export const updateGkeParticipantsDenormalizedAutoscaleNodePools =
  // onCreate() of new participant
  // Denormalize participant user / device data
  functions
    .runWith(customRunWith)
    .firestore.document("system/operations/gkeParticipantsDenormalized/{gkeAccelerator}")
    .onUpdate(async (change, context) => {
      console.debug("Document context:");
      console.debug(JSON.stringify(context));
      console.debug("Document data before:");
      console.debug(JSON.stringify(change.before.data()));
      console.debug("Document data after:");
      console.debug(JSON.stringify(change.after.data()));
      const gkeAccelerator : GkeAccelerator = context.params.gkeAccelerator as GkeAccelerator;
      console.debug("Change to ", change.after.ref.path);
      const gkeParticipantsDenormalizedBefore = change.before.data() as docTypes.GkeParticipantsDenormalized;
      const gkeParticipantsDenormalized = change.after.data() as docTypes.GkeParticipantsDenormalized;
      const newGkeParticipantsDenormalized = gkeParticipantsDenormalized.participants.flatMap((p) => {
        if (gkeParticipantsDenormalizedBefore.participants.includes(p)) {
          return [];
        } else {
          return [p];
        }
      });
      const removedGkeParticipantsDenormalized = gkeParticipantsDenormalizedBefore.participants.flatMap((p) => {
        if (gkeParticipantsDenormalized.participants.includes(p)) {
          return [];
        } else {
          return [p];
        }
      });
      console.debug(`GkeParticipantsDenormalized - ${newGkeParticipantsDenormalized} new, ${removedGkeParticipantsDenormalized} removed`);
      if ((newGkeParticipantsDenormalized.length + removedGkeParticipantsDenormalized.length) == 0) {
        console.log("No new or removed participants, not scaling Gke");
        return;
      } else {
        return autoscaleClientNodesGke(gkeAccelerator);
      }
    });
