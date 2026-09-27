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
