import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import Bull from 'bull';
import { SpanStatusCode } from '@opentelemetry/api';
import { initTelemetry, getTracer } from '../../../packages/telemetry';
import {
  MinioClient,
  createMinio,
  ensureBucket,
} from '../../../packages/miniox';

type IngestJobData = {
  fileId: string;
  targetLanguage: string;
  originalName?: string;
};

type EncodeJobData = {
  fileId: string;
  chunkSeq: number;
  sourceLanguage: string;
  targetLanguage: string;
};

type SplitResult = {
  totalLines: number;
  totalChunks: number;
  sourceLanguage: string;
};

const tracer = getTracer('ingest-splitter');

function log(message: string, meta: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      service: 'ingest-splitter',
      message,
      ...meta,
    }),
  );
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
    type: 'exponential' as const,
    delay: Number.parseInt(process.env.JOB_BACKOFF_DELAY ?? '2000', 10),
  },
  removeOnComplete: { age: 3600, count: 10000 },
  removeOnFail: { age: 86400 },
};

const encodeQueue = new Bull<EncodeJobData>('variables.encode', {
  redis: redisConfig,
  defaultJobOptions,
});
log('redis queue init', {
  queue: 'variables.encode',
  host: redisHost,
  port: redisPort,
});

const ingestQueue = new Bull<IngestJobData>('ingest.split', {
  redis: redisConfig,
  defaultJobOptions,
});
log('redis queue init', {
  queue: 'ingest.split',
  host: redisHost,
  port: redisPort,
});

ingestQueue.on('waiting', (jobId: Bull.JobId) =>
  log('ingest queue waiting', { jobId }),
);
ingestQueue.on('active', (job) =>
  log('ingest queue active', { jobId: job.id, data: job.data }),
);
ingestQueue.on('completed', (job, result) =>
  log('ingest queue completed', { jobId: job.id, result }),
);
ingestQueue.on('failed', (job, err) =>
  log('ingest queue failed', {
    jobId: job?.id,
    error: err instanceof Error ? err.message : err,
  }),
);

const inputPrefix = process.env.INPUT_PREFIX ?? 'inline';
const bucketName = process.env.MINIO_BUCKET ?? 'translator';
const chunkMaxLines = Number.parseInt(
  process.env.SPLIT_MAX_LINES ?? '2000',
  10,
);
const chunkMaxBytes = Number.parseInt(
  process.env.SPLIT_MAX_BYTES ?? `${4 * 1024 * 1024}`,
  10,
);
const chunkPadWidth = Number.parseInt(
  process.env.SPLIT_CHUNK_PAD_WIDTH ?? '5',
  10,
);
const concurrency = Number.parseInt(
  process.env.SPLIT_CONCURRENCY ?? '2',
  10,
);

let minioClient: MinioClient;
const pipelineApiBase =
  process.env.PIPELINE_API_BASE_URL ?? 'http://api-service:3005/api';

async function callPipeline<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${pipelineApiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(
      `Pipeline API ${path} failed (${res.status}): ${message || 'unknown error'}`,
    );
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

async function updateFileRecord(
  fileId: string,
  totalLines: number,
  totalChunks: number,
  originLang: string,
  targetLang: string,
) {
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

async function markFileError(fileId: string, error: string) {
  log('marking file error', { fileId, error });
  await callPipeline('/pipeline/files/error', {
    fileId,
    error: error.slice(0, 1024),
  });
}

function getRawKey(fileId: string) {
  return `${inputPrefix}/${fileId}.raw`;
}

function getChunkKey(fileId: string, chunkSeq: number) {
  const padded = chunkSeq.toString().padStart(chunkPadWidth, '0');
  return `${inputPrefix}/split/${fileId}/chunk-${padded}.ndjson`;
}

async function enqueueEncodeJob(
  fileId: string,
  chunkSeq: number,
  sourceLanguage: string,
  targetLanguage: string,
) {
  await encodeQueue.add(
    { fileId, chunkSeq, sourceLanguage, targetLanguage },
    {
      ...defaultJobOptions,
      jobId: `${fileId}:${chunkSeq}`,
    },
  );
}

async function writeChunk(
  client: MinioClient,
  chunkKey: string,
  lines: string[],
): Promise<void> {
  const body = lines.join('\n') + '\n';
  await client.putObject(bucketName, chunkKey, body, undefined, {
    'Content-Type': 'application/x-ndjson',
  });
}

async function updateJobProgress(
  job: Bull.Job<unknown>,
  progress: number | object,
) {
  const fn = (job as { updateProgress?: (p: number | object) => Promise<void> })
    .updateProgress;
  if (typeof fn !== 'function') {
    log('updateProgress unavailable on job', { jobId: job.id });
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

async function splitFile(
  job: Bull.Job<IngestJobData>,
  fileId: string,
  targetLanguage: string,
): Promise<SplitResult> {
  const span = tracer.startSpan('ingest.split', {
    attributes: {
      'file.id': fileId,
    },
  });

  try {
    const objectStream = await minioClient.getObject(
      bucketName,
      getRawKey(fileId),
    );
    const rl = createInterface({
      input: objectStream as Readable,
      crlfDelay: Infinity,
    });

    let chunkSeq = 1;
    let totalLines = 0;
    let totalChunks = 0;
    let sourceLanguage: string | null = null;

    let currentBytes = 0;
    let chunkEntries: string[] = [];

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
      await enqueueEncodeJob(
        fileId,
        chunkSeq,
        sourceLanguage,
        targetLanguage,
      );
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
      const exceedsBytes =
        chunkEntries.length > 0 && currentBytes + recordBytes > chunkMaxBytes;

      if (chunkEntries.length && (exceedsLines || exceedsBytes)) {
        await flushChunk();
      }

      chunkEntries.push(record);
      currentBytes += recordBytes;
    }

    if (!totalLines) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw new Error(`File ${fileId} contained no lines`);
    }

    if (!sourceLanguage) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw new Error(
        `Unable to determine source language from file ${fileId}`,
      );
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
    span.setStatus({ code: SpanStatusCode.OK });
    return { totalLines, totalChunks, sourceLanguage };
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw err;
  } finally {
    span.end();
  }
}

async function processJob(job: Bull.Job<IngestJobData>) {
  const { fileId, targetLanguage } = job.data;
  if (!fileId) {
    throw new Error('fileId is required');
  }
  if (!targetLanguage) {
    throw new Error('targetLanguage is required');
  }

  try {
    log('received ingest job', { fileId, targetLanguage, jobId: job.id });
    const { totalLines, totalChunks, sourceLanguage } = await splitFile(
      job,
      fileId,
      targetLanguage,
    );
    await updateFileRecord(
      fileId,
      totalLines,
      totalChunks,
      sourceLanguage,
      targetLanguage,
    );
    return { totalLines, totalChunks };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown ingest error';
    log('ingest job failed', { fileId, error: errorMessage, jobId: job.id });
    await markFileError(fileId, errorMessage);
    throw err;
  }
}

async function bootstrap() {
  initTelemetry('ingest-splitter');
  minioClient = createMinio('ingest-splitter');
  await ensureBucket(minioClient, bucketName);

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

function stripBom(value: string): string {
  if (value.charCodeAt(0) === 0xfeff) {
    return value.slice(1);
  }
  return value;
}

function detectSourceLanguage(line: string): string | null {
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
