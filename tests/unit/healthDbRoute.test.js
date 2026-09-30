import { describe, it, expect, vi, beforeEach } from 'vitest';

const query = vi.fn();
vi.mock('@/server/db/neonSql', () => ({ getNeonSql: () => query }));
vi.mock('@/server/config/catalogEnv', () => ({ getCatalogProvider: () => 'neon' }));

let ip = 0;
const get = (GET, address) =>
  GET(new Request('http://localhost/api/health/db', { headers: { 'x-forwarded-for': address ?? `203.0.113.${++ip}` } }));

async function freshRoute() {
  vi.resetModules();
  process.env.DATABASE_URL = 'postgres://test';
  return (await import('@/app/api/health/db/route')).GET;
}

describe('GET /api/health/db', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('reutiliza el resultado en caché en vez de consultar la base en cada petición', async () => {
    query.mockResolvedValue([{ ok: 1 }]);
    const GET = await freshRoute();
    for (let i = 0; i < 5; i++) expect((await get(GET)).status).toBe(200);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('aplica rate limit por IP', async () => {
    query.mockResolvedValue([{ ok: 1 }]);
    const GET = await freshRoute();
    const statuses = [];
    for (let i = 0; i < 32; i++) statuses.push((await get(GET, '198.51.100.9')).status);
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(30)).toEqual([429, 429]);
  });

  it('responde 503 sin filtrar el error de la base de datos', async () => {
    query.mockImplementation(async () => {
      throw new Error('password authentication failed for user "admin" at db.internal');
    });
    const GET = await freshRoute();
    const res = await get(GET);
    expect(res.status).toBe(503);
    const text = JSON.stringify(await res.json());
    expect(text).toBe('{"ok":false,"error":"database_connect_failed"}');
    expect(text).not.toMatch(/password|admin|internal/);
  });

  it('no permite cachear la respuesta en el CDN', async () => {
    query.mockResolvedValue([{ ok: 1 }]);
    const GET = await freshRoute();
    expect((await get(GET)).headers.get('Cache-Control')).toBe('no-store');
  });
});
