import { ClientsService } from "../clients/clients.service";
import { JwtService } from "@nestjs/jwt";
import { AuthClient } from "../auth-client.entity";
import { PostTokenResponseBody } from "./token.dto";
import { OrganizationsService } from "../organizations/organizations.service";
export declare class AuthService {
    private clientsService;
    private organizationsService;
    private jwtService;
    constructor(clientsService: ClientsService, organizationsService: OrganizationsService, jwtService: JwtService);
    validateClient(client_id: string, client_secret: string): Promise<AuthClient | string>;
    token(authClient: AuthClient, grantType: string, scope?: string): Promise<PostTokenResponseBody>;
}
