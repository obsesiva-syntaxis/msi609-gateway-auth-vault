import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { safeEqual } from './crypto-utils';
import { VaultService } from './vault.service';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly vault: VaultService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const raw = req.headers['x-introspection-secret'];
    const received: string = (Array.isArray(raw) ? raw[0] : raw) ?? '';
    const expected = await this.vault.getSecret('auth_introspection_secret');
    if (!safeEqual(received, expected)) {
      throw new ForbiddenException('Solicitud no autorizada');
    }
    return true;
  }
}
