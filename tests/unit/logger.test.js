import { describe, it, expect } from 'vitest';
import { createLogger, withLogContext, requestIdFrom, redactText } from '@/server/observability/logger';

function capture(options = {}) {
  const lines = [];
  const logger = createLogger({ level: 'debug', ...options, sink: (level, line) => lines.push({ level, entry: JSON.parse(line), line }) });
  return { logger, lines };
}

describe('logger estructurado', () => {
  it('escribe una línea JSON con ts, level y event', () => {
    const { logger, lines } = capture();
    logger.info('feed.ok', { items: 3 });
    expect(lines).toHaveLength(1);
    expect(lines[0].entry).toMatchObject({ level: 'info', event: 'feed.ok', items: 3 });
    expect(new Date(lines[0].entry.ts).toString()).not.toBe('Invalid Date');
  });

  it('pone ts, level y event primero y omite los campos undefined', () => {
    const { logger, lines } = capture();
    logger.info('orden', { z: 1, ausente: undefined, a: 2 });
    expect(Object.keys(lines[0].entry)).toEqual(['ts', 'level', 'event', 'z', 'a']);
  });

  it('respeta el nivel mínimo', () => {
    const { logger, lines } = capture({ level: 'warn' });
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    expect(lines.map((l) => l.entry.event)).toEqual(['c', 'd']);
  });

  it('los campos no pueden sobrescribir ts, level ni event', () => {
    const { logger, lines } = capture();
    logger.error('real', { level: 'debug', event: 'falso', ts: 'ayer' });
    expect(lines[0].entry.level).toBe('error');
    expect(lines[0].entry.event).toBe('real');
    expect(lines[0].entry.ts).not.toBe('ayer');
  });

  it('un valor con saltos de línea no puede falsificar otra línea de log', () => {
    const { logger, lines } = capture();
    logger.warn('x', { query: 'hola\n{"level":"error","event":"falso"}\r\nfin' });
    expect(lines[0].line).not.toMatch(/[\r\n]/);
    expect(lines[0].entry.event).toBe('x');
  });

  it('redacta claves sensibles y secretos dentro de los textos', () => {
    const { logger, lines } = capture();
    logger.error('t', {
      apiKey: 'abc123',
      headers: { authorization: 'Bearer zzz.yyy', 'x-ok': 'visible' },
      url: 'https://api.test/x?api_key=SECRETO&page=2',
      db: 'postgres://user:pass@host/db',
      who: 'persona@example.com',
    });
    const out = lines[0].line;
    for (const leaked of ['abc123', 'zzz.yyy', 'SECRETO', 'user:pass', 'persona@example.com']) {
      expect(out).not.toContain(leaked);
    }
    expect(lines[0].entry.headers['x-ok']).toBe('visible');
    expect(lines[0].entry.url).toContain('page=2');
  });

  it('serializa errores sin cuerpo de respuesta y con pila acotada', () => {
    const { logger, lines } = capture();
    const err = Object.assign(new Error('falló con token=SECRETO'), {
      code: 'E_X',
      response: { status: 502, data: { clave: 'NO_DEBE_SALIR' } },
    });
    logger.error('e', { err });
    const out = lines[0].entry.err;
    expect(out).toMatchObject({ name: 'Error', code: 'E_X', status: 502 });
    expect(lines[0].line).not.toContain('NO_DEBE_SALIR');
    expect(lines[0].line).not.toContain('SECRETO');
    expect(out.stack.length).toBeLessThanOrEqual(4);
  });

  it('acota objetos enormes, profundos y circulares sin lanzar', () => {
    const { logger, lines } = capture();
    const circular = { a: 1 };
    circular.self = circular;
    logger.info('c', { circular, big: Array.from({ length: 100 }, (_, i) => i), long: 'x'.repeat(5000) });
    expect(lines).toHaveLength(1);
    expect(lines[0].entry.big).toHaveLength(20);
    expect(lines[0].entry.long.length).toBeLessThanOrEqual(501);
  });

  it('añade el contexto de la petición y se aísla entre peticiones concurrentes', async () => {
    const { logger, lines } = capture();
    await Promise.all([
      withLogContext({ route: 'a', requestId: '1' }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        logger.info('uno');
      }),
      withLogContext({ route: 'b', requestId: '2' }, async () => {
        logger.info('dos');
      }),
    ]);
    const byEvent = Object.fromEntries(lines.map((l) => [l.entry.event, l.entry]));
    expect(byEvent.uno).toMatchObject({ route: 'a', requestId: '1' });
    expect(byEvent.dos).toMatchObject({ route: 'b', requestId: '2' });
  });

  it('fuera de un contexto no añade route ni requestId', () => {
    const { logger, lines } = capture();
    logger.info('suelto');
    expect(lines[0].entry.route).toBeUndefined();
  });
});

describe('requestIdFrom', () => {
  it('usa x-vercel-id saneado y acotado', () => {
    const req = new Request('http://x', { headers: { 'x-vercel-id': 'gru1::abc-123' } });
    expect(requestIdFrom(req)).toBe('gru1::abc-123');
    const evil = new Request('http://x', { headers: { 'x-vercel-id': 'a b<script>'.padEnd(200, 'z') } });
    expect(requestIdFrom(evil)).toMatch(/^[\w.:-]{1,64}$/);
  });

  it('genera un UUID si no hay cabecera', () => {
    expect(requestIdFrom(new Request('http://x'))).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('redactText', () => {
  it('no deja correos ni tokens en claro', () => {
    expect(redactText('a@b.co Bearer abc.def token=xyz')).toBe('[email] Bearer [redacted] token=[redacted]');
  });
});
