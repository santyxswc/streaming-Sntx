import 'server-only';
import { getMediaBySlug } from '@/server/catalog/catalogRepository';
import {
  getTmdbVideos,
  findTmdbByExternalId,
  findTmdbIdByTitle,
  isTmdbConfigured,
} from '@/server/integrations/tmdb';
import { createTtlCache } from '@/server/shared/ttlCache';
import { parseYoutubeId } from '@/lib/youtube';

/**
 * Resuelve los tráilers de YouTube de un título del catálogo.
 *
 * Solo ~7% del catálogo tiene el tráiler guardado en la columna `trailer`, así
 * que se resuelve bajo demanda contra TMDB usando el mejor identificador
 * disponible (id TMDB → IMDb/TheTVDB → título + año). No escribe en la BD:
 * el resultado se cachea en memoria del proceso y en el CDN vía Cache-Control.
 */

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
// Un "sin tráilers" puede ser un fallo puntual de TMDB: se reintenta antes.
const EMPTY_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_TRAILERS = 6;

const TYPE_WEIGHT = { Trailer: 0, Teaser: 1, Clip: 2 };
const LANGUAGE_WEIGHT = { es: 0, en: 1 };

/** Tráiler oficial en español primero; luego inglés; luego el resto. */
export function rankVideo(v) {
  return (
    (TYPE_WEIGHT[v.type] ?? 3) * 100 +
    (LANGUAGE_WEIGHT[v.language] ?? 2) * 10 +
    (v.official ? 0 : 1)
  );
}

function toTrailer({ key, name, language = '', official = false, type = 'Trailer' }) {
  return { key, name: name || 'Tráiler', language, official, type };
}

/**
 * @param {object} deps
 * @param {{ getMediaBySlug: Function }} deps.catalog
 * @param {{ isConfigured: () => boolean, getVideos: Function, findByExternalId: Function, findIdByTitle: Function }} deps.videos
 * @param {ReturnType<typeof createTtlCache>} [deps.cache]
 */
export function createTrailerService({ catalog, videos, cache = createTtlCache({ maxEntries: 5000 }) }) {
  async function resolveTmdbId(item) {
    const ids = item.externalIds || {};
    if (ids.tmdb) return String(ids.tmdb);

    if (ids.imdb) {
      const match = await videos.findByExternalId(ids.imdb, 'imdb_id');
      if (match?.id) return String(match.id);
    }
    if (ids.tvdb) {
      const match = await videos.findByExternalId(String(ids.tvdb), 'tvdb_id');
      if (match?.id) return String(match.id);
    }

    const byTitle =
      (await videos.findIdByTitle(item.type, item.originalTitle || item.title, item.year)) ||
      (item.originalTitle && item.originalTitle !== item.title
        ? await videos.findIdByTitle(item.type, item.title, item.year)
        : null);
    return byTitle ? String(byTitle) : null;
  }

  async function resolve(item) {
    const trailers = [];
    const stored = parseYoutubeId(item.trailer);
    if (stored) trailers.push(toTrailer({ key: stored, name: 'Tráiler oficial' }));

    if (videos.isConfigured()) {
      const tmdbId = await resolveTmdbId(item);
      if (tmdbId) {
        const found = await videos.getVideos(item.type, tmdbId);
        found
          .filter((v) => v.key !== stored)
          .sort((a, b) => rankVideo(a) - rankVideo(b))
          .forEach((v) => trailers.push(toTrailer(v)));
      }
    }
    return { trailers: trailers.slice(0, MAX_TRAILERS) };
  }

  /**
   * Tráilers de un ítem ya cargado (evita releer el catálogo).
   * @param {{ id: string, type: 'movie'|'series', trailer?: string, externalIds?: object, title?: string, originalTitle?: string, year?: string }} item
   */
  async function getTrailersForItem(item) {
    const mediaType = item.type === 'series' ? 'series' : 'movie';
    const cacheKey = `${mediaType}:${item.id}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const result = await resolve({ ...item, type: mediaType });
    cache.set(cacheKey, result, result.trailers.length ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS);
    return result;
  }

  /**
   * @param {'movie'|'series'} type
   * @param {string} id  id del catálogo (slug) o `tmdb-<id>`
   * @returns {Promise<{ trailers: ReturnType<typeof toTrailer>[] } | null>} null si el título no existe
   */
  async function getTrailersForMedia(type, id) {
    const mediaType = type === 'series' ? 'series' : 'movie';
    const cached = cache.get(`${mediaType}:${id}`);
    if (cached !== undefined) return cached;

    const item = id.startsWith('tmdb-')
      ? { id, type: mediaType, externalIds: { tmdb: id.slice('tmdb-'.length) } }
      : await catalog.getMediaBySlug(mediaType, id);
    if (!item) return null;
    return getTrailersForItem({ ...item, id, type: mediaType });
  }

  return { getTrailersForItem, getTrailersForMedia };
}

export const trailerService = createTrailerService({
  catalog: { getMediaBySlug },
  videos: {
    isConfigured: isTmdbConfigured,
    getVideos: getTmdbVideos,
    findByExternalId: findTmdbByExternalId,
    findIdByTitle: findTmdbIdByTitle,
  },
});
