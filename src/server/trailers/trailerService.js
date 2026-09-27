import 'server-only';
import { getMediaBySlug } from '@/server/catalog/catalogRepository';
import {
  getTmdbVideos,
  findTmdbByExternalId,
  findTmdbIdByTitle,
  isTmdbConfigured,
} from '@/server/integrations/tmdb';
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
const CACHE_MAX_ENTRIES = 2000;
const MAX_TRAILERS = 6;

const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key, value, ttlMs) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Map conserva el orden de inserción: el primero es el más antiguo.
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { expiresAt: Date.now() + ttlMs, value });
}

const TYPE_WEIGHT = { Trailer: 0, Teaser: 1, Clip: 2 };
const LANGUAGE_WEIGHT = { es: 0, en: 1 };

/** Tráiler oficial en español primero; luego inglés; luego el resto. */
function rankVideo(v) {
  return (
    (TYPE_WEIGHT[v.type] ?? 3) * 100 +
    (LANGUAGE_WEIGHT[v.language] ?? 2) * 10 +
    (v.official ? 0 : 1)
  );
}

async function resolveTmdbId(item) {
  const ids = item.externalIds || {};
  if (ids.tmdb) return String(ids.tmdb);

  if (ids.imdb) {
    const match = await findTmdbByExternalId(ids.imdb, 'imdb_id');
    if (match?.id) return String(match.id);
  }
  if (ids.tvdb) {
    const match = await findTmdbByExternalId(String(ids.tvdb), 'tvdb_id');
    if (match?.id) return String(match.id);
  }

  const byTitle =
    (await findTmdbIdByTitle(item.type, item.originalTitle || item.title, item.year)) ||
    (item.originalTitle && item.originalTitle !== item.title
      ? await findTmdbIdByTitle(item.type, item.title, item.year)
      : null);
  return byTitle ? String(byTitle) : null;
}

function toTrailer({ key, name, language = '', official = false, type = 'Trailer' }) {
  return { key, name: name || 'Tráiler', language, official, type };
}

/**
 * @param {'movie'|'series'} type
 * @param {string} id  id del catálogo (slug) o `tmdb-<id>`
 * @returns {Promise<{ trailers: ReturnType<typeof toTrailer>[] } | null>} null si el título no existe
 */
export async function getTrailersForMedia(type, id) {
  const mediaType = type === 'series' ? 'series' : 'movie';
  const cacheKey = `${mediaType}:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  const item = id.startsWith('tmdb-')
    ? { id, type: mediaType, externalIds: { tmdb: id.slice('tmdb-'.length) } }
    : await getMediaBySlug(mediaType, id);
  if (!item) return null;

  const trailers = [];
  const stored = parseYoutubeId(item.trailer);
  if (stored) trailers.push(toTrailer({ key: stored, name: 'Tráiler oficial' }));

  if (isTmdbConfigured()) {
    const tmdbId = await resolveTmdbId({ ...item, type: mediaType });
    if (tmdbId) {
      const videos = await getTmdbVideos(mediaType, tmdbId);
      videos
        .filter((v) => v.key !== stored)
        .sort((a, b) => rankVideo(a) - rankVideo(b))
        .forEach((v) => trailers.push(toTrailer(v)));
    }
  }

  const result = { trailers: trailers.slice(0, MAX_TRAILERS) };
  cacheSet(cacheKey, result, result.trailers.length ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS);
  return result;
}
