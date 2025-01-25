"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteArtifact = exports.createSignedDownloadUrl = exports.checkUploadedFileExists = exports.createSignedUploadUrl = void 0;
const storage_1 = require("@google-cloud/storage");
function signedUrlOptions(action) {
    return {
        version: "v4",
        action: action,
        expires: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
    };
}
async function createSignedUploadUrl(bucketName, destFile) {
    const storage = new storage_1.Storage();
    try {
        const [url] = await storage
            .bucket(bucketName)
            .file(destFile)
            .getSignedUrl(signedUrlOptions("write"));
        return url;
    }
    catch (e) {
        console.error(e);
        return undefined;
    }
}
exports.createSignedUploadUrl = createSignedUploadUrl;
async function checkUploadedFileExists(bucketName, destFile) {
    const storage = new storage_1.Storage();
    try {
        const [file] = (await storage
            .bucket(bucketName)
            .file(destFile)
            .get());
        return file.exists;
    }
    catch (e) {
        console.error(e);
        return undefined;
    }
}
exports.checkUploadedFileExists = checkUploadedFileExists;
async function createSignedDownloadUrl(bucketName, destFile) {
    const storage = new storage_1.Storage();
    try {
        const [url] = await storage
            .bucket(bucketName)
            .file(destFile)
            .getSignedUrl(signedUrlOptions("read"));
        return url;
    }
    catch (e) {
        console.error(e);
        return undefined;
    }
}
exports.createSignedDownloadUrl = createSignedDownloadUrl;
async function deleteArtifact(bucketName, fileName) {
    const storage = new storage_1.Storage();
    try {
        const [response] = await storage
            .bucket(bucketName)
            .file(fileName)
            .delete();
        console.info(`${fileName} has been deleted from ${bucketName}`);
        return response;
    }
    catch (e) {
        // TODO: Use proper typing for this
        if (e.code === 404)
            return { statusCode: 404 };
        console.error(`Failed to delete ${fileName} from ${bucketName}`);
        console.error(e);
        return undefined;
    }
}
exports.deleteArtifact = deleteArtifact;
//# sourceMappingURL=googleStorage.js.map