/**
 * Cliente para Wyzie Subs (https://sub.wyzie.io), API gratuita de búsqueda de
 * subtítulos por IMDb/TMDB id, pensada específicamente para reproductores tipo
 * VidSrc/VidLink/SuperEmbed (URLs con CORS habilitado, listas para pasarse
 * directo como `sub_url` / `sub_file`).
 *
 * Para usar: define WYZIE_API_KEY en .env.local (clave gratuita en
 * https://store.wyzie.io/redeem). Si no está configurada, esta capa no hace
 * ninguna petición y el resto del player sigue funcionando igual que antes.
 */

const WYZIE_BASE = "https://sub.wyzie.io/search";

function getApiKey() {
  return process.env.WYZIE_API_KEY || null;
}

export function isWyzieConfigured() {
  return Boolean(getApiKey());
}

/**
 * Busca el subtítulo en español mejor puntuado para un contenido dado.
 * @param {{ imdbId?: string, tmdbId?: string|number, season?: string|number, episode?: string|number }} params
 * @returns {Promise<string|null>} URL directa al archivo .vtt (CORS-enabled) o null si no hay match.
 */
export async function getSpanishSubtitleUrl({ imdbId, tmdbId, season, episode } = {}) {
  const apiKey = getApiKey();
  const id = imdbId || tmdbId;
  if (!apiKey || !id) return null;

  const url = new URL(WYZIE_BASE);
  url.searchParams.set("id", String(id));
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "vtt");
  url.searchParams.set("key", apiKey);
  if (season) url.searchParams.set("season", String(season));
  if (episode) url.searchParams.set("episode", String(episode));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const results = await res.json();
    if (!Array.isArray(results) || !results.length) return null;
    // Wyzie ordena por relevancia/rating; nos quedamos con el primero.
    return results[0]?.url || null;
  } catch (err) {
    console.warn("[subtitles] Error consultando Wyzie:", err.message);
    return null;
  }
}
