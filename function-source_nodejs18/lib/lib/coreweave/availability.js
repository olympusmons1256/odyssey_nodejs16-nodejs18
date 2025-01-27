"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveGpuRegions = exports.selectWeightEquivalentRandomGpuRegion = exports.calculateGpuRegionsFromAvailability = exports.getLatestAvailabilityFromCoreweave = void 0;
const axios = __importStar(require("axios"));
const firebaseAdmin = __importStar(require("firebase-admin"));
const firestore_1 = require("../documents/firestore");
async function getLatestAvailabilityFromCoreweave() {
    const response = await axios.default.get("https://resource-api.tenant-peter.knative.chi.coreweave.com/api/v1/metadata/regions");
    if (response.status >= 300 || response.status < 200 || response.data == undefined) {
        console.error("Failed to get coreweave resource availability");
        console.error(response);
        return;
    }
    const availability = response.data;
    const doc = {
        timestamp: firebaseAdmin.firestore.Timestamp.now(),
        data: JSON.stringify(availability),
    };
    try {
        await (0, firestore_1.getCoreweaveAvailabilityRef)().set(doc);
    }
    catch (e) {
        console.error("Failed to set coreweave availability in firestore");
        console.error(e);
        return;
    }
}
exports.getLatestAvailabilityFromCoreweave = getLatestAvailabilityFromCoreweave;
async function calculateGpuRegionsFromAvailability(availabilityData, validRegions, validGpus, graphicsBenchmark, serverRegion, maximumCost) {
    if (validGpus == undefined || Object.entries(validGpus).length < 1) {
        console.error("Empty validGpus");
        return [];
    }
    if (validRegions == undefined || validRegions.length < 1) {
        console.error("Empty validRegions");
        return [];
    }
    const vGpus = Object.entries(validGpus).reduce((acc, [k, v]) => {
        if (v.benchmark >= graphicsBenchmark &&
            (maximumCost == undefined || v.cost <= maximumCost))
            acc[k] = v;
        return acc;
    }, {});
    const weightedOptions = availabilityData.map((r) => {
        return Object.entries(r.compute.gpu).flatMap(([k, v]) => {
            console.debug(`Checking if region: ${r.slug} has gpu ${k} with ${v.all.available} > 1`);
            if (Object.keys(vGpus).includes(k) == false)
                return [];
            if (v.all.available < 1)
                return [];
            if (validRegions.includes(r.slug) == false)
                return [];
            const availabilityWeight = v.all.available / 20;
            const regionWeight = (serverRegion != undefined && serverRegion == r.slug) ? 10 : 0;
            const costWeight = ((1.8 - vGpus[k].cost) * 50);
            const perfomanceWeight = vGpus[k].benchmark / 2;
            const weightRounded = Math.round(perfomanceWeight + costWeight + regionWeight + availabilityWeight);
            const weightTopped = (weightRounded > 100) ? 100 : weightRounded;
            return [{ region: r.slug, gpu: k, weight: weightTopped }];
        });
    }).flat()
        .sort((a, b) => b.weight - a.weight);
    console.debug({ vGpus, weightedOptions });
    return weightedOptions;
}
exports.calculateGpuRegionsFromAvailability = calculateGpuRegionsFromAvailability;
function selectWeightEquivalentRandomGpuRegion(gpuRegions) {
    const gpuRegionsSameWeight = gpuRegions.filter((gpuRegion) => (gpuRegion.weight == gpuRegions[0].weight));
    const bestRandomRegion = gpuRegionsSameWeight[gpuRegionsSameWeight.length * Math.random() | 0].region;
    return gpuRegions.filter((gr) => gr.region == bestRandomRegion);
}
exports.selectWeightEquivalentRandomGpuRegion = selectWeightEquivalentRandomGpuRegion;
async function resolveGpuRegions(configuration, graphicsBenchmark, restrictToRegions, serverRegion) {
    const defaultGpu = {
        gpu: "Quadro_RTX_4000",
        region: "ORD1",
        weight: 10,
    };
    if (configuration == undefined) {
        console.debug("Gpu weighting methods failed, using default GPU");
        console.debug(defaultGpu);
        return [defaultGpu];
    }
    const getDynamicAvailability = async () => {
        try {
            const [, availability] = await (0, firestore_1.getCoreweaveAvailability)();
            if (availability == undefined) {
                console.error("Failed to get coreweave availability document");
                return [];
            }
            const availabilityData = JSON.parse(availability.data);
            if (configuration.validRegions != undefined && configuration.validGpus != undefined && availabilityData != undefined) {
                const validRegions = (restrictToRegions != undefined && restrictToRegions.length > 0) ? configuration.validRegions.filter((region) => restrictToRegions.includes(region)) : configuration.validRegions;
                console.debug("Calculating availability-based GPU regions");
                const gpuRegions = await calculateGpuRegionsFromAvailability(availabilityData, validRegions, configuration.validGpus, graphicsBenchmark, serverRegion);
                return selectWeightEquivalentRandomGpuRegion(gpuRegions);
            }
            else
                return [];
        }
        catch (e) {
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
                };
            });
        }
        else
            return [];
    };
    const availabilityGpuRegions = await getDynamicAvailability();
    const staticGpuRegions = getStaticGpuRegions();
    if (configuration.useDynamicGpuRegion == true) {
        if (availabilityGpuRegions.length > 0) {
            console.debug("Using dynamic GPU regions");
            return availabilityGpuRegions;
        }
        else {
            console.warn("No Dynamic GPU availability");
        }
    }
    if (staticGpuRegions.length > 0) {
        console.debug("Using static configured GPU regions");
        return staticGpuRegions;
    }
    else {
        console.debug("No static configured GPU regions");
    }
    console.debug("GPU weighting methods failed, using default GPU");
    console.debug(defaultGpu);
    return [defaultGpu];
}
exports.resolveGpuRegions = resolveGpuRegions;
//# sourceMappingURL=availability.js.map