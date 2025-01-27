import {Storage, GetSignedUrlConfig} from "@google-cloud/storage";

function signedUrlOptions(action: "read" | "write"): GetSignedUrlConfig {
  return {
    version: "v4",
    action: action,
    expires: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
  };
}

export async function createSignedUploadUrl(bucketName: string, destFile: string) {
  const storage = new Storage();
  try {
    const [url] = await storage
      .bucket(bucketName)
      .file(destFile)
      .getSignedUrl(signedUrlOptions("write"));
    return url;
  } catch (e: any) {
    console.error(e);
    return undefined;
  }
}

export async function checkUploadedFileExists(bucketName: string, destFile: string) {
  const storage = new Storage();
  try {
    const [file] = (await storage
      .bucket(bucketName)
      .file(destFile)
      .get());
    return file.exists;
  } catch (e: any) {
    console.error(e);
    return undefined;
  }
}

export async function createSignedDownloadUrl(bucketName: string, destFile: string) {
  const storage = new Storage();
  try {
    const [url] = await storage
      .bucket(bucketName)
      .file(destFile)
      .getSignedUrl(signedUrlOptions("read"));
    return url;
  } catch (e: any) {
    console.error(e);
    return undefined;
  }
}

export async function deleteArtifact(bucketName: string, fileName: string) {
  const storage = new Storage();
  try {
    const [response] = await storage
      .bucket(bucketName)
      .file(fileName)
      .delete();
    console.info(`${fileName} has been deleted from ${bucketName}`);
    return response;
  } catch (e: any) {
    // TODO: Use proper typing for this
    if (e.code === 404) return {statusCode: 404};
    console.error(`Failed to delete ${fileName} from ${bucketName}`);
    console.error(e);
    return undefined;
  }
}
