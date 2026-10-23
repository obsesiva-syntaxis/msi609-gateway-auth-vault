import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthClient } from './auth-client.service';
import { getCookie, readJson, SESSION_COOKIE } from './http-utils';
import { SessionGuard } from './session.guard';
import { VaultService } from './vault.service';

// Secure solo se activa con HTTPS; en el laboratorio local (HTTP) va en false.
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly vault: VaultService,
    private readonly auth: AuthClient,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { username, password } = (await readJson(req)) ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new BadRequestException('username y password requeridos');
    }
    const result = await this.auth.login(username, password);

    // El token viaja solo en la cookie HttpOnly, nunca en el cuerpo
    res.cookie(SESSION_COOKIE, result.access_token, {
      ...COOKIE_BASE,
      maxAge: result.expires_in * 1000,
    });
    return { authenticated: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() req: any) {
    const { userId, username, roles } = req.session.identity;
    return { user_id: userId, username, roles };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = getCookie(req, SESSION_COOKIE);
    if (token) {
      // Si no se puede revocar, se lanza el error y la cookie NO se borra
      const secrets = await this.vault.getGatewaySecrets();
      await this.auth.logout(token, secrets.auth_introspection_secret);
    }
    res.clearCookie(SESSION_COOKIE, COOKIE_BASE);
    return { logged_out: true };
  }
}
