import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { SpanStatusCode } from '@opentelemetry/api';
import Bull from 'bull';
import axios from 'axios';
import { initTelemetry, getTracer } from '../../../packages/telemetry';
import {
  createMinio,
  MinioClient,
  ensureBucket,
} from '../../../packages/miniox';

type TranslateJobData = {
  fileId: string;
  chunkSeq: number;
  sourceLanguage: string;
  targetLanguage: string;
};

type PosteditJobData = TranslateJobData;

type EncodedLine = {
  line_no: number;
  encoded_text: string;
  placeholder_map?: unknown;
  original_text?: string;
};

type TranslatedLine = {
  line_no: number;
  translated_text: string;
  placeholder_map?: unknown;
  original_text?: string;
};

const tracer = getTracer('translate-service');

function log(message: string, meta: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      service: 'translate-service',
      message,
      ...meta,
    }),
  );
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
      type: 'exponential' as const,
      delay: Number.parseInt(process.env.JOB_BACKOFF_DELAY ?? '2000', 10),
    },
    removeOnComplete: { age: 3600, count: 10000 },
    removeOnFail: { age: 86400 },
  },
};

const translateQueue = new Bull<TranslateJobData>('translate.process', {
  ...queueOptions,
  limiter: {
    max: Number.parseInt(process.env.TRANSLATE_RATE_MAX ?? '50', 10),
    duration: Number.parseInt(process.env.TRANSLATE_RATE_DURATION ?? '1000', 10),
  },
});
log('redis queue init', {
  queue: 'translate.process',
  host: redisHost,
  port: redisPort,
});

const posteditQueue = new Bull<PosteditJobData>('postedit.process', {
  ...queueOptions,
});
log('redis queue init', {
  queue: 'postedit.process',
  host: redisHost,
  port: redisPort,
});

const bucket = process.env.MINIO_BUCKET ?? 'translator';
const inputPrefix = process.env.INPUT_PREFIX ?? 'inline';
const outputPrefix = process.env.OUTPUT_PREFIX ?? 'out';
const chunkPadWidth = Number.parseInt(
  process.env.SPLIT_CHUNK_PAD_WIDTH ?? '5',
  10,
);
const batchSize = Number.parseInt(
  process.env.TRANSLATE_BATCH_SIZE ?? '64',
  10,
);
const concurrency = Number.parseInt(
  process.env.TRANSLATE_QUEUE_CONCURRENCY ?? '2',
  10,
);

const translatorKey = process.env.MICROSOFT_TRANSLATOR_KEY;
const translatorRegion = process.env.MICROSOFT_TRANSLATOR_REGION;
const translatorEnabled = Boolean(translatorKey && translatorRegion);
let translatorWarningLogged = false;
const translatorUrl =
  process.env.MICROSOFT_TRANSLATOR_URL ??
  'https://api.cognitive.microsofttranslator.com/translate';

if (!translatorKey) {
  throw new Error('MICROSOFT_TRANSLATOR_KEY is required');
}

if (!translatorRegion) {
  throw new Error('MICROSOFT_TRANSLATOR_REGION is required');
}

const minio: MinioClient = createMinio('translate-service');

async function readEncodedChunk(
  client: MinioClient,
  key: string,
): Promise<EncodedLine[]> {
  const stream = (await client.getObject(bucket, key)) as Readable;
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  const records: EncodedLine[] = [];
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    records.push(JSON.parse(trimmed) as EncodedLine);
  }
  return records;
}

async function writeTranslatedChunk(
  client: MinioClient,
  key: string,
  lines: TranslatedLine[],
) {
  const body = lines.map((record) => JSON.stringify(record)).join('\n') + '\n';
  await client.putObject(bucket, key, body, undefined, {
    'Content-Type': 'application/x-ndjson',
  });
}

function getEncodedKey(fileId: string, chunkSeq: number) {
  return `${inputPrefix}/encoded/${fileId}/chunk-${chunkSeq
    .toString()
    .padStart(chunkPadWidth, '0')}.ndjson`;
}

function getTranslatedKey(fileId: string, chunkSeq: number) {
  return `${outputPrefix}/translated/${fileId}/chunk-${chunkSeq
    .toString()
    .padStart(chunkPadWidth, '0')}.ndjson`;
}

