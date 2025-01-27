/// <reference types="express-serve-static-core" />
/// <reference types="passport" />
import * as express from "express";
import * as functions from "firebase-functions";
export declare const createNestServer: (expressInstance: express.Express) => Promise<void>;
export declare const api: functions.HttpsFunction;
