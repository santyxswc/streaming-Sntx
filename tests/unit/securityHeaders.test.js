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

  it('permite los orígenes que Firebase Analytics necesita (gtag.js y envío de eventos)', () => {
    const csp = buildCsp({ isProd: true });
    const directive = (name) => csp.split('; ').find((d) => d.startsWith(name));
    expect(directive('script-src')).toContain('https://www.googletagmanager.com');
    expect(directive('connect-src')).toContain('https://*.google-analytics.com');
  });

  describe('connect-src de Firebase', () => {
    const connect = (options) =>
      buildCsp({ isProd: true, ...options })
        .split('; ')
        .find((d) => d.startsWith('connect-src'))
        .split(' ');

    it('lista los hosts exactos de Auth, Firestore, Installations y Analytics', () => {
      const hosts = connect();
      for (const host of [
        'https://firestore.googleapis.com',
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
        'https://firebaseinstallations.googleapis.com',
        'https://firebase.googleapis.com',
      ]) {
        expect(hosts).toContain(host);
      }
    });

    it('no admite comodines que permitan enviar datos a buckets o bases de datos ajenos', () => {
      const hosts = connect();
      for (const wildcard of ['https://*.googleapis.com', 'https://*.firebaseio.com', 'wss://*.firebaseio.com', 'https://*.gstatic.com']) {
        expect(hosts).not.toContain(wildcard);
      }
    });
  });

  describe('frame-src de Firebase Auth', () => {
    const frames = (options) =>
      buildCsp({ isProd: true, ...options })
        .split('; ')
        .find((d) => d.startsWith('frame-src'))
        .split(' ');

    it('usa el dominio de Auth del proyecto en lugar de *.firebaseapp.com', () => {
      const list = frames({ authDomain: 'mi-proyecto.firebaseapp.com' });
      expect(list).toContain('https://mi-proyecto.firebaseapp.com');
      expect(list).not.toContain('https://*.firebaseapp.com');
    });

    it('si falta la variable o no es un dominio, cae al comodín para no romper el login', () => {
      expect(frames({ authDomain: undefined })).toContain('https://*.firebaseapp.com');
      expect(frames({ authDomain: 'x.com; script-src *' })).toContain('https://*.firebaseapp.com');
    });
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
