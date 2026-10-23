import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';

// Se comparan los SHA-256: ambos buffers miden siempre 32 bytes,
// lo que evita errores por largo distinto o caracteres no ASCII.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

@Injectable()
export class GatewaySecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const raw = req.headers['x-gateway-secret'];
    const received: string = (Array.isArray(raw) ? raw[0] : raw) ?? '';
    const expected = process.env.INTERNAL_GATEWAY_SECRET ?? '';
    if (!safeEqual(received, expected)) {
      // El campo "code" permite al gateway distinguir este 403 del de rol
      throw new ForbiddenException({
        statusCode: 403,
        code: 'INVALID_GATEWAY_SECRET',
        message: 'Solicitud no autorizada desde Gateway',
      });
    }
    return true;
  }
}
