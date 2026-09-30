import 'server-only';
import { FEED_PAGES } from '@/server/feed/feedSections';
import { createTmdbPopularitySource, createCatalogSource } from '@/server/feed/feedSources';
import { getMediaByIds, getMediaSorted } from '@/server/catalog/catalogRepository';
import { getTmdbMediaList, isTmdbConfigured } from '@/server/integrations/tmdb';
import { trailerService } from '@/server/trailers/trailerService';
import { createTtlCache } from '@/server/shared/ttlCache';
import { createLimiter } from '@/server/shared/concurrency';
import { logger } from '@/server/observability/logger';

/**
 * Feed curado de las páginas de inicio, películas y series.
 *
 * Cada fila = candidatos populares (fuente) ∩ títulos del catálogo ∩ con
 * tráiler disponible. Así nunca aparecen títulos desconocidos con un 10.0 de
 * un solo voto ni fichas sin tráiler, y todo lo mostrado existe en la BD
 * (chat, "Mi lista" y detalle funcionan igual). No escribe en la BD.
 */

const FEED_TTL_MS = 60 * 60 * 1000;
const SECTION_LIMIT = 20;

/** Rellena huecos del catálogo (p. ej. backdrop vacío) con los datos de la fuente. */
export function mergeCatalogItem(catalogItem, candidate) {
  return {
    ...catalogItem,
    overview: catalogItem.overview || candidate.overview || '',
    image: catalogItem.image || candidate.image || '',
    backdrop: catalogItem.backdrop || candidate.backdrop || '',
    year: catalogItem.year || candidate.year || '',
    rating: Number(catalogItem.rating) > 0 ? catalogItem.rating : candidate.rating,
    genres: catalogItem.genres?.length ? catalogItem.genres : candidate.genres || [],
  };
}

/** Forma pública de un ítem del feed: sin payloads internos ni ids externos. */
function toFeedItem(item, trailerKey) {
  return {
    id: item.id,
    numericId: item.numericId ?? null,
    title: item.title,
    originalTitle: item.originalTitle ?? null,
    overview: item.overview,
    image: item.image,
    backdrop: item.backdrop,
    year: item.year,
    rating: item.rating,
    genres: item.genres,
    type: item.type,
    trailer: trailerKey,
  };
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => item?.id && !seen.has(item.id) && seen.add(item.id));
}

/**
 * @param {object} deps
 * @param {{ getCandidates: (section: object, now: Date) => Promise<object[]> }} deps.source
 * @param {{ getMediaByIds: (type: string, ids: string[]) => Promise<object[]> }} deps.catalog
 * @param {{ getTrailersForItem: (item: object) => Promise<{ trailers: { key: string }[] }> }} deps.trailers
 */
export function createFeedService({
  source,
  catalog,
  trailers,
  pages = FEED_PAGES,
  limiter = createLimiter(8),
  cache = createTtlCache({ maxEntries: 20 }),
  ttlMs = FEED_TTL_MS,
  now = () => new Date(),
}) {
  const trailerKeyOf = (item) =>
    limiter(() => trailers.getTrailersForItem(item))
      .then((r) => r.trailers[0]?.key || null)
      .catch(() => null);

  /** Recorre candidatos por tandas hasta reunir `limit` títulos con tráiler. */
  async function takeWithTrailer(items, limit) {
    const picked = [];
    for (let i = 0; i < items.length && picked.length < limit; i += limit) {
      const batch = items.slice(i, i + limit);
      const keys = await Promise.all(batch.map(trailerKeyOf));
      batch.forEach((item, j) => {
        if (keys[j] && picked.length < limit) picked.push(toFeedItem(item, keys[j]));
      });
    }
    return picked;
  }

  /** Fase 1 (paralelizable): candidatos de la fuente que existen en el catálogo. */
  async function catalogCandidates(section, at) {
    const candidates = uniqueById(await source.getCandidates(section, at));
    if (!candidates.length) return [];
    const inCatalog = await catalog.getMediaByIds(section.type, candidates.map((c) => c.id));
    const byId = new Map(inCatalog.map((item) => [item.id, item]));
    return candidates
      .filter((c) => byId.has(c.id))
      .map((c) => ({ ...mergeCatalogItem(byId.get(c.id), c), type: section.type }));
  }

  async function buildPage(page) {
    const at = now();
    const pools = await Promise.all(
      page.sections.map((section) =>
        catalogCandidates(section, at).catch((err) => {
          logger.error('feed.section_failed', { section: section.id, err });
          return [];
        })
      )
    );

    // Fase 2 (en orden): cada título aparece una sola vez por página; gana la
    // fila de más arriba. Los tráilers ya consultados quedan en caché.
    const used = new Set();
    const sections = [];
    for (const [i, section] of page.sections.entries()) {
      const fresh = pools[i].filter((item) => !used.has(item.id));
      const items = await takeWithTrailer(fresh, section.limit || SECTION_LIMIT);
      items.forEach((item) => used.add(item.id));
      sections.push({
        id: section.id,
        title: section.title,
        type: section.type,
        ranked: Boolean(section.ranked),
        items,
      });
    }

    const featuredPool = sections
      .filter((s) => page.featured.from.includes(s.id))
      .flatMap((s) => s.items)
      .filter((item) => item.backdrop && item.overview);

    return {
      featured: uniqueById(featuredPool).slice(0, page.featured.limit),
      sections: sections.filter((s) => s.items.length > 0),
      generatedAt: at.toISOString(),
    };
  }

  /**
   * @param {string} pageId  'home' | 'movies' | 'series'
   * @returns {Promise<{ featured: object[], sections: object[], generatedAt: string } | null>}
   */
  function getFeed(pageId) {
    const page = Object.hasOwn(pages, pageId) ? pages[pageId] : null;
    if (!page) return Promise.resolve(null);

    // Se cachea la promesa: peticiones simultáneas comparten un solo cálculo.
    const cached = cache.get(pageId);
    if (cached) return cached;
    const pending = buildPage(page).catch((err) => {
      cache.delete(pageId);
      throw err;
    });
    cache.set(pageId, pending, ttlMs);
    return pending;
  }

  return { getFeed };
}

const tmdbSource = createTmdbPopularitySource({ fetchList: getTmdbMediaList });
const catalogSource = createCatalogSource({ getMediaSorted });

export const feedService = createFeedService({
  source: {
    getCandidates: (section, at) =>
      (isTmdbConfigured() ? tmdbSource : catalogSource).getCandidates(section, at),
  },
  catalog: { getMediaByIds },
  trailers: trailerService,
});
