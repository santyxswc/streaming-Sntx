import 'server-only';
import { NextResponse } from 'next/server';
import { logger } from '@/server/observability/logger';

// Tras esto se poda el almacén en memoria (probabilístico, no en cada petición).
const CLEANUP_PROBABILITY = 0.01;
const MAX_IDLE_MS = 10 * 60 * 1000;
// Si Redis tarda más, se degrada al almacén en memoria en vez de frenar la API.
const REDIS_TIMEOUT_MS = 1500;

/**
 * Almacén en memoria (ventana deslizante). Vive dentro de una instancia: en
 * serverless cada instancia tiene el suyo y se reinicia en frío, así que solo
 * sirve en desarrollo o como reserva cuando no hay almacén compartido.
 */
export function createMemoryStore() {
  const hitsByKey = new Map();

  function cleanupStaleEntries() {
    const now = Date.now();
    for (const [key, records] of hitsByKey) {
      const last = records[records.length - 1];
      if (last == null || now - last > MAX_IDLE_MS) hitsByKey.delete(key);
    }
  }

  return {
    name: 'memory',
    /** @returns {Promise<boolean>} true si la petición queda dentro del límite */
    async hit(key, { limit, windowMs }) {
      if (Math.random() < CLEANUP_PROBABILITY) cleanupStaleEntries();
      const now = Date.now();
      const recent = (hitsByKey.get(key) || []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hitsByKey.set(key, recent);
        return false;
      }
      recent.push(now);
      hitsByKey.set(key, recent);
      return true;
    },
  };
}

/**
 * Almacén compartido en Upstash Redis (API REST, sin dependencias).
 * Ventana fija: INCR + PEXPIRE NX en un único viaje. Los contadores caducan solos.
 */
export function createUpstashStore({ url, token, fetchImpl = fetch }) {
  const endpoint = `${url.replace(/\/+$/, '')}/pipeline`;
  return {
    name: 'upstash',
    async hit(key, { limit, windowMs }) {
      const redisKey = `rl:${key}`;
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['PEXPIRE', redisKey, String(windowMs), 'NX'],
        ]),
        signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Upstash respondió ${res.status}`);
      const [incr] = await res.json();
      const count = Number(incr?.result);
      if (!Number.isFinite(count)) throw new Error('Respuesta inesperada de Upstash');
      return count <= limit;
    },
  };
}

/** Elige el almacén según el entorno. Acepta los nombres de variable de Upstash y de Vercel KV. */
export function createStoreFromEnv(env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? createUpstashStore({ url, token }) : createMemoryStore();
}

/**
 * @param {{ store: { hit: Function }, fallback?: { hit: Function }, onError?: Function }} deps
 *   `fallback` se usa si `store` lanza (Redis caído o lento): se prioriza que la API siga viva.
 */
export function createRateLimiter({
  store,
  fallback = createMemoryStore(),
  onError = (_message, detail) => logger.warn('ratelimit.store_unavailable', { detail }),
}) {
  async function allowed(key, opts) {
    try {
      return await store.hit(key, opts);
    } catch (error) {
      if (store === fallback) throw error;
      onError('[rateLimit] almacén compartido no disponible, usando memoria:', error?.message);
      return fallback.hit(key, opts);
    }
  }

  const tooManyRequests = (message) => {
    const text = message || 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    return NextResponse.json({ success: false, error: text, message: text }, { status: 429 });
  };

  /**
   * Límite por clave arbitraria (p. ej. uid) para complementar el límite por IP.
   * @param {string} key - Identificador único (ej. `chat:post:uid123`)
   * @returns {Promise<Response|null>} 429 si se superó el límite; null si puede continuar
   */
  async function rateLimitKey(key, { limit = 10, windowMs = 60000, message } = {}) {
    return (await allowed(key, { limit, windowMs })) ? null : tooManyRequests(message);
  }

  /**
   * Límite por IP. Cada ruta debe usar un `id` distinto para no compartir contador
   * (p. ej. el polling del chat no debe agotar el cupo de login).
   * @param {string} options.id - Identificador único por endpoint (ej. 'chat-messages-get')
   * @returns {Promise<Response|null>} recuerda usar `await`: una Promise siempre es truthy
   */
  async function rateLimit(req, { limit = 10, windowMs = 60000, id = 'default' } = {}) {
    return rateLimitKey(`ip:${getClientIp(req)}:${id}`, { limit, windowMs });
  }

  return { rateLimit, rateLimitKey };
}

export function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'anonymous'
  );
}

const defaultLimiter = createRateLimiter({ store: createStoreFromEnv() });
export const rateLimit = defaultLimiter.rateLimit;
export const rateLimitKey = defaultLimiter.rateLimitKey;
