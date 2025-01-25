import { ConfigurationOdysseyClientPod, CoreweaveRegionsAvailabilityResponseData, CoreweaveValidGpus, CoreweaveWorkloadResourceRequest } from "../systemDocTypes";
export declare function getLatestAvailabilityFromCoreweave(): Promise<void>;
export declare function calculateGpuRegionsFromAvailability(availabilityData: CoreweaveRegionsAvailabilityResponseData, validRegions: string[], validGpus: CoreweaveValidGpus, graphicsBenchmark: number, serverRegion?: string, maximumCost?: number): Promise<CoreweaveWorkloadResourceRequest[]>;
export declare function selectWeightEquivalentRandomGpuRegion(gpuRegions: CoreweaveWorkloadResourceRequest[]): CoreweaveWorkloadResourceRequest[];
export declare function resolveGpuRegions(configuration: ConfigurationOdysseyClientPod | undefined, graphicsBenchmark: number, restrictToRegions: string[] | undefined, serverRegion?: string): Promise<CoreweaveWorkloadResourceRequest[]>;
