/**
 * Página puente para incrustar tráilers de YouTube desde la app de escritorio.
 *
 * YouTube rechaza la incrustación (Error 153) si la petición no lleva un `Referer` HTTP(S). Bajo
 * `tauri://localhost` el webview no lo envía, así que el escritorio incrusta ESTA página, que sí
 * tiene origen https, y ella incrusta el vídeo. Solo acepta ids de YouTube válidos y un conjunto
 * cerrado de parámetros de reproductor: no es un proxy abierto.
 */

// Orígenes del webview de Tauri (Linux/macOS, Windows con http y https) y el servidor de desarrollo.
export const EMBED_FRAME_ANCESTORS = [
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
  'http://localhost:1420',
];

const FLAG_PARAMS = ['autoplay', 'mute', 'controls', 'loop', 'rel', 'modestbranding'];

/** Id de YouTube válido o null. Solo ids pelados: no se aceptan URLs. */
export function embedVideoId(value) {
  return /^[\w-]{11}$/.test(value ?? '') ? value : null;
}

/** Copia solo los parámetros permitidos: banderas 0/1 y `playlist` igual al propio id (para `loop`). */
export function sanitizeEmbedParams(searchParams, id) {
  const query = new URLSearchParams({ rel: '0', modestbranding: '1' });
  for (const key of FLAG_PARAMS) {
    const value = searchParams.get(key);
    if (value === '0' || value === '1') query.set(key, value);
  }
  if (searchParams.get('playlist') === id) query.set('playlist', id);
  return query;
}

export function renderEmbedHtml(id, searchParams) {
  const src = `https://www.youtube-nocookie.com/embed/${id}?${sanitizeEmbedParams(searchParams, id)}`;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tráiler</title>
<style>html,body{margin:0;height:100%;background:#000}iframe{display:block;width:100%;height:100%;border:0}</style>
</head><body><iframe src="${src.replace(/&/g, '&amp;')}" title="Tráiler" allow="autoplay; encrypted-media; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`;
}

/** Cabeceras de la página puente: sin X-Frame-Options; solo Tauri puede enmarcarla. */
export function embedHeaders() {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    'Content-Security-Policy': [
      "default-src 'none'",
      "style-src 'unsafe-inline'",
      'frame-src https://www.youtube-nocookie.com',
      `frame-ancestors ${EMBED_FRAME_ANCESTORS.join(' ')}`,
      "base-uri 'none'",
      "form-action 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Robots-Tag': 'noindex, nofollow',
  };
}
