import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
// import {queryOrganizationParticipantUsage, queryParticipantAnalytics, queryRoomUsageCheckOperation} from "../lib/organizations/usage";
import {queryParticipantAnalytics} from "../lib/organizations/usage";
import * as fs from "node:fs";
// import {getConfigurationBilling} from "../lib/billing";

(async () => {
  const oneDayAgo = new Date(new Date().valueOf() - (1000 * 60 * 60 * 24));
  // const sevenDaysAgo = new Date(new Date().valueOf() - (1000 * 60 * 60 * 24 * 7));
  const now = new Date();

  // const organizationId = "2S6bgAfMjnXM8oCWEmGKam";
  const projectId = "ngp-odyssey";

  /*
  const organzationParticipantUsage = await queryOrganizationParticipantUsage({
    projectId,
    count: 1000,
    offset: 0,
    after: sevenDaysAgo,
    before: now,
    spaceId: "nL2N5QYqorDCiNX6LsoRq4",
    organizationId,
    aggregation: "sumCreditsUsedBySpaceId",
  });
  fs.writeFileSync("/tmp/usageQuery.bq", organzationParticipantUsage.query);
  fs.writeFileSync("/tmp/usageQueryParams.json", JSON.stringify(organzationParticipantUsage.params, undefined, 2));
  if (organzationParticipantUsage.usageRecords != undefined) fs.writeFileSync("/tmp/usageRecords.json", JSON.stringify(organzationParticipantUsage.usageRecords, undefined, 2));
  organzationParticipantUsage.sumCreditsUsedBySpaceId?.sumCreditsUsedBySpaceId?.forEach((r) => console.dir(r, {depth: null}));
  console.debug({sumCreditsUsedBySpaceId: organzationParticipantUsage.sumCreditsUsedBySpaceId});
  */

  const participantAnalytics = await queryParticipantAnalytics({
    count: 1000,
    offset: 0,
    projectId,
    after: oneDayAgo,
    before: now,
    organizationId: "GYByxtyzprqEuwWzekiK",
  });

  fs.writeFileSync("/tmp/analyticsQuery.bq", participantAnalytics.query);
  fs.writeFileSync("/tmp/analyticsQueryParams.json", JSON.stringify(participantAnalytics.params, undefined, 2));
  fs.writeFileSync("/tmp/analyticsResults.json", JSON.stringify(participantAnalytics.results, undefined, 2));
  if (participantAnalytics.results == undefined) console.debug(participantAnalytics);

  /*

  const configurationBilling = await getConfigurationBilling({organizationId: "GYByxtyzprqEuwWzekiK"});
  const result = await queryRoomUsageCheckOperation({
    projectId,
    afterOrEqualToEndTimestamp: sevenDaysAgo,
    beforeEndTimestamp: now,
    organizationId,
    roomId: "x1S54BhKnJ1Eo35EoVbezZ",
    participantUsageCheckId: "test",
    configurationBilling: configurationBilling,
  });

  fs.writeFileSync("/tmp/roomCheckQuery.bq", result.query);
  fs.writeFileSync("/tmp/roomCheckQueryParams.json", JSON.stringify(result.params, undefined, 2));
  fs.writeFileSync("/tmp/roomCheckResults.json", JSON.stringify(result.sumCreditsUsed, undefined, 2));
  console.debug({sumCreditsUsed: result.sumCreditsUsed});
  */
})();
