/**
 * Tope de tiempo para las llamadas a APIs externas (TMDB, OMDb). Sin él, un proveedor colgado retiene la
 * función de Vercel hasta su límite de duración. Se puede ajustar con EXTERNAL_API_TIMEOUT_MS.
 */
export const DEFAULT_EXTERNAL_TIMEOUT_MS = 8000;

export function externalApiSignal() {
  const configured = Number(process.env.EXTERNAL_API_TIMEOUT_MS);
  return AbortSignal.timeout(Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_EXTERNAL_TIMEOUT_MS);
}
