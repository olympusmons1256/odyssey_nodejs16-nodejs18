import * as shortUuid from "short-uuid";
export declare function createNewOrganizationWithOwner(name: string, ownerId: string): Promise<shortUuid.SUUID | undefined>;
