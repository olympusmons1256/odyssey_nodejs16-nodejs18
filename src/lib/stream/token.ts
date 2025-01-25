import {StreamChat} from "stream-chat";
import * as functions from "firebase-functions";

interface StreamCredentials {
  consumerKey: string,
  consumerSecret: string
}

export function getStreamCredentials() : StreamCredentials {
  return {
    consumerKey: functions.config().stream.consumerkey,
    consumerSecret: functions.config().stream.consumersecret,
  };
}

export async function signParticipantJwtToken(userId: string) {
  const {consumerKey, consumerSecret} = getStreamCredentials();
  const serverClient = StreamChat.getInstance( consumerKey, consumerSecret);
  return serverClient.createToken(userId);
}
