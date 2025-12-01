import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import Bull from 'bull';
import OpenAI from 'openai';
import { SpanStatusCode } from '@opentelemetry/api';
import {
  createMinio,
  ensureBucket,
  MinioClient,
} from '../../../packages/miniox';
import { initTelemetry, getTracer } from '../../../packages/telemetry';

type PosteditJobData = {
  fileId: string;
  chunkSeq: number;
  sourceLanguage: string;
  targetLanguage: string;
};

type TranslatedLine = {
  line_no: number;
  translated_text: string;
  placeholder_map?: unknown;
  original_text?: string;
};

type PosteditedLine = {
  line_no: number;
  postedited_text: string;
  placeholder_map?: unknown;
  original_text?: string;
};

const tracer = getTracer('postedit-service');

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

const posteditQueue = new Bull<PosteditJobData>('postedit.process', {
  ...queueOptions,
});
console.log(
  '[postedit-service] redis queue init "postedit.process"',
  { host: redisHost, port: redisPort },
);

const decodeQueue = new Bull<PosteditJobData>('variables.decode', {
  ...queueOptions,
});
console.log(
  '[postedit-service] redis queue init "variables.decode"',
  { host: redisHost, port: redisPort },
);

const bucket = process.env.MINIO_BUCKET ?? 'translator';
const outputPrefix = process.env.OUTPUT_PREFIX ?? 'out';
const chunkPadWidth = Number.parseInt(
  process.env.SPLIT_CHUNK_PAD_WIDTH ?? '5',
  10,
);
const batchSize = Number.parseInt(process.env.POSTEDIT_BATCH_SIZE ?? '32', 10);
const concurrency = Number.parseInt(
  process.env.POSTEDIT_QUEUE_CONCURRENCY ?? '2',
  10,
);
const openaiModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const openaiKey = process.env.OPENAI_API_KEY;

if (!openaiKey) {
  throw new Error('OPENAI_API_KEY is required for postedit-service');
}

const openai = new OpenAI({ apiKey: openaiKey });
const minio: MinioClient = createMinio('postedit-service');

function getTranslatedKey(fileId: string, chunkSeq: number) {
  return `${outputPrefix}/translated/${fileId}/chunk-${chunkSeq
    .toString()
    .padStart(chunkPadWidth, '0')}.ndjson`;
}

function getPosteditedKey(fileId: string, chunkSeq: number) {
  return `${outputPrefix}/postedited/${fileId}/chunk-${chunkSeq
    .toString()
    .padStart(chunkPadWidth, '0')}.ndjson`;
}

async function readTranslatedChunk(
  client: MinioClient,
  key: string,
): Promise<TranslatedLine[]> {
  const stream = (await client.getObject(bucket, key)) as Readable;
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  const records: TranslatedLine[] = [];
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    records.push(JSON.parse(trimmed) as TranslatedLine);
  }
  return records;
}

async function writePosteditedChunk(
  client: MinioClient,
  key: string,
  lines: PosteditedLine[],
) {
  const body = lines.map((record) => JSON.stringify(record)).join('\n') + '\n';
  await client.putObject(bucket, key, body, undefined, {
    'Content-Type': 'application/x-ndjson',
  });
}

function buildPrompt(targetLang: string) {
  return `You are a localization editor for Paradox grand strategy games.
Polish every line for fluency in ${targetLang}, preserve meaning, tone, and historical terminology.

Hard constraints:
- Never change or remove placeholders that look like ⟦PLACEHOLDER⟧ or {hash}.
- Do not introduce new placeholders.
- Return JSON with shape {"lines":[{"line_no":number,"text":string},...]} and nothing else.`;
}

