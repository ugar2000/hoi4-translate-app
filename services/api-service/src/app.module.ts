import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TranslateModule } from './translate/translate.module';
import { HistoryModule } from './history/history.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TranslateModule,
    HistoryModule,
  ],
})
export class AppModule {}
