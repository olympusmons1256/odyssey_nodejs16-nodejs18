export interface FirebaseConfig {
    databaseURL: string;
    storageBucket: string;
    projectId: string;
}
export declare function getFirebaseProjectId(): string;
export declare function getFirebaseProjectStorage(): string;
export declare function getStripeSecretKey(): string | undefined;
export declare function getSlackToken(): string | undefined;
export declare function getStripeWebhookSigningKey(): string | undefined;
export declare function getPostmarkKey(): string | undefined;
export declare function getEnvUrl(env: string): "https://app.odyssey.stream" | "https://app-dev.odyssey.stream" | "https://app-testing.odyssey.stream" | "http://localhost:8080";
export declare function projectToEnvName(projectId: string): "emulator" | "prod" | "dev" | "testing" | undefined;
