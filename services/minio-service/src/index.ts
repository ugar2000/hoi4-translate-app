import path from 'node:path';
import { promises as fs } from 'node:fs';
import Queue, { Job } from 'bull';
import { SpanStatusCode } from '@opentelemetry/api';
import { Client as MinioClient } from 'minio';
import { initTelemetry, getTracer } from '../../../packages/telemetry';

type BaseJob = {
  key: string;
  bucket?: string;
};

type CreateOrUpdateJob = BaseJob & {
  type: 'create' | 'update';
  sourcePath: string;
  contentType?: string;
};

type ReadJob = BaseJob & {
  type: 'read';
  destinationPath: string;
};

type DeleteJob = BaseJob & {
  type: 'delete';
};

type MinioJobData = CreateOrUpdateJob | ReadJob | DeleteJob;

type MinioJobResult = {
  bucket: string;
  key: string;
  path?: string;
  contentType?: string;
  size?: number;
};

type MinioConfig = {
  bucket: string;
  key: string;
};

const redisHost = process.env.REDIS_HOST ?? 'redis';
const redisPort = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);
const queueName = process.env.MINIO_QUEUE_NAME ?? 'minio:jobs';
const concurrency = Number.parseInt(process.env.MINIO_WORKERS ?? '4', 10);
const sharedRoot = path.resolve(process.env.MINIO_SHARED_DIR ?? '/exports');
const defaultBucket = process.env.MINIO_BUCKET ?? 'translator';

function createMinioClient(): MinioClient {
  const endpoint = process.env.MINIO_ENDPOINT ?? 'http://minio:9000';
  const accessKey = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
  const url = new URL(endpoint);

  return new MinioClient({
    endPoint: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80,
    useSSL: url.protocol === 'https:',
    accessKey,
    secretKey,
    region: process.env.MINIO_REGION,
  });
}

const minio = createMinioClient();

async function ensureBucket(bucket: string): Promise<void> {
  const exists = await minio.bucketExists(bucket).catch((err: Error & { code?: string }) => {
    if (err.code === 'NoSuchBucket') {
      return false;
    }
    throw err;
  });

  if (!exists) {
    await minio.makeBucket(bucket, '');
  }
}

async function saveObject(ref: MinioConfig, data: Buffer, contentType?: string): Promise<void> {
  await ensureBucket(ref.bucket);
  await minio.putObject(ref.bucket, ref.key, data, undefined, {
    'Content-Type': contentType ?? 'application/octet-stream',
  });
}

async function readObject(ref: MinioConfig): Promise<{ data: Buffer; contentType?: string }> {
  const stream = await minio.getObject(ref.bucket, ref.key);
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', async () => {
      try {
        const stat = await minio.statObject(ref.bucket, ref.key);
        resolve({ data: Buffer.concat(chunks), contentType: stat.metaData?.['content-type'] });
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function deleteObject(ref: MinioConfig): Promise<void> {
  await minio.removeObject(ref.bucket, ref.key);
}

function resolveSharedPath(target: string): string {
  const candidate = path.resolve(path.isAbsolute(target) ? target : path.join(sharedRoot, target));
  const relative = path.relative(sharedRoot, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path "${target}" escapes shared directory ${sharedRoot}`);
  }
  return candidate;
}

async function handleCreate(job: Job<CreateOrUpdateJob>): Promise<MinioJobResult> {
  const bucket = job.data.bucket ?? defaultBucket;
  const key = job.data.key;
  const source = resolveSharedPath(job.data.sourcePath);
  const buffer = await fs.readFile(source);
  await saveObject({ bucket, key }, buffer, job.data.contentType);
  return { bucket, key, path: source, size: buffer.length };
}

async function handleRead(job: Job<ReadJob>): Promise<MinioJobResult> {
  const bucket = job.data.bucket ?? defaultBucket;
  const key = job.data.key;
  const destination = resolveSharedPath(job.data.destinationPath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const { data, contentType } = await readObject({ bucket, key });
  await fs.writeFile(destination, data);
  return { bucket, key, path: destination, contentType, size: data.length };
}

async function handleDelete(job: Job<DeleteJob>): Promise<MinioJobResult> {
  const bucket = job.data.bucket ?? defaultBucket;
  const key = job.data.key;
  await deleteObject({ bucket, key });
  return { bucket, key };
}

async function processJob(job: Job<MinioJobData>): Promise<MinioJobResult> {
  switch (job.data.type) {
    case 'create':
    case 'update':
      return handleCreate(job as Job<CreateOrUpdateJob>);
    case 'read':
      return handleRead(job as Job<ReadJob>);
    case 'delete':
      return handleDelete(job as Job<DeleteJob>);
    default:
      throw new Error(`Unsupported minio job type ${(job.data as MinioJobData).type as string}`);
  }
}

async function bootstrap() {
  initTelemetry('minio-service');
  const tracer = getTracer('minio-service');

  await fs.mkdir(sharedRoot, { recursive: true });
  await ensureBucket(defaultBucket);

const queue = new Queue<MinioJobData>(queueName, {
  redis: {
    host: redisHost,
    port: redisPort,
  },
});
console.log(
  `[minio-service] redis queue init "${queueName}" -> ${redisHost}:${redisPort}`,
);

  const runJob = async (job: Job<MinioJobData>) => {
    const span = tracer.startSpan(`minio.${job.data.type}`, {
      attributes: {
        'minio.key': job.data.key,
        'minio.bucket': job.data.bucket ?? defaultBucket,
        'minio.type': job.data.type,
      },
    });

    try {
      const result = await processJob(job);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
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

  console.log(
    `[minio-service] waiting for jobs on queue "${queueName}" with concurrency ${concurrency} (shared dir: ${sharedRoot})`,
  );
}

bootstrap().catch((err) => {
  console.error('[minio-service] fatal error', err);
  process.exit(1);
});
