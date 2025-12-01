"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_readline_1 = require("node:readline");
const node_crypto_1 = require("node:crypto");
const api_1 = require("@opentelemetry/api");
const bull_1 = __importDefault(require("bull"));
const axios_1 = __importDefault(require("axios"));
const telemetry_1 = require("../../../packages/telemetry");
const miniox_1 = require("../../../packages/miniox");
const tracer = (0, telemetry_1.getTracer)('translate-service');
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
const translateQueue = new bull_1.default('translate.process', {
    ...queueOptions,
    limiter: {
        max: Number.parseInt(process.env.TRANSLATE_RATE_MAX ?? '50', 10),
        duration: Number.parseInt(process.env.TRANSLATE_RATE_DURATION ?? '1000', 10),
    },
});
const posteditQueue = new bull_1.default('postedit.process', {
    ...queueOptions,
});
const bucket = process.env.MINIO_BUCKET ?? 'translator';
const inputPrefix = process.env.INPUT_PREFIX ?? 'inline';
const outputPrefix = process.env.OUTPUT_PREFIX ?? 'out';
const chunkPadWidth = Number.parseInt(process.env.SPLIT_CHUNK_PAD_WIDTH ?? '5', 10);
const batchSize = Number.parseInt(process.env.TRANSLATE_BATCH_SIZE ?? '64', 10);
const concurrency = Number.parseInt(process.env.TRANSLATE_QUEUE_CONCURRENCY ?? '2', 10);
const translatorKey = process.env.MICROSOFT_TRANSLATOR_KEY;
const translatorRegion = process.env.MICROSOFT_TRANSLATOR_REGION;
const translatorUrl = process.env.MICROSOFT_TRANSLATOR_URL ??
    'https://api.cognitive.microsofttranslator.com/translate';
