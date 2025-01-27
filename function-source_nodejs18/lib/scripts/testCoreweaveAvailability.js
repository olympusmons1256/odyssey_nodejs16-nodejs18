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
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const availability_1 = require("../lib/coreweave/availability");
const now = admin.firestore.Timestamp.now();
const graphicsBenchmark = 5;
const availabilityData = JSON.parse("[{\"name\":\"New York - EWR1\",\"slug\":\"EWR1\",\"timezone\":\"UTC-5\",\"connectivity\":{\"natEgress\":[\"64.124.109.153/32\",\"69.74.226.101/32\"],\"speedtest\":{\"iperf\":\"iperf.speedtest.ewr1.coreweave.com\"}},\"compute\":{\"gpu\":{\"A100_NVLINK\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_NVLINK_80GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_PCIE_40GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_PCIE_80GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A40\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Quadro_RTX_4000\":{\"all\":{\"available\":33},\"virtualServer\":{\"available\":32}},\"Quadro_RTX_5000\":{\"all\":{\"available\":-1},\"virtualServer\":{\"available\":0}},\"RTX_A4000\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"RTX_A5000\":{\"all\":{\"available\":1},\"virtualServer\":{\"available\":0}},\"RTX_A6000\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Radeon_Pro_W5700\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100_NVLINK\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100_PCIE\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}}},\"cpu\":{\"intel-xeon-v1\":{\"availability\":\"none\"},\"intel-xeon-v2\":{\"availability\":\"none\"},\"intel-xeon-v4\":{\"availability\":\"none\"},\"intel-xeon-scalable\":{\"availability\":\"none\"},\"amd-epyc-rome\":{\"availability\":\"high\"}}},\"storage\":{\"diskClasses\":[{\"name\":\"NVMe\",\"slug\":\"nvme\"},{\"name\":\"HDD\",\"slug\":\"hdd\"}],\"storageTypes\":[{\"name\":\"Block Storage\",\"slug\":\"block\",\"volumeMode\":\"Block\",\"accessModes\":[\"ReadWriteOnce\"]},{\"name\":\"Shared Filesystem\",\"slug\":\"shared\",\"volumeMode\":\"Filesystem\",\"accessModes\":[\"ReadWriteMany\"]}],\"storageClassNames\":[\"block-nvme-ewr1\",\"block-hdd-ewr1\",\"shared-nvme-ewr1\",\"shared-hdd-ewr1\",\"block-nvme-reducedredundancy-ewr1\",\"shared-hdd-archival-ewr1\",\"shared-nvme-reducedredundancy-ewr1\",\"block-hdd-archival-ewr1\"]},\"features\":[\"storage\",\"vdi\"]},{\"name\":\"New York - EWR2\",\"slug\":\"EWR2\",\"timezone\":\"UTC-5\",\"connectivity\":{\"natEgress\":[\"65.51.246.39/32\"],\"speedtest\":{}},\"compute\":{\"gpu\":{\"A100_NVLINK\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_NVLINK_80GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_PCIE_40GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_PCIE_80GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A40\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Quadro_RTX_4000\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Quadro_RTX_5000\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"RTX_A4000\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"RTX_A5000\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"RTX_A6000\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Radeon_Pro_W5700\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100_NVLINK\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100_PCIE\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}}},\"cpu\":{\"intel-xeon-v1\":{\"availability\":\"none\"},\"intel-xeon-v2\":{\"availability\":\"none\"},\"intel-xeon-v4\":{\"availability\":\"none\"},\"intel-xeon-scalable\":{\"availability\":\"none\"},\"amd-epyc-rome\":{\"availability\":\"none\"}}},\"features\":[]},{\"name\":\"New York - LGA1\",\"slug\":\"LGA1\",\"timezone\":\"UTC-5\",\"connectivity\":{\"natEgress\":[\"69.74.226.101/32\",\"64.124.109.153/32\",\"216.153.56.64/26\"],\"speedtest\":{\"iperf\":\"iperf.speedtest.lga1.coreweave.com\"}},\"compute\":{\"gpu\":{\"A100_NVLINK\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_NVLINK_80GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_PCIE_40GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_PCIE_80GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A40\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":64}},\"Quadro_RTX_4000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"Quadro_RTX_5000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"RTX_A4000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"RTX_A5000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"RTX_A6000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"Radeon_Pro_W5700\":{\"all\":{\"available\":3},\"virtualServer\":{\"available\":3}},\"Tesla_V100\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100_NVLINK\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100_PCIE\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}}},\"cpu\":{\"intel-xeon-v1\":{\"availability\":\"none\"},\"intel-xeon-v2\":{\"availability\":\"none\"},\"intel-xeon-v3\":{\"availability\":\"high\"},\"intel-xeon-v4\":{\"availability\":\"high\"},\"intel-xeon-scalable\":{\"availability\":\"high\"},\"amd-epyc-rome\":{\"availability\":\"high\"},\"amd-epyc-milan\":{\"availability\":\"high\"}}},\"storage\":{\"diskClasses\":[{\"name\":\"NVMe\",\"slug\":\"nvme\"},{\"name\":\"HDD\",\"slug\":\"hdd\"}],\"storageTypes\":[{\"name\":\"Block Storage\",\"slug\":\"block\",\"volumeMode\":\"Block\",\"accessModes\":[\"ReadWriteOnce\"]},{\"name\":\"Shared Filesystem\",\"slug\":\"shared\",\"volumeMode\":\"Filesystem\",\"accessModes\":[\"ReadWriteMany\"]}],\"storageClassNames\":[\"block-nvme-lga1\",\"block-hdd-lga1\",\"shared-nvme-lga1\",\"shared-hdd-lga1\",\"block-nvme-reducedredundancy-lga1\",\"shared-hdd-archival-lga1\",\"shared-nvme-reducedredundancy-lga1\",\"block-hdd-archival-lga1\",\"object-standard-lga1\"],\"objectStorageHost\":\"object.lga1.coreweave.com\"},\"features\":[\"storage\",\"vdi\",\"objectStorage\"]},{\"name\":\"Chicago - ORD1\",\"slug\":\"ORD1\",\"timezone\":\"UTC-6\",\"connectivity\":{\"natEgress\":[\"207.53.234.0/27\"],\"speedtest\":{\"iperf\":\"iperf.speedtest.ord1.coreweave.com\"}},\"compute\":{\"gpu\":{\"A100_NVLINK\":{\"all\":{\"available\":89},\"virtualServer\":{\"available\":0}},\"A100_NVLINK_80GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_PCIE_40GB\":{\"all\":{\"available\":38},\"virtualServer\":{\"available\":15}},\"A100_PCIE_80GB\":{\"all\":{\"available\":24},\"virtualServer\":{\"available\":11}},\"A40\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":38}},\"Quadro_RTX_4000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"Quadro_RTX_5000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"RTX_A4000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"RTX_A5000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":43}},\"RTX_A6000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":64}},\"Radeon_Pro_W5700\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":0}},\"Tesla_V100_NVLINK\":{\"all\":{\"available\":80},\"virtualServer\":{\"available\":52}},\"Tesla_V100_PCIE\":{\"all\":{\"available\":19},\"virtualServer\":{\"available\":12}}},\"cpu\":{\"intel-xeon-v1\":{\"availability\":\"none\"},\"intel-xeon-v2\":{\"availability\":\"none\"},\"intel-xeon-v3\":{\"availability\":\"high\"},\"intel-xeon-v4\":{\"availability\":\"high\"},\"intel-xeon-scalable\":{\"availability\":\"high\"},\"amd-epyc-rome\":{\"availability\":\"high\"},\"amd-epyc-milan\":{\"availability\":\"high\"}},\"features\":[\"storage\",\"vdi\"]},\"storage\":{\"diskClasses\":[{\"name\":\"NVMe\",\"slug\":\"nvme\"},{\"name\":\"HDD\",\"slug\":\"hdd\"}],\"storageTypes\":[{\"name\":\"Block Storage\",\"slug\":\"block\",\"volumeMode\":\"Block\",\"accessModes\":[\"ReadWriteOnce\"]},{\"name\":\"Shared Filesystem\",\"slug\":\"shared\",\"volumeMode\":\"Filesystem\",\"accessModes\":[\"ReadWriteMany\"]}],\"storageClassNames\":[\"block-nvme-ord1\",\"block-hdd-ord1\",\"shared-nvme-ord1\",\"shared-hdd-ord1\",\"block-nvme-reducedredundancy-ord1\",\"shared-hdd-archival-ord1\",\"shared-nvme-reducedredundancy-ord1\",\"block-hdd-archival-ord1\",\"object-standard-ord1\"],\"objectStorageHost\":\"object.ord1.coreweave.com\"},\"features\":[\"storage\",\"vdi\",\"objectStorage\"]},{\"name\":\"Las Vegas - LAS1\",\"slug\":\"LAS1\",\"timezone\":\"UTC-9\",\"connectivity\":{\"natEgress\":[\"216.153.48.0/27\"],\"speedtest\":{\"iperf\":\"iperf.speedtest.las1.coreweave.com\"}},\"compute\":{\"gpu\":{\"A100_NVLINK\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_NVLINK_80GB\":{\"all\":{\"available\":87},\"virtualServer\":{\"available\":0}},\"A100_PCIE_40GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A100_PCIE_80GB\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"A40\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"Quadro_RTX_4000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"Quadro_RTX_5000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"RTX_A4000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":100}},\"RTX_A5000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":48}},\"RTX_A6000\":{\"all\":{\"available\":100},\"virtualServer\":{\"available\":49}},\"Radeon_Pro_W5700\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100_NVLINK\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}},\"Tesla_V100_PCIE\":{\"all\":{\"available\":0},\"virtualServer\":{\"available\":0}}},\"cpu\":{\"intel-xeon-v4\":{\"availability\":\"high\"},\"intel-xeon-scalable\":{\"availability\":\"high\"},\"amd-epyc-milan\":{\"availability\":\"high\"}},\"features\":[\"storage\",\"vdi\"]},\"storage\":{\"diskClasses\":[{\"name\":\"NVMe\",\"slug\":\"nvme\"},{\"name\":\"HDD\",\"slug\":\"hdd\"}],\"storageTypes\":[{\"name\":\"Block Storage\",\"slug\":\"block\",\"volumeMode\":\"Block\",\"accessModes\":[\"ReadWriteOnce\"]},{\"name\":\"Shared Filesystem\",\"slug\":\"shared\",\"volumeMode\":\"Filesystem\",\"accessModes\":[\"ReadWriteMany\"]}],\"storageClassNames\":[\"block-nvme-las1\",\"block-hdd-las1\",\"shared-nvme-las1\",\"shared-hdd-las1\",\"block-nvme-reducedredundancy-las1\",\"shared-hdd-archival-las1\",\"shared-nvme-reducedredundancy-las1\",\"block-hdd-archival-las1\",\"object-standard-las1\"],\"objectStorageHost\":\"object.las1.coreweave.com\"},\"features\":[\"storage\",\"vdi\",\"objectStorage\"]}]");
const configuration = {
    "firebaseApiKey": "AIzaSyAWE8e3WdAjaJrvwSC-lzfJF3t8hrqMcnQ",
    "iceServers": [
        {
            "urls": "stun:stun.l.google.com:19302",
        },
        {
            "credential": "kH23hvFdTwFpdwLJ",
            "urls": "turn:coturn-1.odyssey-client.newgameplus.live:3478",
            "username": "71zUMZFMfefhanPd",
        },
    ],
    "iceServersProvider": "twilio",
    "unrealBaseCliArgs": "-AudioMixer -Vulkan -PixelStreamingEncoderRateControl=VBR -PixelStreamingWebRTCStartBitrate=1000000 -FullStdOutLogOutput -Unattended -LogCmds=PixelStreamingWebRTC Verbose -PixelStreamingWebRTCDisableReceiveAudio=true -PixelStreamingWebRTCDisableTransmitAudio=false -gpucrashdebugging  -dpcvars=\"r.Vulkan.FlushOnMapStaging=1\"  -PixelStreamingWebRTCDisableAudioSync=false",
    "unrealCpuM": 6000,
    "unrealGkeAccelerator": "nvidia-tesla-t4",
    "unrealGpus": [
        {
            "gpu": "Quadro_RTX_4000",
            "weight": 80,
        },
        {
            "gpu": "Quadro_RTX_5000",
            "weight": 50,
        },
        {
            "gpu": "RTX_A4000",
            "weight": 30,
        },
        {
            "gpu": "RTX_A5000",
            "weight": 20,
        },
        {
            "gpu": "RTX_A6000",
            "weight": 10,
        },
    ],
    "unrealImageId": "1096-Testing_Client_CI-Shipping-20221013000407",
    "unrealImageRepo": "gcr.io/ngp-odyssey/odyssey-client",
    "unrealMemoryMb": 16000,
    "unrealMountContainsClientAndServer": true,
    "unrealMountContent": true,
    "unrealMountImageId": "base-20220831052503",
    "unrealMountImageRepo": "gcr.io/ngp-odyssey/odyssey-client",
    "unrealOverrideCliArgs": "-ResX=1920 -ResY=1080",
    "updated": now,
    "useDynamicGpuRegion": true,
    "usersCollectionPath": "root",
    "validGpus": {
        "Quadro_RTX_4000": {
            "benchmark": 5,
            "cost": 0.24,
        },
        "Quadro_RTX_5000": {
            "benchmark": 4,
            "cost": 0.57,
        },
        "RTX_A4000": {
            "benchmark": 7,
            "cost": 0.61,
        },
        "RTX_A5000": {
            "benchmark": 8,
            "cost": 0.77,
        },
        "RTX_A6000": {
            "benchmark": 10,
            "cost": 1.28,
        },
    },
    "validRegions": [
        "ORD1",
        "LAS1",
        "LGA1",
    ],
    "workloadClusterProviders": [
        "coreweave",
    ],
    "workloadRegion": "ORD1",
};
async function f() {
    if (configuration.validGpus == undefined || configuration.validRegions == undefined) {
        throw new Error("Configuration wrong: configuration.validGpus == undefined || configuration.validRegions == undefined");
    }
    const gpuRegions = await (0, availability_1.calculateGpuRegionsFromAvailability)(availabilityData, configuration.validRegions, configuration.validGpus, graphicsBenchmark);
    const bestOneRegion = (0, availability_1.selectWeightEquivalentRandomGpuRegion)(gpuRegions);
    console.debug(bestOneRegion);
}
f();
//# sourceMappingURL=testCoreweaveAvailability.js.map