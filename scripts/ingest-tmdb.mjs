/**
 * Ingesta desde TMDB hacia la base activa (CATALOG_PROVIDER, normalmente Neon)
 * vía /api/ingest/tmdb, con reintentos y backoff.
 *
 * Uso:
 *   npm run ingest:tmdb -- --type=movie --max-pages=20
 *   npm run ingest:tmdb -- --type=series --full
 *   npm run ingest:tmdb -- --type=movie --full --year=2024
 *
 * --full: recorre página por página hasta la última que reporte TMDB.
 *         TMDB solo permite 500 páginas por combinación de sort/año/género
 *         (20 items/página = 10000 ítems tope). Para ir más allá de ese tope,
 *         repite el ingest variando --year (ej. año por año) o --genre.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[m[1].trim()] = val;
    }
  });
}

const BASE = process.env.INGEST_BASE_URL || 'http://localhost:3000';
const isLocalIngest = /localhost|127\.0\.0\.1/.test(BASE);
let KEY = process.env.INGEST_SECRET_KEY || process.env.SCRAPE_SECRET_KEY;
if (!KEY) {
  if (isLocalIngest) {
    KEY = 'dev-ingest-secret';
  } else {
    console.error(
      'INGEST_SECRET_KEY es obligatoria cuando INGEST_BASE_URL apunta a un host distinto de localhost.'
    );
    process.exit(1);
  }
}

function parseArgs() {
  const out = {
    type: process.env.TMDB_INGEST_TYPE || 'movie',
    maxPages: parseInt(process.env.TMDB_INGEST_MAX_PAGES || '500', 10) || 500,
    startPage: parseInt(process.env.TMDB_INGEST_START_PAGE || '1', 10) || 1,
    delayMs: parseInt(process.env.TMDB_INGEST_DELAY_MS || '400', 10) || 400,
    full: /^(1|true|yes)$/i.test(process.env.TMDB_INGEST_FULL || ''),
    sortBy: process.env.TMDB_INGEST_SORT_BY || 'popularity.desc',
    year: process.env.TMDB_INGEST_YEAR || undefined,
    genre: process.env.TMDB_INGEST_GENRE || undefined,
    originalLanguage: process.env.TMDB_INGEST_ORIGINAL_LANGUAGE || undefined,
  };
  for (const a of process.argv.slice(2)) {
    if (a === '--full' || a === '--all') out.full = true;
    else if (a === '--full=false') out.full = false;
    else if (a.startsWith('--type=')) out.type = a.slice(7);
    else if (a.startsWith('--max-pages=')) out.maxPages = parseInt(a.slice(12), 10) || 500;
    else if (a.startsWith('--start-page=')) out.startPage = parseInt(a.slice(13), 10) || 1;
    else if (a.startsWith('--delay-ms=')) out.delayMs = parseInt(a.slice(11), 10) || 400;
    else if (a.startsWith('--sort-by=')) out.sortBy = a.slice(10);
    else if (a.startsWith('--year=')) out.year = a.slice(7);
    else if (a.startsWith('--genre=')) out.genre = a.slice(8);
    else if (a.startsWith('--original-language=')) out.originalLanguage = a.slice(20);
  }
  return out;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postWithRetry(body, { retries = 4, baseDelay = 1000 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE.replace(/\/$/, '')}/api/ingest/tmdb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': KEY,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      return json;
    } catch (e) {
      lastErr = e;
      const wait = baseDelay * Math.pow(2, i);
      console.warn(`[ingest-tmdb] intento ${i + 1}/${retries} fallido: ${e.message}. Reintento en ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function main() {
  const { type, maxPages, startPage, delayMs, full, sortBy, year, genre, originalLanguage } = parseArgs();
  const mediaType = type === 'series' ? 'series' : 'movie';
  const filterLabel = `sort=${sortBy}${year ? `, year=${year}` : ''}${genre ? `, genre=${genre}` : ''}${originalLanguage ? `, idioma=${originalLanguage}` : ''}`;

  if (full) {
    console.log(
      `[ingest-tmdb] Modo --full: ${mediaType} desde página ${startPage} → ${BASE} (hasta última página TMDB, máx. ${maxPages}, ${filterLabel})`
    );
    let totalItems = 0;
    let page = startPage;

    let totalDuplicates = 0;

    while (page - startPage < maxPages) {
      const json = await postWithRetry(
        { type: mediaType, page, all: false, sortBy, year, genre, originalLanguage },
        { retries: 5, baseDelay: 2000 }
      );
      const n = json.count ?? 0;
      const raw = json.rawCount ?? n;
      const dupes = json.duplicatesSkipped ?? 0;
      totalItems += n;
      totalDuplicates += dupes;
      console.log(
        `[ingest-tmdb] página ${page}/${json.totalPages ?? '?'}: ${n} nuevos, ${dupes} ya existían ` +
          `(total nuevos ~${totalItems}, total duplicados ~${totalDuplicates})`
      );

      /* rawCount (no count) indica si TMDB ya no devolvió items: count puede ser 0
         solo porque toda la página eran duplicados, y ahí hay que seguir. */
      if (raw === 0) {
        console.log('[ingest-tmdb] Sin más datos, fin.');
        break;
      }
      if (json.totalPages && page >= json.totalPages) {
        console.log('[ingest-tmdb] Llegamos al límite de páginas que reporta TMDB para este filtro.');
        break;
      }
      page += 1;
      await sleep(delayMs);
    }
    console.log(
      `[ingest-tmdb] Fin modo --full. Items nuevos ingeridos: ~${totalItems}. Duplicados omitidos: ~${totalDuplicates}.`
    );
    return;
  }

  console.log(`[ingest-tmdb] Modo páginas fijas: ${mediaType} → ${BASE} (páginas ${startPage}..${startPage + maxPages - 1}, max=${maxPages}, ${filterLabel})`);

  let total = 0;
  let totalDupes = 0;
  for (let p = 0; p < maxPages; p++) {
    const page = startPage + p;
    const json = await postWithRetry(
      { type: mediaType, page, all: false, sortBy, year, genre, originalLanguage },
      { retries: 5, baseDelay: 2000 }
    );
    const n = json.count ?? 0;
    const raw = json.rawCount ?? n;
    const dupes = json.duplicatesSkipped ?? 0;
    total += n;
    totalDupes += dupes;
    console.log(`[ingest-tmdb] página ${page}: ${n} nuevos, ${dupes} ya existían (acumulado ${total})`);
    if (raw === 0) {
      console.log('[ingest-tmdb] sin más datos, fin.');
      break;
    }
    await sleep(delayMs);
  }
  console.log(`[ingest-tmdb] terminado. Nuevos: ${total}. Duplicados omitidos: ${totalDupes}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
