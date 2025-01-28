import {Injectable} from "@nestjs/common";
import {Ability, AbilityBuilder, AbilityClass, ExtractSubjectType, InferSubjects} from "@casl/ability";
import {Organization} from "../organizations/organization.entity";
import {AuthClient} from "../auth-client.entity";

type Subjects = InferSubjects<typeof Organization | typeof AuthClient> | "all";

export type AppAbility = Ability<[Action, Subjects]>;


export enum Action {
  Manage = "manage",
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
}

export interface JwtUser {
  sub: string
  organizationId: string
}

@Injectable()
export class CaslAbilityFactory {
  createForClient(client: AuthClient) {
    const {can, build} = new AbilityBuilder<
    Ability<[Action, Subjects]>
    >(Ability as AbilityClass<AppAbility>);

    can(Action.Read, Organization, {id: client.id});

    return build({
      // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
      detectSubjectType: (item: any) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  createForJwtUser(jwtUser: JwtUser) {
    const {can, build} = new AbilityBuilder<
    Ability<[Action, Subjects]>
    >(Ability as AbilityClass<AppAbility>);

    can(Action.Read, Organization, {id: jwtUser.organizationId});

    return build({
      // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
      detectSubjectType: (item: any) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}

