import {Module} from "@nestjs/common";
import {AuthService} from "./auth.service";
import {ClientsModule} from "../clients/clients.module";
import {PassportModule} from "@nestjs/passport";
import {LocalStrategy} from "./local.strategy";
import {JwtStrategy} from "./jwt.strategy";
import {JwtModule} from "@nestjs/jwt";
import {JwtAuthGuard} from "./jwt-auth.guard";
import {APP_GUARD} from "@nestjs/core";
import {BasicAuthStrategy} from "./basic-auth.strategy";
import {AppConfigService} from "../appConfig/appConfig.service";

@Module({
  imports: [
    ClientsModule,
    PassportModule,
    JwtModule.register({
      signOptions: {expiresIn: "24h", algorithm: "RS256"},
      privateKey: AppConfigService.getJwtSigningKey(),
    }),
  ],
  providers: [
    AuthService,
    LocalStrategy,
    BasicAuthStrategy,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [
    AuthService,
  ],
})
export class AuthModule {}
