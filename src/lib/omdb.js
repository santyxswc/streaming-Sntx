/**
 * Cliente para OMDb API (Open Movie Database).
 * @see https://www.omdbapi.com/
 *
 * Para usar: define OMDB_API_KEY en .env.local
 */

const OMDB_BASE = "https://www.omdbapi.com";

function getApiKey() {
  return process.env.OMDB_API_KEY || null;
}

/**
 * @returns {boolean} true si OMDb está configurado
 */
export function isOmdbConfigured() {
  return Boolean(getApiKey());
}

async function omdbFetch(params = {}) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = new URL(OMDB_BASE);
  url.searchParams.set("apikey", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.Response === "False") return null;
  return data;
}

function mapOmdbToMedia(item) {
  const type = item.Type === "series" ? "series" : "movie";
  return {
    id: `omdb-${item.imdbID}`,
    numericId: 0,
    title: item.Title || "",
    originalTitle: item.Title || "",
    overview: item.Plot || "",
    image: item.Poster && item.Poster !== "N/A" ? item.Poster : "",
    backdrop: "",
    year: item.Year ? item.Year.split("–")[0] : "",
    rating: item.imdbRating && item.imdbRating !== "N/A" ? item.imdbRating : "0.0",
    genres: item.Genre
      ? item.Genre.split(",").map((g) => g.trim())
      : [],
    country: item.Country || "",
    trailer: "",
    type,
    source: "omdb",
    imdbID: item.imdbID,
    scrapedAt: new Date().toISOString(),
  };
}

function mapOmdbSearchItem(item) {
  const type = item.Type === "series" ? "series" : "movie";
  return {
    id: `omdb-${item.imdbID}`,
    numericId: 0,
    title: item.Title || "",
    originalTitle: item.Title || "",
    overview: "",
    image: item.Poster && item.Poster !== "N/A" ? item.Poster : "",
    backdrop: "",
    year: item.Year ? item.Year.split("–")[0] : "",
    rating: "0.0",
    genres: [],
    country: "",
    trailer: "",
    type,
    source: "omdb",
    imdbID: item.imdbID,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Búsqueda por título en OMDb.
 */
export async function searchOmdb(query, page = 1) {
  const data = await omdbFetch({ s: query, page: String(page) });
  if (!data || !data.Search) return [];
  return data.Search.map(mapOmdbSearchItem).slice(0, 10);
}

/**
 * Obtener detalle de un título por IMDb ID.
 */
export async function getOmdbById(imdbId) {
  const data = await omdbFetch({ i: imdbId, plot: "full" });
  if (!data) return null;
  return mapOmdbToMedia(data);
}

/**
 * Obtener detalle de un título por nombre.
 */
export async function getOmdbByTitle(title, year) {
  const params = { t: title, plot: "full" };
  if (year) params.y = String(year);
  const data = await omdbFetch(params);
  if (!data) return null;
  return mapOmdbToMedia(data);
}
