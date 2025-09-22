import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TranslateController } from './translate.controller';
import { TranslateService } from './translate.service';
import { TranslateGateway } from './translate.gateway';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'TRANSLATION_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('TRANSLATION_HOST', 'localhost'),
            port: Number(config.get<string>('TRANSLATION_PORT', '4001')),
          },
        }),
      },
    ]),
  ],
  controllers: [TranslateController],
  providers: [TranslateService, TranslateGateway],
})
export class TranslateModule {}
