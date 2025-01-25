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
// import {queryOrganizationParticipantUsage, queryParticipantAnalytics, queryRoomUsageCheckOperation} from "../lib/organizations/usage";
const usage_1 = require("../lib/organizations/usage");
const fs = __importStar(require("node:fs"));
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
    const participantAnalytics = await (0, usage_1.queryParticipantAnalytics)({
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
    if (participantAnalytics.results == undefined)
        console.debug(participantAnalytics);
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
//# sourceMappingURL=testQueryOrganizationParticipantUsage.js.map