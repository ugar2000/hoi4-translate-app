import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../storage/file-storage.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { randomUUID } from 'crypto';
import { basename } from 'path';
import { Readable } from 'stream';
import { Express } from 'express';

interface UploadFiles {
  original?: Express.Multer.File[];
  translated?: Express.Multer.File[];
}

interface StoredFile {
  stream: Readable;
  fileName: string;
  contentType?: string;
}

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorageService,
  ) {}

  async createHistoryEntry(
    userId: number,
    dto: CreateHistoryDto,
    files: UploadFiles,
  ) {
    const originalFile = files.original?.[0];
    const translatedFile = files.translated?.[0];

    if (!originalFile || !translatedFile) {
      throw new BadRequestException('Both original and translated files are required');
    }

    const baseKey = `user-${userId}/${Date.now()}-${randomUUID()}`;
    const originalName = this.sanitizeFileName(originalFile.originalname || 'original.yml');
    const translatedName = this.sanitizeFileName(translatedFile.originalname || 'translated.yml');

    const originalKey = `${baseKey}/original-${originalName}`;
    const translatedKey = `${baseKey}/translated-${translatedName}`;

    await this.storage.upload(
      originalKey,
      originalFile.buffer,
      originalFile.mimetype || 'application/octet-stream',
      `attachment; filename="${originalName}"`,
    );

    await this.storage.upload(
      translatedKey,
      translatedFile.buffer,
      translatedFile.mimetype || 'application/octet-stream',
      `attachment; filename="${translatedName}"`,
    );

    return this.prisma.translate.create({
      data: {
        userId,
        originalFile: originalKey,
        translatedFile: translatedKey,
        originLang: dto.originLang,
        translatedLang: dto.translatedLang,
      },
    });
  }

  getHistoryForUser(userId: number) {
    return this.prisma.translate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStoredFile(
    userId: number,
    id: number,
    type: 'original' | 'translated',
  ): Promise<StoredFile> {
    const entry = await this.prisma.translate.findFirst({
      where: { id, userId },
    });

    if (!entry) {
      throw new NotFoundException('History entry not found');
    }

    const key = type === 'original' ? entry.originalFile : entry.translatedFile;
    try {
      const { stream, contentType } = await this.storage.getObject(key);
      const fileName = basename(key);

      return {
        stream,
        contentType,
        fileName,
      };
    } catch (error) {
      throw new NotFoundException('Stored file could not be retrieved');
    }
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
