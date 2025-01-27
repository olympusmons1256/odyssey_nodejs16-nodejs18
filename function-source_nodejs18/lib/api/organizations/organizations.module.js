"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_fireorm_1 = require("nestjs-fireorm");
const casl_module_1 = require("../casl/casl.module");
const spaceTemplates_module_1 = require("../spaceTemplates/spaceTemplates.module");
const spaceTemplates_service_1 = require("../spaceTemplates/spaceTemplates.service");
const organization_entity_1 = require("./organization.entity");
const organizations_controller_1 = require("./organizations.controller");
const organizations_service_1 = require("./organizations.service");
let OrganizationsModule = class OrganizationsModule {
};
OrganizationsModule = __decorate([
    (0, common_1.Module)({
        imports: [nestjs_fireorm_1.FireormModule.forFeature([organization_entity_1.Organization]), casl_module_1.CaslModule, spaceTemplates_module_1.SpaceTemplatesModule],
        providers: [organizations_service_1.OrganizationsService, spaceTemplates_service_1.SpaceTemplatesService],
        controllers: [organizations_controller_1.OrganizationsController],
        exports: [organizations_service_1.OrganizationsService],
    })
], OrganizationsModule);
exports.OrganizationsModule = OrganizationsModule;
//# sourceMappingURL=organizations.module.js.map