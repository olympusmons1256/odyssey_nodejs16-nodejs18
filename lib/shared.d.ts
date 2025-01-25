import * as functions from "firebase-functions";
export declare const firebaseServiceAccount: string;
export declare const customRunWith: functions.RuntimeOptions;
export declare const customRunWithWarm: functions.RuntimeOptions;
export declare function customRunWithDefinedMemory(memory: functions.RuntimeOptions["memory"]): functions.RuntimeOptions;