if (!translatorKey) {
    throw new Error('MICROSOFT_TRANSLATOR_KEY is required');
}
if (!translatorRegion) {
    throw new Error('MICROSOFT_TRANSLATOR_REGION is required');
}
const minio = (0, miniox_1.createMinio)('translate-service');
async function readEncodedChunk(client, key) {
    const stream = (await client.getObject(bucket, key));
    const rl = (0, node_readline_1.createInterface)({ input: stream, crlfDelay: Infinity });
    const records = [];
    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }
        records.push(JSON.parse(trimmed));
    }
    return records;
}
async function writeTranslatedChunk(client, key, lines) {
    const body = lines.map((record) => JSON.stringify(record)).join('\n') + '\n';
    await client.putObject(bucket, key, body, undefined, {
        'Content-Type': 'application/x-ndjson',
    });
}
function getEncodedKey(fileId, chunkSeq) {
    return `${inputPrefix}/encoded/${fileId}/chunk-${chunkSeq
        .toString()
        .padStart(chunkPadWidth, '0')}.ndjson`;
}
function getTranslatedKey(fileId, chunkSeq) {
    return `${outputPrefix}/translated/${fileId}/chunk-${chunkSeq
        .toString()
        .padStart(chunkPadWidth, '0')}.ndjson`;
}
function convertLanguageCode(code) {
    const normalized = code.trim().toLowerCase();
    const mapping = {
        l_english: 'en',
        l_french: 'fr',
        l_german: 'de',
        l_spanish: 'es',
        l_polish: 'pl',
        l_russian: 'ru',
        l_turkish: 'tr',
        l_portuguese: 'pt',
        l_brazilian: 'pt-br',
        l_chinese: 'zh-Hans',
        l_japanese: 'ja',
        l_korean: 'ko',
        l_italian: 'it',
        l_dutch: 'nl',
        l_finnish: 'fi',
        l_swedish: 'sv',
        l_czech: 'cs',
        l_hungarian: 'hu',
        l_romanian: 'ro',
        l_danish: 'da',
        l_norwegian: 'nb',
        l_ukrainian: 'uk',
        l_greek: 'el',
        l_bulgarian: 'bg',
        l_estonian: 'et',
        l_latvian: 'lv',
        l_lithuanian: 'lt',
        l_slovak: 'sk',
        l_slovenian: 'sl',
        l_indonesian: 'id',
        l_arabic: 'ar',
        l_simplified_chinese: 'zh-Hans',
        l_traditional_chinese: 'zh-Hant',
    };
    const normalizedWithPrefix = normalized.startsWith('l_') || normalized.startsWith('§')
        ? normalized
        : `l_${normalized}`;
    const result = mapping[normalized] ??
        mapping[normalizedWithPrefix] ??
        (normalized.length === 2 || normalized.includes('-') ? normalized : null);
    if (!result) {
        throw new Error(`Unsupported language code: ${code}`);
    }
    return result;
}
async function translateTexts(texts, sourceLang, targetLang) {
    if (!texts.length) {
        return [];
    }
    const toCode = convertLanguageCode(targetLang);
    const fromCode = convertLanguageCode(sourceLang);
    const params = new URLSearchParams({
        'api-version': '3.0',
        to: toCode,
        from: fromCode,
    });
    const response = await axios_1.default.post(`${translatorUrl}?${params.toString()}`, texts.map((text) => ({ Text: text ?? '' })), {
        headers: {
            'Ocp-Apim-Subscription-Key': translatorKey,
            'Ocp-Apim-Subscription-Region': translatorRegion,
            'Content-Type': 'application/json',
            'X-ClientTraceId': (0, node_crypto_1.randomUUID)(),
        },
    });
    return response.data.map((item, idx) => {
        const translated = item?.translations?.[0]?.text ?? texts[idx] ?? '';
        return translated;
    });
}
async function processTranslateJob(job) {
    const { fileId, chunkSeq, sourceLanguage, targetLanguage } = job.data;
    if (!fileId || typeof chunkSeq !== 'number') {
        throw new Error('fileId and chunkSeq are required');
    }
    const span = tracer.startSpan('translate.chunk', {
        attributes: {
            'file.id': fileId,
            'chunk.seq': chunkSeq,
        },
    });
    try {
        const inputKey = getEncodedKey(fileId, chunkSeq);
        const outputKey = getTranslatedKey(fileId, chunkSeq);
        const records = await readEncodedChunk(minio, inputKey);
        if (!records.length) {
            throw new Error(`Chunk ${fileId}/${chunkSeq} contained no records at ${inputKey}`);
        }
        const translatedLines = [];
        for (let idx = 0; idx < records.length; idx += batchSize) {
            const batch = records.slice(idx, idx + batchSize);
            const texts = batch.map((line) => line.encoded_text ?? '');
            const translatedTexts = await translateTexts(texts, sourceLanguage, targetLanguage);
            batch.forEach((line, offset) => {
                translatedLines.push({
                    line_no: line.line_no,
                    translated_text: translatedTexts[offset] ?? '',
                    placeholder_map: line.placeholder_map,
                });
            });
            await job.updateProgress({
                processed: Math.min(idx + batch.length, records.length),
                total: records.length,
            });
        }
        await writeTranslatedChunk(minio, outputKey, translatedLines);
        await posteditQueue.add('postedit.process', {
            fileId,
            chunkSeq,
            sourceLanguage,
            targetLanguage,
        }, {
            jobId: `${fileId}:${chunkSeq}`,
        });
        span.setStatus({ code: api_1.SpanStatusCode.OK });
        return { lines: records.length };
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
async function bootstrap() {
    (0, telemetry_1.initTelemetry)('translate-service');
    await (0, miniox_1.ensureBucket)(minio, bucket);
    translateQueue.process(concurrency, processTranslateJob);
    const shutdown = async () => {
        await translateQueue.close();
        await posteditQueue.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    console.log(`[translate-service] listening on queue translate.process with concurrency ${concurrency}`);
}
bootstrap().catch((err) => {
    console.error('[translate-service] fatal error', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map