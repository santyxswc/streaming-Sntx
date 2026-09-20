/**
 * API pública del catálogo: delega en Firebase o Neon según CATALOG_PROVIDER.
 * @see src/lib/catalogEnv.js
 */
export {
  saveMediaBatch,
  getMediaSorted,
  getLatestMedia,
  getFilterMetadata,
  updateFilterMetadata,
  getMediaBySlug,
  searchCatalog,
  getRecommendationsForItem,
  findMediaForAiLookup,
  db,
} from "@/services/catalogRepository";
