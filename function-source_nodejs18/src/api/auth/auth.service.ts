import {Injectable} from "@nestjs/common";
import {ClientsService} from "../clients/clients.service";
import {JwtService} from "@nestjs/jwt";
import {AuthClient} from "../auth-client.entity";
import {PostTokenResponseBody} from "./token.dto";
import * as argon2 from "argon2";
import {OrganizationsService} from "../organizations/organizations.service";

@Injectable()
export class AuthService {
  constructor(
    private clientsService: ClientsService,
    private organizationsService: OrganizationsService,
    private jwtService: JwtService
  ) {}

  // eslint-disable-next-line camelcase
  async validateClient(client_id: string, client_secret: string): Promise<AuthClient | string> {
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
      } catch (e: any) {
        return "Unauthorized";
      }
    } catch (e: any) {
      console.error("Uncaught exception");
      console.error(e);
      return "Internal Error";
    }
  }

  async token(authClient: AuthClient, grantType: string, scope?: string) {
    const payload = {
      organizationId: authClient.organizationId,
      sub: authClient.id,
      grantType: grantType,
      scope: scope,
    };
    // eslint-disable-next-line camelcase
    const access_token = this.jwtService.sign(payload);
    return new PostTokenResponseBody(access_token);
  }
}
