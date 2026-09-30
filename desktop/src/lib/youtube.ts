import { api } from "@/config/api";

/**
 * URL para incrustar un tráiler de YouTube.
 *
 * YouTube rechaza la incrustación (Error 153) si la página no envía un Referer HTTP(S), y bajo
 * `tauri://localhost` el webview no lo envía. Por eso no se incrusta YouTube directamente: se usa una
 * página puente de la web (https) que a su vez incrusta el vídeo. Solo admite un conjunto cerrado de
 * parámetros (autoplay, mute, controls, loop, playlist, rel, modestbranding): ver
 * `src/server/embed/youtubeEmbed.js` en la web.
 */
export function youtubeEmbedUrl(id: string, params: Record<string, string | number> = {}): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => query.set(k, String(v)));
  return `${api.base}/embed/${encodeURIComponent(id)}?${query}`;
}
