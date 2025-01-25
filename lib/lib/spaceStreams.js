"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInitialSpaceStreamExists = exports.addSpaceStreamingInfo = void 0;
const uuid_1 = require("uuid");
const firestore_1 = require("./documents/firestore");
const token_1 = require("./dolby/token");
const encryption_1 = require("./encryption");
const firebase_1 = require("./firebase");
const functions_config_1 = require("./functions-config");
async function addSpaceStreamingInfo(organizationId, spaceId) {
    try {
        const projectId = (0, firebase_1.getFirebaseProjectId)();
        const streamName = (0, uuid_1.v4)();
        const label = projectId + "-" + streamName;
        const publisherToken = await (0, token_1.createStreamingPublisherToken)(streamName, label);
        if (publisherToken == undefined)
            throw new Error("Error creating stream publisher token");
        const subscriberToken = await (0, token_1.createStreamingSubscriberToken)(streamName, label);
        if (subscriberToken == undefined)
            throw new Error("Error creating stream subscriber token");
        const cryptoSecretKey = (0, functions_config_1.getEncryptionSecretKey)();
        if (cryptoSecretKey == undefined)
            throw new Error("Failed to get encryption secret key");
        const encrypted = (0, encryption_1.encryptWithKey)(Buffer.from(publisherToken.token, "ascii"), cryptoSecretKey);
        if (encrypted == undefined)
            throw new Error("Failed encryption");
        const encryptedPublisherToken = encrypted.toString("base64");
        const spaceStream = {
            streamName,
            subscriberToken: subscriberToken.token,
            subscriberTokenId: subscriberToken.id,
            subscriberTokenAccountId: subscriberToken.accountId,
        };
        const spaceStreamPrivate = {
            encryptedPublisherToken,
            publisherTokenId: publisherToken.id,
            publisherTokenAccountId: publisherToken.accountId,
        };
        const spaceStreamRef = (0, firestore_1.getSpaceStreamRef)(organizationId, spaceId, streamName);
        await spaceStreamRef.create(spaceStream);
        console.debug(`Added space stream info to ${spaceStreamRef.path}`);
        const spaceStreamPrivateRef = (0, firestore_1.getSpaceStreamPrivateRef)(organizationId, spaceId, streamName);
        await spaceStreamPrivateRef.create(spaceStreamPrivate);
        console.debug(`Added space stream secrets to ${spaceStreamRef.path}`);
    }
    catch (e) {
        console.error("Error adding stream info to space");
        throw e;
    }
}
exports.addSpaceStreamingInfo = addSpaceStreamingInfo;
async function checkInitialSpaceStreamExists(organizationId, spaceId) {
    var _a;
    const spaceStreams = await (0, firestore_1.getSpaceStreams)(organizationId, spaceId);
    if (spaceStreams == undefined || spaceStreams.length < 1)
        return false;
    if (spaceStreams.length > 1)
        console.error(`Space has multiple spaceStreams ${organizationId}/${spaceId}`);
    const spaceStreamId = (_a = spaceStreams[0][0]) === null || _a === void 0 ? void 0 : _a.id;
    if (spaceStreamId == undefined)
        return false;
    const [, spaceStreamPrivate] = await (0, firestore_1.getSpaceStreamPrivate)(organizationId, spaceId, spaceStreamId);
    if (spaceStreamPrivate == undefined)
        console.error(`Space has spaceStream but not spaceStreamPrivate ${organizationId}/${spaceId}`);
    return true;
}
exports.checkInitialSpaceStreamExists = checkInitialSpaceStreamExists;
//# sourceMappingURL=spaceStreams.js.map