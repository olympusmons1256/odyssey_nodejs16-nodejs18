"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientCredentialsAuthParamsMiddleware = void 0;
const common_1 = require("@nestjs/common");
let ClientCredentialsAuthParamsMiddleware = class ClientCredentialsAuthParamsMiddleware {
    use(req, _res, next) {
        /* Change `client_id` & client_secret params to `username` & `password`
        so that passport-local will work */
        // Remove any existing username or password params
        if (req.body.username != undefined && req.body.client_id == undefined) {
            return next(new common_1.HttpException("Unauthorized", 401));
        }
        if (req.body.password != undefined && req.body.client_secret == undefined) {
            return next(new common_1.HttpException("Unauthorized", 401));
        }
        // Copy client_id to username
        if (req.body.client_id) {
            req.body.username = req.body.client_id;
        }
        // Copy client_secret to password
        if (req.body.client_secret) {
            req.body.password = req.body.client_secret;
        }
        next();
    }
};
ClientCredentialsAuthParamsMiddleware = __decorate([
    (0, common_1.Injectable)()
], ClientCredentialsAuthParamsMiddleware);
exports.ClientCredentialsAuthParamsMiddleware = ClientCredentialsAuthParamsMiddleware;
//# sourceMappingURL=client-credentials-auth-params.middleware.js.map