async function posteditBatch(
  lines: TranslatedLine[],
  targetLanguage: string,
): Promise<Map<number, string>> {
  const payload = lines.map((line) => ({
    line_no: line.line_no,
    text: line.translated_text ?? '',
  }));

  const response = await openai.chat.completions.create({
    model: openaiModel,
    temperature: Number(process.env.POSTEDIT_TEMPERATURE ?? '0.2'),
    messages: [
      {
        role: 'system',
        content: buildPrompt(targetLanguage),
      },
      {
        role: 'user',
        content: JSON.stringify({ lines: payload }),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '{"lines":[]}';
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as {
      lines?: { line_no: number; text: string }[];
    };
    const map = new Map<number, string>();
    for (const item of parsed.lines ?? []) {
      map.set(item.line_no, item.text);
    }
    return map;
  } catch (err) {
    console.warn('[postedit-service] Failed to parse OpenAI response, falling back to original text', {
      error: err instanceof Error ? err.message : err,
      raw: cleaned,
    });
    const fallback = new Map<number, string>();
    payload.forEach((item) => fallback.set(item.line_no, item.text));
    return fallback;
  }
}

async function processPosteditJob(job: Bull.Job<PosteditJobData>) {
  const { fileId, chunkSeq, targetLanguage } = job.data;
  if (!fileId || typeof chunkSeq !== 'number') {
    throw new Error('fileId and chunkSeq are required');
  }

  const span = tracer.startSpan('postedit.chunk', {
    attributes: { 'file.id': fileId, 'chunk.seq': chunkSeq },
  });

  try {
    const inputKey = getTranslatedKey(fileId, chunkSeq);
    const outputKey = getPosteditedKey(fileId, chunkSeq);
    const records = await readTranslatedChunk(minio, inputKey);
    if (!records.length) {
      throw new Error(
        `Chunk ${fileId}/${chunkSeq} contained no translated records at ${inputKey}`,
      );
    }

    const posteditedLines: PosteditedLine[] = [];
    for (let idx = 0; idx < records.length; idx += batchSize) {
      const batch = records.slice(idx, idx + batchSize);
      const edits = await posteditBatch(batch, targetLanguage);

      batch.forEach((line) => {
        posteditedLines.push({
          line_no: line.line_no,
          postedited_text: edits.get(line.line_no) ?? line.translated_text ?? '',
          placeholder_map: line.placeholder_map,
          original_text: line.original_text ?? '',
        });
      });

      const processed = Math.min(idx + batch.length, records.length);
      await (job as Bull.Job<PosteditJobData> & {
        updateProgress(progress: number | object): Promise<void>;
      });
      await updateJobProgress(
        job as Bull.Job<PosteditJobData>,
        Math.round((processed / records.length) * 100),
      );
    }

    await writePosteditedChunk(minio, outputKey, posteditedLines);

    await decodeQueue.add(job.data, { jobId: `${fileId}:${chunkSeq}` });

    span.setStatus({ code: SpanStatusCode.OK });
    return { lines: records.length };
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw err;
  } finally {
    span.end();
  }
}

async function bootstrap() {
  initTelemetry('postedit-service');
  await ensureBucket(minio, bucket);

  posteditQueue.process(concurrency, processPosteditJob);

  const shutdown = async () => {
    await posteditQueue.close();
    await decodeQueue.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(
    `[postedit-service] listening on queue postedit.process with concurrency ${concurrency}`,
  );
}

bootstrap().catch((err) => {
  console.error('[postedit-service] fatal error', err);
  process.exit(1);
});
async function updateJobProgress(
  job: Bull.Job<PosteditJobData>,
  progress: number | object,
) {
  const fn = (job as { updateProgress?: (p: number | object) => Promise<void> })
    .updateProgress;
  if (typeof fn !== 'function') {
    console.log('[postedit-service] updateProgress unavailable', { jobId: job.id });
    return;
  }
  try {
    await fn.call(job, progress);
  } catch (err) {
    console.error('[postedit-service] updateProgress failed', {
      jobId: job.id,
      error: err instanceof Error ? err.message : err,
    });
  }
}
