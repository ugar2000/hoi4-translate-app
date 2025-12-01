import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
// import { getTextObject } from '../../../../packages/miniox';
// import type { MinioClient } from '../../../../packages/miniox';
// import { delay } from '../../../../packages/redisx';
import { CoordinatorClient } from './coordinator.client';
// import { MINIO_TOKEN } from './translate.module';

interface TranslationPayload {
  text: string;
  targetLanguage: string;
  mode?: 'translate' | 'post-process';
  context?: string;
}

@Injectable()
export class TranslateService {
  private readonly bucket: string;
  private readonly inputPrefix: string;
  private readonly outputPrefix: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly coordinator: CoordinatorClient,
    // @Inject(MINIO_TOKEN) private readonly minio: MinioClient,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'translator');
    this.inputPrefix = this.config.get<string>('INPUT_PREFIX', 'inline');
    this.outputPrefix = this.config.get<string>('OUTPUT_PREFIX', 'out');
    this.timeoutMs = Number(this.config.get<string>('TRANSLATION_TIMEOUT_MS', '45000'));
  }

  async translate(payload: TranslationPayload) {
    try {
      const fileId = this.createJobId();
      const lines = this.prepareLines(payload.text);
      const { total_lines: totalLines } = await this.coordinator.startJob({
        file_id: fileId,
        bucket: this.bucket,
        object_prefix: this.inputPrefix,
        lines,
        target_language: payload.targetLanguage,
      });

      await this.waitForCompletion(fileId, totalLines);

      // const finalKey = `${this.outputPrefix}/${fileId}/final.txt`;
      // const translated = await getTextObject(this.minio, this.bucket, finalKey);

      // TODO: MinIO functionality temporarily disabled
      return { translatedText: 'MinIO functionality temporarily disabled' };
    } catch (error) {
      throw new InternalServerErrorException('Translation failed');
    }
  }

  private prepareLines(text: string): string[] {
    return text.split(/\r?\n/);
  }

  private createJobId(): string {
    return `api-${randomUUID()}`;
  }

  private async waitForCompletion(fileId: string, totalLines: number): Promise<void> {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      const status = await this.coordinator.getStatus(fileId);
      const processed = status.lines?.processed ?? 0;
      if (processed >= totalLines) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    throw new Error('Pipeline timeout');
  }
}
