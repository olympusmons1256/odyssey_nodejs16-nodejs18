import {setGkeNodePoolNodeCount} from "../gcloud/containerClusters";
import {resolveGkeStreamingSessionClusterInfo} from "../streamingSessions/shared";
import {GkeAccelerator} from "../systemDocTypes";
import {getGkeParticipantsDenormalized, getWorkloadClusterProviderConfiguration} from "../documents/firestore";

export async function autoscaleClientNodesGke(gkeAccelerator: GkeAccelerator) {
  console.debug("Getting gkeParticipantsDenormalized");
  const [gkeParticipantsDenormalizedDoc, gkeParticipantsDenormalized] = await getGkeParticipantsDenormalized(gkeAccelerator);

  if (gkeParticipantsDenormalizedDoc == undefined || gkeParticipantsDenormalized == undefined) {
    return console.error("gkeParticipantsDenormalizedDoc or gkeParticipantsDenormalized is undefined");
  }

  const gkeAcceleratorParticipants = gkeParticipantsDenormalized.participants.length;

  console.debug(`${gkeAcceleratorParticipants} participants for GKE accelerator ${gkeAccelerator}`);
  console.debug("Getting GKE workloadClusterProvider configuration");
  const [, clusterProviderConfiguration] = await getWorkloadClusterProviderConfiguration("gke");

  function resolveMinNodeCount() {
    if (clusterProviderConfiguration == undefined) {
      console.debug("Cluster provider configuration not defined");
      return gkeAcceleratorParticipants;
    }

    if (clusterProviderConfiguration.minNodeCounts == undefined) {
      console.debug("Cluster provider configuration minNodeCounts not defined");
      return gkeAcceleratorParticipants;
    }

    const gkeAcceleratorMinNodeCount = clusterProviderConfiguration.minNodeCounts.reduce((acc, gkeAcceleratorNodePoolConfiguration) => {
      if (gkeAcceleratorNodePoolConfiguration.accelerator == gkeAccelerator && gkeAcceleratorNodePoolConfiguration.minNodeCount != undefined) {
        return gkeAcceleratorNodePoolConfiguration.minNodeCount;
      } else {
        return acc;
      }
    }, 0);

    if (gkeAcceleratorParticipants >= gkeAcceleratorMinNodeCount) {
      console.debug("Total participant count exceeds or equals configured minNodeCount");
      return gkeAcceleratorParticipants;
    } else {
      console.debug("minNodeCount exceeds total participant count");
      return gkeAcceleratorMinNodeCount;
    }
  }
  console.debug("Resolved GKE minNodeCount: ", resolveMinNodeCount());
  const clusterInfo = resolveGkeStreamingSessionClusterInfo();
  return await setGkeNodePoolNodeCount(clusterInfo, resolveMinNodeCount(), gkeAccelerator);
}
