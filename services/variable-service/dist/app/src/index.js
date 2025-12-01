"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_readline_1 = require("node:readline");
const bull_1 = __importDefault(require("bull"));
const api_1 = require("@opentelemetry/api");
const miniox_1 = require("../../../packages/miniox");
const telemetry_1 = require("../../../packages/telemetry");
const tracer = (0, telemetry_1.getTracer)('variable-service');
function log(message, meta = {}) {
    console.log(JSON.stringify({
        service: 'variable-service',
        message,
        ...meta,
    }));
}
const redisHost = process.env.REDIS_HOST ?? 'redis';
const redisPort = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);
const queueOptions = {
    redis: {
        host: redisHost,
        port: redisPort,
    },
    defaultJobOptions: {
        attempts: Number.parseInt(process.env.JOB_ATTEMPTS ?? '5', 10),
        backoff: {
            type: 'exponential',
            delay: Number.parseInt(process.env.JOB_BACKOFF_DELAY ?? '2000', 10),
        },
        removeOnComplete: { age: 3600, count: 10000 },
        removeOnFail: { age: 86400 },
    },
};
const encodeQueue = new bull_1.default('variables.encode', queueOptions);
const decodeQueue = new bull_1.default('variables.decode', queueOptions);
const translateQueue = new bull_1.default('translate.process', queueOptions);
log('redis queue init', {
    queues: ['variables.encode', 'variables.decode', 'translate.process'],
    host: redisHost,
    port: redisPort,
});
const inputPrefix = process.env.INPUT_PREFIX ?? 'inline';
const outputPrefix = process.env.OUTPUT_PREFIX ?? 'out';
const chunkPadWidth = Number.parseInt(process.env.SPLIT_CHUNK_PAD_WIDTH ?? '5', 10);
const encodeConcurrency = Number.parseInt(process.env.VAR_ENCODE_CONCURRENCY ?? '2', 10);
const decodeConcurrency = Number.parseInt(process.env.VAR_DECODE_CONCURRENCY ?? '2', 10);
const bucket = process.env.MINIO_BUCKET ?? 'translator';
const pipelineApiBase = process.env.PIPELINE_API_BASE_URL ?? 'http://api-service:3005/api';
const SPECIAL_CODES = [
    '§!',
    '§C',
    '§L',
    '§W',
    '§B',
    '§G',
    '§R',
    '§b',
    '§g',
    '§Y',
    '§H',
    '§T',
    '§O',
    '§0',
    '§1',
    '§2',
    '§3',
    '§4',
    '§5',
    '§6',
    '§7',
    '§8',
    '§9',
    '§t',
];
const minio = (0, miniox_1.createMinio)('variable-service');
async function callPipeline(path, body) {
    log('calling pipeline API', { path, preview: JSON.stringify(body).slice(0, 200) });
    const res = await fetch(`${pipelineApiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const message = await res.text();
        const messageText = message || 'unknown error';
        log('pipeline API call failed', { path, status: res.status, message: messageText });
        throw new Error(`Pipeline API ${path} failed (${res.status}): ${message || 'unknown error'}`);
    }
}
function padChunk(chunkSeq) {
    return chunkSeq.toString().padStart(chunkPadWidth, '0');
}
function getSplitKey(fileId, chunkSeq) {
    return `${inputPrefix}/split/${fileId}/chunk-${padChunk(chunkSeq)}.ndjson`;
}
function getEncodedKey(fileId, chunkSeq) {
    return `${inputPrefix}/encoded/${fileId}/chunk-${padChunk(chunkSeq)}.ndjson`;
}
function getPosteditedKey(fileId, chunkSeq) {
    return `${outputPrefix}/postedited/${fileId}/chunk-${padChunk(chunkSeq)}.ndjson`;
}
function getFinalKey(fileId, chunkSeq) {
    return `${outputPrefix}/final/${fileId}/chunk-${padChunk(chunkSeq)}.ndjson`;
}
async function readLines(key) {
    log('reading NDJSON', { key });
    const stream = (await minio.getObject(bucket, key));
    const rl = (0, node_readline_1.createInterface)({ input: stream, crlfDelay: Infinity });
    const records = [];
    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        records.push(JSON.parse(trimmed));
    }
    log('read NDJSON complete', { key, count: records.length });
    return records;
}
async function writeLines(key, records) {
    log('writing NDJSON', { key, count: records.length });
    const body = records.map((record) => JSON.stringify(record)).join('\n') + '\n';
    await minio.putObject(bucket, key, body, undefined, {
        'Content-Type': 'application/x-ndjson',
    });
}
function encodeText(lineNo, text) {
    let encoded = text ?? '';
    const placeholders = [];
    let counter = 0;
    const tokenFor = (value) => {
        const token = `{VAR_${lineNo}_${counter++}}`;
        placeholders.push({ token, value });
        return token;
    };
    const replaceRegex = (regex) => {
        encoded = encoded.replace(regex, (match) => tokenFor(match));
    };
    replaceRegex(/⟦.*?⟧/g);
    replaceRegex(/\[[^\]]+\]/g);
    SPECIAL_CODES.sort((a, b) => b.length - a.length).forEach((code) => {
        if (!code)
            return;
        const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        encoded = encoded.replace(regex, () => tokenFor(code));
    });
    return { encoded, placeholders };
}
function decodeText(text, map) {
    let decoded = text ?? '';
    for (const entry of map ?? []) {
        const escaped = entry.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        decoded = decoded.replace(new RegExp(escaped, 'g'), entry.value);
    }
    return decoded;
}
async function processEncodeJob(job) {
    const { fileId, chunkSeq, sourceLanguage, targetLanguage } = job.data;
    if (!fileId || typeof chunkSeq !== 'number') {
        throw new Error('fileId and chunkSeq are required');
    }
    const span = tracer.startSpan('variables.encode', {
        attributes: { 'file.id': fileId, 'chunk.seq': chunkSeq },
    });
    try {
        log('encode job received', {
            fileId,
            chunkSeq,
            sourceLanguage,
            targetLanguage,
            jobId: job.id,
        });
        const inputKey = getSplitKey(fileId, chunkSeq);
        const outputKey = getEncodedKey(fileId, chunkSeq);
        const lines = await readLines(inputKey);
        if (!lines.length) {
            throw new Error(`Chunk ${fileId}/${chunkSeq} contained no lines at ${inputKey}`);
        }
        const encodedLines = lines.map((line) => {
            const { encoded, placeholders } = encodeText(line.line_no, line.text);
            return {
                line_no: line.line_no,
                encoded_text: encoded,
                placeholder_map: placeholders,
            };
        });
        await writeLines(outputKey, encodedLines);
        await translateQueue.add('translate.process', { fileId, chunkSeq, sourceLanguage, targetLanguage }, { jobId: `${fileId}:${chunkSeq}` });
        span.setStatus({ code: api_1.SpanStatusCode.OK });
        log('encode job completed', {
            fileId,
            chunkSeq,
            count: encodedLines.length,
        });
        return { lines: encodedLines.length };
    }
    catch (err) {
        span.recordException(err);
        span.setStatus({ code: api_1.SpanStatusCode.ERROR });
        await markFileError(fileId, err);
        throw err;
    }
    finally {
        span.end();
    }
}
async function processDecodeJob(job) {
    const { fileId, chunkSeq } = job.data;
    if (!fileId || typeof chunkSeq !== 'number') {
        throw new Error('fileId and chunkSeq are required');
    }
    const span = tracer.startSpan('variables.decode', {
        attributes: { 'file.id': fileId, 'chunk.seq': chunkSeq },
    });
    try {
        log('decode job received', { fileId, chunkSeq, jobId: job.id });
        const inputKey = getPosteditedKey(fileId, chunkSeq);
        const outputKey = getFinalKey(fileId, chunkSeq);
        const lines = await readLines(inputKey);
        if (!lines.length) {
            throw new Error(`Chunk ${fileId}/${chunkSeq} contained no postedited lines at ${inputKey}`);
        }
        const finalLines = lines.map((line) => ({
            line_no: line.line_no,
            final_text: decodeText(line.postedited_text ?? '', line.placeholder_map),
        }));
        await writeLines(outputKey, finalLines);
        await callPipeline('/pipeline/files/chunk', {
            fileId,
            chunkSeq,
            lines: finalLines.map((line) => ({
                line_no: line.line_no,
                text: line.final_text,
            })),
        });
        span.setStatus({ code: api_1.SpanStatusCode.OK });
        log('decode job completed', {
            fileId,
            chunkSeq,
            count: finalLines.length,
        });
        return { lines: finalLines.length };
    }
    catch (err) {
        span.recordException(err);
        span.setStatus({ code: api_1.SpanStatusCode.ERROR });
        await markFileError(fileId, err);
        throw err;
    }
    finally {
        span.end();
    }
}
async function markFileError(fileId, err) {
    const message = err instanceof Error ? err.message : 'Variable service error';
    await callPipeline('/pipeline/files/error', {
        fileId,
        error: message.slice(0, 1024),
    });
}
async function bootstrap() {
    (0, telemetry_1.initTelemetry)('variable-service');
    await (0, miniox_1.ensureBucket)(minio, bucket);
    encodeQueue.process(encodeConcurrency, processEncodeJob);
    decodeQueue.process(decodeConcurrency, processDecodeJob);
    const shutdown = async () => {
        await encodeQueue.close();
        await decodeQueue.close();
        await translateQueue.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    log('ready', {
        encodeConcurrency,
        decodeConcurrency,
        queues: ['variables.encode', 'variables.decode'],
    });
}
bootstrap().catch((err) => {
    console.error('[variable-service] fatal error', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map