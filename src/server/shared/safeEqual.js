import crypto from 'crypto';

/**
 * Compara dos secretos en tiempo constante para no filtrar por timing cuántos
 * caracteres coinciden. Devuelve false si alguno falta o difiere en longitud.
 */
export function safeEqual(a, b) {
  if (a == null || b == null) return false;
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
