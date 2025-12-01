import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { FileStorageService } from '../storage/file-storage.service';

@Module({
  imports: [AuthModule],
  controllers: [HistoryController],
  providers: [HistoryService, PrismaService, FileStorageService],
})
export class HistoryModule { }
