import 'server-only';
import axios from 'axios';

const TVMAZE_BASE = 'https://api.tvmaze.com';

/**
 * Todos los episodios de una serie de TVmaze (API pública, sin clave).
 * @returns {Promise<Array<{ season: number, number: number, name: string, summary: string|null, image: object|null }>>}
 */
export async function getTvmazeEpisodes(showId) {
  const { data } = await axios.get(`${TVMAZE_BASE}/shows/${showId}/episodes`, { timeout: 5000 });
  return Array.isArray(data) ? data : [];
}
