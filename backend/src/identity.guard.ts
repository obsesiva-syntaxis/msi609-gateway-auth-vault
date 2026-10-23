import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Identity } from './types';

// Lee la identidad que el gateway propaga tras validar la sesion.
// Solo se llega aqui si el secreto del gateway ya fue aceptado.
@Injectable()
export class IdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const one = (name: string): string => {
      const v = req.headers[name];
      return (Array.isArray(v) ? v[0] : v) ?? '';
    };

    const userId = one('x-authenticated-user');
    const username = one('x-authenticated-username');
    if (!userId || !username) {
      throw new UnauthorizedException('Identidad no propagada por el gateway');
    }

    const identity: Identity = {
      userId,
      username,
      roles: one('x-authenticated-roles')
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
    };
    req.identity = identity;
    return true;
  }
}
