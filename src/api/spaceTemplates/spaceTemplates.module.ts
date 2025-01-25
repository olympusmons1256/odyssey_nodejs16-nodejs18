import {Module} from "@nestjs/common";
import {FireormModule} from "nestjs-fireorm";
import {SpaceTemplate} from "./spaceTemplate.entity";
import {SpaceTemplatesController} from "./spaceTemplates.controller";
import {SpaceTemplatesService} from "./spaceTemplates.service";

@Module({
  imports: [FireormModule.forFeature([SpaceTemplate])],
  providers: [SpaceTemplatesService],
  controllers: [SpaceTemplatesController],
  exports: [SpaceTemplatesService, FireormModule.forFeature([SpaceTemplate])],
})

export class SpaceTemplatesModule {}
