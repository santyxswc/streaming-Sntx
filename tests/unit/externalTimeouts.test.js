import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchTmdb } from '@/server/integrations/tmdb';
import { searchOmdb } from '@/server/integrations/omdb';

// `fetch` que nunca responde: solo termina cuando se aborta su señal (como un proveedor colgado).
const hangingFetch = () =>
  vi.fn((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal.reason))));

const within = (ms, promise) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`sin respuesta tras ${ms} ms: no hay timeout`)), ms))]);

describe('timeouts de las APIs externas', () => {
  beforeEach(() => {
    process.env.TMDB_API_KEY = 'a'.repeat(32);
    process.env.OMDB_API_KEY = 'omdbkey';
    process.env.EXTERNAL_API_TIMEOUT_MS = '60';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.EXTERNAL_API_TIMEOUT_MS;
  });

  it('TMDB: una respuesta colgada se corta y se degrada a resultado vacío', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const result = await within(2000, searchTmdb('matrix'));
    expect(result ?? []).toHaveLength(0);
  });

  it('OMDb: una respuesta colgada se corta con un error que el llamador puede registrar', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    await expect(within(2000, searchOmdb('matrix'))).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('por defecto usa un tope de 8 s', async () => {
    delete process.env.EXTERNAL_API_TIMEOUT_MS;
    let signal;
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => { signal = init.signal; return new Response('{}', { status: 200 }); }));
    await searchTmdb('matrix');
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });
});
