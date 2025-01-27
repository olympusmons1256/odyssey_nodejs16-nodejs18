import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import {queryParticipantAnalytics, queryParticipantUsageChecks /* queryRoomUsageCheckOperation */} from "../lib/organizations/usage";
import * as fs from "node:fs";

(async () => {
  const oneDayAgo = new Date(new Date().valueOf() - (1000 * 60 * 60));
  const now = new Date();

  const organizationId = "lUhC4Ckd1yuaOFf9nEbJ";
  const projectId = "ngp-odyssey-testing";

  const participantAnalytics = await queryParticipantAnalytics({
    count: 10000,
    offset: 0,
    projectId,
    after: oneDayAgo,
    before: now,
    organizationId,
  });

  fs.writeFileSync("/tmp/analyticsQuery.bq", participantAnalytics.query);
  fs.writeFileSync("/tmp/analyticsQueryParams.json", JSON.stringify(participantAnalytics.params, undefined, 2));
  fs.writeFileSync("/tmp/analyticsResults.json", JSON.stringify(participantAnalytics.results, undefined, 2));
  if (participantAnalytics.results == undefined) console.debug(participantAnalytics);

  const participantAnalyticsSummed = await queryParticipantAnalytics({
    count: 10000,
    offset: 0,
    projectId,
    after: oneDayAgo,
    before: now,
    organizationId,
    // spaceId,
    aggregation: "sumCreditsUsedBySpaceId",
  });

  fs.writeFileSync("/tmp/analyticsQuerySummed.bq", participantAnalyticsSummed.query);
  fs.writeFileSync("/tmp/analyticsQuerySummedParams.json", JSON.stringify(participantAnalyticsSummed.params, undefined, 2));
  fs.writeFileSync("/tmp/analyticsSummedResults.json", JSON.stringify(participantAnalyticsSummed.results, undefined, 2));
  if (participantAnalyticsSummed.results == undefined) console.debug(participantAnalytics);

  const result = await queryParticipantUsageChecks({
    projectId,
    before: now,
    after: oneDayAgo,
    organizationId,
    count: 10000,
    offset: 0,
    // roomId: "x1S54BhKnJ1Eo35EoVbezZ",
    // participantUsageCheckId: "test"
  });

  fs.writeFileSync("/tmp/participantUsageCheckQuery.bq", result.query);
  fs.writeFileSync("/tmp/participantUsageCheckQueryParams.json", JSON.stringify(result.params, undefined, 2));
  fs.writeFileSync("/tmp/participantUsageCheckResults.json", JSON.stringify(result.sumDeductedCreditsBySpaceId, undefined, 2));
  console.debug({sumDeductedCreditsBySpaceId: result.sumDeductedCreditsBySpaceId});
})();
