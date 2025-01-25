export declare function createSignedUploadUrl(bucketName: string, destFile: string): Promise<string | undefined>;
export declare function checkUploadedFileExists(bucketName: string, destFile: string): Promise<{
    (options?: object | undefined): Promise<[boolean]>;
    (options: object, callback: import("@google-cloud/storage/build/src/nodejs-common").ExistsCallback): void;
    (callback: import("@google-cloud/storage/build/src/nodejs-common").ExistsCallback): void;
} | undefined>;
export declare function createSignedDownloadUrl(bucketName: string, destFile: string): Promise<string | undefined>;
export declare function deleteArtifact(bucketName: string, fileName: string): Promise<import("teeny-request").Response<any> | {
    statusCode: number;
} | undefined>;
