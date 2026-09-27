const YOUTUBE_ID = /^[\w-]{11}$/;

/**
 * Extrae el id de vídeo de YouTube de una URL (watch?v=, youtu.be/, /embed/)
 * o de un id pelado, que es como lo guardan algunas fuentes del catálogo.
 * @returns {string | null}
 */
export function parseYoutubeId(value) {
  if (!value || typeof value !== 'string') return null;
  const raw = value.trim();
  if (YOUTUBE_ID.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get('v');
    if (fromQuery && YOUTUBE_ID.test(fromQuery)) return fromQuery;
    const last = url.pathname.split('/').filter(Boolean).pop();
    return last && YOUTUBE_ID.test(last) ? last : null;
  } catch {
    return null;
  }
}

/**
 * URL de embed de YouTube (dominio sin cookies) para un id de vídeo.
 * @param {string} id
 * @param {Record<string, string | number>} [params]
 */
export function youtubeEmbedUrl(id, params = {}) {
  const query = new URLSearchParams({ rel: '0', modestbranding: '1', ...params });
  return `https://www.youtube-nocookie.com/embed/${id}?${query}`;
}
