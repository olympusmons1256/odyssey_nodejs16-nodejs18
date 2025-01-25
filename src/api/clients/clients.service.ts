import {Injectable} from "@nestjs/common";
import {BaseFirestoreRepository} from "fireorm";
import {InjectRepository} from "nestjs-fireorm";
import {AuthClient} from "../auth-client.entity";

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(AuthClient)
    private authClients: BaseFirestoreRepository<AuthClient>
  ) {}

  async findById(authClientId: string): Promise<AuthClient> {
    return await this.authClients.findById(authClientId);
  }
}
