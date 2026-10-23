import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { requestLogger } from './request-logger';

async function bootstrap() {
  if (!process.env.INTERNAL_GATEWAY_SECRET) {
    throw new Error('INTERNAL_GATEWAY_SECRET no esta configurado');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable('x-powered-by');
  app.use(requestLogger);
  await app.listen(9000, '0.0.0.0');
}
bootstrap();
