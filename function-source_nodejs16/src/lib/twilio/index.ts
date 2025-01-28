import * as twilio from "twilio";
import * as functions from "firebase-functions";
import {IceServer} from "./shared";

interface TwilioCredentials {
  accountSid: string,
  authToken: string
}

function getTwilioCredentials() : TwilioCredentials {
  return {
    accountSid: functions.config().twilio.accountsid,
    authToken: functions.config().twilio.authtoken,
  };
}

export async function getTwilioIceServers() {
  const twilioCredentials = getTwilioCredentials();
  const client = twilio(twilioCredentials.accountSid, twilioCredentials.authToken);
  const tokens = await client.tokens.create();
  return tokens.iceServers.map((v) => v as IceServer);
}
