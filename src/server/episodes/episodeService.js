import 'server-only';
import { getTmdbTvShow, getTmdbSeasonEpisodes } from '@/server/integrations/tmdb';
import { getTvmazeEpisodes } from '@/server/integrations/tvmaze';
import { getCatalogProvider } from '@/server/config/catalogEnv';
import { getDemoEpisodes } from '@/server/catalog/providers/demoCatalog';
import { stripHtml } from '@/lib/text.mjs';

/**
 * Temporadas y episodios de una serie. Cada resolvedor declara qué ids sabe
 * atender; el primero que coincide responde. Añadir una fuente nueva es
 * añadir un resolvedor, sin tocar los existentes.
 *
 * Respuesta: `{ posts: [{ _id, title, overview, image }], seasons: string[] }`
 * o `null` si ninguna fuente conoce la serie.
 */


export const tmdbResolver = {
  match: (showId) => /^tmdb-(\d+)$/.exec(showId)?.[1] ?? null,
  async getSeason(tvId, season) {
    const [show, { posts }] = await Promise.all([
      getTmdbTvShow(tvId),
      getTmdbSeasonEpisodes(tvId, season),
    ]);
    if (!show) return null;
    return { posts, seasons: show.seasons?.length ? show.seasons : [String(season)] };
  },
};

export const tvmazeResolver = {
  match: (showId) => (/^tvmaze-(\d+)$/.exec(showId) || /-tvmaze-(\d+)$/.exec(showId))?.[1] ?? null,
  async getSeason(tvId, season) {
    const episodes = await getTvmazeEpisodes(tvId);
    if (!episodes.length) return null;
    const seasonNum = Number(season) || 1;
    const seasons = [...new Set(episodes.map((ep) => String(ep.season)))]
      .filter(Boolean)
      .sort((a, b) => Number(a) - Number(b));
    const posts = episodes
      .filter((ep) => ep.season === seasonNum)
      .map((ep) => ({
        _id: `tvmaze-${tvId}-s${ep.season}-e${ep.number}`,
        title: ep.name || `Episodio ${ep.number}`,
        overview: stripHtml(ep.summary),
        image: ep.image?.original || ep.image?.medium || '',
      }));
    return { posts, seasons: seasons.length ? seasons : [String(season)] };
  },
};

export const demoResolver = {
  match: (showId) => (getCatalogProvider() === 'demo' ? showId : null),
  getSeason: (showId, season) => getDemoEpisodes(showId, season),
};

export function createEpisodeService(resolvers) {
  return {
    async getSeason(showId, season = '1') {
      for (const resolver of resolvers) {
        const key = resolver.match(showId);
        if (key == null) continue;
        try {
          const result = await resolver.getSeason(key, season);
          if (result) return result;
        } catch (err) {
          console.warn(`[episodes] ${showId} T${season}:`, err.message);
        }
      }
      return null;
    },
  };
}

export const episodeService = createEpisodeService([tmdbResolver, tvmazeResolver, demoResolver]);
