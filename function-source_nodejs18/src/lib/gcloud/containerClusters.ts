import * as container from "@google-cloud/container";
import {GkeAccelerator} from "../systemDocTypes";

export interface GkeClusterInfo {
  projectId: string,
  region?: string,
  zone?: string,
  clusterId: string,
}

const nodeCountPerPoolBuffer = 5;

export function constructRequest(clusterInfo: GkeClusterInfo) {
  if ((clusterInfo.region != undefined && clusterInfo.zone != undefined) || (clusterInfo.region == undefined && clusterInfo.zone == undefined)) {
    throw new Error("Must specify one of zone or region, not both or neither");
  } else if (clusterInfo.region != undefined) {
    return {name: `projects/${clusterInfo.projectId}/locations/${clusterInfo.region}/clusters/${clusterInfo.clusterId}`};
  } else {
    return clusterInfo;
  }
}

export async function setGkeNodePoolNodeCount(gkeClusterInfo : GkeClusterInfo, nodeCountExpected: number, gkeAccelerator: GkeAccelerator) {
  const client = new container.ClusterManagerClient();
  console.debug(`Getting GKE cluster for GkeAccelerator ${gkeAccelerator}`, gkeClusterInfo);
  const clusters = await client.getCluster(constructRequest(gkeClusterInfo));
  const cluster = clusters.flatMap((cluster) => {
    try {
      const icluster = cluster as container.protos.google.container.v1.ICluster;
      if (icluster.nodePools != undefined) {
        return [icluster];
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }).pop();

  if (cluster == undefined) {
    console.error("No clusters or node pools found");
    return undefined;
  } else {
    console.debug("Found cluster: ", cluster);
  }

  if (cluster.nodePools == undefined || cluster.nodePools.length == 0) {
    console.error("Cluster has no nodePools");
    return undefined;
  } else {
    console.debug(`Found ${cluster.nodePools.length} nodePools in cluster`);
  }

  const acceleratedNodePools = cluster.nodePools.flatMap((nodePool) => {
    if (nodePool.config != undefined && nodePool.config.accelerators != undefined) {
      const acceleratorsMatchingGkeAccelerator = nodePool.config.accelerators.flatMap((accelerator) => {
        console.debug(`Checking if nodePool accelerator: '${accelerator.acceleratorType}' matches expected '${gkeAccelerator}'`);
        if (accelerator.acceleratorType == gkeAccelerator) {
          console.debug(`nodePool accelerator: '${accelerator.acceleratorType}' matches expected '${gkeAccelerator}`);
          return [accelerator];
        } else {
          console.debug(`nodePool accelerator '${accelerator.acceleratorType}' does not match expected '${gkeAccelerator}'`);
          return [];
        }
      });
      if (acceleratorsMatchingGkeAccelerator.length > 0) {
        console.debug(`At least one accelerator in nodePool '${nodePool.name}' matches expected '${gkeAccelerator}'`);
        return [nodePool];
      } else {
        console.debug(`No accelerators in nodePool '${nodePool.name}' match expected '${gkeAccelerator}'`);
        return [];
      }
    } else {
      return [];
    }
  });

  console.debug(`Found ${acceleratedNodePools.length} accelerated node pools in the cluster matching ${gkeAccelerator}`);

  const minNodeCountPerPool = (nodeCountExpected == 0) ? 0 : nodeCountExpected / acceleratedNodePools.length;
  const maxNodeCountPerPool = minNodeCountPerPool + nodeCountPerPoolBuffer;

  const results = acceleratedNodePools.map(async (nodePool) => {
    const nodePoolName = "projects/" + gkeClusterInfo.projectId + "/locations/" + gkeClusterInfo.region + "/clusters/" + gkeClusterInfo.clusterId + "/nodePools/" + nodePool.name;
    console.debug(`Setting nodePool autoscaling of pool ${nodePoolName} to min: ${minNodeCountPerPool}, max: ${maxNodeCountPerPool}`);
    return await client.setNodePoolAutoscaling({
      autoscaling: {
        autoprovisioned: false,
        enabled: true,
        minNodeCount: minNodeCountPerPool,
        maxNodeCount: maxNodeCountPerPool,
      },
      name: nodePoolName,
    });
  });

  return await Promise.all(results);
}
