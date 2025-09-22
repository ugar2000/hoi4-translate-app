import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

interface GetObjectResult {
  stream: Readable;
  contentType?: string;
}

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'http://minio:9000');
    const accessKeyId = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretAccessKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    const region = this.configService.get<string>('MINIO_REGION', 'us-east-1');

    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'translations');
    this.s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
    contentDisposition?: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(contentDisposition ? { ContentDisposition: contentDisposition } : {}),
      }),
    );
  }

  async getObject(key: string): Promise<GetObjectResult> {
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    const stream = response.Body as Readable | undefined;
    if (!stream) {
      throw new Error(`File ${key} did not return a readable stream`);
    }

    return {
      stream,
      contentType: response.ContentType ?? undefined,
    };
  }

  private async ensureBucket() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      this.logger.log(`Bucket ${this.bucket} not found, attempting to create`);
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (createError: any) {
        const errorCode = createError?.Code ?? createError?.name;
        if (errorCode !== 'BucketAlreadyOwnedByYou' && errorCode !== 'BucketAlreadyExists') {
          this.logger.error(`Failed to create bucket ${this.bucket}: ${createError}`);
          throw createError;
        }
      }
    }
  }
}
