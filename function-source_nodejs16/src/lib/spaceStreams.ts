import * as shortUuid from "short-uuid";
import {getSpaceStreamPrivate, getSpaceStreamPrivateRef, getSpaceStreamRef, getSpaceStreams} from "./documents/firestore";
import {createStreamingPublisherToken, createStreamingSubscriberToken} from "./dolby/token";
import {encryptWithKey} from "./encryption";
import {getFirebaseProjectId} from "./firebase";
import {getEncryptionSecretKey} from "./functions-config";
import * as cmsDocTypes from "./cmsDocTypes";

export async function addSpaceStreamingInfo(organizationId: string, spaceId: string) {
  try {
    const projectId = getFirebaseProjectId();
    const streamName = shortUuid.generate().toString();
    const label = projectId + "-" + streamName;
    const publisherToken = await createStreamingPublisherToken(streamName, label);
    if (publisherToken == undefined) throw new Error("Error creating stream publisher token");
    const subscriberToken = await createStreamingSubscriberToken(streamName, label);
    if (subscriberToken == undefined) throw new Error("Error creating stream subscriber token");

    const cryptoSecretKey = getEncryptionSecretKey();
    if (cryptoSecretKey == undefined) throw new Error("Failed to get encryption secret key");

    const encrypted = encryptWithKey(Buffer.from(publisherToken.token, "ascii"), cryptoSecretKey);
    if (encrypted == undefined) throw new Error("Failed encryption");

    const encryptedPublisherToken = encrypted.toString("base64");

    const spaceStream : cmsDocTypes.SpaceStream = {
      streamName,
      subscriberToken: subscriberToken.token,
      subscriberTokenId: subscriberToken.id,
      subscriberTokenAccountId: subscriberToken.accountId,
    };

    const spaceStreamPrivate : cmsDocTypes.SpaceStreamPrivate = {
      encryptedPublisherToken,
      publisherTokenId: publisherToken.id,
      publisherTokenAccountId: publisherToken.accountId,
    };

    const spaceStreamRef = getSpaceStreamRef(organizationId, spaceId, streamName);
    await spaceStreamRef.create(spaceStream);
    console.debug(`Added space stream info to ${spaceStreamRef.path}`);
    const spaceStreamPrivateRef = getSpaceStreamPrivateRef(organizationId, spaceId, streamName);
    await spaceStreamPrivateRef.create(spaceStreamPrivate);
    console.debug(`Added space stream secrets to ${spaceStreamRef.path}`);
  } catch (e: any) {
    console.error("Error adding stream info to space");
    throw e;
  }
}

export async function checkInitialSpaceStreamExists(organizationId: string, spaceId: string) {
  const spaceStreams = await getSpaceStreams(organizationId, spaceId);
  if (spaceStreams == undefined || spaceStreams.length < 1) return false;
  if (spaceStreams.length > 1) console.error(`Space has multiple spaceStreams ${organizationId}/${spaceId}`);
  const spaceStreamId = spaceStreams[0][0]?.id;
  if (spaceStreamId == undefined) return false;
  const [, spaceStreamPrivate] = await getSpaceStreamPrivate(organizationId, spaceId, spaceStreamId);
  if (spaceStreamPrivate == undefined) console.error(`Space has spaceStream but not spaceStreamPrivate ${organizationId}/${spaceId}`);
  return true;
}
