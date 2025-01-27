interface StreamCredentials {
    consumerKey: string;
    consumerSecret: string;
}
export declare function getStreamCredentials(): StreamCredentials;
export declare function signParticipantJwtToken(userId: string): Promise<string>;
export {};
