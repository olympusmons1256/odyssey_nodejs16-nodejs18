import * as functions from "firebase-functions";

export function getEncryptionSecretKey() : Buffer | undefined {
  const secretKey: string | undefined = functions.config().encryption.secretkey;
  if (secretKey == undefined) {
    console.error("Functions config '.encryption.secretkey' is undefined");
    return undefined;
  }
  try {
    return Buffer.from(secretKey, "utf8");
  } catch (e: any) {
    console.error("Failed to read encryption key to buffer");
    return undefined;
  }
}
