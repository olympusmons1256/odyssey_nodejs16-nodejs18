import { AuthService } from "./auth/auth.service";
import { PostTokenRequestBody, PostTokenResponseBody } from "./auth/token.dto";
export declare class AppController {
    private authService;
    constructor(authService: AuthService);
    token(body: PostTokenRequestBody, req: any): Promise<PostTokenResponseBody>;
}
