import { NextResponse } from "next/server";
import { searchCatalog } from "@/services/db";
import { searchTmdb, isTmdbConfigured } from "@/lib/tmdb";
import { searchOmdb, isOmdbConfigured } from "@/lib/omdb";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const revalidate = 1800;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
};

/**
 * GET /api/media/multi-search?q=...
 *
 * Busca en múltiples fuentes en paralelo:
 * 1. Catálogo local (Firebase/Neon/demo)
 * 2. TMDB API (si configurada)
 * 3. OMDb API (si configurada)
 *
 * Retorna resultados unificados con indicador de fuente.
 */
export async function GET(request) {
  const limitResponse = rateLimit(request, {
    limit: 15,
    windowMs: 60000,
    id: "multi-search",
  });
  if (limitResponse) return limitResponse;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ success: true, data: [], sources: [] }, { headers: CACHE_HEADERS });
  }

  const query = q.trim();
  const sources = [];
  const allResults = [];

  // Launch searches in parallel
  const searches = [];

  // 1. Local catalog
  searches.push(
    searchCatalog(query)
      .then((results) => {
        sources.push("local");
        return (results || []).map((item) => ({
          ...item,
          source: item.source || "local",
        }));
      })
      .catch((err) => {
        console.error("Multi-search local error:", err.message);
        return [];
      })
  );

  // 2. TMDB
  if (isTmdbConfigured()) {
    searches.push(
      searchTmdb(query)
        .then((results) => {
          if (results.length > 0) sources.push("tmdb");
          else console.warn(`[multi-search] TMDB devolvió 0 resultados para "${query}" (revisa logs de [tmdb] arriba: auth/timeout/formato)`);
          return results; // already have source: 'tmdb'
        })
        .catch((err) => {
          console.error(`[multi-search] TMDB error para "${query}":`, err.message, err.stack?.split("\n")[1] || "");
          return [];
        })
    );
  }

  // 3. OMDb
  if (isOmdbConfigured()) {
    searches.push(
      searchOmdb(query)
        .then((results) => {
          if (results.length > 0) sources.push("omdb");
          return results; // already have source: 'omdb'
        })
        .catch((err) => {
          console.error("Multi-search OMDb error:", err.message);
          return [];
        })
    );
  }

  const searchResults = await Promise.all(searches);

  // Merge results: local first, then TMDB, then OMDb
  for (const results of searchResults) {
    allResults.push(...results);
  }

  // Deduplicate by title (case-insensitive, normalized)
  const seen = new Set();
  const deduplicated = [];
  for (const item of allResults) {
    const key = (item.title || item.originalTitle || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    deduplicated.push(item);
  }

  return NextResponse.json(
    {
      success: true,
      data: deduplicated.slice(0, 40),
      sources: [...new Set(sources)],
    },
    { headers: CACHE_HEADERS }
  );
}
