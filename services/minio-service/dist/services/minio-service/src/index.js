"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = require("node:fs");
const bull_1 = __importDefault(require("bull"));
const api_1 = require("@opentelemetry/api");
const minio_1 = require("minio");
const telemetry_1 = require("../../../packages/telemetry");
const redisHost = process.env.REDIS_HOST ?? 'redis';
const redisPort = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);
const queueName = process.env.MINIO_QUEUE_NAME ?? 'minio:jobs';
const concurrency = Number.parseInt(process.env.MINIO_WORKERS ?? '4', 10);
const sharedRoot = node_path_1.default.resolve(process.env.MINIO_SHARED_DIR ?? '/exports');
const defaultBucket = process.env.MINIO_BUCKET ?? 'translator';
function createMinioClient() {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'http://minio:9000';
    const accessKey = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
    const url = new URL(endpoint);
    return new minio_1.Client({
        endPoint: url.hostname,
        port: url.port ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80,
        useSSL: url.protocol === 'https:',
        accessKey,
        secretKey,
        region: process.env.MINIO_REGION,
    });
}
const minio = createMinioClient();
async function ensureBucket(bucket) {
    const exists = await minio.bucketExists(bucket).catch((err) => {
        if (err.code === 'NoSuchBucket') {
            return false;
        }
        throw err;
    });
    if (!exists) {
        await minio.makeBucket(bucket, '');
    }
}
async function saveObject(ref, data, contentType) {
    await ensureBucket(ref.bucket);
    await minio.putObject(ref.bucket, ref.key, data, undefined, {
        'Content-Type': contentType ?? 'application/octet-stream',
    });
}
async function readObject(ref) {
    const stream = await minio.getObject(ref.bucket, ref.key);
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', async () => {
            try {
                const stat = await minio.statObject(ref.bucket, ref.key);
                resolve({ data: Buffer.concat(chunks), contentType: stat.metaData?.['content-type'] });
            }
            catch (err) {
                reject(err);
            }
        });
    });
}
async function deleteObject(ref) {
    await minio.removeObject(ref.bucket, ref.key);
}
function resolveSharedPath(target) {
    const candidate = node_path_1.default.resolve(node_path_1.default.isAbsolute(target) ? target : node_path_1.default.join(sharedRoot, target));
    const relative = node_path_1.default.relative(sharedRoot, candidate);
    if (relative.startsWith('..') || node_path_1.default.isAbsolute(relative)) {
        throw new Error(`Path "${target}" escapes shared directory ${sharedRoot}`);
    }
    return candidate;
}
async function handleCreate(job) {
    const bucket = job.data.bucket ?? defaultBucket;
    const key = job.data.key;
    const source = resolveSharedPath(job.data.sourcePath);
    const buffer = await node_fs_1.promises.readFile(source);
    await saveObject({ bucket, key }, buffer, job.data.contentType);
    return { bucket, key, path: source, size: buffer.length };
}
async function handleRead(job) {
    const bucket = job.data.bucket ?? defaultBucket;
    const key = job.data.key;
    const destination = resolveSharedPath(job.data.destinationPath);
    await node_fs_1.promises.mkdir(node_path_1.default.dirname(destination), { recursive: true });
    const { data, contentType } = await readObject({ bucket, key });
    await node_fs_1.promises.writeFile(destination, data);
    return { bucket, key, path: destination, contentType, size: data.length };
}
async function handleDelete(job) {
    const bucket = job.data.bucket ?? defaultBucket;
    const key = job.data.key;
    await deleteObject({ bucket, key });
    return { bucket, key };
}
async function processJob(job) {
    switch (job.data.type) {
        case 'create':
        case 'update':
            return handleCreate(job);
        case 'read':
            return handleRead(job);
        case 'delete':
            return handleDelete(job);
        default:
            throw new Error(`Unsupported minio job type ${job.data.type}`);
    }
}
async function bootstrap() {
    (0, telemetry_1.initTelemetry)('minio-service');
    const tracer = (0, telemetry_1.getTracer)('minio-service');
    await node_fs_1.promises.mkdir(sharedRoot, { recursive: true });
    await ensureBucket(defaultBucket);
    const queue = new bull_1.default(queueName, {
        redis: {
            host: redisHost,
            port: redisPort,
        },
    });
    console.log(`[minio-service] redis queue init "${queueName}" -> ${redisHost}:${redisPort}`);
    const runJob = async (job) => {
        const span = tracer.startSpan(`minio.${job.data.type}`, {
            attributes: {
                'minio.key': job.data.key,
                'minio.bucket': job.data.bucket ?? defaultBucket,
                'minio.type': job.data.type,
            },
        });
        try {
            const result = await processJob(job);
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return result;
        }
        catch (err) {
            span.recordException(err);
            span.setStatus({ code: api_1.SpanStatusCode.ERROR });
            throw err;
        }
        finally {
            span.end();
        }
    };
    queue.process(concurrency, runJob);
    ['create', 'update', 'read', 'delete'].forEach((name) => {
        queue.process(name, concurrency, runJob);
    });
    queue.on('completed', (job, result) => {
        console.log(`[minio-service] job ${job.id} (${job.data.type}) completed`, result);
    });
    queue.on('failed', (job, err) => {
        const jobId = job?.id ?? 'unknown';
        console.error(`[minio-service] job ${jobId} failed`, err);
    });
    const shutdown = async () => {
        console.log('[minio-service] shutting down');
        await queue.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    console.log(`[minio-service] waiting for jobs on queue "${queueName}" with concurrency ${concurrency} (shared dir: ${sharedRoot})`);
}
bootstrap().catch((err) => {
    console.error('[minio-service] fatal error', err);
    process.exit(1);
});
