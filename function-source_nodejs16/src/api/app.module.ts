import {MiddlewareConsumer, Module, NestModule, RequestMethod} from "@nestjs/common";
import {AuthModule} from "./auth/auth.module";
import {ClientsModule} from "./clients/clients.module";
import {AppController} from "./app.controller";
import {OrganizationsModule} from "./organizations/organizations.module";
import {ClientCredentialsAuthParamsMiddleware} from "./client-credentials-auth-params.middleware";
import {PostTokenRequestBody} from "./auth/token.dto";
import {FireormModule} from "@newgameplus/nestjs-fireorm";
import {CaslModule} from "./casl/casl.module";
import {SpaceTemplatesModule} from "./spaceTemplates/spaceTemplates.module";
import {UsersModule} from "./users/users.module";
import {AppConfigModule} from "./appConfig/appConfig.module";

@Module({
  imports: [
    AuthModule,
    ClientsModule,
    OrganizationsModule,
    SpaceTemplatesModule,
    PostTokenRequestBody,
    FireormModule.forRoot({
      firestoreSettings: {ignoreUndefinedProperties: true},
      fireormSettings: {validateModels: true},
    }),
    CaslModule,
    UsersModule,
    AppConfigModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ClientCredentialsAuthParamsMiddleware)
      .forRoutes({path: "/auth/token", method: RequestMethod.POST});
  }
}
