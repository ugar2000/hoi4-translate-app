import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertFileDto } from './dto/upsert-file.dto';
import { MarkFileErrorDto } from './dto/mark-file-error.dto';
import { ChunkCompleteDto } from './dto/chunk-complete.dto';
import { FileGateway } from '../file/file.gateway';

@Controller('pipeline/files')
export class PipelineController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileGateway: FileGateway,
  ) { }

  private readonly logger = new Logger(PipelineController.name);

  @Post('upsert')
  @HttpCode(204)
  async upsertFile(@Body() dto: UpsertFileDto): Promise<void> {
    this.logger.log(
      `Upserting file metadata ${dto.fileId} (lines=${dto.totalLines}, chunks=${dto.totalChunks}, origin=${dto.originLang}, target=${dto.targetLang})`,
    );
    await this.prisma.pipelineFile.upsert({
      where: { fileId: dto.fileId },
      create: {
        fileId: dto.fileId,
        status: 'split',
        totalLines: dto.totalLines,
        totalChunks: dto.totalChunks,
        originLang: dto.originLang,
        targetLang: dto.targetLang,
        progress: {
          create: {
            processedLines: 0,
            processedChunks: 0,
          },
        },
      },
      update: {
        status: 'split',
        totalLines: dto.totalLines,
        totalChunks: dto.totalChunks,
        originLang: dto.originLang,
        targetLang: dto.targetLang,
        error: null,
        progress: {
          update: {
            processedLines: 0,
            processedChunks: 0,
            updatedAt: new Date(),
          },
        },
      },
    });
  }

  @Post('error')
  @HttpCode(204)
  async markError(@Body() dto: MarkFileErrorDto): Promise<void> {
    this.logger.error(`Marking file error for ${dto.fileId}`, dto.error);
    await this.prisma.pipelineFile.upsert({
      where: { fileId: dto.fileId },
      create: {
        fileId: dto.fileId,
        status: 'error',
        error: dto.error,
        totalLines: 0,
        totalChunks: 0,
        progress: {
          create: {},
        },
      },
      update: {
        status: 'error',
        error: dto.error,
      },
    });
  }

  @Post('chunk')
  @HttpCode(204)
  async handleChunkComplete(@Body() dto: ChunkCompleteDto): Promise<void> {
    this.logger.log(
      `Chunk complete for ${dto.fileId}#${dto.chunkSeq} with ${dto.lines.length} lines`,
    );
    this.logger.debug(
      `Chunk payload ${dto.fileId}#${dto.chunkSeq}: ${JSON.stringify(dto.lines)}`,
    );
    const totalLines = dto.lines.length;

    await this.prisma.pipelineProgress.upsert({
      where: { fileId: dto.fileId },
      create: {
        fileId: dto.fileId,
        processedLines: totalLines,
        processedChunks: 1,
      },
      update: {
        processedLines: { increment: totalLines },
        processedChunks: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    const file = await this.prisma.pipelineFile.findUnique({
      where: { fileId: dto.fileId },
      select: { totalChunks: true },
    });

    const progress = await this.prisma.pipelineProgress.findUnique({
      where: { fileId: dto.fileId },
      select: { processedChunks: true },
    });

    if (
      file &&
      progress &&
      progress.processedChunks >= file.totalChunks &&
      file.totalChunks > 0
    ) {
      this.logger.log(`File ${dto.fileId} marked as completed`);
      this.logger.log(
        `Final result for ${dto.fileId}: chunks=${file.totalChunks}, processedChunks=${progress.processedChunks}`,
      );
      await this.prisma.pipelineFile.update({
        where: { fileId: dto.fileId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }

    this.fileGateway.emitFileChunk(dto.fileId, dto.chunkSeq, dto.lines);
  }
}
