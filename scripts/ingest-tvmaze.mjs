/**
 * Ingesta de series (y animes) desde TVmaze directamente hacia Neon/Postgres.
 * A diferencia de ingest-tmdb.mjs, este script NO pasa por
 * el servidor Next.js: conecta directo a `DATABASE_URL` con `postgres` e inserta
 * en la tabla `media` (mismo esquema que db/migrations/001_init_neon_catalog.sql).
 *
 * Uso:
 *   node scripts/ingest-tvmaze.mjs --pages=5
 *   node scripts/ingest-tvmaze.mjs --full
 *   node scripts/ingest-tvmaze.mjs --full --start-page=10 --delay-ms=500
 *
 * --full: recorre página por página (250 shows/página) hasta que TVmaze
 *         devuelva 404 (fin real de su catálogo).
 *
 * Deduplicación (para no sobre-poblar con lo que ya existe):
 *   1. El `id` es un slug del título; si ya existe con otro show de TVmaze
 *      detrás, se le agrega el id numérico de TVmaze para no chocar.
 *   2. Se hace upsert por `id` (ON CONFLICT DO UPDATE) para poder re-correr
 *      el script sin duplicar el mismo show de TVmaze.
 *   3. Si ya existe una serie con el MISMO TÍTULO (normalizado) de otra fuente
 *      (lamovie.org, TMDB, o una corrida previa de este script), se omite:
 *      el catálogo ya tiene ese título, no hace falta otra fila para él.
 *
 * Resumir tras cortar el proceso:
 *   Cada página completada se guarda en .ingest-state/tvmaze-progress.json
 *   (fuera de git). Si lo vuelves a correr sin pasar --start-page, retoma
 *   automáticamente en la página siguiente a la última guardada. Para forzar
 *   un punto de partida distinto, pasa --start-page=N explícitamente.
 */
import postgres from 'postgres';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { stripHtml } from '../src/lib/text.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const envPath = resolve(root, '.env.local');
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

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Define DATABASE_URL (o NEON_DATABASE_URL) en .env.local');
  process.exit(1);
}

const TVMAZE_BASE = 'https://api.tvmaze.com';
const PROGRESS_FILE = resolve(root, '.ingest-state', 'tvmaze-progress.json');

