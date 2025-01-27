import * as crypto from "crypto";

const algorithm = "aes-256-cbc";

export function encryptWithKey(data: Buffer, key: Buffer) {
  try {
    if (key.length != 32) throw new Error(`Invalid key length ${key.length}. Must be 32 bytes`);
    const initVector = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, initVector);
    const encryptedData = cipher.update(data);
    const final = cipher.final();
    return Buffer.concat([initVector, encryptedData, final]);
  } catch (e: any) {
    console.error("Failed to encrypt using provided key");
    console.error(e);
    return undefined;
  }
}

export function decryptWithKey(data: Buffer, key: Buffer) {
  try {
    if (key.length != 32) throw new Error(`Invalid key length ${key.length}. Must be 32 bytes`);
    const initVector = data.subarray(0, 16);
    const d = data.subarray(16);
    const cipher = crypto.createDecipheriv(algorithm, key, initVector);
    const decryptedData = cipher.update(d);
    const final = cipher.final();
    return Buffer.concat([decryptedData, final]);
  } catch (e: any) {
    console.error("Failed to decrypt using provided key");
    console.error(e);
    return undefined;
  }
}
