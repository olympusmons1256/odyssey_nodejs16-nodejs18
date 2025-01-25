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
exports.queryRoomUsageCheckOperation = exports.queryParticipantUsageChecks = exports.queryParticipantAnalytics = exports.queryOrganizationParticipantUsage = void 0;
const bigquery_1 = require("@google-cloud/bigquery");
const admin = __importStar(require("firebase-admin"));
const billing_1 = require("../billing");
const firestore_1 = require("../documents/firestore");
const misc_1 = require("../misc");
async function queryOrganizationParticipantUsage(queryParams) {
    const bigQuery = new bigquery_1.BigQuery();
    const configurationBilling = await (0, billing_1.getConfigurationBilling)({
        organizationId: queryParams.organizationId,
        spaceId: queryParams.spaceId,
        roomId: queryParams.roomId,
    });
    console.debug({ configurationBilling });
    // NOTE: This query does the following:
    // * Gets latest state of each space
    // * Get latest state of each room
    // * Gets participantsDenormalized records from timeframe
    // * Gets participant usage records from timeframe
    // * Joins the space, room and participantsDenormalized data onto the usage record
    // * Returns usage records with the timestamp of the nearest hour, user and space information
    const windowsQuery = `
    WITH
    spaces AS (
      SELECT
        document_name,
        timestamp,
        event_id,
        data,
        path_params,
        organizationId,
        spaceId
      FROM (
        SELECT
          document_name,
          FIRST_VALUE(timestamp) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS timestamp,
          FIRST_VALUE(event_id) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS event_id,
          FIRST_VALUE(operation) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS operation,
          FIRST_VALUE(data) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS data,
          FIRST_VALUE(path_params) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS path_params,
          JSON_VALUE(path_params, "$.spaceId") AS spaceId,
          JSON_VALUE(path_params, "$.organizationId") AS organizationId
        FROM
          \`${queryParams.projectId}.firestore_export.spaces_raw_changelog\`
        WHERE
          operation IN ("CREATE", "UPDATE")
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.spaceId != undefined) ? "AND JSON_VALUE(path_params, \"$.spaceId\") = @space_id" : ""}
      )
      GROUP BY document_name,
        timestamp,
        event_id,
        data,
        path_params,
        organizationId,
        spaceId
    ),

    rooms AS (
      SELECT
        document_name,
        timestamp,
        event_id,
        data,
        spaceId,
        path_params,
        organizationId,
        roomId
      FROM (
        SELECT
          document_name,
          FIRST_VALUE(timestamp) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS timestamp,
          FIRST_VALUE(event_id) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS event_id,
          FIRST_VALUE(operation) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS operation,
          FIRST_VALUE(data) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS data,
          FIRST_VALUE(JSON_VALUE(data, "$.spaceId")) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS spaceId,
          FIRST_VALUE(path_params) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS path_params,
          JSON_VALUE(path_params, "$.roomId") AS roomId,
          JSON_VALUE(path_params, "$.organizationId") AS organizationId
        FROM
          \`${queryParams.projectId}.firestore_export.rooms_raw_changelog\`
        WHERE
          operation in ("CREATE","UPDATE")
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
      )
      GROUP BY
        document_name,
        timestamp,
        event_id,
        data,
        spaceId,
        path_params,
        organizationId,
        roomId
    ),

    participantsDenormalized AS (
      SELECT
        participantId,
        userEmail,
        userName,
        timestamp,
        roomId,
      FROM (
        SELECT
          FIRST_VALUE(timestamp) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS timestamp,
          FIRST_VALUE(JSON_VALUE(data, "$.userName")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS userName,
          FIRST_VALUE(JSON_VALUE(data, "$.userEmail")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS userEmail,
          FIRST_VALUE(JSON_VALUE(path_params, "$.roomId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS roomId,
          FIRST_VALUE(JSON_VALUE(path_params, "$.participantsDenormalized")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS participantId,
        FROM
          \`${queryParams.projectId}.firestore_export.participantsDenormalized_raw_changelog\`
        WHERE operation IN ("CREATE", "UPDATE")
        AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
        AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
        AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
        ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
      )
      GROUP BY
        participantId,
        userEmail,
        userName,
        timestamp,
        roomId
      ORDER BY timestamp
    ),

    usage AS (
      SELECT
        TIMESTAMP_SECONDS(3600 * DIV(UNIX_SECONDS(TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(usage.data, "$.end._seconds"), SUBSTR(JSON_VALUE(usage.data, "$.end._nanoseconds"), 0, 3)) AS INT64))) + 1800, 3600)) AS hour,
        JSON_VALUE(usage.path_params, "$.organizationId") AS organizationId,
        JSON_VALUE(usage.path_params, "$.participantId") AS participantId,
        JSON_VALUE(usage.path_params, "$.roomId") AS roomId,
        usage.document_id AS participantUsageId,
        TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(usage.data, "$.end._seconds"), SUBSTR(JSON_VALUE(usage.data, "$.end._nanoseconds"), 0, 3)) AS INT64)) AS endTimestamp,
        r.spaceId AS spaceId,
        JSON_VALUE(s.data, "$.name") AS spaceName,
        pD.userEmail as userEmail,
        pD.userName as userName,
        CASE
          WHEN
            pD.userEmail IS NULL
            OR SPLIT(pD.userEmail, '@')[OFFSET(1)] IS NULL
            OR SPLIT(pD.userEmail, '@')[OFFSET(1)] = ""
            OR SPLIT(pD.userEmail, '@')[OFFSET(1)] in UNNEST(@excluded_usage_email_domains)
          THEN
            0
          ELSE
            CAST(JSON_VALUE(usage.data, "$.creditsUsed") AS FLOAT64)
        END as creditsUsed
      FROM
        \`${queryParams.projectId}.firestore_export.participantUsage_raw_changelog\` as usage
      INNER JOIN rooms r ON r.roomId = JSON_VALUE(usage.path_params, "$.roomId")
      INNER JOIN spaces s ON s.spaceId = r.spaceId
      INNER JOIN participantsDenormalized pD ON pD.participantId = JSON_VALUE(usage.path_params, "$.participantId")
      WHERE operation = "CREATE"
      AND JSON_VALUE(usage.path_params, "$.organizationId") = @organization_id
      ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(usage.path_params, \"$.roomId\") = @room_id" : ""}
      AND usage.timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
      AND usage.timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
    )
  `;
    const selectQuery = (() => {
        switch (queryParams.aggregation) {
            case "sumCreditsUsedBySpaceId": {
                return `
        SELECT
          SUM(creditsUsed) as creditsUsed,
          spaceId
        FROM
          usage
        WHERE organizationId = @organization_id
        ${(queryParams.roomId != undefined) ? "AND roomId = @room_id" : ""}
        AND endTimestamp >= @after_timestamp
        AND endTimestamp < @before_timestamp
        GROUP BY spaceId
        ORDER BY spaceId
        LIMIT @row_limit OFFSET @row_offset
        ;`;
            }
            default: {
                return `
        SELECT
          *
        FROM
          usage
        WHERE organizationId = @organization_id
        ${(queryParams.roomId != undefined) ? "AND roomId = @room_id" : ""}
        ${(queryParams.spaceId != undefined) ? "AND spaceId = @space_id" : ""}
        AND endTimestamp >= @after_timestamp
        AND endTimestamp < @before_timestamp
        ORDER BY endTimestamp
        LIMIT @row_limit OFFSET @row_offset
        ;`;
            }
        }
    })();
    const query = windowsQuery + "\n" + selectQuery;
    const params = {
        row_limit: queryParams.count,
        row_offset: queryParams.offset,
        excluded_usage_email_domains: (configurationBilling != undefined && configurationBilling.excludedUsageEmailDomains != undefined && configurationBilling.excludedUsageEmailDomains.length > 0) ? configurationBilling.excludedUsageEmailDomains : [],
        organization_id: queryParams.organizationId,
        space_id: queryParams.spaceId,
        room_id: queryParams.roomId,
        after_timestamp: new bigquery_1.BigQueryTimestamp(queryParams.after),
        before_timestamp: new bigquery_1.BigQueryTimestamp(queryParams.before),
    };
    // console.debug("Running bigquery query");
    // console.debug({query, params: queryParams});
    try {
        const [job] = await bigQuery.createQueryJob({
            query,
            useLegacySql: false,
            params,
            types: {
                excluded_usage_email_domains: ["STRING"],
            },
        });
        console.debug(`Awaiting query job results for query job: ${job.id}`);
        const result = await job.getQueryResults(job);
        const [rows] = result;
        console.debug(`Got ${rows.length} rows from query job results for ${job.id}`);
        const sumCreditsUsedBySpaceId = (() => {
            if (queryParams.aggregation == undefined)
                return undefined;
            return { sumCreditsUsedBySpaceId: rows.map((r) => {
                    return {
                        spaceId: r.spaceId,
                        creditsUsed: r.creditsUsed,
                    };
                }),
                type: "sumCreditsUsedBySpaceId",
            };
        })();
        const usageRecords = (() => {
            if (queryParams.aggregation != undefined)
                return undefined;
            return rows.map((r) => {
                const participantId = String(r.participantId);
                const [userId, deviceId] = participantId.split(":");
                return {
                    creditsUsed: r.creditsUsed,
                    endTimestamp: r.endTimestamp.value,
                    hour: r.hour.value,
                    organizationId: r.organizationId,
                    participantId: r.participantId,
                    userName: r.userName,
                    userEmail: r.userEmail,
                    userId,
                    deviceId,
                    participantUsageId: r.participantUsageId,
                    roomId: r.roomId,
                    spaceId: r.spaceId,
                    spaceName: r.spaceName,
                };
            });
        })();
        const results = {
            query,
            params,
            sumCreditsUsedBySpaceId,
            usageRecords,
        };
        return results;
    }
    catch (e) {
        console.error(e);
        return { query, params };
    }
}
exports.queryOrganizationParticipantUsage = queryOrganizationParticipantUsage;
async function queryParticipantAnalytics(queryParams) {
    const bigQuery = new bigquery_1.BigQuery();
    const configurationBilling = await (0, billing_1.getConfigurationBilling)({
        organizationId: queryParams.organizationId,
        spaceId: queryParams.spaceId,
        roomId: queryParams.roomId,
    });
    // NOTE: This query does the following:
    // * Gets latest state of each space
    // * Get latest state of each room
    // * Get latest state of each denormalized participant
    // * Get latest state of each participant
    // * Gets participant usage records from timeframe
    // * Joins the space, room, participants and participantsDenormalized data onto the usage record
    // * Returns usage records with the timestamp of the nearest hour, user and space information
    const windowsQuery = `
    WITH spaces AS (
      SELECT
        document_name,
        timestamp,
        event_id,
        data,
        path_params,
        organizationId,
        spaceId,
        spaceName
      FROM (
        SELECT
          document_name,
          FIRST_VALUE(timestamp) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS timestamp,
          FIRST_VALUE(event_id) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS event_id,
          FIRST_VALUE(operation) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS operation,
          FIRST_VALUE(data) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS data,
          FIRST_VALUE(JSON_VALUE(data, "$.name")) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS spaceName,
          FIRST_VALUE(path_params) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS path_params,
          JSON_VALUE(path_params, "$.spaceId") AS spaceId,
          JSON_VALUE(path_params, "$.organizationId") AS organizationId
        FROM
          \`${queryParams.projectId}.firestore_export.spaces_raw_changelog\`
        WHERE
          operation in ("CREATE","UPDATE")
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.spaceId != undefined) ? "AND JSON_VALUE(path_params, \"$.spaceId\") = @space_id" : ""}
      )
      GROUP BY
        document_name,
        timestamp,
        event_id,
        data,
        path_params,
        organizationId,
        spaceId,
        spaceName
    ),

    rooms AS (
      SELECT
        document_name,
        timestamp,
        event_id,
        data,
        roomName,
        spaceId,
        path_params,
        organizationId,
        roomId
      FROM (
        SELECT
          document_name,
          FIRST_VALUE(timestamp) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS timestamp,
          FIRST_VALUE(event_id) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS event_id,
          FIRST_VALUE(operation) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS operation,
          FIRST_VALUE(data) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS data,
          FIRST_VALUE(JSON_VALUE(data, "$.spaceId")) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS spaceId,
          FIRST_VALUE(JSON_VALUE(data, "$.name")) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS roomName,
          FIRST_VALUE(path_params) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS path_params,
          JSON_VALUE(path_params, "$.roomId") AS roomId,
          JSON_VALUE(path_params, "$.organizationId") AS organizationId
        FROM
          \`${queryParams.projectId}.firestore_export.rooms_raw_changelog\`
        WHERE
          operation in ("CREATE","UPDATE")
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
          ${(queryParams.spaceId != undefined) ? "AND JSON_VALUE(data, \"$.spaceId\") = @space_id" : ""}
      )
      GROUP BY
        document_name,
        timestamp,
        event_id,
        data,
        spaceId,
        path_params,
        organizationId,
        roomName,
        roomId
    ),

    participantsDenormalized AS (
      SELECT
        participantId,
        userEmail,
        userName,
        timestamp,
        roomId,
      FROM (
        SELECT
          FIRST_VALUE(timestamp) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS timestamp,
          FIRST_VALUE(JSON_VALUE(data, "$.userName")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS userName,
          FIRST_VALUE(JSON_VALUE(data, "$.userEmail")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS userEmail,
          FIRST_VALUE(JSON_VALUE(path_params, "$.roomId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS roomId,
          FIRST_VALUE(JSON_VALUE(path_params, "$.participantsDenormalized")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS participantId,
        FROM
          \`${queryParams.projectId}.firestore_export.participantsDenormalized_raw_changelog\`
        WHERE
          operation in ("CREATE","UPDATE")
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
      )
      GROUP BY
        participantId,
        userEmail,
        userName,
        timestamp,
        roomId
      ORDER BY timestamp
    ),

    participants AS (
      SELECT
        TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(data, "$.created._seconds"), SUBSTR(JSON_VALUE(data, "$.created._nanoseconds"), 0, 3)) AS INT64)) AS createdAt,
        participantId,
        data,
        organizationId,
        timestamp,
        roomId,
      FROM (
        SELECT
          FIRST_VALUE(timestamp) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp DESC
          ) AS timestamp,
          FIRST_VALUE(JSON_VALUE(path_params, "$.roomId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp DESC
          ) AS roomId,
          FIRST_VALUE(JSON_VALUE(path_params, "$.organizationId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp DESC
          ) AS organizationId,
          FIRST_VALUE(data) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp DESC
          ) AS data,
          FIRST_VALUE(JSON_VALUE(path_params, "$.participantId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp DESC
          ) AS participantId,
        FROM
          \`${queryParams.projectId}.firestore_export.participants_raw_changelog\`
        WHERE
          operation in ("CREATE","UPDATE")
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
      )
      GROUP BY
        createdAt,
        participantId,
        organizationId,
        timestamp,
        roomId,
        data
      ORDER BY timestamp
    ),

    participantUpdateStateCreatedDeployments AS (
      SELECT
        participantId,
        timestamp,
      FROM (
        SELECT
          FIRST_VALUE(timestamp) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp ASC
          ) AS timestamp,
          FIRST_VALUE(JSON_VALUE(path_params, "$.participantId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp ASC
          ) AS participantId,
        FROM
          \`${queryParams.projectId}.firestore_export.participants_raw_changelog\`
        WHERE
          operation = "UPDATE"
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(data, "$.state") = "created-deployments"
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
      )
      GROUP BY
        participantId,
        timestamp
      ORDER BY timestamp
    ),

    participantDeletions AS (
      SELECT
        participantId,
        timestamp,
        roomId
      FROM (
        SELECT
          FIRST_VALUE(timestamp) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp DESC
          ) AS timestamp,
          FIRST_VALUE(JSON_VALUE(path_params, "$.roomId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp DESC
          ) AS roomId,
          FIRST_VALUE(JSON_VALUE(path_params, "$.participantId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantId")
            ORDER BY
              timestamp DESC
          ) AS participantId,
        FROM
          \`${queryParams.projectId}.firestore_export.participants_raw_changelog\`
        WHERE
          operation = "DELETE"
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
      )
      GROUP BY
        participantId,
        timestamp,
        roomId
      ORDER BY timestamp
    ),

    browserStates AS (
      SELECT
        TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(data, "$.timestamp._seconds"), SUBSTR(JSON_VALUE(data, "$.timestamp._nanoseconds"), 0, 3)) AS INT64)) AS createdAt,
        timestamp,
        JSON_VALUE(path_params, "$.roomId") as roomId,
        JSON_VALUE(path_params, "$.participantId") as participantId,
        JSON_VALUE(path_params, "$.browserStateId") as browserStateId,
        JSON_VALUE(data, "$.state") as state,
      FROM
        \`${queryParams.projectId}.firestore_export.browserStates_raw_changelog\`
      WHERE
        operation = "CREATE"
        AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
        AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
        AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
        ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
      ORDER BY timestamp
    ),

    browserStateSummaryByParticipant AS (
      SELECT
        participantId,
        MAX(createdAt) as lastCreatedAt,
        MAX(CASE WHEN state = 'pixelstreaming-initialized' THEN timestamp END) AS reachedPixelstreamingInitializedAt,
        MAX(CASE WHEN state = 'webrtc-connected' THEN timestamp END) AS reachedWebrtcConnectedAt,
        MAX(CASE WHEN (state = "pixelstreaming-initialized") THEN 1 ELSE 0 END) AS reachedPixelstreamingInitialized,
        MAX(CASE WHEN (state = "webrtc-connected") THEN 1 ELSE 0 END) AS reachedWebrtcConnected,
      FROM (
        SELECT
          participantId,
          createdAt,
          timestamp,
          state,
          ROW_NUMBER() OVER (PARTITION BY participantId, state ORDER BY timestamp ASC) AS rowNumber
        FROM browserStates
      )
      WHERE rowNumber = 1
      GROUP BY participantId
    ),

    usage AS (
      SELECT
        CAST(JSON_VALUE(usage.data, "$.creditsUsed") AS FLOAT64) AS creditsUsed,
        JSON_VALUE(usage.path_params, "$.organizationId") AS organizationId,
        JSON_VALUE(usage.path_params, "$.participantId") AS participantId,
        JSON_VALUE(usage.path_params, "$.roomId") AS roomId,
        usage.document_id AS participantUsageId,
        TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(usage.data, "$.end._seconds"), SUBSTR(JSON_VALUE(usage.data, "$.end._nanoseconds"), 0, 3)) AS INT64)) AS endTimestamp,
        r.spaceId AS spaceId,
      FROM
        \`${queryParams.projectId}.firestore_export.participantUsage_raw_changelog\` as usage
      INNER JOIN rooms r ON r.roomId = JSON_VALUE(usage.path_params, "$.roomId")
      INNER JOIN spaces s ON s.spaceId = r.spaceId
      WHERE
        operation = "CREATE"
        AND usage.timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
        AND usage.timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
        AND JSON_VALUE(usage.path_params, "$.organizationId") = @organization_id
        ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
    ),

    usageByParticipant AS (
      SELECT
        SUM(creditsUsed) as creditsUsed,
        MAX(endTimestamp) as lastEndTimestamp,
        organizationId,
        participantId,
        roomId,
        spaceId
      FROM
        usage
      WHERE true
      GROUP BY
        organizationId,
        participantId,
        roomId,
        spaceId
    ),

    result AS (
      SELECT
        p.organizationId as organizationId,
        p.createdAt as startedAt,
        p.roomId as roomId,
        p.participantId as participantId,
        p.data as participant,
        u.creditsUsed as creditsUsed,
        u.lastEndTimestamp as lastUsageAt,
        r.spaceId AS spaceId,
        r.roomName AS roomName,
        s.spaceName as spaceName,
        pD.userEmail as userEmail,
        pD.userName as userName,
        d.timestamp as deletedAt,
        bS.lastCreatedAt as lastBrowserStateAt,
        JSON_VALUE(p.data, "$.state") AS participantState,
        createdDeployments.timestamp as reachedCreatedDeploymentsAt,
        bS.reachedPixelstreamingInitialized as reachedPixelstreamingInitialized,
        bS.reachedWebrtcConnected as reachedWebrtcConnected,
        bS.reachedPixelstreamingInitializedAt as reachedPixelstreamingInitializedAt,
        bS.reachedWebrtcConnectedAt as reachedWebrtcConnectedAt,
        GREATEST(IFNULL(d.timestamp, p.createdAt), IFNULL(u.lastEndTimestamp, p.createdAt), IFNULL(bS.lastCreatedAt, p.createdAt)) as endedAt,
        CASE
          WHEN
            pD.userEmail IS NULL
            OR SPLIT(pD.userEmail, '@')[OFFSET(1)] IS NULL
            OR SPLIT(pD.userEmail, '@')[OFFSET(1)] = ""
            OR SPLIT(pD.userEmail, '@')[OFFSET(1)] in UNNEST(@excluded_usage_email_domains)
          THEN
            0
          ELSE
            u.creditsUsed
        END as creditsUsed,
        CASE
          WHEN d.timestamp is not null
          THEN
            TIMESTAMP_DIFF(d.timestamp, p.createdAt, MILLISECOND)
          WHEN u.lastEndTimestamp is not null
          THEN
            TIMESTAMP_DIFF(u.lastEndTimestamp, p.createdAt, MILLISECOND)
          WHEN bS.lastCreatedAt is not null
          THEN
            TIMESTAMP_DIFF(bS.lastCreatedAt, p.createdAt, MILLISECOND)
          ELSE
            null
        END as durationMillis
      FROM
        participants as p
      LEFT JOIN rooms r ON r.roomId = p.roomId
      LEFT JOIN spaces s ON s.spaceId = r.spaceId
      LEFT JOIN participantsDenormalized pD ON pD.participantId = p.participantId
      LEFT JOIN participantDeletions d ON d.participantId = p.participantId
      LEFT JOIN usageByParticipant u ON u.participantId = p.participantId
      LEFT JOIN browserStateSummaryByParticipant bS ON bS.participantId = p.participantId
      LEFT JOIN participantUpdateStateCreatedDeployments createdDeployments ON createdDeployments.participantId = p.participantId
      WHERE true
      ${(queryParams.spaceId != undefined) ? "AND r.spaceId = @space_id" : ""}
      ${(queryParams.roomId != undefined) ? "AND r.roomId = @room_id" : ""}
    )
  `;
    const selectQuery = (() => {
        switch (queryParams.aggregation) {
            case "sumCreditsUsedBySpaceId": {
                return `
        SELECT
          SUM(creditsUsed) as creditsUsed,
          COUNT(creditsUsed) as recordCount,
          spaceId
        FROM
          result
        WHERE organizationId = @organization_id
        ${(queryParams.roomId != undefined) ? "AND roomId = @room_id" : ""}
        AND result.startedAt >= @after_timestamp
        AND result.startedAt < @before_timestamp
        GROUP BY spaceId
        ORDER BY spaceId
        LIMIT @row_limit OFFSET @row_offset
        ;`;
            }
            default: {
                return `
        SELECT
          *
        FROM
          result
        WHERE result.startedAt >= @after_timestamp
        AND result.startedAt < @before_timestamp
        ORDER BY startedAt
        LIMIT @row_limit OFFSET @row_offset
        ;
        `;
            }
        }
    })();
    const query = windowsQuery + "\n" + selectQuery;
    const params = {
        row_limit: queryParams.count,
        row_offset: queryParams.offset,
        excluded_usage_email_domains: (configurationBilling != undefined && configurationBilling.excludedUsageEmailDomains != undefined && configurationBilling.excludedUsageEmailDomains.length > 0) ? configurationBilling.excludedUsageEmailDomains : [],
        organization_id: queryParams.organizationId,
        room_id: queryParams.roomId,
        space_id: queryParams.spaceId,
        after_timestamp: new bigquery_1.BigQueryTimestamp(queryParams.after),
        before_timestamp: new bigquery_1.BigQueryTimestamp(queryParams.before),
    };
    const result = await (async () => {
        try {
            console.debug("Running bigquery query queryParticipantAnalytics");
            const [job] = await bigQuery.createQueryJob({
                query,
                useLegacySql: false,
                params,
                types: {
                    excluded_usage_email_domains: ["STRING"],
                },
            });
            console.debug(`Awaiting query job results for query job: ${job.id}`);
            return await job.getQueryResults(job);
        }
        catch (e) {
            console.error(e);
            return undefined;
        }
    })();
    if (result == undefined) {
        console.error("Query failed");
        return { query, params, results: undefined };
    }
    const [rows] = result;
    console.debug(`Got ${rows.length} rows from query job results`);
    const results = (() => {
        return rows.map((r) => {
            var _a, _b, _c;
            const participantId = String(r.participantId);
            const participant = JSON.parse(r.participant);
            const stateChangesFixed = (_a = participant.stateChanges) === null || _a === void 0 ? void 0 : _a.map((sC) => {
                const timestamp = new admin.firestore.Timestamp(sC.timestamp._seconds, sC.timestamp._nanoseconds);
                const state = sC.state;
                return {
                    timestamp,
                    state,
                };
            });
            const readyState = (() => {
                if (stateChangesFixed == undefined)
                    return undefined;
                return stateChangesFixed.find((pS) => pS.state == "ready-deployment");
            })();
            const createdDeploymentsState = (() => {
                var _a;
                const fromCreatedDeploymentsQuery = ((_a = r.reachedCreatedDeploymentsAt) === null || _a === void 0 ? void 0 : _a.value) != undefined ? new Date(r.reachedCreatedDeploymentsAt.value) : undefined;
                if (fromCreatedDeploymentsQuery != null && fromCreatedDeploymentsQuery != undefined) {
                    return {
                        state: "created-deployments",
                        timestamp: admin.firestore.Timestamp.fromDate(fromCreatedDeploymentsQuery),
                    };
                }
                if (stateChangesFixed == undefined)
                    return undefined;
                return stateChangesFixed.find((pS) => pS.state == "created-deployments");
            })();
            const [userId, deviceId] = participantId.split(":");
            const startedAt = new Date(r.startedAt.value);
            const reachedCreatedDeploymentsState = createdDeploymentsState != undefined;
            const reachedCreatedDeploymentsStateAt = reachedCreatedDeploymentsState ? createdDeploymentsState.timestamp.toDate() : undefined;
            const reachedCreatedDeploymentsStateAfterMs = reachedCreatedDeploymentsStateAt != undefined ? reachedCreatedDeploymentsStateAt.valueOf() - startedAt.valueOf() : undefined;
            const reachedReadyState = readyState != undefined;
            const reachedReadyStateAt = reachedReadyState ? readyState.timestamp.toDate() : undefined;
            const reachedReadyStateAfterMs = reachedReadyStateAt != undefined ? reachedReadyStateAt.valueOf() - startedAt.valueOf() : undefined;
            const reachedWebrtcConnectedState = Boolean(r.reachedWebrtcConnected);
            const reachedWebrtcConnectedStateAt = reachedWebrtcConnectedState ? ((_b = r.reachedWebrtcConnectedAt) === null || _b === void 0 ? void 0 : _b.value) != undefined ? new Date(r.reachedWebrtcConnectedAt.value) : undefined : undefined;
            const reachedWebrtcConnectedStateAfterMs = reachedWebrtcConnectedStateAt != undefined ? reachedWebrtcConnectedStateAt.valueOf() - startedAt.valueOf() : undefined;
            const reachedInitializedState = Boolean(r.reachedPixelstreamingInitialized);
            const reachedInitializedStateAt = reachedInitializedState ? ((_c = r.reachedPixelstreamingInitializedAt) === null || _c === void 0 ? void 0 : _c.value) != undefined ? new Date(r.reachedPixelstreamingInitializedAt.value) : undefined : undefined;
            const reachedInitializedStateAfterMs = reachedInitializedStateAt ? reachedInitializedStateAt.valueOf() - startedAt.valueOf() : undefined;
            return {
                creditsUsed: (r.creditsUsed != null && r.creditsUsed != undefined) ? r.creditsUsed : 0,
                deviceId,
                durationMillis: r.durationMillis,
                endedAt: (r.endedAt != undefined) ? r.endedAt.value : undefined,
                organizationId: r.organizationId,
                participantId: r.participantId,
                participantUsageId: r.participantUsageId,
                reachedCreatedDeploymentsState,
                reachedCreatedDeploymentsStateAt,
                reachedCreatedDeploymentsStateAfterMs,
                reachedReadyState,
                reachedReadyStateAt,
                reachedReadyStateAfterMs,
                reachedWebrtcConnectedState,
                reachedWebrtcConnectedStateAt,
                reachedWebrtcConnectedStateAfterMs,
                reachedInitializedState,
                reachedInitializedStateAt,
                reachedInitializedStateAfterMs,
                shardId: r.roomId,
                roomName: r.roomName,
                spaceId: r.spaceId,
                spaceName: r.spaceName,
                startedAt,
                userEmail: r.userEmail,
                userId,
                userName: r.userName,
            };
        });
    })();
    const sumCreditsUsedBySpaceId = (() => {
        if (queryParams.aggregation == undefined)
            return undefined;
        return { sumCreditsUsedBySpaceId: rows.map((r) => {
                return {
                    spaceId: r.spaceId,
                    creditsUsed: r.creditsUsed,
                    recordCount: r.recordCount,
                };
            }),
            type: "sumCreditsUsedBySpaceId",
        };
    })();
    return { query, params, results, sumCreditsUsedBySpaceId };
}
exports.queryParticipantAnalytics = queryParticipantAnalytics;
async function queryParticipantUsageChecks(queryParams) {
    const bigQuery = new bigquery_1.BigQuery();
    const windowsQuery = `
    WITH spaces AS (
      SELECT
        document_name,
        timestamp,
        event_id,
        data,
        path_params,
        organizationId,
        spaceId,
        spaceName
      FROM (
        SELECT
          document_name,
          FIRST_VALUE(timestamp) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS timestamp,
          FIRST_VALUE(event_id) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS event_id,
          FIRST_VALUE(operation) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS operation,
          FIRST_VALUE(data) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS data,
          FIRST_VALUE(JSON_VALUE(data, "$.name")) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS spaceName,
          FIRST_VALUE(path_params) OVER(PARTITION BY JSON_VALUE(path_params, "$.spaceId")
          ORDER BY
            timestamp DESC ) AS path_params,
          JSON_VALUE(path_params, "$.spaceId") AS spaceId,
          JSON_VALUE(path_params, "$.organizationId") AS organizationId
        FROM
          \`${queryParams.projectId}.firestore_export.spaces_raw_changelog\`
        WHERE
          operation in ("CREATE","UPDATE")
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.spaceId != undefined) ? "AND JSON_VALUE(path_params, \"$.spaceId\") = @space_id" : ""}
      )
      GROUP BY
        document_name,
        timestamp,
        event_id,
        data,
        path_params,
        organizationId,
        spaceId,
        spaceName
    ),

    rooms AS (
      SELECT
        document_name,
        timestamp,
        event_id,
        data,
        roomName,
        spaceId,
        path_params,
        organizationId,
        roomId
      FROM (
        SELECT
          document_name,
          FIRST_VALUE(timestamp) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS timestamp,
          FIRST_VALUE(event_id) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS event_id,
          FIRST_VALUE(operation) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS operation,
          FIRST_VALUE(data) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS data,
          FIRST_VALUE(JSON_VALUE(data, "$.spaceId")) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS spaceId,
          FIRST_VALUE(JSON_VALUE(data, "$.name")) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS roomName,
          FIRST_VALUE(path_params) OVER(PARTITION BY JSON_VALUE(path_params, "$.roomId")
          ORDER BY
            timestamp DESC ) AS path_params,
          JSON_VALUE(path_params, "$.roomId") AS roomId,
          JSON_VALUE(path_params, "$.organizationId") AS organizationId
        FROM
          \`${queryParams.projectId}.firestore_export.rooms_raw_changelog\`
        WHERE
          operation in ("CREATE","UPDATE")
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
          ${(queryParams.spaceId != undefined) ? "AND JSON_VALUE(data, \"$.spaceId\") = @space_id" : ""}
      )
      GROUP BY
        document_name,
        timestamp,
        event_id,
        data,
        spaceId,
        path_params,
        organizationId,
        roomName,
        roomId
    ),

    participantUsageChecks AS (
      SELECT
        participantId,
        userEmail,
        userName,
        timestamp,
        roomId,
      FROM (
        SELECT
          FIRST_VALUE(timestamp) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantUsageChecks")
            ORDER BY
              timestamp DESC
          ) AS timestamp,
          FIRST_VALUE(JSON_VALUE(path_params, "$.roomId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantUsageCheckId")
            ORDER BY
              timestamp DESC
          ) AS roomId,
          FIRST_VALUE(data) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantUsageCheckId")
            ORDER BY
              timestamp DESC
          ) AS data,
          FIRST_VALUE(JSON_VALUE(path_params, "$.participantUsageCheckId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantUsageCheckId")
            ORDER BY
              timestamp DESC
          ) AS participantUsageCheckId,
          FIRST_VALUE(JSON_VALUE(path_params, "$.organizationId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantUsageCheckId")
            ORDER BY
              timestamp DESC
          ) AS organizationId,
        FROM
          \`${queryParams.projectId}.firestore_export.participantUsageChecks_raw_changelog\`
        WHERE
          operation in ("CREATE","UPDATE")
          AND timestamp >= TIMESTAMP_SUB(@after_timestamp, INTERVAL 5 MINUTE)
          AND timestamp < TIMESTAMP_ADD(@before_timestamp, INTERVAL 5 MINUTE)
          AND JSON_VALUE(data, "$.deductedCredits") is not NULL
          AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
          ${(queryParams.roomId != undefined) ? "AND JSON_VALUE(path_params, \"$.roomId\") = @room_id" : ""}
      )
      GROUP BY
        data,
        participantUsageCheckId,
        timestamp,
        roomId,
        organizationId,
      ORDER BY timestamp
    ),

    result AS (
      SELECT
        p.organizationId as organizationId,
        p.startedAt as startedAt,
        p.roomId as roomId,
        p.participantId as participantId,
        p.data as participantUsageCheck,
        r.spaceId AS spaceId,
        r.roomName AS roomName,
        s.spaceName as spaceName,
        TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(p.data, "$.triggeredAt._seconds"), SUBSTR(JSON_VALUE(p.data, "$.triggeredAt._nanoseconds"), 0, 3)) AS INT64)) AS triggeredAt,
        TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(p.data, "$.startedAt._seconds"), SUBSTR(JSON_VALUE(p.data, "$.startedAt._nanoseconds"), 0, 3)) AS INT64)) AS startedAt,
        TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(p.data, "$.accountedAt._seconds"), SUBSTR(JSON_VALUE(p.data, "$.accountedAt._nanoseconds"), 0, 3)) AS INT64)) AS accountedAt,
        TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(p.data, "$.participantUsageDocsAddedAt._seconds"), SUBSTR(JSON_VALUE(p.data, "$.participantUsageDocsAddedAt._nanoseconds"), 0, 3)) AS INT64)) AS participantUsageDocsAddedAt,
        JSON_VALUE(p.data, "$.participantUsageDocsAdded") AS participantUsageDocsAdded,
        JSON_VALUE(p.data, "$.result") AS result,
        JSON_VALUE(p.data, "$.participantUsageDocsAccounted") AS participantUsageDocsAccounted,
        JSON_VALUE(p.data, "$.deductedCredits") AS deductedCredits
      FROM
        participantUsageChecks as p
      LEFT JOIN rooms r ON r.roomId = p.roomId
      LEFT JOIN spaces s ON s.spaceId = r.spaceId
      WHERE true
      ${(queryParams.spaceId != undefined) ? "AND r.spaceId = @space_id" : ""}
      ${(queryParams.roomId != undefined) ? "AND r.roomId = @room_id" : ""}
    )
  `;
    const selectQuery = (() => {
        switch (queryParams.aggregation) {
            case "sumDeductedCreditsBySpaceId": {
                return `
        SELECT
          SUM(deductedCredits) as deductedCredits,
          COUNT(deductedCredits) as recordCount,
          spaceId
        FROM
          result
        WHERE organizationId = @organization_id
        ${(queryParams.roomId != undefined) ? "AND roomId = @room_id" : ""}
        AND result.startedAt >= @after_timestamp
        AND result.startedAt < @before_timestamp
        GROUP BY spaceId
        ORDER BY spaceId
        LIMIT @row_limit OFFSET @row_offset
        ;`;
            }
            default: {
                return `
        SELECT
          *
        FROM
          result
        WHERE result.startedAt >= @after_timestamp
        AND result.startedAt < @before_timestamp
        ORDER BY startedAt
        LIMIT @row_limit OFFSET @row_offset
        ;
        `;
            }
        }
    })();
    const query = windowsQuery + "\n" + selectQuery;
    const params = {
        row_limit: queryParams.count,
        row_offset: queryParams.offset,
        organization_id: queryParams.organizationId,
        room_id: queryParams.roomId,
        space_id: queryParams.spaceId,
        after_timestamp: new bigquery_1.BigQueryTimestamp(queryParams.after),
        before_timestamp: new bigquery_1.BigQueryTimestamp(queryParams.before),
    };
    const result = await (async () => {
        try {
            console.debug("Running bigquery query queryParticipantUsageChecks");
            const [job] = await bigQuery.createQueryJob({
                query,
                useLegacySql: false,
                params,
            });
            console.debug(`Awaiting query job results for query job: ${job.id}`);
            return await job.getQueryResults(job);
        }
        catch (e) {
            console.error(e);
            return undefined;
        }
    })();
    if (result == undefined) {
        console.error("Query failed");
        return { query, params, results: undefined };
    }
    const [rows] = result;
    console.debug(`Got ${rows.length} rows from query job results`);
    const results = (() => {
        return rows.map((r) => {
            var _a, _b, _c, _d, _e, _f;
            const participantUsageCheckId = String(r.participantUsageCheckId);
            const organizationId = String(r.organizationId);
            const roomName = String(r.roomName);
            const spaceId = String(r.spaceId);
            const spaceName = String(r.spaceName);
            const startedAt = (((_a = r.participantUsageCheck) === null || _a === void 0 ? void 0 : _a.startedAt) != null && ((_b = r.participantUsageCheck) === null || _b === void 0 ? void 0 : _b.startedAt) != undefined) ? new admin.firestore.Timestamp(r.participantUsageCheck.startedAt._seconds, r.participantUsageCheck.startedAt._nanoseconds) : undefined;
            const triggeredAt = new admin.firestore.Timestamp(r.participantUsageCheck.triggeredAt._seconds, r.participantUsageCheck.triggeredAt._nanoseconds);
            const accountedAt = (((_c = r.participantUsageCheck) === null || _c === void 0 ? void 0 : _c.accountedAt) != null && ((_d = r.participantUsageCheck) === null || _d === void 0 ? void 0 : _d.accountedAt) != undefined) ? new admin.firestore.Timestamp(r.participantUsageCheck.accountedAt._seconds, r.participantUsageCheck.accountedAt._nanoseconds) : undefined;
            const participantUsageDocsAddedAt = (((_e = r.participantUsageCheck) === null || _e === void 0 ? void 0 : _e.participantUsageDocsAddedAt) != null && ((_f = r.participantUsageCheck) === null || _f === void 0 ? void 0 : _f.participantUsageDocsAddedAt) != undefined) ? new admin.firestore.Timestamp(r.participantUsageCheck.participantUsageDocsAddedAt._seconds, r.participantUsageCheck.participantUsageDocsAddedAt._nanoseconds) : undefined;
            const participantUsageCheck = Object.assign(Object.assign({}, JSON.parse(r.participantUsageCheck)), { startedAt,
                triggeredAt,
                accountedAt,
                participantUsageDocsAddedAt });
            return Object.assign({ participantUsageCheckId,
                organizationId,
                startedAt,
                roomName,
                spaceName,
                spaceId }, participantUsageCheck);
        });
    })();
    const sumDeductedCreditsBySpaceId = (() => {
        if (queryParams.aggregation == undefined)
            return undefined;
        return { sumDeductedCreditsBySpaceId: rows.map((r) => {
                return {
                    spaceId: r.spaceId,
                    deductedCredits: r.deductedCredits,
                    recordCount: r.recordCount,
                };
            }),
            type: "sumDeductedCreditsBySpaceId",
        };
    })();
    return { query, params, results, sumDeductedCreditsBySpaceId };
}
exports.queryParticipantUsageChecks = queryParticipantUsageChecks;
async function queryRoomUsageCheckOperation(queryParams) {
    const bigQuery = new bigquery_1.BigQuery();
    const query = `
    WITH
    participantsDenormalized AS (
      SELECT
        participantId,
        userEmail,
        userName,
        timestamp,
        roomId,
      FROM (
        SELECT
          FIRST_VALUE(timestamp) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS timestamp,
          FIRST_VALUE(JSON_VALUE(data, "$.userName")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS userName,
          FIRST_VALUE(JSON_VALUE(data, "$.userEmail")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS userEmail,
          FIRST_VALUE(JSON_VALUE(path_params, "$.roomId")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS roomId,
          FIRST_VALUE(JSON_VALUE(path_params, "$.participantsDenormalized")) OVER(
            PARTITION BY JSON_VALUE(path_params, "$.participantsDenormalized")
            ORDER BY
              timestamp DESC
          ) AS participantId,
        FROM
          \`${queryParams.projectId}.firestore_export.participantsDenormalized_raw_changelog\`
        WHERE operation IN ("CREATE", "UPDATE")
        AND timestamp >= TIMESTAMP_SUB(@after, INTERVAL 24 HOUR)
        AND timestamp < TIMESTAMP_ADD(@before, INTERVAL 5 MINUTE)
        AND JSON_VALUE(path_params, "$.organizationId") = @organization_id
        AND JSON_VALUE(path_params, "$.roomId") = @room_id
      )
      GROUP BY
        participantId,
        userEmail,
        userName,
        timestamp,
        roomId
      ORDER BY timestamp
   ),
   records as (
      SELECT
        JSON_VALUE(path_params, "$.organizationId") as organizationId,
        JSON_VALUE(path_params, "$.roomId") as roomId,
        document_id as participantUsageId,
        TIMESTAMP_MILLIS(CAST (CONCAT(JSON_VALUE(data, "$.end._seconds"), SUBSTR(JSON_VALUE(data, "$.end._nanoseconds"), 0, 3)) as INT64)) as endTimestamp,
        CASE
          WHEN
            pD.userEmail IS NULL
            OR SPLIT(pD.userEmail, '@')[OFFSET(1)] IS NULL
            OR SPLIT(pD.userEmail, '@')[OFFSET(1)] = ""
            OR SPLIT(pD.userEmail, '@')[OFFSET(1)] in UNNEST(@excluded_usage_email_domains)
          THEN
            0
          ELSE
            CAST(JSON_VALUE(u.data, "$.creditsUsed") AS FLOAT64)
        END as creditsUsed,
        JSON_VALUE(u.path_params, "$.participantId") as participantId
      FROM \`${queryParams.projectId}.firestore_export.participantUsage_raw_changelog\` as u
      LEFT JOIN participantsDenormalized pD ON pD.participantId = JSON_VALUE(u.path_params, "$.participantId")
      WHERE operation = "CREATE"
      AND JSON_VALUE(u.path_params, "$.organizationId") = @organization_id
      AND JSON_VALUE(u.path_params, "$.roomId") = @room_id
      AND u.timestamp >= TIMESTAMP_SUB(@after, INTERVAL 5 MINUTE)
      AND u.timestamp <  TIMESTAMP_ADD(@before, INTERVAL 5 MINUTE)
   )
    SELECT
      SUM(creditsUsed) as sumCreditsUsed,
      COUNT(creditsUsed) as participantUsageDocCount
    FROM records
    WHERE endTimestamp >= @after
    AND endTimestamp < @before
    LIMIT 10000
    `;
    const params = {
        excluded_usage_email_domains: (queryParams.configurationBilling != undefined && queryParams.configurationBilling.excludedUsageEmailDomains != undefined && queryParams.configurationBilling.excludedUsageEmailDomains.length > 0) ? queryParams.configurationBilling.excludedUsageEmailDomains : [],
        organization_id: queryParams.organizationId,
        room_id: queryParams.roomId,
        after: queryParams.afterOrEqualToEndTimestamp,
        before: queryParams.beforeEndTimestamp,
    };
    console.debug({ params });
    const participantUsageCheckPath = (0, firestore_1.getParticipantUsageCheckRef)(queryParams.organizationId, queryParams.roomId, queryParams.participantUsageCheckId).path;
    try {
        console.debug(`Waiting 10 seconds for bigquery to catch up before querying for participantUsageCheckId: ${participantUsageCheckPath}`);
        await (0, misc_1.sleep)(10000);
        console.debug(`Creating query job for participantUsageCheck: ${participantUsageCheckPath}`);
        const [job] = await bigQuery.createQueryJob({
            query,
            useLegacySql: false,
            labels: { participant_usage_check_id_lowercase: queryParams.participantUsageCheckId.toLowerCase() },
            types: {
                excluded_usage_email_domains: ["STRING"],
            },
            params,
        });
        console.debug(`Awaiting query job results for participantUsageCheck: ${participantUsageCheckPath}`);
        const result = await job.getQueryResults(job);
        const [rows] = result;
        console.debug(`Got ${rows.length} rows from query job results for participantUsageCheck: ${participantUsageCheckPath}`);
        if (rows.length != 1) {
            console.warn(`Expected one row but got ${rows.length} from participantUsageCheck bigquery query response results`);
        }
        const row = rows.pop();
        console.debug(JSON.stringify(row));
        const sumCreditsUsed = (() => {
            if ((row === null || row === void 0 ? void 0 : row.sumCreditsUsed) === undefined || row.sumCreditsUsed === null || Number.isNaN(row.sumCreditsUsed)) {
                console.error(`Query result row does not contain a valid number in column value sumCreditsUsed. participantUsageCheck: ${participantUsageCheckPath}`);
                return 0;
            }
            return Number(row.sumCreditsUsed);
        })();
        const participantUsageDocCount = (() => {
            if ((row === null || row === void 0 ? void 0 : row.participantUsageDocCount) === undefined || (row === null || row === void 0 ? void 0 : row.participantUsageDocCount) === null || Number.isNaN(row === null || row === void 0 ? void 0 : row.participantUsageDocCount)) {
                console.error(`Query result row does not contain a valid number in column value row?.participantUsageDocCount. participantUsageCheck: ${participantUsageCheckPath}`);
                return 0;
            }
            return Number(row.participantUsageDocCount);
        })();
        return { query, params, sumCreditsUsed, participantUsageDocCount };
    }
    catch (e) {
        console.error(`Error with query for participantUsageCheck: ${participantUsageCheckPath}`);
        console.error(e);
        return { query, params };
    }
}
exports.queryRoomUsageCheckOperation = queryRoomUsageCheckOperation;
//# sourceMappingURL=usage.js.map