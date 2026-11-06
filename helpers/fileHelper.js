const {BlobServiceClient, StorageSharedKeyCredential} = require("@azure/storage-blob");
const {randomString} = require("./stringHelper");
const {AZURE_STORAGE_NAME, AZURE_STORAGE_KEY, AZURE_STORAGE_URL} = process.env;

const sharedKeyCredential = new StorageSharedKeyCredential(AZURE_STORAGE_NAME, AZURE_STORAGE_KEY);

exports.saveBuffer = async function([type, buffer]){
    const name = randomString() + '.' + type.split('/')[1];
    const path = AZURE_STORAGE_URL + type.split('/')[0];

    const containerClient = await new BlobServiceClient(path, sharedKeyCredential).getContainerClient('');
    const blockBlobClient = containerClient.getBlockBlobClient(name);
    await blockBlobClient.uploadData(buffer, {blobHTTPHeaders: {blobContentType: type}});

    return path + '/' + name;
};

exports.uploadBlob = async (blob) => {
    // const blobContentType = blob.fileType;
    // const blobServiceClient = new BlobServiceClient(AZURE_STORAGE_URL + blob.type, sharedKeyCredential);
    // const containerClient = blobServiceClient.getContainerClient('');
    // const blockBlobClient = containerClient.getBlockBlobClient(blob.fileName.toString());
    //
    // return await blockBlobClient.uploadData(blob.data, {
    //     blobHTTPHeaders: {
    //         blobContentType: blobContentType
    //     }
    // })
};
//
exports.deleteFile = async (root, name) => {
    const blobServiceClient = new BlobServiceClient(AZURE_STORAGE_URL + root, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient('');

    return await containerClient.getBlockBlobClient(name).deleteIfExists();
};