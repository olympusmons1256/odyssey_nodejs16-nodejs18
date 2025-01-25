import { Strategy } from "passport-local";
import { AuthService } from "./auth.service";
import { AuthClient } from "../auth-client.entity";
declare const LocalStrategy_base: new (...args: any[]) => Strategy;
export declare class LocalStrategy extends LocalStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(client_id: string, client_secret: string): Promise<AuthClient>;
}
export {};