function convertLanguageCode(code: string): string {
  const normalized = code.trim().toLowerCase();
  const mapping: Record<string, string> = {
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

  const normalizedWithPrefix =
    normalized.startsWith('l_') || normalized.startsWith('§')
      ? normalized
      : `l_${normalized}`;

  const result =
    mapping[normalized] ??
    mapping[normalizedWithPrefix] ??
    (normalized.length === 2 || normalized.includes('-') ? normalized : null);

  if (!result) {
    throw new Error(`Unsupported language code: ${code}`);
  }
  return result;
}

async function translateTexts(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
  if (!texts.length) {
    return [];
  }

  if (!translatorEnabled) {
    if (!translatorWarningLogged) {
      translatorWarningLogged = true;
      log('MICROSOFT_TRANSLATOR_KEY or REGION missing, returning original text', {});
    }
    return texts;
  }

  const toCode = convertLanguageCode(targetLang);
  const fromCode = convertLanguageCode(sourceLang);

  const params = new URLSearchParams({
    'api-version': '3.0',
    to: toCode,
    from: fromCode,
  });

  const response = await axios.post(
    `${translatorUrl}?${params.toString()}`,
    texts.map((text) => ({ Text: text ?? '' })),
    {
      headers: {
        'Ocp-Apim-Subscription-Key': translatorKey!,
        'Ocp-Apim-Subscription-Region': translatorRegion!,
        'Content-Type': 'application/json',
        'X-ClientTraceId': randomUUID(),
      },
    },
  );

  return response.data.map((item: any, idx: number) => {
    const translated =
      item?.translations?.[0]?.text ?? texts[idx] ?? '';
    return translated;
  });
}

async function processTranslateJob(job: Bull.Job<TranslateJobData>) {
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
    log('translate job received', {
      fileId,
      chunkSeq,
      sourceLanguage,
      targetLanguage,
      jobId: job.id,
    });
    const inputKey = getEncodedKey(fileId, chunkSeq);
    const outputKey = getTranslatedKey(fileId, chunkSeq);

    const records = await readEncodedChunk(minio, inputKey);
    if (!records.length) {
      throw new Error(
        `Chunk ${fileId}/${chunkSeq} contained no records at ${inputKey}`,
      );
    }

    const translatedLines: TranslatedLine[] = [];
    for (let idx = 0; idx < records.length; idx += batchSize) {
      const batch = records.slice(idx, idx + batchSize);
      const texts = batch.map((line) => line.encoded_text ?? '');
      const translatedTexts = await translateTexts(
        texts,
        sourceLanguage,
        targetLanguage,
      );

      batch.forEach((line, offset) => {
        const translatedText = translatedTexts[offset] ?? '';
        log('translation result', {
          fileId,
          chunkSeq,
          lineNo: line.line_no,
          sourceSample: (texts[offset] ?? '').slice(0, 160),
          translatedSample: translatedText.slice(0, 160),
        });
        translatedLines.push({
          line_no: line.line_no,
          translated_text: translatedText,
          placeholder_map: line.placeholder_map,
          original_text: line.original_text ?? '',
        });
      });

      const processed = Math.min(idx + batch.length, records.length);
      await updateJobProgress(
        job as Bull.Job<TranslateJobData>,
        Math.round((processed / records.length) * 100),
      );
    }

    await writeTranslatedChunk(minio, outputKey, translatedLines);

    await posteditQueue.add(
      {
        fileId,
        chunkSeq,
        sourceLanguage,
        targetLanguage,
      },
      {
        jobId: `${fileId}:${chunkSeq}`,
      },
    );

    span.setStatus({ code: SpanStatusCode.OK });
    log('translate job completed', {
      fileId,
      chunkSeq,
      lines: records.length,
    });
    return { lines: records.length };
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    log('translate job failed', {
      fileId,
      chunkSeq,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    span.end();
  }
}

async function bootstrap() {
  initTelemetry('translate-service');
  await ensureBucket(minio, bucket);

  translateQueue.process(concurrency, processTranslateJob);

  const shutdown = async () => {
    await translateQueue.close();
    await posteditQueue.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  log('ready', {
    queue: 'translate.process',
    concurrency,
    translatorEnabled,
  });
}

bootstrap().catch((err) => {
  console.error('[translate-service] fatal error', err);
  process.exit(1);
});
async function updateJobProgress(
  job: Bull.Job<TranslateJobData>,
  progress: number | object,
) {
  const fn = (job as { updateProgress?: (p: number | object) => Promise<void> })
    .updateProgress;
  if (typeof fn !== 'function') {
    log('updateProgress unavailable on translate job', { jobId: job.id });
    return;
  }
  try {
    await fn.call(job, progress);
  } catch (err) {
    log('updateProgress failed', {
      jobId: job.id,
      error: err instanceof Error ? err.message : err,
    });
  }
}
