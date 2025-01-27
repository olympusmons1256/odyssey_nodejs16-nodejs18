import * as k8s from "@kubernetes/client-node";
import { ConfigurationOdysseyClientPod, ClusterProvider } from "../systemDocTypes";
import { DeploymentState, ParticipantState } from "../docTypes";
import { ResolvedSpaceUnrealProjectVersion } from "../unrealProjects/shared";
export declare function updateDeploymentState(organizationId: string, roomId: string, participantId: string, deploymentId: string, newState: DeploymentState, signallingUrl?: string, nodeName?: string, region?: string): Promise<FirebaseFirestore.WriteResult | undefined>;
export declare function updateParticipantState(organizationId: string, roomId: string, participantId: string, newState?: ParticipantState, latestDeploymentState?: DeploymentState, signallingUrl?: string, winnerDeploymentId?: string): Promise<FirebaseFirestore.WriteResult | undefined>;
export declare function watchConfigMapUntilReady(kc: k8s.KubeConfig, configMapName: string, timeout: number): Promise<"ready" | "failed-provisioning" | "timed-out-provisioning">;
export declare function watchPodUntilReady(organizationId: string, roomId: string, participantId: string, deploymentId: string, kc: k8s.KubeConfig, podName: string, signallingUrl: string): Promise<FirebaseFirestore.WriteResult | undefined>;
export declare function deployPodstack(projectId: string, configuration: ConfigurationOdysseyClientPod, workloadClusterProvider: ClusterProvider, organizationId: string, spaceId: string, roomId: string, participantId: string, deploymentId: string, serverAddress: string | undefined, levelId: string | undefined, userId: string, deviceId: string, customToken: string, graphicsBenchmark: number, resolvedSpaceUnrealProjectVersion: ResolvedSpaceUnrealProjectVersion, serverRegion?: string): Promise<FirebaseFirestore.WriteResult | undefined>;
export declare function deletePodStack(userId: string, deploymentId: string, workloadClusterProvider: ClusterProvider): Promise<boolean>;
export declare function collectPodStackStates(userId: string, deploymentId: string, workloadClusterProvider: ClusterProvider): Promise<{
    events: k8s.CoreV1EventList | undefined;
    pod: k8s.V1Pod | undefined;
    configMap: k8s.V1ConfigMap | undefined;
    service: k8s.V1Service | undefined;
    ingress: k8s.V1Ingress | k8s.NetworkingV1beta1Ingress | undefined;
}>;
