import { NextResponse } from 'next/server';
import { scrapeMovies, scrapeSeries } from '@/services/scraper';
import { saveMediaBatch, updateFilterMetadata } from '@/services/db';

export const runtime = 'nodejs';

/** Máximo de páginas por una sola petición (evita timeouts en serverless; sube en local si hace falta). */
const DEFAULT_MAX_PAGES_PER_REQUEST = parseInt(
  process.env.SCRAPER_MAX_PAGES_PER_REQUEST || '5000',
  10
);

export async function POST(request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const isDev = process.env.NODE_ENV === 'development';
    const secretKey =
      process.env.SCRAPE_SECRET_KEY || (isDev ? 'luv-dev-secret-123' : null);
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'SCRAPE_SECRET_KEY no configurada' },
        { status: 500 }
      );
    }

    if (apiKey !== secretKey) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { type, page, all, fullCatalog, maxPages: maxPagesBody } = body;

    const targetPage = page || 1;
    /** Catálogo completo desde `page` hasta la última que reporte la API (antes `all` solo hacía 10 páginas). */
    const fullRun = all === true || fullCatalog === true;
    const maxPagesPerRequest = Math.min(
      maxPagesBody ?? DEFAULT_MAX_PAGES_PER_REQUEST,
      50000
    );

    let currentPage = targetPage;
    let totalPages = 1;
    let totalScraped = 0;
    let pagesDone = 0;
    const sampleItems = [];

    while (pagesDone < maxPagesPerRequest) {
      let result;
      if (type === 'movie') {
        result = await scrapeMovies(currentPage);
      } else if (type === 'series') {
        result = await scrapeSeries(currentPage);
      } else {
        return NextResponse.json(
          { success: false, error: 'type debe ser movie o series' },
          { status: 400 }
        );
      }

      totalPages = result.totalPages || 1;

      if (!result.items.length) {
        console.log(`[scrape] Sin items en página ${currentPage} (${type})`);
        break;
      }

      console.log(
        `[scrape] ${type} página ${currentPage}/${totalPages}: ${result.items.length} items`
      );

      await Promise.all([
        saveMediaBatch(result.items),
        updateFilterMetadata(type, result.items),
      ]);
      totalScraped += result.items.length;
      pagesDone++;

      if (sampleItems.length < 20) {
        sampleItems.push(...result.items.slice(0, 20 - sampleItems.length));
      }

      if (!fullRun) break;

      /* No usar totalPages para parar: la API de lamovie.org puede reportar last_page bajo
         en /tvshows (ej. 30) aunque haya más páginas. Seguir hasta página vacía. */
      currentPage += 1;
    }

    return NextResponse.json({
      success: true,
      count: totalScraped,
      totalPages,
      lastPageScraped: currentPage,
      pagesProcessed: pagesDone,
      fullRun,
      data: sampleItems.slice(0, 20),
    });
  } catch (error) {
    console.error('Scrape API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
