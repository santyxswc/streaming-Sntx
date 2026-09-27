import 'server-only';
import { getCatalogProvider } from "@/server/config/catalogEnv";
import * as firebaseCatalog from "@/server/catalog/providers/firebaseCatalog";
import * as neonCatalog from "@/server/catalog/providers/neonCatalog";
import * as tmdbCatalog from "@/server/catalog/providers/tmdbCatalog";
import * as demoCatalog from "@/server/catalog/providers/demoCatalog";

/**
 * Repositorio del catálogo: punto de entrada único para las API routes.
 *
 * Cada proveedor (Neon/PostgreSQL, Firestore, TMDB en vivo o demo en memoria)
 * implementa el mismo contrato; el activo se elige con CATALOG_PROVIDER
 * (ver src/server/config/catalogEnv.js). Las rutas nunca importan un
 * proveedor concreto, así que cambiar de base de datos no toca la capa HTTP.
 */
function provider() {
  switch (getCatalogProvider()) {
    case "neon":
      return neonCatalog;
    case "tmdb":
      return tmdbCatalog;
    case "demo":
      return demoCatalog;
    default:
      return firebaseCatalog;
  }
}

export const saveMediaBatch = (...args) => provider().saveMediaBatch(...args);
export const getMediaSorted = (...args) => provider().getMediaSorted(...args);
export const getLatestMedia = (...args) => provider().getLatestMedia(...args);
export const getFilterMetadata = (...args) => provider().getFilterMetadata(...args);
export const updateFilterMetadata = (...args) => provider().updateFilterMetadata(...args);
export const getMediaBySlug = (...args) => provider().getMediaBySlug(...args);
export const searchCatalog = (...args) => provider().searchCatalog(...args);
export const getRecommendationsForItem = (...args) => provider().getRecommendationsForItem(...args);
export const findMediaForAiLookup = (...args) => provider().findMediaForAiLookup(...args);
