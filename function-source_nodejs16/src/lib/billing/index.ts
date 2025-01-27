import * as admin from "firebase-admin";
import {BillingFeatures} from "../docTypes";
import {getBillingFeaturesOverride, getBillingProductsAvailable, getBillingPublic, getBillingPublicRef, getBillingSubscription, getConfigurationBillingRef, getOrganizationConfigurationBillingRef, getRoomConfigurationBillingRef, getSpaceConfigurationBillingRef} from "../documents/firestore";
import {ConfigurationBilling} from "../systemDocTypes";

interface GetConfigurationBillingParams {
  organizationId?: string
  spaceId?: string
  roomId?: string
}
export async function getConfigurationBilling(params: GetConfigurationBillingParams) : Promise<ConfigurationBilling | undefined> {
  async function getConfiguration(configurationDocPath: string) : Promise<ConfigurationBilling | undefined> {
    const configurationDoc = await admin.firestore()
      .doc(configurationDocPath).get();
    if (configurationDoc.exists) {
      return configurationDoc.data() as ConfigurationBilling;
    } else {
      return undefined;
    }
  }

  const configurationSources : string[] = [];
  const systemConfigurationRef = getConfigurationBillingRef();
  configurationSources.push(systemConfigurationRef.path);
  if (params.organizationId != undefined) {
    const organizationConfigurationRef = getOrganizationConfigurationBillingRef(params.organizationId);
    configurationSources.push(organizationConfigurationRef.path);
  }
  if (params.organizationId != undefined && params.spaceId != undefined ) {
    const spaceConfigurationRef = getSpaceConfigurationBillingRef(params.organizationId, params.spaceId);
    configurationSources.push(spaceConfigurationRef.path);
  }
  if (params.organizationId != undefined && params.roomId != undefined ) {
    const roomConfigurationRef = getRoomConfigurationBillingRef(params.organizationId, params.roomId);
    configurationSources.push(roomConfigurationRef.path);
  }

  return await configurationSources.reduce<Promise<ConfigurationBilling | undefined>>(async (acc, docPath) => {
    const result = await getConfiguration(docPath);
    if (result == undefined) {
      console.debug(`Configuration document ${docPath} doesn't exist`);
      return await acc;
    } else {
      const accResolved = await acc;
      if (accResolved == undefined) {
        console.debug(`Setting configuration from ${docPath}`);
        return result;
      } else {
        console.debug(`Merging configuration from ${docPath} with existing`);
        return {...accResolved, ...result};
      }
    }
  }, Promise.resolve(undefined));
}

export async function denormalizeBillingFeatures(organizationId: string) {
  const [, featuresOverride] = await getBillingFeaturesOverride(organizationId);
  if (featuresOverride == undefined) {
    console.error(`Failed to get billing/featuresOverride for ${organizationId}`);
    return;
  }

  const [, productsAvailable] = await getBillingProductsAvailable();
  if (productsAvailable == undefined) {
    console.error("Failed to get products/available");
    return;
  }

  const [, billingPublic] = await getBillingPublic(organizationId);
  if (billingPublic == undefined) {
    console.error(`Failed to get billing/public for ${organizationId}`);
    return;
  }

  const [, subscription] = await getBillingSubscription(organizationId);

  const features: BillingFeatures = (() => {
    if (subscription != undefined && billingPublic.disableBilling != true) {
      const tier = productsAvailable.tiers[subscription.stripeProductId];
      return {...tier.features, ...featuresOverride};
    } else {
      // TODO: Remove some of these true defaults once we've setup featuresOverride for our existing enterprise customers
      const defaultFeatures : BillingFeatures = {
        bridge: true,
        restApi: true,
        sharding: true,
        analytics: true,
        publishSpace: true,
        inWorldStreams: true,
      };
      return {...defaultFeatures, ...featuresOverride};
    }
  })();

  console.debug(`Denormalizing billing/public:features for ${organizationId}`);
  return await getBillingPublicRef(organizationId).set({features}, {merge: true});
}
