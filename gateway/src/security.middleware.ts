import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ?? 'http://localhost:8000,http://127.0.0.1:8000'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Solo metodo, ruta (sin query) y codigo: nunca headers ni cuerpo.
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const inicio = Date.now();
  res.on('finish', () => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl.split('?')[0]} -> ${res.statusCode} (${Date.now() - inicio}ms)`,
    );
  });
  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
  res.setHeader('Cache-Control', 'no-store');
  next();
}

// Defensa adicional contra CSRF: si el navegador declara un Origin ajeno
// en un metodo que modifica estado, se rechaza. Curl/Postman no envian Origin.
export function originCheck(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ statusCode: 403, message: 'Origen no permitido' });
    return;
  }
  next();
}
