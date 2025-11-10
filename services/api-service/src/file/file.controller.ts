import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileService } from './file.service';
import { CreateFileJobDto } from './dto/create-file-job.dto';
import { ReadFileJobDto } from './dto/read-file-job.dto';
import { FileWorkflowService } from './file.workflow.service';
import { StartFileProcessDto } from './dto/start-file-process.dto';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(
    private readonly fileService: FileService,
    private readonly workflow: FileWorkflowService,
  ) {}

  @Post('process')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  startPipeline(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: StartFileProcessDto,
  ) {
    this.logger.log(
      `Received file pipeline request (target=${dto.targetLang ?? 'missing'}, size=${
        file?.size ?? 'n/a'
      }, mimetype=${file?.mimetype ?? 'n/a'})`,
    );
    const startTime = Date.now();
    return this.workflow
      .startFromUpload(file, dto.targetLang)
      .then((result) => {
        this.logger.log(
          `File pipeline queued (fileId=${result.fileId}, uploadJob=${result.uploadJobId}, duration=${Date.now() - startTime}ms)`,
        );
        return result;
      })
      .catch((err) => {
        this.logger.error(
          `Failed to start file pipeline: ${err instanceof Error ? err.message : err}`,
        );
        throw err;
      });
  }

  @Post('upload')
  createFileJob(@Body() dto: CreateFileJobDto) {
    return this.fileService.enqueueWriteJob(dto);
  }

  @Post('download')
  readFileJob(@Body() dto: ReadFileJobDto) {
    return this.fileService.enqueueReadJob(dto);
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    const job = await this.fileService.getJob(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }
}
