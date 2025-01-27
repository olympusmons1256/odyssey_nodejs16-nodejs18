import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import fetch, { RequestInfo } from "node-fetch";
import * as admin from "firebase-admin";
import {getFirebaseProjectStorage} from "./firebase";

export async function uploadFileUrlToCloudStorage(file: RequestInfo | URL, storagePath: string, fileName: string) {
  const tempFilePath = path.join(os.tmpdir(), fileName);
  try {
    // fetch file from url and save to temp storage
    const fetchResult = await fetch(file)
      .catch((e: any) => {
        throw e;
      });
    if (!fetchResult.ok) {
      throw new Error(`Failed to fetch file: ${fetchResult.status} ${fetchResult.statusText}`);
    }
    const buffer = await fetchResult.buffer();
    await fs.promises.writeFile(tempFilePath, buffer)
      .catch((e: any) => {
        throw e;
      });
    // create storage path and upload to firestore
    const firebaseStorage = getFirebaseProjectStorage();
    const firebaseFilePath = `${storagePath}/${fileName}`;
    const bucket = admin.storage().bucket(firebaseStorage);
    await bucket.upload(tempFilePath, {destination: firebaseFilePath})
      .catch((e: any) => {
        throw e;
      });
    const newFile = bucket.file(firebaseFilePath);
    await fs.promises.rm(tempFilePath);
    await newFile.makePublic();
    return newFile.publicUrl();
  } catch (err: any) {
    console.log("ERROR: There was an error generating file URL, deleting");
    await fs.promises.rm(tempFilePath);
    throw err;
  }
}
