import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileController } from './file.controller';
import { FileGateway } from './file.gateway';
import { FileService } from './file.service';
import { AuthModule } from '../auth/auth.module';
import { FileWorkflowService } from './file.workflow.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [FileController],
  providers: [FileService, FileGateway, FileWorkflowService],
  exports: [FileService, FileGateway, FileWorkflowService],
})
export class FileModule {}
