import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { InternalSecretGuard } from './internal-secret.guard';

function validToken(token: unknown): token is string {
  return typeof token === 'string' && token.length > 0 && token.length <= 256;
}

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('health')
  health() {
    return { status: 'OK', service: 'Auth Service' };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: any) {
    const { username, password } = body ?? {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.length === 0 ||
      username.length > 64 ||
      password.length > 128
    ) {
      throw new BadRequestException('username y password requeridos');
    }
    const result = await this.auth.login(username, password);
    // Mismo mensaje para usuario inexistente y password incorrecta
    if (!result) throw new UnauthorizedException('Credenciales invalidas');
    return result;
  }

  @Post('introspect')
  @HttpCode(200)
  @UseGuards(InternalSecretGuard)
  introspect(@Body() body: any) {
    if (!validToken(body?.token)) return { active: false };
    return this.auth.introspect(body.token);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(InternalSecretGuard)
  logout(@Body() body: any) {
    if (!validToken(body?.token)) return { revoked: false };
    return { revoked: this.auth.logout(body.token) };
  }
}
