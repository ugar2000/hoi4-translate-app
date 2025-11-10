import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bull from 'bull';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CreateFileJobDto } from './dto/create-file-job.dto';
import { ReadFileJobDto } from './dto/read-file-job.dto';
import {
  FileJobSummary,
  MinioJobData,
} from './file.types';

type BullQueue<T> = import('bull').Queue<T>;
type BullJob<T> = import('bull').Job<T>;

@Injectable()
export class FileService implements OnModuleDestroy {
  private readonly logger = new Logger(FileService.name);
  private readonly queue: BullQueue<MinioJobData>;
  private readonly sharedRoot: string;
  private readonly queueAddTimeoutMs: number;
  private readonly queueReady: Promise<void>;

  constructor(private readonly config: ConfigService) {
    const redisHost = config.get<string>('REDIS_HOST', 'redis');
    const redisPort = Number(
      config.get<string>('REDIS_PORT', '6379'),
    );
    this.logger.log(
      `FileService connecting to Redis at ${redisHost}:${redisPort}`,
    );
    const queueName = config.get<string>('MINIO_QUEUE_NAME', 'minio:jobs');

    this.sharedRoot = path.resolve(
      config.get<string>('MINIO_SHARED_DIR', '/exports'),
    );
    this.queueAddTimeoutMs = Number(
      config.get<string>('QUEUE_ADD_TIMEOUT_MS', '5000'),
    );

    this.queue = new Bull<MinioJobData>(queueName, {
      redis: {
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
    });

    this.queueReady = this.queue
      .isReady()
      .then(() => {
        this.logger.log(
          `MinIO queue ready (redis ${redisHost}:${redisPort}, queue ${queueName})`,
        );
      })
      .catch((err) => {
        this.logger.error(
          `Failed to connect to Redis at ${redisHost}:${redisPort}`,
          err instanceof Error ? err.stack : err,
        );
        throw err;
      });

    this.queue.on('error', (err) => {
      this.logger.error(
        `Redis queue error: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
    this.queue.on('waiting', (jobId) =>
      this.logger.debug(`Queue waiting job ${jobId}`),
    );
    this.queue.on('active', (job) =>
      this.logger.debug(`Queue active job ${job.id}`),
    );
  }

  getQueue() {
    return this.queue;
  }

  getRoom(jobId: string | number): string {
    return `file:${jobId}`;
  }

  async enqueueWriteJob(dto: CreateFileJobDto): Promise<FileJobSummary> {
    const operation = dto.operation ?? 'create';
    const sourcePath = await this.ensureSharedPath(dto.sourcePath, true);

    this.logger.debug(
      `Enqueueing ${operation} job for key ${dto.key} (source: ${sourcePath})`,
    );

    await this.queueReady;

    const job = await this.addJobWithTimeout(
      this.queue.add(
        operation,
        {
          type: operation,
          key: dto.key,
          bucket: dto.bucket,
          sourcePath,
          contentType: dto.contentType,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 25,
        },
      ),
      `add ${operation} job for ${dto.key}`,
    );

    this.logger.debug(`Queued ${operation} job ${job.id} for ${dto.key}`);
    return this.serializeJob(job);
  }

  async enqueueReadJob(dto: ReadFileJobDto): Promise<FileJobSummary> {
    const destinationPath = await this.ensureSharedPath(
      dto.destinationPath,
      false,
    );

    this.logger.debug(
      `Enqueueing read job for key ${dto.key} (destination: ${destinationPath})`,
    );

    await this.queueReady;

    const job = await this.addJobWithTimeout(
      this.queue.add(
        'read',
        {
          type: 'read',
          key: dto.key,
          bucket: dto.bucket,
          destinationPath,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 25,
        },
      ),
      `add read job for ${dto.key}`,
    );

    this.logger.debug(`Queued read job ${job.id} for ${dto.key}`);
    return this.serializeJob(job);
  }

  private async addJobWithTimeout<T>(
    promise: Promise<T>,
    description: string,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const guardedPromise = promise.catch((err) => {
      throw err;
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new Error(
            `${description} timed out after ${this.queueAddTimeoutMs}ms`,
          ),
        );
      }, this.queueAddTimeoutMs);
    });

    try {
      const result = (await Promise.race([
        guardedPromise,
        timeoutPromise,
      ])) as T;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      return result;
    } catch (err) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      this.logger.error(
        `${description} failed: ${err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }

  async getJob(jobId: string): Promise<FileJobSummary | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return this.serializeJob(job);
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  private async serializeJob(job: BullJob<MinioJobData>): Promise<FileJobSummary> {
    const state = await job.getState();
    return {
      id: String(job.id),
      state,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      data: job.data as Record<string, unknown>,
      result: job.returnvalue,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn ?? null,
      processedOn: job.processedOn ?? null,
    };
  }

  private async ensureSharedPath(
    input: string,
    mustExist: boolean,
  ): Promise<string> {
    if (!input) {
      throw new BadRequestException('Path is required');
    }

    const candidate = path.resolve(
      input.startsWith('/') ? input : path.join(this.sharedRoot, input),
    );
    const relative = path.relative(this.sharedRoot, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException(
        `Path "${input}" escapes shared directory ${this.sharedRoot}`,
      );
    }

    if (mustExist) {
      try {
        await fs.access(candidate);
      } catch {
        throw new BadRequestException(`Path "${candidate}" does not exist`);
      }
    } else {
      await fs.mkdir(path.dirname(candidate), { recursive: true });
    }

    return candidate;
  }
}
