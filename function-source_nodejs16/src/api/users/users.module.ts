import {Module} from "@nestjs/common";
import {UsersService} from "./users.service";
import {UsersController} from "./users.controller";
import {User} from "./entities/user.entity";
import {FireormModule} from "@newgameplus/nestjs-fireorm";
import {OrganizationsModule} from "../organizations/organizations.module";

@Module({
  imports: [OrganizationsModule, FireormModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, FireormModule.forFeature([User])],
})
export class UsersModule {}
