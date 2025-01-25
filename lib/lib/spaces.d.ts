import * as cmsDocTypes from "./cmsDocTypes";
export declare function saveSpaceHistory(organizationId: string, spaceId: string, timestamp?: Date, space?: cmsDocTypes.OrgSpace, authorUserId?: string, name?: string): Promise<"error-not-found" | "error-author-user-not-found" | "error-space-items-not-found" | "error-internal" | {
    id: string;
    spaceHistory: cmsDocTypes.SpaceHistory;
    spaceItemsHistoryPages: cmsDocTypes.SpaceItemsHistoryPage[];
}>;
