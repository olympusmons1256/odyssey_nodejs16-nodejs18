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
exports.InviteUsersResultDto = exports.InviteUserResultDto = exports.InviteUsersToSpaceDto = exports.InviteUserToSpaceDto = exports.InviteUsersToOrganizationDto = exports.InviteUserToOrganizationDto = exports.IsOrganizationRole = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const docTypes_1 = require("../../../lib/docTypes");
const class_transformer_1 = require("class-transformer");
let IsOrganizationRole = class IsOrganizationRole {
    validate(text) {
        console.debug("Validating organization roles");
        return docTypes_1.ORGANIZATION_ROLES.map((v) => v.toString()).includes(text);
    }
    defaultMessage() {
        // here you can provide default error message if validation failed
        return "Field ($value) is not a valid organization role. Try one of these: " + docTypes_1.ORGANIZATION_ROLES.map((v) => "\"" + v + "\"").join(",");
    }
};
IsOrganizationRole = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: "organizationRole", async: false })
], IsOrganizationRole);
exports.IsOrganizationRole = IsOrganizationRole;
class InviteUserToOrganizationDto {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], InviteUserToOrganizationDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Validate)(IsOrganizationRole),
    __metadata("design:type", String)
], InviteUserToOrganizationDto.prototype, "organizationRole", void 0);
exports.InviteUserToOrganizationDto = InviteUserToOrganizationDto;
class InviteUsersToOrganizationDto {
    constructor() {
        this.sendInviteEmails = false;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)({ type: [InviteUserToOrganizationDto], maxItems: 10 }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.ArrayMaxSize)(10),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => InviteUserToOrganizationDto),
    __metadata("design:type", Array)
], InviteUsersToOrganizationDto.prototype, "users", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Boolean)
], InviteUsersToOrganizationDto.prototype, "sendInviteEmails", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], InviteUsersToOrganizationDto.prototype, "inviterName", void 0);
exports.InviteUsersToOrganizationDto = InviteUsersToOrganizationDto;
class InviteUserToSpaceDto {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], InviteUserToSpaceDto.prototype, "email", void 0);
exports.InviteUserToSpaceDto = InviteUserToSpaceDto;
class InviteUsersToSpaceDto {
    constructor() {
        this.sendInviteEmails = false;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)({ type: [InviteUserToSpaceDto], maxItems: 10 }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.ArrayMaxSize)(10),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => InviteUserToSpaceDto),
    __metadata("design:type", Array)
], InviteUsersToSpaceDto.prototype, "users", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Boolean)
], InviteUsersToSpaceDto.prototype, "sendInviteEmails", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], InviteUsersToSpaceDto.prototype, "inviterName", void 0);
exports.InviteUsersToSpaceDto = InviteUsersToSpaceDto;
class InviteUserResultDto {
    constructor(email, statusCode, inviteLink, inviteId, error) {
        this.email = email;
        this.statusCode = statusCode;
        this.inviteLink = inviteLink;
        this.inviteId = inviteId;
        this.error = error;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InviteUserResultDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], InviteUserResultDto.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], InviteUserResultDto.prototype, "inviteLink", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], InviteUserResultDto.prototype, "inviteId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], InviteUserResultDto.prototype, "error", void 0);
exports.InviteUserResultDto = InviteUserResultDto;
class InviteUsersResultDto {
    constructor(results) {
        this.results = results;
        this.errorCount = results.reduce((acc, result) => result.error == undefined ? acc : acc + 1, 0);
    }
}
__decorate([
    (0, swagger_1.ApiProperty)({ type: [InviteUserResultDto] }),
    __metadata("design:type", Array)
], InviteUsersResultDto.prototype, "results", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], InviteUsersResultDto.prototype, "errorCount", void 0);
exports.InviteUsersResultDto = InviteUsersResultDto;
//# sourceMappingURL=invite.dto.js.map