import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/server/integrations/deepseek', () => ({ chatCompletion: vi.fn() }));
vi.mock('@/server/catalog/catalogRepository', () => ({
  findMediaForAiLookup: vi.fn(async () => ({ winner: null, winnerId: null })),
}));

const { chatCompletion } = await import('@/server/integrations/deepseek');
const { POST } = await import('@/app/api/ai/search/route');

let ip = 0;
const call = (body, raw) =>
  POST(
    new Request('http://localhost/api/ai/search', {
      method: 'POST',
      headers: { 'x-forwarded-for': `192.0.2.${++ip}` },
      body: raw ?? JSON.stringify(body),
    })
  );

describe('POST /api/ai/search', () => {
  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    chatCompletion.mockReset();
  });

  it('rechaza con 400 un cuerpo que no es JSON, sin llamar al modelo', async () => {
    const res = await call(null, '{no-json');
    expect(res.status).toBe(400);
    expect(chatCompletion).not.toHaveBeenCalled();
  });

  it.each([{}, { query: 42 }, { query: { a: 1 } }, { query: '   ' }])(
    'rechaza con 400 la consulta %j sin llamar al modelo',
    async (body) => {
      expect((await call(body)).status).toBe(400);
      expect(chatCompletion).not.toHaveBeenCalled();
    }
  );

  it('rechaza consultas demasiado largas sin gastar tokens', async () => {
    const res = await call({ query: 'a'.repeat(5000) });
    expect(res.status).toBe(400);
    expect(chatCompletion).not.toHaveBeenCalled();
  });

  it('responde 502 si el modelo no devuelve JSON, sin filtrar su salida', async () => {
    chatCompletion.mockResolvedValue('Lo siento, no puedo ayudar. password=hunter2');
    const res = await call({ query: 'un tren en la nieve' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toMatch(/hunter2/);
  });

  it('informa de que no está en el catálogo sin paréntesis vacíos si falta el año', async () => {
    chatCompletion.mockResolvedValue(JSON.stringify({ titleSpanish: 'Rompenieves', type: 'movie' }));
    const body = await (await call({ query: 'un tren en la nieve' })).json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('"Rompenieves"');
    expect(body.message).not.toContain('()');
  });
});
