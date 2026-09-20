import { getCatalogProvider } from "@/lib/catalogEnv";
import * as firebaseCatalog from "@/services/catalog/firebaseCatalog";
import * as neonCatalog from "@/services/catalog/neonCatalog";
import * as tmdbCatalog from "@/services/catalog/tmdbCatalog";
import * as demoCatalog from "@/services/catalog/demoCatalog";

function impl() {
  const provider = getCatalogProvider();
  switch (provider) {
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

export const saveMediaBatch = (...args) => impl().saveMediaBatch(...args);
export const getMediaSorted = (...args) => impl().getMediaSorted(...args);
export const getLatestMedia = (...args) => impl().getLatestMedia(...args);
export const getFilterMetadata = (...args) => impl().getFilterMetadata(...args);
export const updateFilterMetadata = (...args) => impl().updateFilterMetadata(...args);
export const getMediaBySlug = (...args) => impl().getMediaBySlug(...args);
export const searchCatalog = (...args) => impl().searchCatalog(...args);
export const getRecommendationsForItem = (...args) => impl().getRecommendationsForItem(...args);
export const findMediaForAiLookup = (...args) => impl().findMediaForAiLookup(...args);

/**
 * Re-export db: Firestore `db` cuando el provider es firebase,
 * null en otros casos (demo, tmdb, neon tienen su propia lógica).
 */
export const db = getCatalogProvider() === "firebase" ? firebaseCatalog.db : null;

