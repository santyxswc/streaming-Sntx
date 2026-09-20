import { NextResponse } from 'next/server';
import axios from 'axios';
import { rateLimit } from '@/lib/rateLimit';
import { getCatalogProvider } from '@/lib/catalogEnv';
import { getDemoEpisodes } from '@/services/catalog/demoCatalog';
import { getTmdbTvShow, getTmdbSeasonEpisodes } from '@/lib/tmdb';

export const runtime = 'nodejs';
export const revalidate = 3600;

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

const SOURCE_URL = (process.env.SOURCE_URL || process.env.SCRAPER_SOURCE_URL || 'https://lamovie.org').replace(/\/+$/, '');
const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': `${SOURCE_URL}/`,
};

export async function GET(request) {
  // Apply Rate Limit: 40 req/min
  const limitResponse = rateLimit(request, {
    limit: 40,
    windowMs: 60000,
    id: 'media-episodes',
  });
  if (limitResponse) return limitResponse;

  const { searchParams } = new URL(request.url);
  const showId = searchParams.get('showId');
  const season = searchParams.get('season') || '1';

  if (!showId) {
    return NextResponse.json({ success: false, error: 'showId is required' }, { status: 400 });
  }

  // Series provenientes de TMDB (via /api/media/multi-search): showId = `tmdb-<id>`.
  const tmdbMatch = showId.match(/^tmdb-(\d+)$/);
  if (tmdbMatch) {
    const tvId = tmdbMatch[1];
    const [show, episodesData] = await Promise.all([
      getTmdbTvShow(tvId),
      getTmdbSeasonEpisodes(tvId, season),
    ]);
    if (!show) {
      return NextResponse.json({ success: false, error: 'TMDB show not found' }, { status: 404 });
    }
    const seasons = show.seasons?.length ? show.seasons : [String(season)];
    return NextResponse.json(
      { success: true, data: { posts: episodesData.posts, seasons } },
      { headers: CACHE_HEADERS }
    );
  }

  // Series provenientes de TVmaze: showId = `tvmaze-<id>` o slug con `-tvmaze-<id>`
  const tvmazeMatch = showId.match(/^tvmaze-(\d+)$/) || showId.match(/-tvmaze-(\d+)$/);
  if (tvmazeMatch) {
    const tvId = tvmazeMatch[1];
    try {
      const { data: rawEpisodes } = await axios.get(`https://api.tvmaze.com/shows/${tvId}/episodes`, {
        timeout: 5000,
      });
      if (Array.isArray(rawEpisodes)) {
        const seasonNum = Number(season) || 1;
        const seasonEpisodes = rawEpisodes.filter((ep) => ep.season === seasonNum);
        const uniqueSeasons = Array.from(new Set(rawEpisodes.map((ep) => String(ep.season))))
          .filter(Boolean)
          .sort((a, b) => Number(a) - Number(b));

        const posts = seasonEpisodes.map((ep) => ({
          _id: `tvmaze-${tvId}-s${ep.season}-e${ep.number}`,
          title: ep.name || `Episodio ${ep.number}`,
          overview: ep.summary ? ep.summary.replace(/<[^>]*>/g, '').trim() : '',
          image: ep.image?.original || ep.image?.medium || '',
        }));

        return NextResponse.json(
          { success: true, data: { posts, seasons: uniqueSeasons.length ? uniqueSeasons : [String(season)] } },
          { headers: CACHE_HEADERS }
        );
      }
    } catch (err) {
      console.warn(`[episodes] Falló obtención de episodios TVmaze para ${tvId}:`, err.message);
    }
  }

  if (getCatalogProvider() === 'demo') {
    const data = await getDemoEpisodes(showId, season);
    return NextResponse.json({ success: true, data }, { headers: CACHE_HEADERS });
  }

  try {
    const url = `${SOURCE_URL}/wp-api/v1/single/episodes/list?_id=${showId}&season=${season}&page=1&postsPerPage=50`;
    const { data } = await axios.get(url, { headers: COMMON_HEADERS, timeout: 5000 });

    return NextResponse.json({ success: true, data: data.data }, { headers: CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
