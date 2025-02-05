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
exports.PostTokenResponseBody = exports.PostTokenRequestBody = void 0;
/* eslint-disable camelcase */
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class PostTokenRequestBody {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PostTokenRequestBody.prototype, "client_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PostTokenRequestBody.prototype, "client_secret", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PostTokenRequestBody.prototype, "grant_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PostTokenRequestBody.prototype, "scope", void 0);
exports.PostTokenRequestBody = PostTokenRequestBody;
class PostTokenResponseBody {
    constructor(access_token, scope, refresh_token) {
        this.access_token = access_token;
        this.token_type = "bearer";
        this.scope = scope;
        this.refresh_token = refresh_token;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PostTokenResponseBody.prototype, "access_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PostTokenResponseBody.prototype, "token_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PostTokenResponseBody.prototype, "scope", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PostTokenResponseBody.prototype, "refresh_token", void 0);
exports.PostTokenResponseBody = PostTokenResponseBody;
//# sourceMappingURL=token.dto.js.map