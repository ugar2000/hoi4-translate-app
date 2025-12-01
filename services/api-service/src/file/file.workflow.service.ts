import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bull, { Job } from 'bull';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import { FileService } from './file.service';
import type { MinioJobData } from './file.types';

type IngestJobData = {
  fileId: string;
  targetLanguage: string;
  originalName?: string;
};

type PendingUpload = {
  fileId: string;
  targetLanguage: string;
  originalName: string;
  localPath: string;
  operation: 'create' | 'update';
};

type UploadResult = {
  fileId: string;
  uploadJobId: string;
  fileName: string;
};

@Injectable()
export class FileWorkflowService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileWorkflowService.name);
  private readonly ingestQueue: Bull.Queue<IngestJobData>;
  private readonly uploadRoot: string;
  private readonly inputPrefix: string;
  private readonly bucket: string;
  private readonly pendingUploads = new Map<string, PendingUpload>();
  private readonly queueCompletedHandler: (
    jobId: Bull.JobId,
    result: unknown,
  ) => Promise<void>;
  private readonly queueFailedHandler: (
    jobId: Bull.JobId,
    err: Error,
  ) => Promise<void>;

  constructor(
    private readonly fileService: FileService,
    private readonly config: ConfigService,
  ) {
    const redisHost = config.get<string>('REDIS_HOST', 'redis');
    const redisPort = Number(config.get<string>('REDIS_PORT', '6379'));
    this.ingestQueue = new Bull<IngestJobData>('ingest.split', {
      redis: {
        host: redisHost,
        port: redisPort,
      },
    });

    const sharedRoot = path.resolve(
      config.get<string>('MINIO_SHARED_DIR', '/exports'),
    );
    this.uploadRoot = path.join(sharedRoot, 'uploads');
    this.inputPrefix = config.get<string>('INPUT_PREFIX', 'inline');
    this.bucket = config.get<string>('MINIO_BUCKET', 'translator');

    this.queueCompletedHandler = (jobId, result) =>
      this.handleUploadCompleted(jobId, result);
    this.queueFailedHandler = (jobId, err) =>
      this.handleUploadFailed(jobId, err);

    const queue = this.fileService.getQueue();
    queue.on('global:completed', this.queueCompletedHandler);
    queue.on('global:failed', this.queueFailedHandler);
  }

  async onModuleInit() {
    await fs.mkdir(this.uploadRoot, { recursive: true });
  }

  async onModuleDestroy() {
    const queue = this.fileService.getQueue();
    queue.removeListener('global:completed', this.queueCompletedHandler);
    queue.removeListener('global:failed', this.queueFailedHandler);
    await this.ingestQueue.close();
  }

  async startFromUpload(
    file: Express.Multer.File | undefined,
    targetLanguage: string,
  ): Promise<UploadResult> {
    if (!file) {
      this.logger.warn('startFromUpload invoked without file payload');
      throw new BadRequestException('Upload file is required');
    }
    if (!targetLanguage) {
      this.logger.warn('startFromUpload invoked without target language');
      throw new BadRequestException('targetLang is required');
    }

    const fileId = `file-${randomUUID()}`;
    const originalName = this.sanitizeFileName(
      file.originalname || `${fileId}.yml`,
    );
    const targetDir = path.join(this.uploadRoot, fileId);
    await fs.mkdir(targetDir, { recursive: true });
    const localPath = path.join(targetDir, originalName);
    await fs.writeFile(localPath, file.buffer);
    this.logger.debug(
      `Wrote upload temp file for ${fileId} to ${localPath} (${file.size} bytes)`,
    );

    const uploadJob = await this.fileService.enqueueWriteJob({
      key: `${this.inputPrefix}/${fileId}.raw`,
      bucket: this.bucket,
      sourcePath: localPath,
      contentType: file.mimetype || 'application/x-yaml',
      operation: 'create',
    });

    this.pendingUploads.set(uploadJob.id, {
      fileId,
      targetLanguage,
      originalName,
      localPath,
      operation: 'create',
    });

    this.logger.log(
      `Queued upload job ${uploadJob.id} for ${fileId} (${originalName})`,
    );

    return {
      fileId,
      uploadJobId: uploadJob.id,
      fileName: originalName,
    };
  }

  private async handleUploadCompleted(
    jobId: Bull.JobId,
    _result: unknown,
  ) {
    const metadata = this.pendingUploads.get(String(jobId));
    if (!metadata || metadata.operation !== 'create') {
      this.logger.debug(
        `Skipping completion for job ${jobId} (metadata missing or not create)`,
      );
      return;
    }

    this.logger.debug(`Upload job ${jobId} completed, triggering ingest`);
    this.pendingUploads.delete(String(jobId));

    await this.cleanupLocalFile(metadata.localPath);
    this.logger.debug(
      `Preparing ingest job for ${metadata.fileId} (target=${metadata.targetLanguage})`,
    );

    try {
      await this.ingestQueue.add(
        {
          fileId: metadata.fileId,
          targetLanguage: metadata.targetLanguage,
          originalName: metadata.originalName,
        },
        {
          jobId: metadata.fileId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 10,
        },
      );
      this.logger.log(
        `Enqueued ingest job for ${metadata.fileId} targeting ${metadata.targetLanguage}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to enqueue ingest job for ${metadata.fileId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private async handleUploadFailed(
    jobId: Bull.JobId,
    err: Error,
  ) {
    const metadata = this.pendingUploads.get(String(jobId));
    if (!metadata) {
      return;
    }

    this.pendingUploads.delete(String(jobId));
    await this.cleanupLocalFile(metadata.localPath);

    this.logger.error(
      `Upload job ${jobId} for ${metadata.fileId} failed: ${err.message}`,
    );
  }

  private async cleanupLocalFile(localPath: string) {
    try {
      await fs.rm(path.dirname(localPath), { recursive: true, force: true });
    } catch (err) {
      this.logger.warn(
        `Failed to clean up temp upload at ${localPath}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
