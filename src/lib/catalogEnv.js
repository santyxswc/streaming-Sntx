/**
 * Proveedor de catálogo: firebase (Firestore), neon (PostgreSQL), tmdb o demo.
 * Si no defines CATALOG_PROVIDER pero sí DATABASE_URL/NEON_DATABASE_URL, se usa Neon.
 * Si defines TMDB_API_KEY sin otro provider, se usa TMDB.
 * Si no hay nada configurado, se usa el modo demo (datos en memoria).
 * @returns {'firebase'|'neon'|'tmdb'|'demo'}
 */
export function getCatalogProvider() {
  const raw = process.env.CATALOG_PROVIDER;
  if (raw != null && String(raw).trim() !== '') {
    const p = String(raw).toLowerCase().trim();
    if (p === 'neon') return 'neon';
    if (p === 'tmdb') return 'tmdb';
    if (p === 'demo') return 'demo';
    return 'firebase';
  }
  if (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL) {
    return 'neon';
  }
  // Auto-detect Firebase: check if critical Firebase admin env is set
  if (
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  ) {
    return 'firebase';
  }
  // Auto-detect TMDB
  if (process.env.TMDB_API_KEY) {
    return 'tmdb';
  }
  // Fallback to demo mode (works without any external service)
  return 'demo';
}

export function isNeonCatalog() {
  return getCatalogProvider() === 'neon';
}

