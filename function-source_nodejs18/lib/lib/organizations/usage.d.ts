import { BigQueryTimestamp } from "@google-cloud/bigquery";
import { OrganizationUsageRecord, ParticipantAnalyticsRecord, ParticipantUsageCheckRecord, SumCreditsUsedBySpaceIdAggregationResults, SumDeductedCreditsBySpaceIdAggregationResults } from "../httpTypes";
import { ConfigurationBilling } from "../systemDocTypes";
interface ParticipantUsageQueryParams {
    projectId: string;
    after: Date;
    before: Date;
    organizationId: string;
    offset: number;
    count: number;
    roomId?: string;
    spaceId?: string;
    aggregation?: "sumCreditsUsedBySpaceId";
}
interface QueryOrganizationParticipantUsageResult {
    query: string;
    params: any;
    sumCreditsUsedBySpaceId?: SumCreditsUsedBySpaceIdAggregationResults;
    usageRecords?: OrganizationUsageRecord[];
}
export declare function queryOrganizationParticipantUsage(queryParams: ParticipantUsageQueryParams): Promise<QueryOrganizationParticipantUsageResult>;
interface ParticipantAnalyticsQueryParams {
    projectId: string;
    after: Date;
    before: Date;
    organizationId: string;
    count: number;
    offset: number;
    roomId?: string;
    spaceId?: string;
    aggregation?: "sumCreditsUsedBySpaceId";
}
export declare function queryParticipantAnalytics(queryParams: ParticipantAnalyticsQueryParams): Promise<{
    query: string;
    params: {
        row_limit: number;
        row_offset: number;
        excluded_usage_email_domains: string[];
        organization_id: string;
        room_id: string | undefined;
        space_id: string | undefined;
        after_timestamp: BigQueryTimestamp;
        before_timestamp: BigQueryTimestamp;
    };
    results: undefined;
    sumCreditsUsedBySpaceId?: undefined;
} | {
    query: string;
    params: {
        row_limit: number;
        row_offset: number;
        excluded_usage_email_domains: string[];
        organization_id: string;
        room_id: string | undefined;
        space_id: string | undefined;
        after_timestamp: BigQueryTimestamp;
        before_timestamp: BigQueryTimestamp;
    };
    results: ParticipantAnalyticsRecord[];
    sumCreditsUsedBySpaceId: SumCreditsUsedBySpaceIdAggregationResults | undefined;
}>;
interface ParticipantUsageChecksQueryParams {
    projectId: string;
    after: Date;
    before: Date;
    organizationId: string;
    count: number;
    offset: number;
    roomId?: string;
    spaceId?: string;
    aggregation?: "sumDeductedCreditsBySpaceId";
}
export declare function queryParticipantUsageChecks(queryParams: ParticipantUsageChecksQueryParams): Promise<{
    query: string;
    params: {
        row_limit: number;
        row_offset: number;
        organization_id: string;
        room_id: string | undefined;
        space_id: string | undefined;
        after_timestamp: BigQueryTimestamp;
        before_timestamp: BigQueryTimestamp;
    };
    results: undefined;
    sumDeductedCreditsBySpaceId?: undefined;
} | {
    query: string;
    params: {
        row_limit: number;
        row_offset: number;
        organization_id: string;
        room_id: string | undefined;
        space_id: string | undefined;
        after_timestamp: BigQueryTimestamp;
        before_timestamp: BigQueryTimestamp;
    };
    results: ParticipantUsageCheckRecord[];
    sumDeductedCreditsBySpaceId: SumDeductedCreditsBySpaceIdAggregationResults | undefined;
}>;
interface QueryRoomUsageCheckOperationParams {
    projectId: string;
    organizationId: string;
    roomId: string;
    participantUsageCheckId: string;
    afterOrEqualToEndTimestamp: Date;
    beforeEndTimestamp: Date;
    configurationBilling?: ConfigurationBilling;
}
export declare function queryRoomUsageCheckOperation(queryParams: QueryRoomUsageCheckOperationParams): Promise<{
    query: string;
    params: any;
    sumCreditsUsed: number;
    participantUsageDocCount: number;
} | {
    query: string;
    params: any;
    sumCreditsUsed?: undefined;
    participantUsageDocCount?: undefined;
}>;
export {};
