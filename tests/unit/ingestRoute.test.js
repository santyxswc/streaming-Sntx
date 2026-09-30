import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/server/integrations/tmdb', () => ({
  discoverTmdbPage: vi.fn(),
  isTmdbConfigured: vi.fn(() => true),
}));
vi.mock('@/server/catalog/catalogRepository', () => ({
  saveMediaBatch: vi.fn(),
  updateFilterMetadata: vi.fn(),
}));
vi.mock('@/server/db/neonSql', () => ({
  getNeonSql: vi.fn(() => () => Promise.reject(new Error('detalle interno: password=hunter2'))),
}));

const { POST } = await import('@/app/api/ingest/tmdb/route');

let ipCounter = 0;
function call({ key, body = { type: 'movie' }, ip } = {}) {
  return POST(
    new Request('http://localhost/api/ingest/tmdb', {
      method: 'POST',
      headers: {
        'x-forwarded-for': ip ?? `203.0.113.${++ipCounter}`,
        ...(key ? { 'x-api-key': key } : {}),
      },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/ingest/tmdb', () => {
  beforeEach(() => {
    process.env.INGEST_SECRET_KEY = 'clave-correcta';
    delete process.env.SCRAPE_SECRET_KEY;
  });

  it('rechaza una clave incorrecta con 401', async () => {
    expect((await call({ key: 'clave-mala' })).status).toBe(401);
  });

  it('rechaza una petición sin clave con 401', async () => {
    expect((await call()).status).toBe(401);
  });

  it('bloquea con 429 tras demasiados intentos fallidos desde la misma IP', async () => {
    const ip = '198.51.100.7';
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await call({ key: `mala-${i}`, ip })).status);
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it('no cuenta como intento fallido las peticiones con la clave correcta', async () => {
    const ip = '198.51.100.8';
    for (let i = 0; i < 15; i++) {
      const res = await call({ key: 'clave-correcta', ip, body: { type: 'invalido' } });
      expect(res.status).toBe(400);
    }
  });

  it('responde 503 genérico si no hay clave configurada, sin nombrar la variable', async () => {
    delete process.env.INGEST_SECRET_KEY;
    const res = await call({ key: 'lo-que-sea' });
    expect(res.status).toBe(503);
    const text = JSON.stringify(await res.json());
    expect(text).not.toMatch(/INGEST_SECRET_KEY/);
  });

  it('no filtra el mensaje interno en un error 500', async () => {
    const res = await call({ key: 'clave-correcta', body: { type: 'movie' } });
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toMatch(/hunter2|detalle interno/);
  });
});
