import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthClient } from './auth-client.service';
import { getCookie, SESSION_COOKIE } from './http-utils';
import { VaultService } from './vault.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly vault: VaultService,
    private readonly auth: AuthClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = getCookie(req, SESSION_COOKIE);
    if (!token) throw new UnauthorizedException('Sesion requerida');

    const secrets = await this.vault.getGatewaySecrets();
    const identity = await this.auth.introspect(token, secrets.auth_introspection_secret);
    if (!identity) throw new UnauthorizedException('Sesion invalida o expirada');

    // El secreto del backend vive solo en este objeto de la peticion
    req.session = { identity, backendSecret: secrets.backend_shared_secret };
    return true;
  }
}
