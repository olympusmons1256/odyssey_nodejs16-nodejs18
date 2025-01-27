"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaslAbilityFactory = exports.Action = void 0;
const common_1 = require("@nestjs/common");
const ability_1 = require("@casl/ability");
const organization_entity_1 = require("../organizations/organization.entity");
var Action;
(function (Action) {
    Action["Manage"] = "manage";
    Action["Create"] = "create";
    Action["Read"] = "read";
    Action["Update"] = "update";
    Action["Delete"] = "delete";
})(Action = exports.Action || (exports.Action = {}));
let CaslAbilityFactory = class CaslAbilityFactory {
    createForClient(client) {
        const { can, build } = new ability_1.AbilityBuilder(ability_1.Ability);
        can(Action.Read, organization_entity_1.Organization, { id: client.id });
        return build({
            // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
            detectSubjectType: (item) => item.constructor,
        });
    }
    createForJwtUser(jwtUser) {
        const { can, build } = new ability_1.AbilityBuilder(ability_1.Ability);
        can(Action.Read, organization_entity_1.Organization, { id: jwtUser.organizationId });
        return build({
            // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
            detectSubjectType: (item) => item.constructor,
        });
    }
};
CaslAbilityFactory = __decorate([
    (0, common_1.Injectable)()
], CaslAbilityFactory);
exports.CaslAbilityFactory = CaslAbilityFactory;
//# sourceMappingURL=casl-ability.factory.js.map