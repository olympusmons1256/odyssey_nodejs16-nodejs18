import {Module} from "@nestjs/common";
import {FireormModule} from "@newgameplus/nestjs-fireorm";
import {CaslModule} from "../casl/casl.module";
import {SpaceTemplatesModule} from "../spaceTemplates/spaceTemplates.module";
import {SpaceTemplatesService} from "../spaceTemplates/spaceTemplates.service";
import {Organization} from "./organization.entity";
import {OrganizationsController} from "./organizations.controller";
import {OrganizationsService} from "./organizations.service";

@Module({
  imports: [FireormModule.forFeature([Organization]), CaslModule, SpaceTemplatesModule],
  providers: [OrganizationsService, SpaceTemplatesService],
  controllers: [OrganizationsController],
  exports: [OrganizationsService],
})

export class OrganizationsModule {}
