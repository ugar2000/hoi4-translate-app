"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinioClient = void 0;
exports.createMinio = createMinio;
exports.ensureBucket = ensureBucket;
exports.putTextObject = putTextObject;
exports.getTextObject = getTextObject;
const minio_1 = require("minio");
Object.defineProperty(exports, "MinioClient", { enumerable: true, get: function () { return minio_1.Client; } });
function resolveEndpoint(rawEndpoint) {
    const endpoint = rawEndpoint.includes('://') ? rawEndpoint : `http://${rawEndpoint}`;
    const url = new URL(endpoint);
    const useSSL = url.protocol === 'https:';
    const port = url.port ? Number.parseInt(url.port, 10) : useSSL ? 443 : 80;
    return { endPoint: url.hostname, port, useSSL };
}
function createMinio(clientName = 'default') {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'http://minio:9000';
    const accessKey = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
    const { endPoint, port, useSSL } = resolveEndpoint(endpoint);
    return new minio_1.Client({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey,
        region: process.env.MINIO_REGION,
    });
}
async function ensureBucket(client, bucket) {
    const name = bucket || process.env.MINIO_BUCKET || 'translator';
    const exists = await client.bucketExists(name).catch((err) => {
        if (err.code === 'NoSuchBucket') {
            return false;
        }
        throw err;
    });
    if (!exists) {
        await client.makeBucket(name, '');
    }
}
async function putTextObject(client, bucket, key, contents) {
    await client.putObject(bucket, key, contents, undefined, {
        'Content-Type': 'text/plain; charset=utf-8',
    });
}
async function getTextObject(client, bucket, key) {
    const stream = await client.getObject(bucket, key);
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}
