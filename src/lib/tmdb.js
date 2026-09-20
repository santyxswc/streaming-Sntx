/**
 * Cliente para TMDB API (The Movie Database).
 * @see https://developer.themoviedb.org/docs
 *
 * Para usar: define TMDB_API_KEY en .env.local
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

function getApiKey() {
  return process.env.TMDB_API_KEY || null;
}

// TMDB tiene dos esquemas de auth:
// - API Key v3 (hash de 32 chars hex): va como query param `api_key=`
// - Read Access Token v4 (JWT largo, con puntos): va como header `Authorization: Bearer`
function isV4Token(key) {
  return key.includes(".") && key.length > 60;
}

/**
 * @returns {boolean} true si TMDB está configurado
 */
export function isTmdbConfigured() {
  return Boolean(getApiKey());
}

async function tmdbFetch(path, params = {}) {
  const key = getApiKey();
  if (!key) return null;

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "es-ES");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const useV4 = isV4Token(key);
  if (!useV4) {
    url.searchParams.set("api_key", key);
  }

  let res;
  try {
    res = await fetch(url.toString(), {
      headers: useV4
        ? { Authorization: `Bearer ${key}`, accept: "application/json" }
        : { accept: "application/json" },
      next: { revalidate: 3600 },
    });
  } catch (err) {
    console.error(`[tmdb] Fetch failed for ${path}:`, err.message);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[tmdb] ${path} -> HTTP ${res.status}: ${body.slice(0, 300)}`);
    return null;
  }
  return res.json();
}

function mapTmdbToMedia(item, mediaType) {
  const type = mediaType || (item.media_type === "tv" ? "series" : "movie");
  const isMovie = type === "movie";
  return {
    id: `tmdb-${item.id}`,
    numericId: item.id,
    title: isMovie ? (item.title || item.name) : (item.name || item.title),
    originalTitle: isMovie
      ? (item.original_title || item.original_name)
      : (item.original_name || item.original_title),
    overview: item.overview || "",
    image: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : "",
    backdrop: item.backdrop_path
      ? `${IMG_BASE}/original${item.backdrop_path}`
      : "",
    year: (isMovie ? item.release_date : item.first_air_date)?.split("-")[0] || "",
    rating: item.vote_average ? item.vote_average.toFixed(1) : "0.0",
    genres: (item.genre_ids || []).map(String),
    country: "",
    trailer: "",
    originalLanguage: item.original_language || "",
    type,
    source: "tmdb",
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Búsqueda multi (películas + series) en TMDB.
 */
export async function searchTmdb(query, page = 1) {
  const data = await tmdbFetch("/search/multi", {
    query,
    page: String(page),
    include_adult: "false",
  });
  if (!data) return [];

  return (data.results || [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => mapTmdbToMedia(r))
    .slice(0, 20);
}

/**
 * Películas trending (para la home page en modo TMDB).
 */
export async function getTrending(mediaType = "movie", timeWindow = "week") {
  const type = mediaType === "series" ? "tv" : "movie";
  const data = await tmdbFetch(`/trending/${type}/${timeWindow}`);
  if (!data) return [];
  return (data.results || []).map((r) => mapTmdbToMedia(r, mediaType));
}

/**
 * Discover con filtros.
 */
export async function discoverTmdb(
  mediaType = "movie",
  { sortBy = "popularity.desc", page = 1, year, genre, originalLanguage } = {}
) {
  const type = mediaType === "series" ? "tv" : "movie";
  const params = {
    sort_by: sortBy,
    page: String(page),
    include_adult: "false",
  };
  if (year) {
    params[type === "movie" ? "primary_release_year" : "first_air_date_year"] =
      String(year);
  }
  if (genre) params.with_genres = String(genre);
  if (originalLanguage) params.with_original_language = String(originalLanguage);

  const data = await tmdbFetch(`/discover/${type}`, params);
  if (!data) return [];
  return (data.results || []).map((r) => mapTmdbToMedia(r, mediaType));
}

const genreMapCache = { movie: null, series: null };

/**
 * Mapa id TMDB -> nombre de género en español (cacheado en memoria del proceso).
 * Los ids de TMDB no coinciden con los de GENRE_MAP (que son de lamovie.org).
 */
export async function getTmdbGenreMap(mediaType = "movie") {
  const key = mediaType === "series" ? "series" : "movie";
  if (genreMapCache[key]) return genreMapCache[key];
  const type = key === "series" ? "tv" : "movie";
  const data = await tmdbFetch(`/genre/${type}/list`);
  const map = {};
  (data?.genres || []).forEach((g) => {
    map[String(g.id)] = g.name;
  });
  genreMapCache[key] = map;
  return map;
}

/**
 * Discover con filtros + metadata de paginación real de TMDB, y géneros
 * resueltos a nombres (no ids), listo para persistir con saveMediaBatch.
 */
export async function discoverTmdbPage(
  mediaType = "movie",
  { sortBy = "popularity.desc", page = 1, year, genre, originalLanguage } = {}
) {
  const type = mediaType === "series" ? "tv" : "movie";
  const params = {
    sort_by: sortBy,
    page: String(page),
    include_adult: "false",
  };
  if (year) {
    params[type === "movie" ? "primary_release_year" : "first_air_date_year"] =
      String(year);
  }
  if (genre) params.with_genres = String(genre);
  if (originalLanguage) params.with_original_language = String(originalLanguage);

  const data = await tmdbFetch(`/discover/${type}`, params);
  if (!data) return { items: [], totalPages: 0, totalResults: 0 };

  const genreMap = await getTmdbGenreMap(mediaType);
  const items = (data.results || []).map((r) => {
    const mapped = mapTmdbToMedia(r, mediaType);
    mapped.genres = (r.genre_ids || [])
      .map((id) => genreMap[String(id)])
      .filter(Boolean);
    return mapped;
  });

  return {
    items,
    totalPages: data.total_pages || 0,
    totalResults: data.total_results || 0,
  };
}

function extractTrailerKey(videos) {
  if (!videos?.results?.length) return "";
  const trailer =
    videos.results.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.results.find((v) => v.site === "YouTube");
  return trailer?.key || "";
}

/**
 * Convierte una URL "watch?v=" de YouTube en su URL de embed.
 */
export function youtubeEmbedFromWatchUrl(watchUrl) {
  if (!watchUrl) return null;
  const id = watchUrl.includes("v=")
    ? watchUrl.split("v=")[1]?.split("&")[0]
    : watchUrl.split("/").pop();
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
}

/**
 * Normaliza el detalle completo de TMDB (movie o tv) a la misma forma
 * que espera el frontend en /[type]/[slug].
 */
function mapTmdbDetail(item, mediaType) {
  const isMovie = mediaType === "movie";
  const trailerKey = extractTrailerKey(item.videos);
  const base = {
    id: `tmdb-${item.id}`,
    numericId: `tmdb-${item.id}`,
    tmdbId: item.id,
    title: isMovie ? item.title : item.name,
    originalTitle: isMovie ? item.original_title : item.original_name,
    overview: item.overview || "",
    image: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : "",
    backdrop: item.backdrop_path
      ? `${IMG_BASE}/original${item.backdrop_path}`
      : "",
    year: (isMovie ? item.release_date : item.first_air_date)?.split("-")[0] || "",
    rating: item.vote_average ? item.vote_average.toFixed(1) : "0.0",
    genres: (item.genres || []).map((g) => g.name),
    country:
      item.production_countries?.[0]?.iso_3166_1 ||
      item.origin_country?.[0] ||
      "",
    trailer: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : "",
    type: isMovie ? "movie" : "series",
    source: "tmdb",
    scrapedAt: new Date().toISOString(),
  };
  if (!isMovie) {
    base.seasons = (item.seasons || [])
      .filter((s) => s.season_number > 0)
      .map((s) => String(s.season_number));
  }
  return base;
}

/**
 * Detalle completo de una película TMDB.
 */
export async function getTmdbMovie(id) {
  const data = await tmdbFetch(`/movie/${id}`, { append_to_response: "videos" });
  if (!data) return null;
  return mapTmdbDetail(data, "movie");
}

/**
 * Detalle completo de una serie TMDB.
 */
export async function getTmdbTvShow(id) {
  const data = await tmdbFetch(`/tv/${id}`, { append_to_response: "videos" });
  if (!data) return null;
  return mapTmdbDetail(data, "series");
}

/**
 * Detalle TMDB según el tipo ('movie' | 'series').
 */
export async function getTmdbMedia(type, id) {
  return type === "movie" ? getTmdbMovie(id) : getTmdbTvShow(id);
}

/**
 * Episodios de una temporada de una serie TMDB, normalizados
 * a la forma { posts, seasons } que espera /api/media/episodes.
 */
export async function getTmdbSeasonEpisodes(tvId, season = 1) {
  const data = await tmdbFetch(`/tv/${tvId}/season/${season}`);
  if (!data) return { posts: [] };

  const posts = (data.episodes || []).map((ep) => ({
    _id: `tmdb-${tvId}-s${season}-e${ep.episode_number}`,
    title: ep.name || `Episodio ${ep.episode_number}`,
    overview: ep.overview || "",
    image: ep.still_path ? `${IMG_BASE}/w500${ep.still_path}` : "",
  }));

  return { posts };
}

/**
 * Busca en TMDB a través de un identificador externo (IMDb, TheTVDB, etc.).
 * @param {string} externalId Ej: "tt0903747" o "81189"
 * @param {'imdb_id' | 'tvdb_id'} source
 * @returns {Promise<{ id: number, type: 'movie' | 'series', title: string } | null>}
 */
export async function findTmdbByExternalId(externalId, source = "imdb_id") {
  if (!externalId) return null;
  const data = await tmdbFetch(`/find/${externalId}`, {
    external_source: source,
  });
  if (!data) return null;

  if (data.tv_results?.length) {
    const r = data.tv_results[0];
    return {
      id: r.id,
      type: "series",
      title: r.name,
      originalTitle: r.original_name,
    };
  }

  if (data.movie_results?.length) {
    const r = data.movie_results[0];
    return {
      id: r.id,
      type: "movie",
      title: r.title,
      originalTitle: r.original_title,
    };
  }

  return null;
}
