"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceTemplatesModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_fireorm_1 = require("nestjs-fireorm");
const spaceTemplate_entity_1 = require("./spaceTemplate.entity");
const spaceTemplates_controller_1 = require("./spaceTemplates.controller");
const spaceTemplates_service_1 = require("./spaceTemplates.service");
let SpaceTemplatesModule = class SpaceTemplatesModule {
};
SpaceTemplatesModule = __decorate([
    (0, common_1.Module)({
        imports: [nestjs_fireorm_1.FireormModule.forFeature([spaceTemplate_entity_1.SpaceTemplate])],
        providers: [spaceTemplates_service_1.SpaceTemplatesService],
        controllers: [spaceTemplates_controller_1.SpaceTemplatesController],
        exports: [spaceTemplates_service_1.SpaceTemplatesService, nestjs_fireorm_1.FireormModule.forFeature([spaceTemplate_entity_1.SpaceTemplate])],
    })
], SpaceTemplatesModule);
exports.SpaceTemplatesModule = SpaceTemplatesModule;
//# sourceMappingURL=spaceTemplates.module.js.map