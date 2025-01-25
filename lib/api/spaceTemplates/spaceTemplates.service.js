"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const fireorm_1 = require("fireorm");
const nestjs_fireorm_1 = require("nestjs-fireorm");
const spaceTemplate_entity_1 = require("./spaceTemplate.entity");
let SpaceTemplatesService = class SpaceTemplatesService {
    constructor(spaceTemplates) {
        this.spaceTemplates = spaceTemplates;
    }
    async getSpaceTemplates(organizationId) {
        const publicSpaceTemplates = await this.spaceTemplates.whereEqualTo("public", true).find();
        const getOrganizationSpaceTemplates = async () => {
            if (organizationId == undefined) {
                return [];
            }
            else {
                return await this.spaceTemplates.whereArrayContains("orgOwner", organizationId).find();
            }
        };
        const allSpaceTemplates = [...publicSpaceTemplates, ...(await getOrganizationSpaceTemplates())].reduce((acc, st) => {
            if (acc.find((v) => v.id == st.id) == undefined)
                acc.push(st);
            return acc;
        }, []);
        if (allSpaceTemplates == null || allSpaceTemplates.length == 0)
            return [];
        return allSpaceTemplates;
    }
    async getSpaceTemplate(spaceTemplateId, organizationId) {
        const spaceTemplate = await this.spaceTemplates.findById(spaceTemplateId);
        if (spaceTemplate == null)
            return undefined;
        if (spaceTemplate.public == true) {
            return spaceTemplate;
        }
        if (organizationId != undefined && spaceTemplate.orgOwner.includes(organizationId)) {
            return spaceTemplate;
        }
        return undefined;
    }
};
SpaceTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, nestjs_fireorm_1.InjectRepository)(spaceTemplate_entity_1.SpaceTemplate)),
    __metadata("design:paramtypes", [fireorm_1.BaseFirestoreRepository])
], SpaceTemplatesService);
exports.SpaceTemplatesService = SpaceTemplatesService;
//# sourceMappingURL=spaceTemplates.service.js.map