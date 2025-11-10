import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TranslateModule } from './translate/translate.module';
import { HistoryModule } from './history/history.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { FileModule } from './file/file.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'services/api-service/.env'],
    }),
    AuthModule,
    TranslateModule,
    FileModule,
    HistoryModule,
    PipelineModule,
  ],
})
export class AppModule { }
