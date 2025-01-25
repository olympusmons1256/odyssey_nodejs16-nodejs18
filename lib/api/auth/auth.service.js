"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const clients_service_1 = require("../clients/clients.service");
const jwt_1 = require("@nestjs/jwt");
const token_dto_1 = require("./token.dto");
const argon2 = __importStar(require("argon2"));
const organizations_service_1 = require("../organizations/organizations.service");
let AuthService = class AuthService {
    constructor(clientsService, organizationsService, jwtService) {
        this.clientsService = clientsService;
        this.organizationsService = organizationsService;
        this.jwtService = jwtService;
    }
    // eslint-disable-next-line camelcase
    async validateClient(client_id, client_secret) {
        try {
            const client = await this.clientsService.findById(client_id);
            if (client == undefined || client == null || client.secret == undefined || client.organizationId == undefined) {
                return "Unauthorized";
            }
            const billingPublic = await this.organizationsService.getBillingPublic(client.organizationId);
            if (billingPublic == undefined) {
                console.warn(`Client auth failed for ${client.id}: ${client.organizationId} no billingPublic`);
                return "Unauthorized";
            }
            if (billingPublic.features.restApi == false) {
                return "REST API disabled for organization";
            }
            try {
                const result = await argon2.verify(client.secret, client_secret);
                return result ? client : "Unauthorized";
            }
            catch (e) {
                return "Unauthorized";
            }
        }
        catch (e) {
            console.error("Uncaught exception");
            console.error(e);
            return "Internal Error";
        }
    }
    async token(authClient, grantType, scope) {
        const payload = {
            organizationId: authClient.organizationId,
            sub: authClient.id,
            grantType: grantType,
            scope: scope,
        };
        // eslint-disable-next-line camelcase
        const access_token = this.jwtService.sign(payload);
        return new token_dto_1.PostTokenResponseBody(access_token);
    }
};
AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [clients_service_1.ClientsService,
        organizations_service_1.OrganizationsService,
        jwt_1.JwtService])
], AuthService);
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map