export declare class PostTokenRequestBody {
    client_id: string;
    client_secret: string;
    grant_type: string;
    scope?: string;
}
export declare class PostTokenResponseBody {
    access_token: string;
    token_type: "bearer";
    scope?: string;
    refresh_token?: string;
    constructor(access_token: string, scope?: string, refresh_token?: string);
}
