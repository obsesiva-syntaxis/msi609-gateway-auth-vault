import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.VAULT_TOKEN) {
    throw new Error('VAULT_TOKEN no configurado');
  }
  const app = await NestFactory.create(AppModule);

  // Log de peticiones: solo metodo, ruta y codigo. Nunca cuerpo ni headers
  // (el cuerpo de /login trae contrasenas y el de /introspect trae tokens).
  app.use((req: any, res: any, next: () => void) => {
    const inicio = Date.now();
    res.on('finish', () => {
      console.log(
        `${new Date().toISOString()} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - inicio}ms)`,
      );
    });
    next();
  });

  await app.listen(8100, '0.0.0.0');
}
bootstrap();
