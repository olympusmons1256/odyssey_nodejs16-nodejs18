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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Organization = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const fireorm_1 = require("fireorm");
const billing_entity_1 = require("./billing.entity");
const organizationUser_entity_1 = require("./organizationUser.entity");
const space_entity_1 = require("./space.entity");
let Organization = class Organization {
};
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], Organization.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], Organization.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Organization.prototype, "domain", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], Organization.prototype, "whitelabel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Organization.prototype, "logoSmallUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Organization.prototype, "splashImageUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Organization.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Organization.prototype, "bio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Organization.prototype, "websiteUrl", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, fireorm_1.SubCollection)(space_entity_1.Space, "spaces"),
    __metadata("design:type", Object)
], Organization.prototype, "spaces", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, fireorm_1.SubCollection)(organizationUser_entity_1.OrganizationUser, "organizationUsers"),
    __metadata("design:type", Object)
], Organization.prototype, "organizationUsers", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, fireorm_1.SubCollection)(billing_entity_1.BillingUsage, "billing"),
    __metadata("design:type", Object)
], Organization.prototype, "billingUsage", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, fireorm_1.SubCollection)(billing_entity_1.BillingPublic, "billing"),
    __metadata("design:type", Object)
], Organization.prototype, "billingPublic", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, fireorm_1.SubCollection)(billing_entity_1.BillingSubscription, "billing"),
    __metadata("design:type", Object)
], Organization.prototype, "billingSubscription", void 0);
Organization = __decorate([
    (0, fireorm_1.Collection)("organizations")
], Organization);
exports.Organization = Organization;
//# sourceMappingURL=organization.entity.js.map