import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { originCheck, requestLogger, securityHeaders } from './security.middleware';

async function bootstrap() {
  if (!process.env.VAULT_TOKEN) {
    throw new Error('VAULT_TOKEN no configurado');
  }
  // bodyParser desactivado: el gateway lee el cuerpo crudo (login y proxy)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(originCheck);
  app.useStaticAssets(join(process.cwd(), 'public'));
  await app.listen(8000, '0.0.0.0');
}
bootstrap();
