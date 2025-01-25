"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("./auth/auth.module");
const clients_module_1 = require("./clients/clients.module");
const app_controller_1 = require("./app.controller");
const organizations_module_1 = require("./organizations/organizations.module");
const client_credentials_auth_params_middleware_1 = require("./client-credentials-auth-params.middleware");
const token_dto_1 = require("./auth/token.dto");
const nestjs_fireorm_1 = require("nestjs-fireorm");
const casl_module_1 = require("./casl/casl.module");
const spaceTemplates_module_1 = require("./spaceTemplates/spaceTemplates.module");
const users_module_1 = require("./users/users.module");
const appConfig_module_1 = require("./appConfig/appConfig.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(client_credentials_auth_params_middleware_1.ClientCredentialsAuthParamsMiddleware)
            .forRoutes({ path: "/auth/token", method: common_1.RequestMethod.POST });
    }
};
AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            clients_module_1.ClientsModule,
            organizations_module_1.OrganizationsModule,
            spaceTemplates_module_1.SpaceTemplatesModule,
            token_dto_1.PostTokenRequestBody,
            nestjs_fireorm_1.FireormModule.forRoot({
                firestoreSettings: { ignoreUndefinedProperties: true },
                fireormSettings: { validateModels: true },
            }),
            casl_module_1.CaslModule,
            users_module_1.UsersModule,
            appConfig_module_1.AppConfigModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map