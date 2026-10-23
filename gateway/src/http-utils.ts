import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { Request } from 'express';

export const SESSION_COOKIE = 'session_token';

// Lee el cuerpo crudo con un tope de tamano (evita agotar memoria).
export async function readBody(req: Request, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.from(chunk);
    size += buf.length;
    if (size > limit) {
      throw new PayloadTooLargeException('Cuerpo demasiado grande');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req: Request, limit = 10_000): Promise<any> {
  const raw = await readBody(req, limit);
  if (raw.length === 0) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw new BadRequestException('JSON invalido');
  }
}

export function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return undefined;
}
