/// <reference types="node" />
/// <reference types="node" />
import * as http from "http";
export declare function sleep(ms: number): Promise<unknown>;
export declare function sleepForever(): any;
export declare function md5sum(data: Buffer): string;
export declare function stringify(value: any): string;
export declare function readFile(path: string): Promise<string>;
export declare function isProductionFirebaseProject(projectId: string): boolean;
export declare function inEmulatorEnv(): boolean;
export declare function dedupList<T>(l: Array<T>): T[];
export declare function isOdysseyStaffEmail(email: string): boolean;
export declare function getMedian(numbers: number[]): number | undefined;
export declare function chunkList<T>(l: Array<T>, chunkSize: number): Array<Array<T>>;
export declare function uniqueByReduce<T>(array: T[]): T[];
export declare function lastItemInArray<T>(array: T[]): T | undefined;
export declare function timeChunkedOperation<T, U>(items: Array<T>, chunkSize: number, millis: number, flatMapFn?: (value: T) => Promise<Array<U>>, arrayFn?: (value: Array<T>) => Promise<Array<U>>, mapFn?: (value: T) => Promise<U>): Promise<Array<U>>;
export declare type K8sResponse = {
    body: any;
    response: http.IncomingMessage;
};
export declare function logHttpResponse(responsePromise: Promise<K8sResponse>): Promise<K8sResponse>;
export declare function yearMonthDay(): string;
export declare function getBillingPeriod(date: Date): {
    year: string;
    month: string;
    day: string;
    hour: string;
};
export declare function formatVolumeName(projectName: string, imageId: string, workloadRegion: string): string;
export declare function convertSpaceSeparatedStringToArray(v: string): string[];
export declare function tryStringToNumber(s: string | undefined): number | undefined;
