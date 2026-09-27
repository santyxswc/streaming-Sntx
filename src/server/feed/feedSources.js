import 'server-only';

/**
 * Fuentes de candidatos del feed. Ambas implementan
 * `getCandidates(section, now) → Promise<item[]>` en orden de relevancia.
 */

const DEFAULT_PAGES = 2;

/**
 * Rankings de popularidad de TMDB (trending, discover por votos/popularidad).
 * Cada página de TMDB trae 20 títulos; `section.pages` permite pedir más
 * candidatos a filas que comparten muchos títulos con otras.
 */
export function createTmdbPopularitySource({ fetchList, pages = DEFAULT_PAGES }) {
  return {
    async getCandidates(section, now) {
      const query = typeof section.query === 'function' ? section.query(now) : section.query;
      const results = await Promise.all(
        Array.from({ length: section.pages ?? pages }, (_, i) =>
          fetchList(section.type, query.path, { ...query.params, page: String(i + 1) })
        )
      );
      return results.flatMap((r) => r.items);
    },
  };
}

/** Sin TMDB (modo demo): ordena el propio catálogo con `fallbackSort`. */
export function createCatalogSource({ getMediaSorted, count = 60 }) {
  return {
    getCandidates(section) {
      return getMediaSorted(section.type, section.fallbackSort || 'scrapedAt', 'desc', count);
    },
  };
}
