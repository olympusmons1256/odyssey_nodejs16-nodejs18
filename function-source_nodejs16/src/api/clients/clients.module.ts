import {Module} from "@nestjs/common";
import {FireormModule} from "@newgameplus/nestjs-fireorm";
import {AuthClient} from "../auth-client.entity";
import {ClientsService} from "./clients.service";

@Module({
  imports: [FireormModule.forFeature([AuthClient])],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
