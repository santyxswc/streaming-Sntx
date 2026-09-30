import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('responde ok sin depender de ningún servicio externo', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('no se puede cachear', () => {
    expect(GET().headers.get('Cache-Control')).toBe('no-store');
  });
});
