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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth/auth.service");
const public_decorator_1 = require("./auth/public.decorator");
const passport_1 = require("@nestjs/passport");
const token_dto_1 = require("./auth/token.dto");
const swagger_1 = require("@nestjs/swagger");
let AppController = class AppController {
    constructor(authService) {
        this.authService = authService;
    }
    async token(body, req) {
        if (body.grant_type != "client_credentials")
            throw new common_1.BadRequestException("Value of 'grant_type' must be 'client_credentials'");
        if (body.scope != undefined && body.scope != "organization")
            throw new common_1.BadRequestException("Value of 'scope' must be 'organization'");
        return this.authService.token(req.user, body.grant_type, body.scope);
    }
};
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(["local", "basic"])),
    (0, swagger_1.ApiTags)("auth"),
    (0, swagger_1.ApiResponse)({ type: token_dto_1.PostTokenResponseBody }),
    (0, common_1.Post)("auth/token"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [token_dto_1.PostTokenRequestBody, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "token", null);
AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AppController);
exports.AppController = AppController;
//# sourceMappingURL=app.controller.js.map