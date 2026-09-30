import { describe, it, expect, vi } from 'vitest';
import { withApiHandler, badRequest, CachePolicy } from '@/server/http/apiHandler';

let ip = 0;
const request = (url = 'http://localhost/api/x?q=1') =>
  new Request(url, { headers: { 'x-forwarded-for': `10.0.0.${++ip}` } });

describe('withApiHandler', () => {
  it('envuelve los datos y aplica la política de caché', async () => {
    const GET = withApiHandler(async (_req, { searchParams }) => ({ q: searchParams.get('q') }), {
      id: 't-ok',
      cache: CachePolicy.day,
    });
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe(CachePolicy.day);
    expect(await res.json()).toEqual({ success: true, data: { q: '1' } });
  });

  it('traduce HttpError a su código y mensaje', async () => {
    const GET = withApiHandler(async () => {
      throw badRequest('falta id');
    }, { id: 't-400' });
    const res = await GET(request());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('falta id');
  });

  it('no filtra mensajes internos en errores inesperados', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const GET = withApiHandler(async () => {
      throw new Error('relation "media" does not exist');
    }, { id: 't-500' });
    const res = await GET(request());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Error interno del servidor');
  });

  it('aplica el rate limit por IP y endpoint', async () => {
    const GET = withApiHandler(async () => 'ok', { id: 't-rl', limit: 1 });
    const req = () => new Request('http://localhost/', { headers: { 'x-forwarded-for': '9.9.9.9' } });
    expect((await GET(req())).status).toBe(200);
    expect((await GET(req())).status).toBe(429);
  });
});

describe('withApiHandler: logs estructurados', () => {
  const capture = () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    return { spy, lines: () => spy.mock.calls.map(([line]) => JSON.parse(line)) };
  };

  it('un error inesperado produce una línea JSON con ruta y requestId', async () => {
    const { lines } = capture();
    const GET = withApiHandler(async () => {
      throw new Error('falló');
    }, { id: 't-log' });
    await GET(new Request('http://localhost/api/x', { headers: { 'x-forwarded-for': '7.7.7.7', 'x-vercel-id': 'gru1::req-42' } }));
    const [entry] = lines();
    expect(entry).toMatchObject({ level: 'error', event: 'api.error', route: 't-log', requestId: 'gru1::req-42' });
    expect(entry.err).toMatchObject({ name: 'Error', message: 'falló' });
  });

  it('el logger dentro del handler hereda el contexto de la petición', async () => {
    const { lines } = capture();
    const { logger } = await import('@/server/observability/logger');
    const GET = withApiHandler(async () => {
      logger.error('mi.evento', { detalle: 1 });
      return 'ok';
    }, { id: 't-ctx' });
    await GET(request());
    expect(lines().find((l) => l.event === 'mi.evento')).toMatchObject({ route: 't-ctx', detalle: 1 });
  });

  it('no registra secretos del mensaje de error', async () => {
    const { spy } = capture();
    const GET = withApiHandler(async () => {
      throw new Error('fetch https://api.test/x?api_key=SECRETO_123 falló');
    }, { id: 't-sec' });
    await GET(request());
    expect(spy.mock.calls.map(([l]) => l).join('\n')).not.toContain('SECRETO_123');
  });
});
