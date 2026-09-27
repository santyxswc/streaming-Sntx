import 'server-only';
/**
 * Proveedor de catálogo basado en TMDB API.
 * Consulta api.themoviedb.org en tiempo real sin persistir datos.
 * Requiere: TMDB_API_KEY en .env.local
 */

import {
  searchTmdb,
  getTrending,
  discoverTmdb,
  isTmdbConfigured,
} from "@/server/integrations/tmdb";

/** No hay db en modo TMDB. */
export const db = null;

export const saveMediaBatch = async () => {
  // No-op: TMDB es solo lectura
};

export const getMediaSorted = async (
  type = "movie",
  sortField = "scrapedAt",
  sortOrder = "desc",
  count = 20,
  _lastDocId = null,
  genre = null,
  year = null,
  _country = null
) => {
  if (!isTmdbConfigured()) return [];

  const sortMap = {
    scrapedAt: "popularity.desc",
    yearRating: "vote_average.desc",
    rating: "vote_average.desc",
    year: "primary_release_date.desc",
  };
  const sortBy = sortMap[sortField] || "popularity.desc";

  const items = await discoverTmdb(type === "series" ? "series" : "movie", {
    sortBy,
    year: year && year !== "Todos" ? year : undefined,
    genre: genre && genre !== "Todos" ? genre : undefined,
  });

  return items.slice(0, count);
};

export const getLatestMedia = async (type = "movie", count = 20) => {
  if (!isTmdbConfigured()) return [];
  const items = await getTrending(type === "series" ? "series" : "movie");
  return items.slice(0, count);
};

export const getFilterMetadata = async () => {
  const currentYear = new Date().getFullYear();
  const years = ["Todos"];
  for (let y = currentYear; y >= 1970; y--) {
    years.push(String(y));
  }
  return {
    years,
    countries: ["Todos"],
  };
};

export const updateFilterMetadata = async () => {
  // No-op
};

export const getMediaBySlug = async (type, slug) => {
  if (!isTmdbConfigured()) return null;
  // Try searching by slug-derived title
  const title = slug.replace(/-/g, " ");
  const results = await searchTmdb(title);
  return results.find((r) => r.id === slug || r.id === `tmdb-${slug}`) || results[0] || null;
};

export const searchCatalog = async (qStr) => {
  if (!isTmdbConfigured()) return [];
  return searchTmdb(qStr);
};

export const getRecommendationsForItem = async (item, count = 60) => {
  if (!item || !isTmdbConfigured()) return [];
  const type = item.type === "series" ? "series" : "movie";
  const items = await getTrending(type);
  return items.filter((i) => i.id !== item.id).slice(0, count);
};

export const findMediaForAiLookup = async (_collectionName, titlesToTry) => {
  if (!isTmdbConfigured()) return { winner: null, winnerId: null };
  for (const title of titlesToTry) {
    if (!title) continue;
    const results = await searchTmdb(title);
    if (results.length > 0) {
      return { winner: results[0], winnerId: results[0].id };
    }
  }
  return { winner: null, winnerId: null };
};
