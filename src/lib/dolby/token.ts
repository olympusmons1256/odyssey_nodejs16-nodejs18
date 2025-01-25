import * as functions from "firebase-functions";
import * as axios from "axios";
import * as request from "request-promise";

interface DolbyCredentials {
  consumerKey: string,
  consumerSecret: string
}

function getDolbyCredentials() : DolbyCredentials {
  return {
    consumerKey: functions.config().dolby.consumerkey,
    consumerSecret: functions.config().dolby.consumersecret,
  };
}

function getDolbyStreamingApiSecret() : string | undefined {
  const streamingApiSecret = functions.config().dolby.streamingapisecret;
  if (streamingApiSecret == undefined) console.error("Functions config '.dolby.streamingapisecret' is undefined");
  return streamingApiSecret;
}

function getDolbyStreamingApiAccountId() : string | undefined {
  const accountId = functions.config().dolby.streamingapiaccountid;
  if (accountId == undefined) console.error("Functions config '.dolby.accountid' is undefined");
  return accountId;
}

export interface DolbyTokenResponse {
  id: string
  token: string
  accountId: string
}

export async function createStreamingSubscriberToken(streamName: string, label: string) {
  const streamingApiSecret = getDolbyStreamingApiSecret();
  const accountId = getDolbyStreamingApiAccountId();
  if (streamingApiSecret == undefined || accountId == undefined) return undefined;

  const opts : axios.AxiosRequestConfig = {
    headers: {
      Authorization: "Bearer " + streamingApiSecret,
    },
  };
  const body = {
    label,
    streams: [{streamName}],
  };

  try {
    const result = await axios.default.post(
      "https://api.millicast.com/api/subscribe_token",
      body,
      opts
    );
    if (
      result.data == undefined ||
      result.data.data == undefined ||
      result.data.data.token == undefined ||
      result.data.data.id == undefined
    ) return undefined;
    return {...result.data.data, accountId} as DolbyTokenResponse | undefined;
  } catch (e: any) {
    console.error("Failed to create subscriber token using millicast REST API");
    console.error(e);
    return undefined;
  }
}


export async function createStreamingPublisherToken(streamName: string, label: string) {
  const streamingApiSecret = getDolbyStreamingApiSecret();
  const accountId = getDolbyStreamingApiAccountId();
  if (streamingApiSecret == undefined || accountId == undefined) return undefined;

  const opts : axios.AxiosRequestConfig = {
    headers: {
      Authorization: "Bearer " + streamingApiSecret,
    },
  };
  const body = {
    label,
    streams: [{streamName}],
    subscribeRequiresAuth: true,
    record: false,
    multisource: false,
  };

  try {
    const result = await axios.default.post(
      "https://api.millicast.com/api/publish_token",
      body,
      opts
    );
    if (
      result.data == undefined ||
      result.data.data == undefined ||
      result.data.data.token == undefined ||
      result.data.data.id == undefined
    ) return undefined;
    return {...result.data.data, accountId} as DolbyTokenResponse | undefined;
  } catch (e: any) {
    console.error("Failed to create publisher token using millicast REST API");
    console.error(e);
    return undefined;
  }
}

export async function signParticipantJwtToken() {
  const {consumerKey, consumerSecret} = getDolbyCredentials();

  const authHeader = "Basic " + Buffer.from(encodeURI(consumerKey) + ":" + encodeURI(consumerSecret)).toString("base64");

  const opts : request.OptionsWithUri = {
    uri: "https://session.voxeet.com/v1/oauth2/token",
    headers: {
      Authorization: authHeader,
    },
    json: true,
    body: {
      grant_type: "client_credentials",
    },
  };

  return await request.post(opts)
    .then(
      (bodyJson) => {
        if (bodyJson.access_token != undefined) {
          return bodyJson.access_token as string;
        } else {
          console.error("Response is missing 'access_token' field");
          return undefined;
        }
      })
    .catch((err) => {
      console.log("error");
      console.error(err);
      return undefined;
    });
}
