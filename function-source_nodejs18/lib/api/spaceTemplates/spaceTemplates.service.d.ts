import { BaseFirestoreRepository } from "fireorm";
import { SpaceTemplate } from "./spaceTemplate.entity";
export declare class SpaceTemplatesService {
    private spaceTemplates;
    constructor(spaceTemplates: BaseFirestoreRepository<SpaceTemplate>);
    getSpaceTemplates(organizationId?: string): Promise<SpaceTemplate[]>;
    getSpaceTemplate(spaceTemplateId: string, organizationId?: string): Promise<SpaceTemplate | undefined>;
}
