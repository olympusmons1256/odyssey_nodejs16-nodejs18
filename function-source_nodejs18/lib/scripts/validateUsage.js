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
const usage_1 = require("../lib/organizations/usage");
const fs = __importStar(require("node:fs"));
(async () => {
    const oneDayAgo = new Date(new Date().valueOf() - (1000 * 60 * 60));
    const now = new Date();
    const organizationId = "lUhC4Ckd1yuaOFf9nEbJ";
    const projectId = "ngp-odyssey-testing";
    const participantAnalytics = await (0, usage_1.queryParticipantAnalytics)({
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
    if (participantAnalytics.results == undefined)
        console.debug(participantAnalytics);
    const participantAnalyticsSummed = await (0, usage_1.queryParticipantAnalytics)({
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
    if (participantAnalyticsSummed.results == undefined)
        console.debug(participantAnalytics);
    const result = await (0, usage_1.queryParticipantUsageChecks)({
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
    console.debug({ sumDeductedCreditsBySpaceId: result.sumDeductedCreditsBySpaceId });
})();
//# sourceMappingURL=validateUsage.js.map