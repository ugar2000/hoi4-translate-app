"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_readline_1 = require("node:readline");
const bull_1 = __importDefault(require("bull"));
const api_1 = require("@opentelemetry/api");
const telemetry_1 = require("../../../packages/telemetry");
const miniox_1 = require("../../../packages/miniox");
const tracer = (0, telemetry_1.getTracer)('ingest-splitter');
function log(message, meta = {}) {
    console.log(JSON.stringify({
        service: 'ingest-splitter',
        message,
        ...meta,
    }));
}
const redisHost = process.env.REDIS_HOST ?? 'redis';
const redisPort = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);
const redisConfig = {
    host: redisHost,
    port: redisPort,
};
const defaultJobOptions = {
    attempts: Number.parseInt(process.env.JOB_ATTEMPTS ?? '5', 10),
    backoff: {
        type: 'exponential',
        delay: Number.parseInt(process.env.JOB_BACKOFF_DELAY ?? '2000', 10),
    },
    removeOnComplete: { age: 3600, count: 10000 },
    removeOnFail: { age: 86400 },
};
const encodeQueue = new bull_1.default('variables.encode', {
    redis: redisConfig,
    defaultJobOptions,
});
log('redis queue init', {
    queue: 'variables.encode',
    host: redisHost,
    port: redisPort,
});
const ingestQueue = new bull_1.default('ingest.split', {
    redis: redisConfig,
    defaultJobOptions,
});
log('redis queue init', {
    queue: 'ingest.split',
    host: redisHost,
    port: redisPort,
});
ingestQueue.on('waiting', (jobId) => log('ingest queue waiting', { jobId }));
ingestQueue.on('active', (job) => log('ingest queue active', { jobId: job.id, data: job.data }));
ingestQueue.on('completed', (job, result) => log('ingest queue completed', { jobId: job.id, result }));
ingestQueue.on('failed', (job, err) => log('ingest queue failed', {
    jobId: job?.id,
    error: err instanceof Error ? err.message : err,
}));
const inputPrefix = process.env.INPUT_PREFIX ?? 'inline';
const bucketName = process.env.MINIO_BUCKET ?? 'translator';
const chunkMaxLines = Number.parseInt(process.env.SPLIT_MAX_LINES ?? '2000', 10);
const chunkMaxBytes = Number.parseInt(process.env.SPLIT_MAX_BYTES ?? `${4 * 1024 * 1024}`, 10);
const chunkPadWidth = Number.parseInt(process.env.SPLIT_CHUNK_PAD_WIDTH ?? '5', 10);
const concurrency = Number.parseInt(process.env.SPLIT_CONCURRENCY ?? '2', 10);
let minioClient;
const pipelineApiBase = process.env.PIPELINE_API_BASE_URL ?? 'http://api-service:3005/api';
async function callPipeline(path, body) {
    const res = await fetch(`${pipelineApiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const message = await res.text();
        throw new Error(`Pipeline API ${path} failed (${res.status}): ${message || 'unknown error'}`);
    }
    if (res.status === 204) {
        return undefined;
    }
    return (await res.json());
}
async function updateFileRecord(fileId, totalLines, totalChunks, originLang, targetLang) {
    log('upserting file record', {
        fileId,
        totalLines,
        totalChunks,
        originLang,
        targetLang,
    });
    await callPipeline('/pipeline/files/upsert', {
        fileId,
        totalLines,
        totalChunks,
        originLang,
        targetLang,
    });
}
async function markFileError(fileId, error) {
    log('marking file error', { fileId, error });
    await callPipeline('/pipeline/files/error', {
        fileId,
        error: error.slice(0, 1024),
    });
}
function getRawKey(fileId) {
    return `${inputPrefix}/${fileId}.raw`;
}
function getChunkKey(fileId, chunkSeq) {
    const padded = chunkSeq.toString().padStart(chunkPadWidth, '0');
    return `${inputPrefix}/split/${fileId}/chunk-${padded}.ndjson`;
}
async function enqueueEncodeJob(fileId, chunkSeq, sourceLanguage, targetLanguage) {
    await encodeQueue.add({ fileId, chunkSeq, sourceLanguage, targetLanguage }, {
        ...defaultJobOptions,
        jobId: `${fileId}:${chunkSeq}`,
    });
}
async function writeChunk(client, chunkKey, lines) {
    const body = lines.join('\n') + '\n';
    await client.putObject(bucketName, chunkKey, body, undefined, {
        'Content-Type': 'application/x-ndjson',
    });
}
async function updateJobProgress(job, progress) {
    const fn = job
        .updateProgress;
    if (typeof fn !== 'function') {
        log('updateProgress unavailable on job', { jobId: job.id });
        return;
    }
    try {
        await fn.call(job, progress);
    }
    catch (err) {
        log('updateProgress failed', {
            jobId: job.id,
            error: err instanceof Error ? err.message : err,
        });
    }
}
async function splitFile(job, fileId, targetLanguage) {
    const span = tracer.startSpan('ingest.split', {
        attributes: {
            'file.id': fileId,
        },
    });
    try {
        const objectStream = await minioClient.getObject(bucketName, getRawKey(fileId));
        const rl = (0, node_readline_1.createInterface)({
            input: objectStream,
            crlfDelay: Infinity,
        });
        let chunkSeq = 1;
        let totalLines = 0;
        let totalChunks = 0;
        let sourceLanguage = null;
        let currentBytes = 0;
        let chunkEntries = [];
        const flushChunk = async () => {
            if (!chunkEntries.length) {
                return;
            }
            if (!sourceLanguage) {
                throw new Error('Unable to determine source language from header');
            }
            const chunkKey = getChunkKey(fileId, chunkSeq);
            log('writing split chunk', {
                fileId,
                chunkSeq,
                chunkKey,
                chunkLines: chunkEntries.length,
            });
            await writeChunk(minioClient, chunkKey, chunkEntries);
            await enqueueEncodeJob(fileId, chunkSeq, sourceLanguage, targetLanguage);
            totalChunks += 1;
            chunkSeq += 1;
            chunkEntries = [];
            currentBytes = 0;
            await updateJobProgress(job, {
                lines: totalLines,
                chunks: totalChunks,
            });
        };
        for await (const rawLine of rl) {
            let lineText = rawLine ?? '';
            totalLines += 1;
            if (totalLines === 1) {
                lineText = stripBom(lineText);
                log('detected raw header', { fileId, header: lineText });
            }
            if (!sourceLanguage) {
                const maybeLang = detectSourceLanguage(lineText);
                if (maybeLang) {
                    sourceLanguage = maybeLang;
                }
            }
            const record = JSON.stringify({
                line_no: totalLines,
                text: lineText,
            });
            const recordBytes = Buffer.byteLength(record, 'utf8') + 1; // newline
            const exceedsLines = chunkEntries.length >= chunkMaxLines;
            const exceedsBytes = chunkEntries.length > 0 && currentBytes + recordBytes > chunkMaxBytes;
            if (chunkEntries.length && (exceedsLines || exceedsBytes)) {
                await flushChunk();
            }
            chunkEntries.push(record);
            currentBytes += recordBytes;
        }
        if (!totalLines) {
            span.setStatus({ code: api_1.SpanStatusCode.ERROR });
            throw new Error(`File ${fileId} contained no lines`);
        }
        if (!sourceLanguage) {
            span.setStatus({ code: api_1.SpanStatusCode.ERROR });
            throw new Error(`Unable to determine source language from file ${fileId}`);
        }
        if (chunkEntries.length) {
            await flushChunk();
        }
        log('split completed', {
            fileId,
            totalLines,
            totalChunks,
            sourceLanguage,
        });
        span.setStatus({ code: api_1.SpanStatusCode.OK });
        return { totalLines, totalChunks, sourceLanguage };
    }
    catch (err) {
        span.recordException(err);
        span.setStatus({ code: api_1.SpanStatusCode.ERROR });
        throw err;
    }
    finally {
        span.end();
    }
}
async function processJob(job) {
    const { fileId, targetLanguage } = job.data;
    if (!fileId) {
        throw new Error('fileId is required');
    }
    if (!targetLanguage) {
        throw new Error('targetLanguage is required');
    }
    try {
        log('received ingest job', { fileId, targetLanguage, jobId: job.id });
        const { totalLines, totalChunks, sourceLanguage } = await splitFile(job, fileId, targetLanguage);
        await updateFileRecord(fileId, totalLines, totalChunks, sourceLanguage, targetLanguage);
        return { totalLines, totalChunks };
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown ingest error';
        log('ingest job failed', { fileId, error: errorMessage, jobId: job.id });
        await markFileError(fileId, errorMessage);
        throw err;
    }
}
async function bootstrap() {
    (0, telemetry_1.initTelemetry)('ingest-splitter');
    minioClient = (0, miniox_1.createMinio)('ingest-splitter');
    await (0, miniox_1.ensureBucket)(minioClient, bucketName);
    ingestQueue.process(concurrency, async (job) => processJob(job));
    const shutdown = async () => {
        await ingestQueue.close();
        await encodeQueue.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    log('ready', { queue: 'ingest.split', concurrency });
}
bootstrap().catch((err) => {
    console.error('[ingest-splitter] fatal error', err);
    process.exit(1);
});
function stripBom(value) {
    if (value.charCodeAt(0) === 0xfeff) {
        return value.slice(1);
    }
    return value;
}
function detectSourceLanguage(line) {
    const trimmed = line.trim();
    if (!trimmed.length) {
        return null;
    }
    const cleaned = stripBom(trimmed);
    const match = cleaned.match(/^([A-Za-z0-9_]+)\s*:/);
    if (!match) {
        return null;
    }
    return match[1];
}
