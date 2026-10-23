import type { NextFunction, Request, Response } from 'express';

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
