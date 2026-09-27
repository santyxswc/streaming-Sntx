import 'server-only';

/**
 * Caché en memoria con expiración por entrada y tope de tamaño (expulsa la
 * entrada más antigua). Vive mientras viva el proceso: complementa, no
 * reemplaza, la caché HTTP del CDN.
 */
export function createTtlCache({ maxEntries = 1000, now = Date.now } = {}) {
  const entries = new Map();

  return {
    get(key) {
      const hit = entries.get(key);
      if (!hit) return undefined;
      if (now() > hit.expiresAt) {
        entries.delete(key);
        return undefined;
      }
      return hit.value;
    },

    set(key, value, ttlMs) {
      entries.delete(key);
      if (entries.size >= maxEntries) {
        // Map conserva el orden de inserción: la primera clave es la más antigua.
        entries.delete(entries.keys().next().value);
      }
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },

    delete(key) {
      entries.delete(key);
    },
  };
}
