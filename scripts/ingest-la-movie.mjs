/**
 * Ingesta contra /api/scrape con reintentos y backoff.
 *
 * Uso:
 *   npm run ingest:la-movie -- --type=movie --max-pages=20
 *   npm run ingest:la-movie -- --type=series --full
 *
 * --full: una petición por página hasta cubrir todo el catálogo (usa totalPages de la API).
 *         Recomendado frente a un solo POST con all:true (puede hacer timeout en Vercel).
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
let KEY = process.env.SCRAPE_SECRET_KEY;
if (!KEY) {
  if (isLocalIngest) {
    KEY = 'luv-dev-secret-123';
  } else {
    console.error(
      'SCRAPE_SECRET_KEY es obligatoria cuando INGEST_BASE_URL apunta a un host distinto de localhost.'
    );
    process.exit(1);
  }
}

function parseArgs() {
  const out = {
    type: process.env.INGEST_TYPE || 'movie',
    maxPages: parseInt(process.env.INGEST_MAX_PAGES || '5000', 10) || 5000,
    startPage: parseInt(process.env.INGEST_START_PAGE || '1', 10) || 1,
    delayMs: parseInt(process.env.INGEST_DELAY_MS || '800', 10) || 800,
    full: /^(1|true|yes)$/i.test(process.env.INGEST_FULL || ''),
  };
  for (const a of process.argv.slice(2)) {
    if (a === '--full' || a === '--all') out.full = true;
    else if (a === '--full=false') out.full = false;
    else if (a.startsWith('--type=')) out.type = a.slice(7);
    else if (a.startsWith('--max-pages=')) out.maxPages = parseInt(a.slice(12), 10) || 5000;
    else if (a.startsWith('--start-page=')) out.startPage = parseInt(a.slice(13), 10) || 1;
    else if (a.startsWith('--delay-ms=')) out.delayMs = parseInt(a.slice(11), 10) || 800;
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
      const res = await fetch(`${BASE.replace(/\/$/, '')}/api/scrape`, {
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
      console.warn(`[ingest] intento ${i + 1}/${retries} fallido: ${e.message}. Reintento en ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function main() {
  const { type, maxPages, startPage, delayMs, full } = parseArgs();
  const mediaType = type === 'series' ? 'series' : 'movie';

  if (full) {
    const maxPagesFull = parseInt(process.env.INGEST_MAX_PAGES || '5000', 10);
    console.log(`[ingest] Modo --full: catálogo completo ${mediaType} desde página ${startPage} → ${BASE} (hasta página vacía, máx. ${maxPagesFull})`);
    let totalItems = 0;
    let page = startPage;

    while (page - startPage < maxPagesFull) {
      const json = await postWithRetry(
        { type: mediaType, page, all: false },
        { retries: 5, baseDelay: 2000 }
      );
      const n = json.count ?? 0;

      totalItems += n;
      console.log(
        `[ingest] página ${page}: ${n} items (total ~${totalItems})`
      );

      if (n === 0) {
        console.log('[ingest] Sin más datos, fin.');
        break;
      }
      /* No usar totalKnown para parar: la API puede reportar last_page bajo y hay más páginas.
         Solo paramos cuando llegamos a una página vacía. */
      page += 1;
      await sleep(delayMs);
    }
    console.log(`[ingest] Fin modo --full. Items scrapeados en esta sesión: ~${totalItems}`);
    return;
  }

  console.log(`[ingest] Modo páginas fijas: ${mediaType} → ${BASE} (páginas ${startPage}..${startPage + maxPages - 1}, max=${maxPages})`);

  let total = 0;
  for (let p = 0; p < maxPages; p++) {
    const page = startPage + p;
    const json = await postWithRetry(
      { type: mediaType, page, all: false },
      { retries: 5, baseDelay: 2000 }
    );
    const n = json.count ?? 0;
    total += n;
    console.log(`[ingest] página ${page}: ${n} items (acumulado ${total})`);
    if (n === 0) {
      console.log('[ingest] sin más datos, fin.');
      break;
    }
    await sleep(delayMs);
  }
  console.log(`[ingest] terminado. Total aproximado scrapeado: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
