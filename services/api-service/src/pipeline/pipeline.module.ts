import { Module } from '@nestjs/common';
import { PipelineController } from './pipeline.controller';
import { PrismaService } from '../prisma/prisma.service';
import { FileModule } from '../file/file.module';

@Module({
  imports: [FileModule],
  controllers: [PipelineController],
  providers: [PrismaService],
})
export class PipelineModule {}
