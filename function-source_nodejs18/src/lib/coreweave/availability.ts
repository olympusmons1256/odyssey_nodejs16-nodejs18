import * as axios from "axios";
import * as firebaseAdmin from "firebase-admin";
import {getCoreweaveAvailability, getCoreweaveAvailabilityRef} from "../documents/firestore";
import {ConfigurationOdysseyClientPod, CoreweaveRegionsAvailability, CoreweaveRegionsAvailabilityResponseData, CoreweaveValidGpus, CoreweaveWorkloadResourceRequest} from "../systemDocTypes";

export async function getLatestAvailabilityFromCoreweave(): Promise<void> {
  const response = await axios.default.get("https://resource-api.tenant-peter.knative.chi.coreweave.com/api/v1/metadata/regions");
  if (response.status >= 300 || response.status < 200 || response.data == undefined) {
    console.error("Failed to get coreweave resource availability");
    console.error(response);
    return;
  }
  const availability = response.data as CoreweaveRegionsAvailabilityResponseData;
  const doc : CoreweaveRegionsAvailability = {
    timestamp: firebaseAdmin.firestore.Timestamp.now(),
    data: JSON.stringify(availability),
  };
  try {
    await getCoreweaveAvailabilityRef().set(doc);
  } catch (e) {
    console.error("Failed to set coreweave availability in firestore");
    console.error(e);
    return;
  }
}

export async function calculateGpuRegionsFromAvailability(availabilityData: CoreweaveRegionsAvailabilityResponseData, validRegions: string[], validGpus: CoreweaveValidGpus, graphicsBenchmark: number, serverRegion?: string, maximumCost?: number) : Promise<CoreweaveWorkloadResourceRequest[]> {
  if (validGpus == undefined || Object.entries(validGpus).length < 1) {
    console.error("Empty validGpus");
    return [];
  }

  if (validRegions == undefined || validRegions.length < 1) {
    console.error("Empty validRegions");
    return [];
  }

  const vGpus = Object.entries(validGpus).reduce((acc, [k, v]) => {
    if (
      v.benchmark >= graphicsBenchmark &&
      (maximumCost == undefined || v.cost <= maximumCost)
    ) acc[k] = v;
    return acc;
  }, {} as CoreweaveValidGpus);

  const weightedOptions = availabilityData.map((r) => {
    return Object.entries(r.compute.gpu).flatMap(([k, v]) => {
      console.debug(`Checking if region: ${r.slug} has gpu ${k} with ${v.all.available} > 1`);
      if (Object.keys(vGpus).includes(k) == false) return [];
      if (v.all.available < 1) return [];
      if (validRegions.includes(r.slug) == false) return [];
      const availabilityWeight = v.all.available / 20;
      const regionWeight = (serverRegion != undefined && serverRegion == r.slug) ? 10 : 0;
      const costWeight = ((1.8 - vGpus[k].cost) * 50);
      const perfomanceWeight = vGpus[k].benchmark / 2;
      const weightRounded = Math.round(perfomanceWeight + costWeight + regionWeight + availabilityWeight);
      const weightTopped = (weightRounded > 100) ? 100 : weightRounded;
      return [{region: r.slug, gpu: k, weight: weightTopped} as CoreweaveWorkloadResourceRequest];
    });
  }).flat()
    .sort((a, b) => b.weight - a.weight);

  console.debug({vGpus, weightedOptions});
  return weightedOptions;
}

export function selectWeightEquivalentRandomGpuRegion(gpuRegions: CoreweaveWorkloadResourceRequest[]) {
  const gpuRegionsSameWeight = gpuRegions.filter((gpuRegion) => (gpuRegion.weight == gpuRegions[0].weight));
  const bestRandomRegion = gpuRegionsSameWeight[gpuRegionsSameWeight.length * Math.random() | 0].region;
  return gpuRegions.filter((gr) => gr.region == bestRandomRegion);
}

export async function resolveGpuRegions(configuration: ConfigurationOdysseyClientPod | undefined, graphicsBenchmark: number, restrictToRegions: string[] | undefined, serverRegion?: string) {
  const defaultGpu = {
    gpu: "Quadro_RTX_4000",
    region: "ORD1",
    weight: 10,
  } as CoreweaveWorkloadResourceRequest;

  if (configuration == undefined) {
    console.debug("Gpu weighting methods failed, using default GPU");
    console.debug(defaultGpu);
    return [defaultGpu];
  }

  const getDynamicAvailability = async () => {
    try {
      const [, availability] = await getCoreweaveAvailability();
      if (availability == undefined) {
        console.error("Failed to get coreweave availability document");
        return [];
      }
      const availabilityData : CoreweaveRegionsAvailabilityResponseData = JSON.parse(availability.data);
      if (configuration.validRegions != undefined && configuration.validGpus != undefined && availabilityData != undefined) {
        const validRegions = (restrictToRegions != undefined && restrictToRegions.length > 0) ? configuration.validRegions.filter((region) => restrictToRegions.includes(region)) : configuration.validRegions;
        console.debug("Calculating availability-based GPU regions");
        const gpuRegions = await calculateGpuRegionsFromAvailability(availabilityData, validRegions, configuration.validGpus, graphicsBenchmark, serverRegion);
        return selectWeightEquivalentRandomGpuRegion(gpuRegions);
      } else return [];
    } catch (e: any) {
      console.error("Failed to parse coreweave availability data");
      return [];
    }
  };

  const getStaticGpuRegions = () => {
    if (configuration.workloadRegion != undefined && configuration.unrealGpus != undefined && configuration.unrealGpus.length > 0) {
      console.debug("Calculating static configured GPU regions");
      return configuration.unrealGpus.map((affinity) => {
        return {
          gpu: affinity.gpu,
          region: configuration.workloadRegion,
          weight: affinity.weight,
        } as CoreweaveWorkloadResourceRequest;
      });
    } else return [];
  };


  const availabilityGpuRegions = await getDynamicAvailability();
  const staticGpuRegions = getStaticGpuRegions();

  if (configuration.useDynamicGpuRegion == true) {
    if (availabilityGpuRegions.length > 0) {
      console.debug("Using dynamic GPU regions");
      return availabilityGpuRegions;
    } else {
      console.warn("No Dynamic GPU availability");
    }
  }

  if (staticGpuRegions.length > 0) {
    console.debug("Using static configured GPU regions");
    return staticGpuRegions;
  } else {
    console.debug("No static configured GPU regions");
  }

  console.debug("GPU weighting methods failed, using default GPU");
  console.debug(defaultGpu);
  return [defaultGpu];
}


