import {BasicStrategy} from "passport-http";
import {Injectable, UnauthorizedException} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {AuthService} from "./auth.service";
import {AuthClient} from "../auth-client.entity";

@Injectable()
export class BasicAuthStrategy extends PassportStrategy(BasicStrategy) {
  constructor(private authService: AuthService) {
    super({
      passReqToCallback: true,
    });
  }

  async validate(_req: any, clientId: string, clientSecret: string): Promise<AuthClient> {
    const authClient = await this.authService.validateClient(clientId, clientSecret);
    if (typeof(authClient) == "string") throw new UnauthorizedException(authClient);
    return authClient;
  }
}
