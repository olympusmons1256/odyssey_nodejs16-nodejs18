import {Injectable} from "@nestjs/common";
import {BaseFirestoreRepository} from "fireorm";
import {InjectRepository} from "nestjs-fireorm";
import {SpaceTemplate} from "./spaceTemplate.entity";

@Injectable()
export class SpaceTemplatesService {
  constructor(
    @InjectRepository(SpaceTemplate)
    private spaceTemplates: BaseFirestoreRepository<SpaceTemplate>,
  ) { }

  async getSpaceTemplates(organizationId?: string) {
    const publicSpaceTemplates = await this.spaceTemplates.whereEqualTo("public", true).find();
    const getOrganizationSpaceTemplates = async () => {
      if (organizationId == undefined) {
        return [];
      } else {
        return await this.spaceTemplates.whereArrayContains("orgOwner", organizationId).find();
      }
    };

    const allSpaceTemplates = [...publicSpaceTemplates, ...(await getOrganizationSpaceTemplates())].reduce((acc, st) => {
      if (acc.find((v) => v.id == st.id) == undefined) acc.push(st);
      return acc;
    }, ([] as SpaceTemplate[]));

    if (allSpaceTemplates == null || allSpaceTemplates.length == 0) return [];
    return allSpaceTemplates;
  }

  async getSpaceTemplate(spaceTemplateId: string, organizationId?: string) : Promise<SpaceTemplate | undefined> {
    const spaceTemplate = await this.spaceTemplates.findById(spaceTemplateId);
    if (spaceTemplate == null) return undefined;
    if (spaceTemplate.public == true) {
      return spaceTemplate;
    }
    if (organizationId != undefined && spaceTemplate.orgOwner.includes(organizationId)) {
      return spaceTemplate;
    }
    return undefined;
  }
}
