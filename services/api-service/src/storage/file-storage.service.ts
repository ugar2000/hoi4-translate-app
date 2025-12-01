import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createMinio,
  ensureBucket,
  MinioClient,
} from '../../../../packages/miniox';
import { Readable } from 'stream';

interface GetObjectResult {
  stream: Readable;
  contentType?: string;
}

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly bucket: string;
  private readonly client: MinioClient;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'translations');
    this.client = createMinio('api-service');
  }

  async onModuleInit() {
    try {
      await ensureBucket(this.client, this.bucket);
      this.logger.log(`MinIO bucket ready: ${this.bucket}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize bucket ${this.bucket}`,
        error instanceof Error ? error.stack : `${error}`,
      );
      throw error;
    }
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
    contentDisposition?: string,
  ): Promise<void> {
    const metadata: Record<string, string> = {
      'Content-Type': contentType,
    };

    if (contentDisposition) {
      metadata['Content-Disposition'] = contentDisposition;
    }

    try {
      await this.client.putObject(this.bucket, key, body, undefined, metadata);
      this.logger.debug(`Uploaded object ${key} (${body.length} bytes)`);
    } catch (error) {
      this.logger.error(
        `Failed to upload object ${key}`,
        error instanceof Error ? error.stack : `${error}`,
      );
      throw error;
    }
  }

  async getObject(key: string): Promise<GetObjectResult> {
    try {
      const stream = (await this.client.getObject(this.bucket, key)) as Readable;
      let contentType: string | undefined;

      try {
        const stat = await this.client.statObject(this.bucket, key);
        const meta = stat.metaData ?? {};
        contentType =
          meta['content-type'] ??
          meta['Content-Type'] ??
          meta['content_type'] ??
          undefined;
      } catch (statError) {
        this.logger.warn(
          `Could not read metadata for ${key}: ${
            statError instanceof Error ? statError.message : statError
          }`,
        );
      }

      return {
        stream,
        contentType,
      };
    } catch (error) {
      this.logger.error(
        `Failed to read object ${key}`,
        error instanceof Error ? error.stack : `${error}`,
      );
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
      this.logger.debug(`Deleted object ${key}`);
    } catch (error: any) {
      if (error?.code === 'NoSuchKey') {
        this.logger.warn(`Object ${key} not found while deleting`);
        return;
      }

      this.logger.error(
        `Failed to delete object ${key}`,
        error instanceof Error ? error.stack : `${error}`,
      );
      throw error;
    }
  }
}
