import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Identity } from './types';

@Injectable()
export class AuthClient {
  private readonly baseUrl = process.env.AUTH_URL ?? 'http://auth:8100';

  private async post(path: string, body: unknown, secret?: string): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(secret ? { 'x-introspection-secret': secret } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException('Servicio de autenticacion no disponible');
    }
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    const res = await this.post('/login', { username, password });
    if (res.status === 401) throw new UnauthorizedException('Credenciales invalidas');
    if (res.status === 400) throw new BadRequestException('username y password requeridos');
    if (!res.ok) throw new BadGatewayException('Error de comunicacion interna');
    return (await res.json()) as { access_token: string; expires_in: number };
  }

  // Devuelve la identidad si la sesion esta activa, o null si no lo esta.
  async introspect(token: string, secret: string): Promise<Identity | null> {
    const res = await this.post('/introspect', { token }, secret);
    if (!res.ok) throw new BadGatewayException('Error de comunicacion interna');
    const b = (await res.json()) as {
      active: boolean;
      user_id?: string;
      username?: string;
      roles?: string[];
    };
    if (!b.active || !b.user_id || !b.username || !Array.isArray(b.roles)) return null;
    return { userId: b.user_id, username: b.username, roles: b.roles };
  }

  async logout(token: string, secret: string): Promise<void> {
    const res = await this.post('/logout', { token }, secret);
    if (!res.ok) throw new BadGatewayException('Error de comunicacion interna');
  }
}
