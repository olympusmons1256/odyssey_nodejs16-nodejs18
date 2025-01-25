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
exports.signParticipantJwtToken = exports.createStreamingPublisherToken = exports.createStreamingSubscriberToken = void 0;
const functions = __importStar(require("firebase-functions"));
const axios = __importStar(require("axios"));
const request = __importStar(require("request-promise"));
function getDolbyCredentials() {
    return {
        consumerKey: functions.config().dolby.consumerkey,
        consumerSecret: functions.config().dolby.consumersecret,
    };
}
function getDolbyStreamingApiSecret() {
    const streamingApiSecret = functions.config().dolby.streamingapisecret;
    if (streamingApiSecret == undefined)
        console.error("Functions config '.dolby.streamingapisecret' is undefined");
    return streamingApiSecret;
}
function getDolbyStreamingApiAccountId() {
    const accountId = functions.config().dolby.streamingapiaccountid;
    if (accountId == undefined)
        console.error("Functions config '.dolby.accountid' is undefined");
    return accountId;
}
async function createStreamingSubscriberToken(streamName, label) {
    const streamingApiSecret = getDolbyStreamingApiSecret();
    const accountId = getDolbyStreamingApiAccountId();
    if (streamingApiSecret == undefined || accountId == undefined)
        return undefined;
    const opts = {
        headers: {
            Authorization: "Bearer " + streamingApiSecret,
        },
    };
    const body = {
        label,
        streams: [{ streamName }],
    };
    try {
        const result = await axios.default.post("https://api.millicast.com/api/subscribe_token", body, opts);
        if (result.data == undefined ||
            result.data.data == undefined ||
            result.data.data.token == undefined ||
            result.data.data.id == undefined)
            return undefined;
        return Object.assign(Object.assign({}, result.data.data), { accountId });
    }
    catch (e) {
        console.error("Failed to create subscriber token using millicast REST API");
        console.error(e);
        return undefined;
    }
}
exports.createStreamingSubscriberToken = createStreamingSubscriberToken;
async function createStreamingPublisherToken(streamName, label) {
    const streamingApiSecret = getDolbyStreamingApiSecret();
    const accountId = getDolbyStreamingApiAccountId();
    if (streamingApiSecret == undefined || accountId == undefined)
        return undefined;
    const opts = {
        headers: {
            Authorization: "Bearer " + streamingApiSecret,
        },
    };
    const body = {
        label,
        streams: [{ streamName }],
        subscribeRequiresAuth: true,
        record: false,
        multisource: false,
    };
    try {
        const result = await axios.default.post("https://api.millicast.com/api/publish_token", body, opts);
        if (result.data == undefined ||
            result.data.data == undefined ||
            result.data.data.token == undefined ||
            result.data.data.id == undefined)
            return undefined;
        return Object.assign(Object.assign({}, result.data.data), { accountId });
    }
    catch (e) {
        console.error("Failed to create publisher token using millicast REST API");
        console.error(e);
        return undefined;
    }
}
exports.createStreamingPublisherToken = createStreamingPublisherToken;
async function signParticipantJwtToken() {
    const { consumerKey, consumerSecret } = getDolbyCredentials();
    const authHeader = "Basic " + Buffer.from(encodeURI(consumerKey) + ":" + encodeURI(consumerSecret)).toString("base64");
    const opts = {
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
        .then((bodyJson) => {
        if (bodyJson.access_token != undefined) {
            return bodyJson.access_token;
        }
        else {
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
exports.signParticipantJwtToken = signParticipantJwtToken;
//# sourceMappingURL=token.js.map