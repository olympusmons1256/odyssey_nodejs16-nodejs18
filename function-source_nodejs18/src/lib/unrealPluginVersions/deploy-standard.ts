import * as k8s from "@kubernetes/client-node";
import {resolveKubeConfig} from "../streamingSessions/shared";

export function formatUnrealPluginVersionClaimName(unrealPluginVersionId: string, region: string) {
  return ("plugin-version-" + unrealPluginVersionId + "-" + region).toLowerCase();
}

export async function deleteUnrealPluginVersionPvcs(unrealPluginVersionId: string, regions: string[]) : Promise<boolean> {
  const kc = await resolveKubeConfig("coreweave");

  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  const namespace = kc.contexts[0].namespace ? kc.contexts[0].namespace : "default";

  const pvcDeleteResults = await Promise.all(regions.map(async (region) => {
    const pvcName = formatUnrealPluginVersionClaimName(unrealPluginVersionId, region);

    try {
      console.debug("Deleting pvc: ", pvcName);
      const pvcDelete = await coreClient.deleteNamespacedPersistentVolumeClaim(pvcName, namespace, undefined, undefined, 15);
      const pvcDeleted = pvcDelete.response.statusCode;
      console.debug("Delete pvc response status code: ", pvcDelete.response.statusCode);
      console.debug("Delete pvc response status message: ", pvcDelete.response.statusMessage);
      if (pvcDeleted != undefined && pvcDeleted >= 200 && pvcDeleted < 300) {
        console.debug("Deleted pvc successfully");
        return true;
      }
    } catch (e: any) {
      console.error(e);
    }
    console.error("Failed to delete pvc");
    return false;
  }));
  const successfullyDeletedPvcs = pvcDeleteResults.reduce<boolean>((acc, r) => (acc == false) ? false : r, true);
  return successfullyDeletedPvcs;
}
