export interface DolbyTokenResponse {
    id: string;
    token: string;
    accountId: string;
}
export declare function createStreamingSubscriberToken(streamName: string, label: string): Promise<DolbyTokenResponse | undefined>;
export declare function createStreamingPublisherToken(streamName: string, label: string): Promise<DolbyTokenResponse | undefined>;
export declare function signParticipantJwtToken(): Promise<string | undefined>;
