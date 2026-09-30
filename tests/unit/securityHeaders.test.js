import { describe, it, expect } from 'vitest';
import {
  buildCsp,
  buildHeaders,
  buildSecurityHeaders,
  PUBLIC_CORS_ROUTES,
} from '../../src/config/securityHeaders.mjs';

const header = (list, key) => list.find((h) => h.key === key)?.value;

describe('buildCsp', () => {
  it('no permite unsafe-eval en producción', () => {
    expect(buildCsp({ isProd: true })).not.toContain("'unsafe-eval'");
  });

  it('permite unsafe-eval solo en desarrollo', () => {
    expect(buildCsp({ isProd: false })).toContain("'unsafe-eval'");
  });

  it.each(["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"])(
    'incluye la directiva %s',
    (directive) => {
      expect(buildCsp({ isProd: true })).toContain(directive);
    },
  );

  it('no depende de Google Analytics ni Tag Manager', () => {
    expect(buildCsp({ isProd: true })).not.toMatch(/googletagmanager|google-analytics|doubleclick/);
  });

  it('solo permite embeber YouTube y Firebase Auth como frames', () => {
    const frameSrc = buildCsp({ isProd: true })
      .split('; ')
      .find((d) => d.startsWith('frame-src'));
    expect(frameSrc).toContain('youtube-nocookie.com');
    expect(frameSrc.split(' ')).not.toContain('https:');
  });
});

describe('buildSecurityHeaders', () => {
  it('envía HSTS solo cuando el sitio se sirve por HTTPS', () => {
    expect(header(buildSecurityHeaders({ isProd: true, https: true }), 'Strict-Transport-Security')).toMatch(/max-age=\d+/);
    expect(header(buildSecurityHeaders({ isProd: true }), 'Strict-Transport-Security')).toBeUndefined();
  });

  it('upgrade-insecure-requests solo se activa con HTTPS (no rompe localhost)', () => {
    expect(buildCsp({ isProd: true, https: true })).toContain('upgrade-insecure-requests');
    expect(buildCsp({ isProd: true })).not.toContain('upgrade-insecure-requests');
  });

  it('desactiva X-XSS-Protection en lugar de usar el modo obsoleto', () => {
    expect(header(buildSecurityHeaders({ isProd: true }), 'X-XSS-Protection')).toBe('0');
  });

  it('mantiene nosniff, DENY y Referrer-Policy', () => {
    const headers = buildSecurityHeaders({ isProd: true });
    expect(header(headers, 'X-Content-Type-Options')).toBe('nosniff');
    expect(header(headers, 'X-Frame-Options')).toBe('DENY');
    expect(header(headers, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});

describe('CORS', () => {
  const rules = buildHeaders({ isProd: true });
  const corsSources = rules
    .filter((r) => header(r.headers, 'Access-Control-Allow-Origin'))
    .map((r) => r.source);

  it('solo abre CORS en las rutas públicas de lectura', () => {
    expect(corsSources).toEqual(PUBLIC_CORS_ROUTES);
  });

  it.each(['chat', 'auth/admin', 'ingest', 'ai', 'health'])(
    'no abre CORS en /api/%s',
    (route) => {
      expect(corsSources.some((s) => s.includes(route))).toBe(false);
    },
  );
});
