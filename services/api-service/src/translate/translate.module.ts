import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TranslateController } from './translate.controller';
import { TranslateService } from './translate.service';
import { TranslateGateway } from './translate.gateway';
import { CoordinatorClient } from './coordinator.client';
// import { createMinio } from '../../../../packages/miniox';

// export const MINIO_TOKEN = 'MINIO_CLIENT';

@Module({
  imports: [ConfigModule],
  controllers: [TranslateController],
  providers: [
    TranslateService,
    TranslateGateway,
    {
      provide: CoordinatorClient,
      useFactory: (config: ConfigService) => {
        const address = config.get<string>(
          'COORDINATOR_ADDRESS',
          'localhost:50051',
        );
        return new CoordinatorClient(address);
      },
      inject: [ConfigService],
    },
    // {
    //   provide: MINIO_TOKEN,
    //   useFactory: () => createMinio('api-service'),
    // },
  ],
  exports: [CoordinatorClient /* , MINIO_TOKEN */],
})
export class TranslateModule {}
