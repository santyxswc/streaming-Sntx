import { NextResponse } from 'next/server';
import axios from 'axios';
import { rateLimit } from '@/lib/rateLimit';
import { getCatalogProvider } from '@/lib/catalogEnv';
import { getDemoPlayer, getDemoEpisodes } from '@/services/catalog/demoCatalog';
import { findMediaForAiLookup } from '@/services/db';
import { getNeonSql } from '@/lib/neonSql';
import {
  getTmdbMovie,
  getTmdbTvShow,
  findTmdbByExternalId,
  youtubeEmbedFromWatchUrl,
} from '@/lib/tmdb';
import { getSpanishSubtitleUrl } from '@/lib/subtitles';

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

/**
 * Construye la lista de proveedores de embed normalizados soportando TMDB ID o IMDb ID.
 */
function buildEmbedProviders({ type = 'movie', tmdbId, imdbId, season = 1, episode = 1, subtitleUrl = null }) {
  const s = Number(season) || 1;
  const e = Number(episode) || 1;
  const id = tmdbId || imdbId;
  if (!id) return [];

  const isTmdb = Boolean(tmdbId);
  const embeds = [];

  // Subtítulo en español (Wyzie), si se resolvió uno para este contenido.
  // Cada proveedor tiene su propio nombre de parámetro para inyectar un .vtt externo.
  const subLink = subtitleUrl ? encodeURIComponent(subtitleUrl) : null;
  const subLabel = encodeURIComponent('Español');
  const vidlinkSub = subLink ? `&sub_file=${subLink}&sub_label=${subLabel}` : '';
  const superembedSub = subLink ? `&sub_url=${subLink}&sub_label=${subLabel}` : '';
  // ds_lang le pide al proveedor que seleccione español por defecto ENTRE los
  // subtítulos que la propia fuente de video ya trae incluidos (no requiere
  // Wyzie); sub_url fuerza uno externo cuando además lo tenemos.
  const vidsrcxyzSub = `${subLink ? `&sub_url=${subLink}` : ''}&ds_lang=spa`;

  if (type === 'movie') {
    embeds.push(
      {
        label: 'VidLink',
        server: 'vidlink',
        url: `https://vidlink.pro/movie/${id}${vidlinkSub}`,
      },
      {
        label: 'SuperEmbed',
        server: 'superembed',
        url: (isTmdb
          ? `https://multiembed.mov/?video_id=${id}&tmdb=1`
          : `https://multiembed.mov/?video_id=${id}`) + superembedSub,
      },
      {
        label: 'Embed.su',
        server: 'embedsu',
        url: `https://embed.su/embed/movie/${id}`,
      },
      {
        label: 'VidSrc XYZ',
        server: 'vidsrcxyz',
        url: (isTmdb
          ? `https://vidsrc.xyz/embed/movie?tmdb=${id}`
          : `https://vidsrc.xyz/embed/movie?imdb=${id}`) + vidsrcxyzSub,
      }
    );
  } else {
    embeds.push(
      {
        label: 'VidLink',
        server: 'vidlink',
        url: `https://vidlink.pro/tv/${id}/${s}/${e}${vidlinkSub}`,
      },
      {
        label: 'SuperEmbed',
        server: 'superembed',
        url: (isTmdb
          ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
          : `https://multiembed.mov/?video_id=${id}&s=${s}&e=${e}`) + superembedSub,
      },
      {
        label: 'Embed.su',
        server: 'embedsu',
        url: `https://embed.su/embed/tv/${id}/${s}/${e}`,
      },
      {
        label: 'VidSrc XYZ',
        server: 'vidsrcxyz',
        url: (isTmdb
          ? `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
          : `https://vidsrc.xyz/embed/tv?imdb=${id}&season=${s}&episode=${e}`) + vidsrcxyzSub,
      }
    );
  }

  return embeds;
}

/** Player real (scraper local o demo) para un postId numérico del catálogo local. */
async function fetchLocalPlayer(numericPostId) {
  try {
    if (getCatalogProvider() === 'demo') {
      return await getDemoPlayer(numericPostId);
    }
    const url = `${SOURCE_URL}/wp-api/v1/player?postId=${numericPostId}&demo=0`;
    const { data } = await axios.get(url, { headers: COMMON_HEADERS, timeout: 5000 });
    return data.data;
  } catch (err) {
    console.error('[player] Error obteniendo player local:', err.message);
    return null;
  }
}

/** Episodios de una temporada del catálogo local (scraper o demo). */
async function fetchLocalEpisodePosts(showNumericId, season) {
  try {
    if (getCatalogProvider() === 'demo') {
      const data = await getDemoEpisodes(showNumericId, season);
      return data.posts || [];
    }
    const url = `${SOURCE_URL}/wp-api/v1/single/episodes/list?_id=${showNumericId}&season=${season}&page=1&postsPerPage=50`;
    const { data } = await axios.get(url, { headers: COMMON_HEADERS, timeout: 5000 });
    return data?.data?.posts || [];
  } catch (err) {
    console.error('[player] Error obteniendo episodios locales:', err.message);
    return [];
  }
}

/**
 * Busca en el catálogo local un título equivalente al de TMDB que además sea reproducible.
 */
async function findLocalMatch(type, media) {
  if (!media) return null;
  try {
    const { winner } = await findMediaForAiLookup(type, [media.title, media.originalTitle]);
    if (!winner?.numericId) return null;
    if (!winner.href || !winner.href.startsWith(SOURCE_URL)) return null;
    return winner;
  } catch (err) {
    console.error('[player] Error buscando coincidencia local:', err.message);
    return null;
  }
}

/**
 * Resuelve identificadores externos para series procedentes de TVmaze.
 */
async function resolveTvmazeShow(tvmazeId) {
  let imdbId = null;
  let thetvdb = null;
  let title = null;

  // 1. Consulta en la base de datos Neon
  try {
    const sql = getNeonSql();
    if (sql) {
      const num = Number(tvmazeId);
      const rows = Number.isFinite(num)
        ? await sql`SELECT * FROM media WHERE numeric_id = ${num} OR id LIKE ${'%-tvmaze-' + tvmazeId} OR id = ${'tvmaze-' + tvmazeId} LIMIT 1`
        : await sql`SELECT * FROM media WHERE id = ${tvmazeId} OR id LIKE ${'%-tvmaze-' + tvmazeId} LIMIT 1`;
      if (rows.length && rows[0].payload) {
        const payload = rows[0].payload;
        imdbId = payload.externals?.imdb || payload.imdbId || null;
        thetvdb = payload.externals?.thetvdb || payload.tvdbId || null;
        title = rows[0].title || payload.name || null;
      }
    }
  } catch (err) {
    console.warn('[player] Error consultando TVmaze en DB:', err.message);
  }

  // 2. Consulta API de TVmaze si falta metadata
  if (!imdbId && !thetvdb) {
    try {
      const res = await axios.get(`https://api.tvmaze.com/shows/${tvmazeId}`, { timeout: 4000 });
      if (res.data?.externals) {
        imdbId = res.data.externals.imdb || null;
        thetvdb = res.data.externals.thetvdb || null;
        title = res.data.name || title;
      }
    } catch (err) {
      console.warn('[player] Error consultando TVmaze API:', err.message);
    }
  }

  // 3. Resuelve TMDB ID cruzando IMDb o TheTVDB
  let tmdbId = null;
  if (imdbId) {
    const match = await findTmdbByExternalId(imdbId, 'imdb_id');
    if (match?.id) tmdbId = String(match.id);
  }
  if (!tmdbId && thetvdb) {
    const match = await findTmdbByExternalId(String(thetvdb), 'tvdb_id');
    if (match?.id) tmdbId = String(match.id);
  }

  return { imdbId, thetvdb, tmdbId, title };
}

export async function GET(request) {
  // Apply Rate Limit: 40 req/min
  const limitResponse = rateLimit(request, {
    limit: 40,
    windowMs: 60000,
    id: 'media-player',
  });
  if (limitResponse) return limitResponse;

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ success: false, error: 'postId is required' }, { status: 400 });
  }

  const idStr = String(postId).trim();

  // =========================================================================
  // CASO 1: Contenido proveniente de TMDB (tmdb-<id> o tmdb-<tvId>-s<N>-e<M>)
  // =========================================================================
  if (idStr.startsWith('tmdb-')) {
    const episodeMatch = idStr.match(/^tmdb-(\d+)-s(\d+)-e(\d+)$/);
    const movieMatch = idStr.match(/^tmdb-(\d+)$/);

    if (!episodeMatch && !movieMatch) {
      return NextResponse.json({ success: false, error: 'ID de TMDB inválido' }, { status: 400 });
    }

    if (movieMatch) {
      const tmdbId = movieMatch[1];
      const movie = await getTmdbMovie(tmdbId);
      const localMatch = await findLocalMatch('movie', movie);
      if (localMatch) {
        const localData = await fetchLocalPlayer(localMatch.numericId);
        if (localData?.embeds?.length) {
          return NextResponse.json({ success: true, data: localData }, { headers: CACHE_HEADERS });
        }
      }

      const subtitleUrl = await getSpanishSubtitleUrl({ tmdbId });
      const embeds = buildEmbedProviders({
        type: 'movie',
        tmdbId,
        subtitleUrl,
      });

      const trailerUrl = movie?.trailer ? youtubeEmbedFromWatchUrl(movie.trailer) : null;
      if (trailerUrl) {
        embeds.push({
          url: trailerUrl,
          label: 'Ver Tráiler Oficial',
          server: 'youtube',
          isTrailer: true,
        });
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            embeds,
            isFallback: true,
            hasTrailer: Boolean(trailerUrl),
            trailerOnly: false,
          },
        },
        { headers: CACHE_HEADERS }
      );
    }

    // Episodio de serie TMDB
    const [, tvId, season, episodeNum] = episodeMatch;
    const show = await getTmdbTvShow(tvId);
    const localMatch = await findLocalMatch('series', show);
    if (localMatch) {
      const localPosts = await fetchLocalEpisodePosts(localMatch.numericId, season);
      const localEpisode = localPosts[Number(episodeNum) - 1];
      if (localEpisode?._id) {
        const localData = await fetchLocalPlayer(localEpisode._id);
        if (localData?.embeds?.length) {
          return NextResponse.json({ success: true, data: localData }, { headers: CACHE_HEADERS });
        }
      }
    }

    const subtitleUrl = await getSpanishSubtitleUrl({ tmdbId: tvId, season, episode: episodeNum });
    const embeds = buildEmbedProviders({
      type: 'series',
      tmdbId: tvId,
      season,
      episode: episodeNum,
      subtitleUrl,
    });

    const trailerUrl = show?.trailer ? youtubeEmbedFromWatchUrl(show.trailer) : null;
    if (trailerUrl) {
      embeds.push({
        url: trailerUrl,
        label: 'Ver Tráiler Oficial',
        server: 'youtube',
        isTrailer: true,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          embeds,
          isFallback: true,
          hasTrailer: Boolean(trailerUrl),
          trailerOnly: false,
        },
      },
      { headers: CACHE_HEADERS }
    );
  }

  // =========================================================================
  // CASO 2: Contenido proveniente de TVmaze (tvmaze-<id> o tvmaze-<id>-s<N>-e<M>)
  // =========================================================================
  if (idStr.startsWith('tvmaze-')) {
    const episodeMatch = idStr.match(/^tvmaze-(\d+)-s(\d+)-e(\d+)$/);
    const showMatch = idStr.match(/^tvmaze-(\d+)$/);

    const tvmazeId = episodeMatch ? episodeMatch[1] : (showMatch ? showMatch[1] : null);
    const season = episodeMatch ? episodeMatch[2] : '1';
    const episodeNum = episodeMatch ? episodeMatch[3] : '1';

    if (!tvmazeId) {
      return NextResponse.json({ success: false, error: 'ID de TVmaze inválido' }, { status: 400 });
    }

    const { imdbId, tmdbId } = await resolveTvmazeShow(tvmazeId);

    let trailerUrl = null;
    if (tmdbId) {
      const show = await getTmdbTvShow(tmdbId);
      const localMatch = await findLocalMatch('series', show);
      if (localMatch) {
        const localPosts = await fetchLocalEpisodePosts(localMatch.numericId, season);
        const localEpisode = localPosts[Number(episodeNum) - 1];
        if (localEpisode?._id) {
          const localData = await fetchLocalPlayer(localEpisode._id);
          if (localData?.embeds?.length) {
            return NextResponse.json({ success: true, data: localData }, { headers: CACHE_HEADERS });
          }
        }
      }
      if (show?.trailer) {
        trailerUrl = youtubeEmbedFromWatchUrl(show.trailer);
      }
    }

    const subtitleUrl = await getSpanishSubtitleUrl({ imdbId, tmdbId, season, episode: episodeNum });
    const embeds = buildEmbedProviders({
      type: 'series',
      tmdbId,
      imdbId,
      season,
      episode: episodeNum,
      subtitleUrl,
    });

    if (trailerUrl) {
      embeds.push({
        url: trailerUrl,
        label: 'Ver Tráiler Oficial',
        server: 'youtube',
        isTrailer: true,
      });
    }

    if (!embeds.length) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron enlaces de streaming para esta serie de TVmaze' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          embeds,
          isFallback: true,
          hasTrailer: Boolean(trailerUrl),
          trailerOnly: false,
        },
      },
      { headers: CACHE_HEADERS }
    );
  }

  // =========================================================================
  // CASO 3: Identificador directo de IMDb (tt... o imdb-tt...)
  // =========================================================================
  const imdbMatch = idStr.match(/^(?:imdb-)?(tt\d+)(?:-s(\d+)-e(\d+))?$/);
  if (imdbMatch) {
    const rawImdbId = imdbMatch[1];
    const season = imdbMatch[2];
    const episodeNum = imdbMatch[3];
    const isEpisode = Boolean(season && episodeNum);

    const tmdbLookup = await findTmdbByExternalId(rawImdbId, 'imdb_id');
    const mediaType = isEpisode ? 'series' : (tmdbLookup?.type || 'movie');
    const tmdbId = tmdbLookup?.id ? String(tmdbLookup.id) : null;

    let trailerUrl = null;
    if (tmdbId) {
      const media = mediaType === 'series' ? await getTmdbTvShow(tmdbId) : await getTmdbMovie(tmdbId);
      if (media?.trailer) {
        trailerUrl = youtubeEmbedFromWatchUrl(media.trailer);
      }
    }

    const subtitleUrl = await getSpanishSubtitleUrl({
      imdbId: rawImdbId,
      tmdbId,
      season: season || '1',
      episode: episodeNum || '1',
    });
    const embeds = buildEmbedProviders({
      type: mediaType,
      tmdbId,
      imdbId: rawImdbId,
      season: season || '1',
      episode: episodeNum || '1',
      subtitleUrl,
    });

    if (trailerUrl) {
      embeds.push({
        url: trailerUrl,
        label: 'Ver Tráiler Oficial',
        server: 'youtube',
        isTrailer: true,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          embeds,
          isFallback: true,
          hasTrailer: Boolean(trailerUrl),
          trailerOnly: false,
        },
      },
      { headers: CACHE_HEADERS }
    );
  }

  // =========================================================================
  // CASO 4: Catálogo Demo
  // =========================================================================
  if (getCatalogProvider() === 'demo') {
    const data = await getDemoPlayer(postId);
    if (!data) {
      return NextResponse.json({ success: false, error: 'No hay datos de demo para este contenido' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data }, { headers: CACHE_HEADERS });
  }

  // =========================================================================
  // CASO 5: Catálogo scraper local con fallback a base de datos Neon
  // =========================================================================
  try {
    const url = `${SOURCE_URL}/wp-api/v1/player?postId=${postId}&demo=0`;
    const { data } = await axios.get(url, { headers: COMMON_HEADERS, timeout: 5000 });
    if (data?.data?.embeds?.length) {
      return NextResponse.json({ success: true, data: data.data }, { headers: CACHE_HEADERS });
    }
  } catch (error) {
    console.warn(`[player] Scraper local falló para postId ${postId} (${error.message}). Buscando en base de datos...`);
  }

  // Fallback si el scraper local no tiene embeds: buscar en la tabla media de Neon
  try {
    const sql = getNeonSql();
    if (sql) {
      const num = Number(postId);
      const rows = Number.isFinite(num)
        ? await sql`SELECT * FROM media WHERE numeric_id = ${num} OR id = ${postId} LIMIT 1`
        : await sql`SELECT * FROM media WHERE id = ${postId} LIMIT 1`;

      if (rows.length) {
        const item = rows[0];
        const payload = item.payload || {};
        const tmdbId = payload.tmdbId || payload.tmdb_id || (item.id?.startsWith('tmdb-') ? item.id.replace('tmdb-', '') : null);
        const imdbId = payload.externals?.imdb || payload.imdbId || payload.imdb_id || null;

        if (tmdbId || imdbId) {
          const isSeries = item.media_type === 'series';
          const subtitleUrl = await getSpanishSubtitleUrl({ tmdbId, imdbId, season: 1, episode: 1 });
          const embeds = buildEmbedProviders({
            type: isSeries ? 'series' : 'movie',
            tmdbId,
            imdbId,
            season: 1,
            episode: 1,
            subtitleUrl,
          });

          const trailerUrl = item.trailer ? youtubeEmbedFromWatchUrl(item.trailer) : null;
          if (trailerUrl) {
            embeds.push({
              url: trailerUrl,
              label: 'Ver Tráiler Oficial',
              server: 'youtube',
              isTrailer: true,
            });
          }

          if (embeds.length) {
            return NextResponse.json(
              {
                success: true,
                data: {
                  embeds,
                  isFallback: true,
                  hasTrailer: Boolean(trailerUrl),
                  trailerOnly: false,
                },
              },
              { headers: CACHE_HEADERS }
            );
          }
        }
      }
    }
  } catch (dbErr) {
    console.error('[player] Error en fallback de base de datos:', dbErr.message);
  }

  return NextResponse.json({ success: false, error: 'No se encontraron fuentes de reproducción para este contenido' }, { status: 404 });
}
