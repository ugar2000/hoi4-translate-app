import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const host = process.env.TRANSLATION_HOST || '0.0.0.0';
  const port = parseInt(process.env.TRANSLATION_PORT || '4001', 10);

  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
    options: {
      host,
      port,
    },
  });

  await app.listen();
  console.log(`Translation microservice listening on ${host}:${port}`);
}

bootstrap();
