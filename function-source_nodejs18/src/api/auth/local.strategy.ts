import {Strategy} from "passport-local";
import {PassportStrategy} from "@nestjs/passport";
import {Injectable, UnauthorizedException} from "@nestjs/common";
import {AuthService} from "./auth.service";
import {AuthClient} from "../auth-client.entity";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  // eslint-disable-next-line camelcase
  async validate(client_id: string, client_secret: string): Promise<AuthClient> {
    const client = await this.authService.validateClient(client_id, client_secret);
    if (typeof(client) == "string") throw new UnauthorizedException(client);
    return client;
  }
}
