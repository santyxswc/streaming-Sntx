import { NextResponse } from 'next/server';
import { discoverTmdbPage, isTmdbConfigured } from '@/server/integrations/tmdb';
import { saveMediaBatch, updateFilterMetadata } from '@/server/catalog/catalogRepository';
import { getNeonSql } from '@/server/db/neonSql';

export const runtime = 'nodejs';

/** TMDB tope real de discover: 500 páginas (20 ítems c/u = 10000 por combinación sort/año/género). */
const DEFAULT_MAX_PAGES_PER_REQUEST = Math.min(
  parseInt(process.env.TMDB_INGEST_MAX_PAGES_PER_REQUEST || '500', 10),
  500
);

function normalizeTitle(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Títulos ya presentes en `media` para ese tipo (lamovie.org + TMDB ya ingerido),
 * normalizados, para no duplicar el mismo título aunque venga con un `id` distinto.
 */
async function loadExistingTitles(mediaType) {
  const sql = getNeonSql();
  const rows = await sql`SELECT title FROM media WHERE media_type = ${mediaType}`;
  const set = new Set();
  for (const row of rows) {
    const norm = normalizeTitle(row.title);
    if (norm) set.add(norm);
  }
  return set;
}

export async function POST(request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const isDev = process.env.NODE_ENV === 'development';
    const secretKey =
      process.env.INGEST_SECRET_KEY ||
      process.env.SCRAPE_SECRET_KEY || // nombre anterior, aún aceptado
      (isDev ? 'dev-ingest-secret' : null);
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'INGEST_SECRET_KEY no configurada' },
        { status: 500 }
      );
    }

    if (apiKey !== secretKey) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    if (!isTmdbConfigured()) {
      return NextResponse.json(
        { success: false, error: 'TMDB_API_KEY no configurada' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { type, page, all, fullCatalog, maxPages: maxPagesBody, sortBy, year, genre, originalLanguage } = body;

    if (type !== 'movie' && type !== 'series') {
      return NextResponse.json(
        { success: false, error: 'type debe ser movie o series' },
        { status: 400 }
      );
    }

    const targetPage = page || 1;
    const fullRun = all === true || fullCatalog === true;
    const maxPagesPerRequest = Math.min(maxPagesBody ?? DEFAULT_MAX_PAGES_PER_REQUEST, 500);

    const existingTitles = await loadExistingTitles(type);

    let currentPage = targetPage;
    let totalPages = 1;
    let totalScraped = 0;
    let totalDuplicates = 0;
    let totalRaw = 0;
    let pagesDone = 0;
    const sampleItems = [];

    while (pagesDone < maxPagesPerRequest) {
      const result = await discoverTmdbPage(type, {
        sortBy: sortBy || 'popularity.desc',
        page: currentPage,
        year,
        genre,
        originalLanguage,
      });

      totalPages = result.totalPages || 1;

      if (!result.items.length) {
        console.log(`[ingest-tmdb] Sin items en página ${currentPage} (${type})`);
        break;
      }
      totalRaw += result.items.length;

      const newItems = [];
      let duplicatesThisPage = 0;
      for (const item of result.items) {
        const norm = normalizeTitle(item.title);
        if (norm && existingTitles.has(norm)) {
          duplicatesThisPage++;
          continue;
        }
        if (norm) existingTitles.add(norm);
        newItems.push(item);
      }
      totalDuplicates += duplicatesThisPage;

      console.log(
        `[ingest-tmdb] ${type} página ${currentPage}/${totalPages}: ${result.items.length} items (` +
          `${newItems.length} nuevos, ${duplicatesThisPage} ya existían)`
      );

      if (newItems.length) {
        await Promise.all([
          saveMediaBatch(newItems),
          updateFilterMetadata(type, newItems),
        ]);
        totalScraped += newItems.length;

        if (sampleItems.length < 20) {
          sampleItems.push(...newItems.slice(0, 20 - sampleItems.length));
        }
      }

      pagesDone++;

      if (!fullRun) break;

      /* TMDB sí reporta total_pages de forma fiable (a diferencia de lamovie.org),
         así que aquí sí podemos parar en el límite real además de en página vacía. */
      if (currentPage >= totalPages) {
        console.log('[ingest-tmdb] Llegamos a la última página que reporta TMDB.');
        break;
      }
      currentPage += 1;
    }

    return NextResponse.json({
      success: true,
      count: totalScraped,
      rawCount: totalRaw,
      duplicatesSkipped: totalDuplicates,
      totalPages,
      lastPageScraped: currentPage,
      pagesProcessed: pagesDone,
      fullRun,
      data: sampleItems.slice(0, 20),
    });
  } catch (error) {
    console.error('Ingest TMDB API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
