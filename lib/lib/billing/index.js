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
exports.denormalizeBillingFeatures = exports.getConfigurationBilling = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("../documents/firestore");
async function getConfigurationBilling(params) {
    async function getConfiguration(configurationDocPath) {
        const configurationDoc = await admin.firestore()
            .doc(configurationDocPath).get();
        if (configurationDoc.exists) {
            return configurationDoc.data();
        }
        else {
            return undefined;
        }
    }
    const configurationSources = [];
    const systemConfigurationRef = (0, firestore_1.getConfigurationBillingRef)();
    configurationSources.push(systemConfigurationRef.path);
    if (params.organizationId != undefined) {
        const organizationConfigurationRef = (0, firestore_1.getOrganizationConfigurationBillingRef)(params.organizationId);
        configurationSources.push(organizationConfigurationRef.path);
    }
    if (params.organizationId != undefined && params.spaceId != undefined) {
        const spaceConfigurationRef = (0, firestore_1.getSpaceConfigurationBillingRef)(params.organizationId, params.spaceId);
        configurationSources.push(spaceConfigurationRef.path);
    }
    if (params.organizationId != undefined && params.roomId != undefined) {
        const roomConfigurationRef = (0, firestore_1.getRoomConfigurationBillingRef)(params.organizationId, params.roomId);
        configurationSources.push(roomConfigurationRef.path);
    }
    return await configurationSources.reduce(async (acc, docPath) => {
        const result = await getConfiguration(docPath);
        if (result == undefined) {
            console.debug(`Configuration document ${docPath} doesn't exist`);
            return await acc;
        }
        else {
            const accResolved = await acc;
            if (accResolved == undefined) {
                console.debug(`Setting configuration from ${docPath}`);
                return result;
            }
            else {
                console.debug(`Merging configuration from ${docPath} with existing`);
                return Object.assign(Object.assign({}, accResolved), result);
            }
        }
    }, Promise.resolve(undefined));
}
exports.getConfigurationBilling = getConfigurationBilling;
async function denormalizeBillingFeatures(organizationId) {
    const [, featuresOverride] = await (0, firestore_1.getBillingFeaturesOverride)(organizationId);
    if (featuresOverride == undefined) {
        console.error(`Failed to get billing/featuresOverride for ${organizationId}`);
        return;
    }
    const [, productsAvailable] = await (0, firestore_1.getBillingProductsAvailable)();
    if (productsAvailable == undefined) {
        console.error("Failed to get products/available");
        return;
    }
    const [, billingPublic] = await (0, firestore_1.getBillingPublic)(organizationId);
    if (billingPublic == undefined) {
        console.error(`Failed to get billing/public for ${organizationId}`);
        return;
    }
    const [, subscription] = await (0, firestore_1.getBillingSubscription)(organizationId);
    const features = (() => {
        if (subscription != undefined && billingPublic.disableBilling != true) {
            const tier = productsAvailable.tiers[subscription.stripeProductId];
            return Object.assign(Object.assign({}, tier.features), featuresOverride);
        }
        else {
            // TODO: Remove some of these true defaults once we've setup featuresOverride for our existing enterprise customers
            const defaultFeatures = {
                bridge: true,
                restApi: true,
                sharding: true,
                analytics: true,
                publishSpace: true,
                inWorldStreams: true,
            };
            return Object.assign(Object.assign({}, defaultFeatures), featuresOverride);
        }
    })();
    console.debug(`Denormalizing billing/public:features for ${organizationId}`);
    return await (0, firestore_1.getBillingPublicRef)(organizationId).set({ features }, { merge: true });
}
exports.denormalizeBillingFeatures = denormalizeBillingFeatures;
//# sourceMappingURL=index.js.map