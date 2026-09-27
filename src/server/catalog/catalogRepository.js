import 'server-only';
import { getCatalogProvider } from "@/server/config/catalogEnv";
import * as firebaseCatalog from "@/server/catalog/providers/firebaseCatalog";
import * as neonCatalog from "@/server/catalog/providers/neonCatalog";
import * as tmdbCatalog from "@/server/catalog/providers/tmdbCatalog";
import * as demoCatalog from "@/server/catalog/providers/demoCatalog";

/**
 * Repositorio del catálogo: punto de entrada único para las API routes.
 *
 * Cada proveedor implementa el mismo contrato (CATALOG_CONTRACT, verificado
 * por tests); el activo se elige con CATALOG_PROVIDER. Las rutas nunca
 * importan un proveedor concreto, así que añadir o cambiar de base de datos
 * no toca la capa HTTP: basta con registrar el módulo aquí.
 */
export const CATALOG_PROVIDERS = {
  neon: neonCatalog,
  firebase: firebaseCatalog,
  tmdb: tmdbCatalog,
  demo: demoCatalog,
};

export const CATALOG_CONTRACT = [
  "saveMediaBatch",
  "getMediaSorted",
  "getLatestMedia",
  "getFilterMetadata",
  "updateFilterMetadata",
  "getMediaBySlug",
  "getMediaByIds",
  "searchCatalog",
  "getRecommendationsForItem",
  "findMediaForAiLookup",
];

const provider = () => CATALOG_PROVIDERS[getCatalogProvider()];

export const saveMediaBatch = (...args) => provider().saveMediaBatch(...args);
export const getMediaSorted = (...args) => provider().getMediaSorted(...args);
export const getLatestMedia = (...args) => provider().getLatestMedia(...args);
export const getFilterMetadata = (...args) => provider().getFilterMetadata(...args);
export const updateFilterMetadata = (...args) => provider().updateFilterMetadata(...args);
export const getMediaBySlug = (...args) => provider().getMediaBySlug(...args);
export const getMediaByIds = (...args) => provider().getMediaByIds(...args);
export const searchCatalog = (...args) => provider().searchCatalog(...args);
export const getRecommendationsForItem = (...args) => provider().getRecommendationsForItem(...args);
export const findMediaForAiLookup = (...args) => provider().findMediaForAiLookup(...args);
