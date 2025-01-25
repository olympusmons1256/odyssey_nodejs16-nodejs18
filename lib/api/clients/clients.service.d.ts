import { BaseFirestoreRepository } from "fireorm";
import { AuthClient } from "../auth-client.entity";
export declare class ClientsService {
    private authClients;
    constructor(authClients: BaseFirestoreRepository<AuthClient>);
    findById(authClientId: string): Promise<AuthClient>;
}
