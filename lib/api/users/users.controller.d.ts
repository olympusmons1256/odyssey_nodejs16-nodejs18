import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/createUser.dto";
import { UpdateUserDto } from "./dto/updateUser.dto";
import { OrganizationsService } from "../organizations/organizations.service";
import { User } from "./entities/user.entity";
export declare class UsersController {
    private readonly usersService;
    private readonly organizationsService;
    constructor(usersService: UsersService, organizationsService: OrganizationsService);
    createUser(createUserDto: CreateUserDto, req: any): Promise<User>;
    createCustomToken(userId: string, req: any): Promise<{
        customToken: string;
    }>;
    getUsers(req: any): Promise<User[]>;
    getUser(userId: string, req: any): Promise<User | undefined>;
    updateUser(userId: string, updateUserDto: UpdateUserDto, req: any): Promise<User | undefined>;
    deleteUser(userId: string, req: any): Promise<void>;
}
