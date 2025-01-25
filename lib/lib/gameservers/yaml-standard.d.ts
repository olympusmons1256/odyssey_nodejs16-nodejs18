import { V1Pod, V1Service } from "@kubernetes/client-node";
import { ConfigurationOdysseyServer } from "../systemDocTypes";
import { ResolvedSpaceUnrealProjectVersion } from "../unrealProjects/shared";
export declare function templatePod(projectId: string, configuration: ConfigurationOdysseyServer, region: string, organizationId: string, spaceId: string, roomId: string, levelId: string | undefined, resolvedSpaceUnrealProjectVersion: ResolvedSpaceUnrealProjectVersion, gameServerYaml: string): V1Pod | undefined;
export declare function templateService(projectId: string, configuration: ConfigurationOdysseyServer, region: string, organizationId: string, spaceId: string, roomId: string, serviceYaml: string): V1Service;
