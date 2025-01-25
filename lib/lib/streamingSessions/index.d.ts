import * as admin from "firebase-admin";
import { BrowserStateUpdateWebRtc, Deployment, DeploymentState, Participant } from "../docTypes";
import { ClusterProvider, ConfigurationOdysseyClientPod } from "../systemDocTypes";
import { GetFirestoreDocResult } from "../documents/firestore";
import { ResolvedSpaceUnrealProjectVersion } from "../unrealProjects/shared";
export declare function checkWebRtcStateOnline(result: GetFirestoreDocResult<BrowserStateUpdateWebRtc>, deviceTimeout: number): boolean;
export declare type ParticipantUpdate = Omit<Participant, "stateChanges"> & {
    stateChanges: admin.firestore.FieldValue;
};
export declare function updateParticipant(participant: ParticipantUpdate, organizationId: string, roomId: string, participantId: string): Promise<FirebaseFirestore.WriteResult>;
export declare function getConfigurationOdysseyClientPod(organizationId?: string, spaceId?: string, shardOfRoomId?: string, roomId?: string, userId?: string): Promise<ConfigurationOdysseyClientPod | undefined>;
export declare function createNewDeployment(userId: string, deviceId: string, attempts: number, workloadClusterProvider: ClusterProvider): Deployment;
export declare function orderOfDeploymentState(deploymentState: DeploymentState): 1 | 0 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export declare function deprovisionDeployment(organizationId: string, roomId: string, participantId: string, deploymentId: string): Promise<FirebaseFirestore.WriteResult | undefined>;
export declare function replaceAndDeprovisionDeployment(organizationId: string, roomId: string, participantId: string, deploymentId: string, userId: string, deviceId: string, attempts: number, workloadClusterProvider: ClusterProvider): Promise<string | false | undefined>;
export declare function createNewDeployments(organizationId: string, spaceId: string, roomId: string, participantId: string, userId: string, deviceId: string, shardOfRoomId?: string): Promise<Promise<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>[]>;
export declare function deployStreamingSession(projectId: string, deployment: Deployment, organizationId: string, spaceId: string, shardOfRoomId: string | undefined, roomId: string, participantId: string, deploymentId: string, serverAddress: string | undefined, levelId: string | undefined, userId: string, deviceId: string, graphicsBenchmark: number, resolvedSpaceUnrealProjectVersion: ResolvedSpaceUnrealProjectVersion, serverRegion?: string): Promise<FirebaseFirestore.WriteResult | undefined>;
export declare function collectDeploymentPodStackState(organizationId: string, roomId: string, participantId: string, deploymentId: string, userId: string, workloadClusterProvider: ClusterProvider, deploymentState: DeploymentState): Promise<string | undefined>;