function parseArgs() {
  const out = {
    startPage: parseInt(process.env.TVMAZE_START_PAGE || '0', 10) || 0,
    startPageExplicit: Boolean(process.env.TVMAZE_START_PAGE),
    maxPages: parseInt(process.env.TVMAZE_MAX_PAGES || '10', 10) || 10,
    delayMs: parseInt(process.env.TVMAZE_DELAY_MS || '450', 10) || 450,
    full: /^(1|true|yes)$/i.test(process.env.TVMAZE_FULL || ''),
  };
  for (const a of process.argv.slice(2)) {
    if (a === '--full' || a === '--all') out.full = true;
    else if (a.startsWith('--start-page=')) {
      out.startPage = parseInt(a.slice(13), 10) || 0;
      out.startPageExplicit = true;
    }
    else if (a.startsWith('--pages=')) out.maxPages = parseInt(a.slice(8), 10) || 10;
    else if (a.startsWith('--delay-ms=')) out.delayMs = parseInt(a.slice(11), 10) || 450;
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveProgress(data) {
  try {
    mkdirSync(dirname(PROGRESS_FILE), { recursive: true });
    writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn(`[ingest-tvmaze] no se pudo guardar progreso: ${e.message}`);
  }
}

function slugify(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTitle(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanHtml(html) {
  return stripHtml(html).replace(/\s+/g, ' ');
}

function mapShowToMedia(show, existingIds) {
  const title = show.name || `Show ${show.id}`;
  const baseSlug = slugify(title) || `show-${show.id}`;
  const id = existingIds.has(baseSlug) ? `${baseSlug}-tvmaze-${show.id}` : baseSlug;

  const image = show.image?.original || show.image?.medium || '';
  const year = show.premiered ? String(show.premiered).split('-')[0] : '';
  const rating = show.rating?.average != null ? Number(show.rating.average).toFixed(1) : '0.0';
  const country =
    show.network?.country?.name || show.webChannel?.country?.name || null;

  return {
    id,
    media_type: 'series',
    title,
    original_title: title,
    overview: cleanHtml(show.summary),
    href: show.url || '',
    image,
    backdrop: image,
    year,
    rating,
    genres: Array.isArray(show.genres) ? show.genres : [],
    country,
    trailer: '',
    numeric_id: show.id,
    payload: show,
  };
}

/**
 * Trae una página del índice de shows de TVmaze.
 * @returns {{items: object[], notFound: boolean}}
 */
async function fetchPage(page, { retries = 4, baseDelay = 1000 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${TVMAZE_BASE}/shows?page=${page}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.status === 404) {
        return { items: [], notFound: true };
      }
      if (res.status === 429) {
        const wait = baseDelay * Math.pow(2, i) + 500;
        console.warn(`[ingest-tvmaze] 429 rate limit en página ${page}, espero ${wait}ms`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const items = await res.json();
      return { items: Array.isArray(items) ? items : [], notFound: false };
    } catch (e) {
      lastErr = e;
      const wait = baseDelay * Math.pow(2, i);
      console.warn(`[ingest-tvmaze] intento ${i + 1}/${retries} fallido en página ${page}: ${e.message}. Reintento en ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function loadExistingIds(sql) {
  const rows = await sql`SELECT id FROM media`;
  return new Set(rows.map((r) => r.id));
}

async function loadExistingSeriesTitles(sql) {
  const rows = await sql`SELECT title FROM media WHERE media_type = 'series'`;
  const set = new Set();
  for (const row of rows) {
    const norm = normalizeTitle(row.title);
    if (norm) set.add(norm);
  }
  return set;
}

function getUpsertShowQuery(sql, item) {
  return sql`
    INSERT INTO media (
      id, media_type, title, original_title, overview, href, image, backdrop,
      year, rating, genres, country, trailer, numeric_id, scraped_at, payload
    ) VALUES (
      ${item.id},
      ${item.media_type},
      ${item.title},
      ${item.original_title},
      ${item.overview},
      ${item.href},
      ${item.image},
      ${item.backdrop},
      ${item.year || null},
      ${item.rating},
      ${item.genres},
      ${item.country},
      ${item.trailer},
      ${item.numeric_id},
      ${new Date()},
      ${item.payload}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      original_title = EXCLUDED.original_title,
      overview = EXCLUDED.overview,
      href = EXCLUDED.href,
      image = EXCLUDED.image,
      backdrop = EXCLUDED.backdrop,
      year = EXCLUDED.year,
      rating = EXCLUDED.rating,
      genres = EXCLUDED.genres,
      country = EXCLUDED.country,
      trailer = EXCLUDED.trailer,
      numeric_id = EXCLUDED.numeric_id,
      scraped_at = EXCLUDED.scraped_at,
      payload = EXCLUDED.payload
  `;
}

async function upsertShowsBatch(sql, items, chunkSize = 50) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await sql.begin((trx) => chunk.map((item) => getUpsertShowQuery(trx, item)));
  }
}

async function updateSeriesFilterMetadata(sql, items) {
  if (!items.length) return;
  const rows = await sql`SELECT years, countries FROM catalog_metadata WHERE facet_key = 'series'`;
  const existing = rows[0] || { years: [], countries: [] };
  const newYears = new Set(existing.years || []);
  const newCountries = new Set(existing.countries || []);
  items.forEach((item) => {
    if (item.year) newYears.add(String(item.year));
    if (item.country) newCountries.add(String(item.country));
  });
  const years = [
    'Todos',
    ...[...newYears].filter((y) => y && y !== 'Todos').sort((a, b) => Number(b) - Number(a)),
  ];
  const countries = [
    'Todos',
    ...[...newCountries].filter((c) => c && c !== 'Todos').sort(),
  ];
  await sql`
    INSERT INTO catalog_metadata (facet_key, years, countries)
    VALUES ('series', ${years}, ${countries})
    ON CONFLICT (facet_key) DO UPDATE SET
      years = EXCLUDED.years,
      countries = EXCLUDED.countries,
      updated_at = now()
  `;
}

async function main() {
  const { startPage, startPageExplicit, maxPages, delayMs, full } = parseArgs();
  const sql = postgres(DATABASE_URL, { max: 4, prepare: false });

  let effectiveStartPage = startPage;
  if (!startPageExplicit) {
    const progress = loadProgress();
    if (progress && Number.isInteger(progress.lastCompletedPage)) {
      effectiveStartPage = progress.lastCompletedPage + 1;
      console.log(
        `[ingest-tvmaze] Retomando desde .ingest-state/tvmaze-progress.json: última página completada ${progress.lastCompletedPage}, arranco en ${effectiveStartPage}.`
      );
    }
  }

  console.log(
    `[ingest-tvmaze] Modo ${full ? '--full' : 'páginas fijas'}: desde página ${effectiveStartPage}` +
      (full ? ' hasta que TVmaze devuelva 404' : `, ${maxPages} página(s)`)
  );

  const [existingIds, existingTitles] = await Promise.all([
    loadExistingIds(sql),
    loadExistingSeriesTitles(sql),
  ]);
  console.log(`[ingest-tvmaze] ${existingIds.size} ids y ${existingTitles.size} títulos de series ya en catálogo.`);

  let totalInserted = 0;
  let totalDuplicates = 0;
  let page = effectiveStartPage;
  let pagesDone = 0;

  while (full || pagesDone < maxPages) {
    const { items, notFound } = await fetchPage(page);

    if (notFound) {
      console.log(`[ingest-tvmaze] Página ${page} no existe (404). Fin del catálogo de TVmaze.`);
      saveProgress({
        lastCompletedPage: page - 1,
        completed: true,
        totalInserted,
        totalDuplicates,
        updatedAt: new Date().toISOString(),
      });
      break;
    }
    if (!items.length) {
      console.log(`[ingest-tvmaze] Página ${page} vacía. Fin.`);
      saveProgress({
        lastCompletedPage: page - 1,
        completed: true,
        totalInserted,
        totalDuplicates,
        updatedAt: new Date().toISOString(),
      });
      break;
    }

    let insertedThisPage = 0;
    let duplicatesThisPage = 0;
    const batchItems = [];

    for (const show of items) {
      const normTitle = normalizeTitle(show.name);
      if (normTitle && existingTitles.has(normTitle)) {
        duplicatesThisPage++;
        continue;
      }
      const item = mapShowToMedia(show, existingIds);
      existingIds.add(item.id);
      if (normTitle) existingTitles.add(normTitle);
      batchItems.push(item);
    }

    if (batchItems.length > 0) {
      await Promise.all([
        upsertShowsBatch(sql, batchItems),
        updateSeriesFilterMetadata(sql, batchItems),
      ]);
      insertedThisPage = batchItems.length;
    }

    totalInserted += insertedThisPage;
    totalDuplicates += duplicatesThisPage;
    pagesDone++;

    console.log(
      `[ingest-tvmaze] página ${page}: ${items.length} shows (${insertedThisPage} nuevos, ${duplicatesThisPage} ya existían) ` +
        `— total nuevos ~${totalInserted}, duplicados ~${totalDuplicates}`
    );

    saveProgress({
      lastCompletedPage: page,
      completed: false,
      totalInserted,
      totalDuplicates,
      updatedAt: new Date().toISOString(),
    });

    page++;
    await sleep(delayMs);
  }

  await sql.end({ timeout: 5 });
  console.log(`[ingest-tvmaze] Terminado. Series insertadas/actualizadas: ${totalInserted}. Duplicados omitidos: ${totalDuplicates}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
