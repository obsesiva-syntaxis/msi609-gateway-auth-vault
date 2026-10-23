import {
  All,
  BadGatewayException,
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { readBody } from './http-utils';
import { findPolicy } from './policies';
import { SessionGuard } from './session.guard';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_BODY_BYTES = 1_000_000;

@Controller()
export class ProxyController {
  private readonly backendUrl = process.env.BACKEND_URL ?? 'http://backend:9000';

  @Get('health')
  health() {
    return { status: 'OK', service: 'API Gateway' };
  }

  @All('api/*')
  @UseGuards(SessionGuard)
  async proxy(@Req() req: any, @Res() res: Response) {
    const path: string = req.params[0] ?? '';

    // Bloquea path traversal hacia rutas no previstas del backend
    if (path.split('/').includes('..') || path.includes('\\')) {
      throw new BadRequestException('Ruta invalida');
    }

    // Lista blanca + autorizacion por rol, con la identidad de la SESION
    const policy = findPolicy(req.method, path);
    if (!policy) throw new NotFoundException('Ruta no expuesta por el gateway');

    const { identity, backendSecret } = req.session;
    if (!policy.roles.some((r: string) => identity.roles.includes(r))) {
      throw new ForbiddenException('Permiso insuficiente');
    }

    const queryIndex: number = req.originalUrl.indexOf('?');
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';

    // Headers NUEVOS: ningun header del cliente se reenvia (ni X-Authenticated-*)
    const headers: Record<string, string> = {
      'X-Gateway-Secret': backendSecret,
      'X-Authenticated-User': identity.userId,
      'X-Authenticated-Username': identity.username,
      'X-Authenticated-Roles': identity.roles.join(','),
    };
    const contentType = req.headers['content-type'];
    if (contentType) headers['content-type'] = contentType;

    const body = METHODS_WITH_BODY.has(req.method)
      ? await readBody(req, MAX_BODY_BYTES)
      : undefined;

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${this.backendUrl}/${path}${query}`, {
        method: req.method,
        headers,
        body: body && body.length > 0 ? new Uint8Array(body) : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new BadGatewayException('Backend no disponible');
    }

    const payload = Buffer.from(await upstream.arrayBuffer());

    // Un 401 del backend significa que el gateway no propago la identidad
    if (upstream.status === 401) {
      throw new BadGatewayException('Error de comunicacion interna');
    }
    // Un 403 por secreto invalido no se revela al cliente; el 403 por rol si pasa
    if (upstream.status === 403) {
      let code: string | undefined;
      try {
        code = JSON.parse(payload.toString('utf8')).code;
      } catch {
        /* cuerpo no JSON: se trata como 403 normal */
      }
      if (code === 'INVALID_GATEWAY_SECRET') {
        throw new BadGatewayException('Error de comunicacion interna');
      }
    }

    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) res.setHeader('content-type', upstreamType);
    res.status(upstream.status).send(payload);
  }
}
