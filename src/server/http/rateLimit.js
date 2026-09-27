import 'server-only';
import { NextResponse } from 'next/server';

const rateLimitMapByKey = new Map();

// El Map vive mientras dure el proceso; sin poda, cada IP/uid que pasó por acá
// se queda para siempre aunque no vuelva a pedir nada. Se poda de forma
// probabilística (no en cada request) para no gastar ciclos de más.
const CLEANUP_PROBABILITY = 0.01;
const MAX_IDLE_MS = 10 * 60 * 1000;

function cleanupStaleEntries() {
  const now = Date.now();
  for (const [key, records] of rateLimitMapByKey) {
    const last = records[records.length - 1];
    if (last == null || now - last > MAX_IDLE_MS) {
      rateLimitMapByKey.delete(key);
    }
  }
}

export function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous'
  );
}

/**
 * Límite por IP. Cada ruta debe usar un `id` distinto para no compartir contador
 * (p. ej. el polling del chat no debe agotar el cupo de login).
 * @param {string} options.id - Identificador único por endpoint (ej. 'chat-messages-get')
 */
export function rateLimit(
  req,
  { limit = 10, windowMs = 60000, id = 'default' } = {}
) {
  const ip = getClientIp(req);
  return rateLimitKey(`ip:${ip}:${id}`, { limit, windowMs });
}

/**
 * Límite por clave arbitraria (p. ej. uid) para complementar el límite por IP.
 * @param {string} key - Identificador único (ej. `chat:post:uid123`)
 */
export function rateLimitKey(
  key,
  { limit = 10, windowMs = 60000, message } = {}
) {
  if (Math.random() < CLEANUP_PROBABILITY) cleanupStaleEntries();

  const now = Date.now();
  const userRecords = rateLimitMapByKey.get(key) || [];
  const recentRecords = userRecords.filter(
    (timestamp) => now - timestamp < windowMs
  );
  if (recentRecords.length >= limit) {
    const text =
      message ||
      'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    return NextResponse.json(
      {
        success: false,
        error: text,
        message: text,
      },
      { status: 429 }
    );
  }
  recentRecords.push(now);
  rateLimitMapByKey.set(key, recentRecords);
  return null;
}
