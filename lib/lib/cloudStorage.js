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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileUrlToCloudStorage = void 0;
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const admin = __importStar(require("firebase-admin"));
const firebase_1 = require("./firebase");
async function uploadFileUrlToCloudStorage(file, storagePath, fileName) {
    const tempFilePath = path.join(os.tmpdir(), fileName);
    try {
        // fetch file from url and save to temp storage
        const fetchResult = await (0, node_fetch_1.default)(file)
            .catch((e) => {
            throw e;
        });
        if (!fetchResult.ok) {
            throw new Error(`Failed to fetch file: ${fetchResult.status} ${fetchResult.statusText}`);
        }
        const buffer = await fetchResult.buffer();
        await fs.promises.writeFile(tempFilePath, buffer)
            .catch((e) => {
            throw e;
        });
        // create storage path and upload to firestore
        const firebaseStorage = (0, firebase_1.getFirebaseProjectStorage)();
        const firebaseFilePath = `${storagePath}/${fileName}`;
        const bucket = admin.storage().bucket(firebaseStorage);
        await bucket.upload(tempFilePath, { destination: firebaseFilePath })
            .catch((e) => {
            throw e;
        });
        const newFile = bucket.file(firebaseFilePath);
        await fs.promises.rm(tempFilePath);
        await newFile.makePublic();
        return newFile.publicUrl();
    }
    catch (err) {
        console.log("ERROR: There was an error generating file URL, deleting");
        await fs.promises.rm(tempFilePath);
        throw err;
    }
}
exports.uploadFileUrlToCloudStorage = uploadFileUrlToCloudStorage;
//# sourceMappingURL=cloudStorage.js.map