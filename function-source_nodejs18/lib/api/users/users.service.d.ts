import { BaseFirestoreRepository } from "fireorm";
import { OrganizationsService } from "../organizations/organizations.service";
import { CreateUserDto } from "./dto/createUser.dto";
import { UpdateUserDto } from "./dto/updateUser.dto";
import { User } from "./entities/user.entity";
export declare class UsersService {
    private users;
    private organizationsService;
    constructor(users: BaseFirestoreRepository<User>, organizationsService: OrganizationsService);
    createUser(createUserDto: CreateUserDto): Promise<User | undefined | "error">;
    createUserAuthToken(organizationId: string, userId: string): Promise<{
        customToken: string;
    } | undefined | "error">;
    getUsers(organizationId: string): Promise<User[]>;
    getUser(organizationId: string, userId: string): Promise<User | undefined>;
    updateUser(organizationId: string, userId: string, updateUserDto: UpdateUserDto): Promise<User | undefined | "error">;
    deleteUser(organizationId: string, userId: string): Promise<string>;
}
