import { describe, it, expect } from 'vitest';
import {
  EMBED_FRAME_ANCESTORS,
  embedHeaders,
  embedVideoId,
  renderEmbedHtml,
  sanitizeEmbedParams,
} from '@/server/embed/youtubeEmbed';
import { GET } from '@/app/embed/[id]/route';

const ID = 'WbziExW1-i4';
const call = (id, query = '') =>
  GET(new Request(`http://localhost/embed/${id}${query}`), { params: Promise.resolve({ id }) });

describe('página puente de YouTube', () => {
  it('solo acepta ids de 11 caracteres, no URLs ni rutas', () => {
    expect(embedVideoId(ID)).toBe(ID);
    for (const bad of ['', undefined, 'corto', `${ID}x`, 'https://youtu.be/WbziExW1-i4', '../etc/passwd', 'a"><script>', 'WbziExW1 i4']) {
      expect(embedVideoId(bad)).toBeNull();
    }
  });

  it('solo copia parámetros permitidos y con valores 0/1', () => {
    const q = sanitizeEmbedParams(
      new URLSearchParams('autoplay=1&mute=1&controls=0&loop=1&playlist=' + ID + '&evil=1&start=99&rel=2&origin=https://x.com'),
      ID,
    );
    expect(Object.fromEntries(q)).toEqual({ rel: '0', modestbranding: '1', autoplay: '1', mute: '1', controls: '0', loop: '1', playlist: ID });
  });

  it('`playlist` solo vale si es el propio id (no permite cargar listas ajenas)', () => {
    expect(sanitizeEmbedParams(new URLSearchParams('playlist=OTROVIDEO12'), ID).has('playlist')).toBe(false);
  });

  it('el HTML incrusta solo youtube-nocookie y no refleja datos del usuario', () => {
    const html = renderEmbedHtml(ID, new URLSearchParams('autoplay=1&x="><script>alert(1)</script>'));
    expect(html).toContain(`https://www.youtube-nocookie.com/embed/${ID}?`);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
    expect(html.match(/src="/g)).toHaveLength(1);
  });

  it('las cabeceras permiten el marco solo a Tauri y no llevan X-Frame-Options', () => {
    const h = embedHeaders();
    expect(h['X-Frame-Options']).toBeUndefined();
    const csp = h['Content-Security-Policy'];
    expect(csp).toContain(`frame-ancestors ${EMBED_FRAME_ANCESTORS.join(' ')}`);
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toMatch(/frame-ancestors[^;]*(\*|https:(?!\/\/tauri))/);
    expect(csp).not.toContain('script-src');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
  });

  describe('GET /embed/:id', () => {
    it('devuelve la página para un id válido', async () => {
      const res = await call(ID, '?autoplay=1&mute=1');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      expect(res.headers.get('x-frame-options')).toBeNull();
      expect(await res.text()).toContain(`embed/${ID}?`);
    });

    it.each(['corto', 'a"><script>', '..%2F..%2Fetc', 'WbziExW1-i4extra'])('responde 404 a %s', async (bad) => {
      const res = await call(bad);
      expect(res.status).toBe(404);
      expect(await res.text()).not.toContain('<iframe');
    });
  });
});
