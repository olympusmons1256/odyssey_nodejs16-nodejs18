import { Ability, InferSubjects } from "@casl/ability";
import { Organization } from "../organizations/organization.entity";
import { AuthClient } from "../auth-client.entity";
declare type Subjects = InferSubjects<typeof Organization | typeof AuthClient> | "all";
export declare type AppAbility = Ability<[Action, Subjects]>;
export declare enum Action {
    Manage = "manage",
    Create = "create",
    Read = "read",
    Update = "update",
    Delete = "delete"
}
export interface JwtUser {
    sub: string;
    organizationId: string;
}
export declare class CaslAbilityFactory {
    createForClient(client: AuthClient): Ability<[Action, Subjects], import("@casl/ability").MongoQuery<import("@casl/ability/dist/types/types").AnyObject>>;
    createForJwtUser(jwtUser: JwtUser): Ability<[Action, Subjects], import("@casl/ability").MongoQuery<import("@casl/ability/dist/types/types").AnyObject>>;
}
export {};
