"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoscaleClientNodesGke = void 0;
const containerClusters_1 = require("../gcloud/containerClusters");
const shared_1 = require("../streamingSessions/shared");
const firestore_1 = require("../documents/firestore");
async function autoscaleClientNodesGke(gkeAccelerator) {
    console.debug("Getting gkeParticipantsDenormalized");
    const [gkeParticipantsDenormalizedDoc, gkeParticipantsDenormalized] = await (0, firestore_1.getGkeParticipantsDenormalized)(gkeAccelerator);
    if (gkeParticipantsDenormalizedDoc == undefined || gkeParticipantsDenormalized == undefined) {
        return console.error("gkeParticipantsDenormalizedDoc or gkeParticipantsDenormalized is undefined");
    }
    const gkeAcceleratorParticipants = gkeParticipantsDenormalized.participants.length;
    console.debug(`${gkeAcceleratorParticipants} participants for GKE accelerator ${gkeAccelerator}`);
    console.debug("Getting GKE workloadClusterProvider configuration");
    const [, clusterProviderConfiguration] = await (0, firestore_1.getWorkloadClusterProviderConfiguration)("gke");
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
            }
            else {
                return acc;
            }
        }, 0);
        if (gkeAcceleratorParticipants >= gkeAcceleratorMinNodeCount) {
            console.debug("Total participant count exceeds or equals configured minNodeCount");
            return gkeAcceleratorParticipants;
        }
        else {
            console.debug("minNodeCount exceeds total participant count");
            return gkeAcceleratorMinNodeCount;
        }
    }
    console.debug("Resolved GKE minNodeCount: ", resolveMinNodeCount());
    const clusterInfo = (0, shared_1.resolveGkeStreamingSessionClusterInfo)();
    return await (0, containerClusters_1.setGkeNodePoolNodeCount)(clusterInfo, resolveMinNodeCount(), gkeAccelerator);
}
exports.autoscaleClientNodesGke = autoscaleClientNodesGke;
//# sourceMappingURL=index.js.map