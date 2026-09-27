import { describe, it, expect } from 'vitest';
import { createTtlCache } from '@/server/shared/ttlCache';
import { createLimiter } from '@/server/shared/concurrency';

describe('createTtlCache', () => {
  it('expira las entradas pasado su TTL', () => {
    let t = 0;
    const cache = createTtlCache({ now: () => t });
    cache.set('a', 1, 100);
    expect(cache.get('a')).toBe(1);
    t = 101;
    expect(cache.get('a')).toBeUndefined();
  });

  it('expulsa la entrada más antigua al llegar al tope', () => {
    const cache = createTtlCache({ maxEntries: 2 });
    cache.set('a', 1, 1000);
    cache.set('b', 2, 1000);
    cache.set('c', 3, 1000);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });
});

describe('createLimiter', () => {
  it('nunca ejecuta más tareas simultáneas que el máximo', async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const task = () =>
      limit(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
      });
    await Promise.all(Array.from({ length: 8 }, task));
    expect(peak).toBe(2);
  });

  it('propaga errores sin bloquear la cola', async () => {
    const limit = createLimiter(1);
    await expect(limit(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(limit(async () => 'ok')).resolves.toBe('ok');
  });
});
