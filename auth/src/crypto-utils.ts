import { createHash, timingSafeEqual } from 'crypto';

// Se comparan los SHA-256: ambos buffers miden siempre 32 bytes,
// lo que evita errores por largo distinto y no filtra el largo del secreto.
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
