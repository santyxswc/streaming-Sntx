import { describe, it, expect, vi } from 'vitest';
import {
  createMemoryStore,
  createUpstashStore,
  createStoreFromEnv,
  createRateLimiter,
  getClientIp,
} from '@/server/http/rateLimit';

const req = (headers = {}) => new Request('http://localhost/api/x', { headers });

describe('createMemoryStore', () => {
  it('permite hasta el límite y bloquea el siguiente', async () => {
    const store = createMemoryStore();
    const opts = { limit: 3, windowMs: 60_000 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await store.hit('k', opts));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('cuenta cada clave por separado', async () => {
    const store = createMemoryStore();
    const opts = { limit: 1, windowMs: 60_000 };
    expect(await store.hit('a', opts)).toBe(true);
    expect(await store.hit('b', opts)).toBe(true);
    expect(await store.hit('a', opts)).toBe(false);
  });

  it('libera el cupo cuando pasa la ventana', async () => {
    vi.useFakeTimers();
    try {
      const store = createMemoryStore();
      const opts = { limit: 1, windowMs: 1000 };
      expect(await store.hit('k', opts)).toBe(true);
      expect(await store.hit('k', opts)).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(await store.hit('k', opts)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('createUpstashStore', () => {
  const okResponse = (count) => ({ ok: true, json: async () => [{ result: count }, { result: 1 }] });

  it('envía INCR y PEXPIRE NX en un pipeline con el token', async () => {
    const fetchImpl = vi.fn(async () => okResponse(1));
    const store = createUpstashStore({ url: 'https://redis.example.io/', token: 'tok', fetchImpl });
    await store.hit('ip:1.2.3.4:x', { limit: 5, windowMs: 60_000 });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://redis.example.io/pipeline');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual([
      ['INCR', 'rl:ip:1.2.3.4:x'],
      ['PEXPIRE', 'rl:ip:1.2.3.4:x', '60000', 'NX'],
    ]);
  });

  it('permite hasta el límite y bloquea por encima', async () => {
    const counts = [1, 2, 3];
    const fetchImpl = vi.fn(async () => okResponse(counts.shift()));
    const store = createUpstashStore({ url: 'https://r.io', token: 't', fetchImpl });
    const opts = { limit: 2, windowMs: 1000 };
    expect(await store.hit('k', opts)).toBe(true);
    expect(await store.hit('k', opts)).toBe(true);
    expect(await store.hit('k', opts)).toBe(false);
  });

  it('lanza si Redis responde con error o con datos inesperados', async () => {
    const opts = { limit: 1, windowMs: 1000 };
    const httpError = createUpstashStore({
      url: 'https://r.io', token: 't', fetchImpl: async () => ({ ok: false, status: 500 }),
    });
    await expect(httpError.hit('k', opts)).rejects.toThrow(/500/);

    const garbage = createUpstashStore({
      url: 'https://r.io', token: 't', fetchImpl: async () => ({ ok: true, json: async () => [{ error: 'x' }] }),
    });
    await expect(garbage.hit('k', opts)).rejects.toThrow();
  });
});

describe('createStoreFromEnv', () => {
  it('usa memoria sin credenciales', () => {
    expect(createStoreFromEnv({}).name).toBe('memory');
    expect(createStoreFromEnv({ UPSTASH_REDIS_REST_URL: 'https://r.io' }).name).toBe('memory');
  });

  it('usa Upstash con los nombres de Upstash o de Vercel KV', () => {
    expect(
      createStoreFromEnv({ UPSTASH_REDIS_REST_URL: 'https://r.io', UPSTASH_REDIS_REST_TOKEN: 't' }).name
    ).toBe('upstash');
    expect(
      createStoreFromEnv({ KV_REST_API_URL: 'https://r.io', KV_REST_API_TOKEN: 't' }).name
    ).toBe('upstash');
  });
});

describe('createRateLimiter', () => {
  it('devuelve null dentro del límite y 429 al superarlo', async () => {
    const { rateLimit } = createRateLimiter({ store: createMemoryStore() });
    const opts = { limit: 2, windowMs: 60_000, id: 't' };
    expect(await rateLimit(req({ 'x-forwarded-for': '1.1.1.1' }), opts)).toBeNull();
    expect(await rateLimit(req({ 'x-forwarded-for': '1.1.1.1' }), opts)).toBeNull();
    const blocked = await rateLimit(req({ 'x-forwarded-for': '1.1.1.1' }), opts);
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).success).toBe(false);
  });

  it('separa el contador por IP y por id de endpoint', async () => {
    const { rateLimit } = createRateLimiter({ store: createMemoryStore() });
    const a = req({ 'x-forwarded-for': '1.1.1.1' });
    expect(await rateLimit(a, { limit: 1, id: 'login' })).toBeNull();
    expect(await rateLimit(a, { limit: 1, id: 'chat' })).toBeNull();
    expect(await rateLimit(req({ 'x-forwarded-for': '2.2.2.2' }), { limit: 1, id: 'login' })).toBeNull();
    expect((await rateLimit(a, { limit: 1, id: 'login' })).status).toBe(429);
  });

  it('rateLimitKey usa el mensaje personalizado', async () => {
    const { rateLimitKey } = createRateLimiter({ store: createMemoryStore() });
    await rateLimitKey('u:1', { limit: 1 });
    const blocked = await rateLimitKey('u:1', { limit: 1, message: 'Más despacio' });
    expect((await blocked.json()).error).toBe('Más despacio');
  });

  it('si el almacén compartido falla, sigue limitando con memoria y avisa', async () => {
    const onError = vi.fn();
    const broken = { name: 'upstash', hit: vi.fn(async () => { throw new Error('ECONNRESET'); }) };
    const { rateLimitKey } = createRateLimiter({ store: broken, fallback: createMemoryStore(), onError });

    expect(await rateLimitKey('k', { limit: 1 })).toBeNull();
    expect((await rateLimitKey('k', { limit: 1 })).status).toBe(429);
    expect(onError).toHaveBeenCalled();
  });
});

describe('getClientIp', () => {
  it('toma la primera IP de x-forwarded-for', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9');
  });
  it('usa x-real-ip si no hay x-forwarded-for', () => {
    expect(getClientIp(req({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
  });
  it("cae a 'anonymous' sin cabeceras", () => {
    expect(getClientIp(req())).toBe('anonymous');
  });
});
