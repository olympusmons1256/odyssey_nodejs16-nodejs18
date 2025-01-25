import { ConfigurationBilling } from "../systemDocTypes";
interface GetConfigurationBillingParams {
    organizationId?: string;
    spaceId?: string;
    roomId?: string;
}
export declare function getConfigurationBilling(params: GetConfigurationBillingParams): Promise<ConfigurationBilling | undefined>;
export declare function denormalizeBillingFeatures(organizationId: string): Promise<FirebaseFirestore.WriteResult | undefined>;
export {};
