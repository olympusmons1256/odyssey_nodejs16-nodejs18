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
exports.decryptWithKey = exports.encryptWithKey = void 0;
const crypto = __importStar(require("crypto"));
const algorithm = "aes-256-cbc";
function encryptWithKey(data, key) {
    try {
        if (key.length != 32)
            throw new Error(`Invalid key length ${key.length}. Must be 32 bytes`);
        const initVector = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, initVector);
        const encryptedData = cipher.update(data);
        const final = cipher.final();
        return Buffer.concat([initVector, encryptedData, final]);
    }
    catch (e) {
        console.error("Failed to encrypt using provided key");
        console.error(e);
        return undefined;
    }
}
exports.encryptWithKey = encryptWithKey;
function decryptWithKey(data, key) {
    try {
        if (key.length != 32)
            throw new Error(`Invalid key length ${key.length}. Must be 32 bytes`);
        const initVector = data.subarray(0, 16);
        const d = data.subarray(16);
        const cipher = crypto.createDecipheriv(algorithm, key, initVector);
        const decryptedData = cipher.update(d);
        const final = cipher.final();
        return Buffer.concat([decryptedData, final]);
    }
    catch (e) {
        console.error("Failed to decrypt using provided key");
        console.error(e);
        return undefined;
    }
}
exports.decryptWithKey = decryptWithKey;
//# sourceMappingURL=encryption.js.map