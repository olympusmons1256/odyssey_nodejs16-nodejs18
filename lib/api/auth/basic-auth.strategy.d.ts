import { BasicStrategy } from "passport-http";
import { AuthService } from "./auth.service";
import { AuthClient } from "../auth-client.entity";
declare const BasicAuthStrategy_base: new (...args: any[]) => BasicStrategy;
export declare class BasicAuthStrategy extends BasicAuthStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(_req: any, clientId: string, clientSecret: string): Promise<AuthClient>;
}
export {};
