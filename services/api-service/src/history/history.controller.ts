import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/request-with-user.interface';
import { CreateHistoryDto } from './dto/create-history.dto';
import { Response } from 'express';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'original', maxCount: 1 },
        { name: 'translated', maxCount: 1 },
      ],
      { storage: memoryStorage() },
    ),
  )
  async createHistory(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateHistoryDto,
    @UploadedFiles()
    files: { original?: Express.Multer.File[]; translated?: Express.Multer.File[] },
  ) {
    const entry = await this.historyService.createHistoryEntry(user.id, dto, files);
    return {
      id: entry.id,
      originLang: entry.originLang,
      translatedLang: entry.translatedLang,
      createdAt: entry.createdAt,
      originalFile: entry.originalFile,
      originalFileName: this.getDisplayName(entry.originalFile),
      translatedFile: entry.translatedFile,
      translatedFileName: this.getDisplayName(entry.translatedFile),
    };
  }

  @Get()
  async listHistory(@CurrentUser() user: RequestUser) {
    const entries = await this.historyService.getHistoryForUser(user.id);
    return entries.map((entry) => ({
      id: entry.id,
      originLang: entry.originLang,
      translatedLang: entry.translatedLang,
      createdAt: entry.createdAt,
      originalFile: entry.originalFile,
      originalFileName: this.getDisplayName(entry.originalFile),
      translatedFile: entry.translatedFile,
      translatedFileName: this.getDisplayName(entry.translatedFile),
    }));
  }

  @Get(':id/original')
  async downloadOriginal(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.historyService.getStoredFile(user.id, id, 'original');
    res.setHeader(
      'Content-Type',
      file.contentType ?? 'application/octet-stream',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${this.getDisplayName(file.fileName)}"`,
    );
    return new StreamableFile(file.stream);
  }

  @Get(':id/translated')
  async downloadTranslated(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.historyService.getStoredFile(user.id, id, 'translated');
    res.setHeader(
      'Content-Type',
      file.contentType ?? 'application/octet-stream',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${this.getDisplayName(file.fileName)}"`,
    );
    return new StreamableFile(file.stream);
  }

  private getDisplayName(key: string): string {
    const base = key.split('/').pop() ?? key;
    return base.replace(/^(original|translated)-/, '');
  }
}
