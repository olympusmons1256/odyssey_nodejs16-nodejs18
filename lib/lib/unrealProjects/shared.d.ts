import { BridgeToolkitSettings, Configurator, OrgSpace } from "../cmsDocTypes";
import { UnrealProject, UnrealProjectVersion } from "../docTypes";
import { GetFirestoreDocResult } from "../documents/firestore";
import { ConfigurationUnrealProjectVersion } from "../systemDocTypes";
export declare function getUnrealProjectName(unrealProject?: UnrealProject, unrealProjectVersion?: UnrealProjectVersion): string | undefined;
export declare function getConfigurationUnrealProjectVersion(options: {
    organizationId?: string;
    unrealProjectId?: string;
    unrealProjectVersionId?: string;
    authorUserId?: string;
}): Promise<ConfigurationUnrealProjectVersion | undefined>;
export declare function formatUnrealProjectVersionBuildPodName(unrealProjectVersionId: string): string;
export declare function formatUnrealProjectVersionVolumeCopyPodName(unrealProjectVersionId: string, region: string): string;
export declare function formatBuilderConfigMapName(projectId: string): string | undefined;
export declare function formatVolumeCopyConfigMapName(projectId: string): string | undefined;
export declare function formatPackageValidatorConfigMapName(projectId: string): string | undefined;
export declare function formatUnrealProjectVersionPackageValidatorPodName(unrealProjectVersionId: string): string;
export declare function formatUnrealProjectVersionClaimName(unrealProjectVersionId: string, region: string): string;
export declare function formatSharedDdcClaimName(region: string): string;
export declare function formatPluginVersionClaimName(pluginVersionId: string, region: string): string;
export declare type ResolvedSpaceUnrealProjectVersion = undefined | {
    unrealProjectId: string;
    unrealProject: UnrealProject;
    unrealProjectVersionId: string;
    unrealProjectVersion: UnrealProjectVersion;
};
export declare function resolveSpaceUnrealProjectVersion(space: OrgSpace): Promise<"not-found" | ResolvedSpaceUnrealProjectVersion>;
export declare function createConfiguratorTemplateItems(spaceTemplateRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, unrealProjectVersion: UnrealProjectVersion): Promise<Configurator[] | undefined>;
export declare function createUpdateConfiguratorItems(spaceRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, configuratorTemplateItems: Configurator[]): Promise<Configurator[] | undefined>;
export declare function createUpdateBridgeToolkitSettingsTemplateItem(spaceTemplateRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, unrealProjectVersion: UnrealProjectVersion): Promise<BridgeToolkitSettings | undefined>;
export declare function createUpdateBridgeToolkitSettingsItem(spaceRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, bridgeToolkitSettingsTemplateItem: BridgeToolkitSettings): Promise<BridgeToolkitSettings | undefined>;
export declare function getAllExpirableUnrealProjectVersions(fromThirtyDaysAgo?: boolean): Promise<GetFirestoreDocResult<UnrealProjectVersion>[]>;
export declare function expireUnrealProjectVersions(unrealProjectVersions: GetFirestoreDocResult<UnrealProjectVersion>[]): Promise<FirebaseFirestore.WriteResult[]>;
export declare function getLatestUnrealProjectVersion(unrealProjectId: string): Promise<{
    unrealProjectId: string;
    doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
    unrealProjectVersion: UnrealProjectVersion;
} | undefined>;
