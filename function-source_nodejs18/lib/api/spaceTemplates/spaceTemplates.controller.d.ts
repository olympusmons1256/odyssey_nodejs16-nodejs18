import { SpaceTemplate } from "./spaceTemplate.entity";
import { SpaceTemplatesService } from "./spaceTemplates.service";
export declare class SpaceTemplatesController {
    private spaceTemplatesService;
    constructor(spaceTemplatesService: SpaceTemplatesService);
    findOrganization(spaceTemplateId: string, req: any): Promise<SpaceTemplate>;
    findSpaces(req: any): Promise<SpaceTemplate[]>;
}
