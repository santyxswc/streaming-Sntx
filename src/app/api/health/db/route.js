import { NextResponse } from 'next/server';
import { getNeonSql } from '@/server/db/neonSql';
import { getCatalogProvider } from '@/server/config/catalogEnv';
import { rateLimit } from '@/server/http/rateLimit';
import { createTtlCache } from '@/server/shared/ttlCache';
import { logger } from '@/server/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cada comprobación real despierta el cómputo de Neon y gasta cuota: el resultado se
// reutiliza unos segundos y los fallos se reintentan antes para recuperarse rápido.
const OK_TTL_MS = 30_000;
const FAIL_TTL_MS = 5_000;
const statusCache = createTtlCache({ maxEntries: 1 });

async function checkDatabase(catalog) {
  if (catalog !== 'neon') {
    return { status: 200, body: { ok: true, catalog, db: 'skipped' }, ttl: OK_TTL_MS };
  }
  if (!process.env.DATABASE_URL && !process.env.NEON_DATABASE_URL) {
    return { status: 503, body: { ok: false, error: 'missing_database_url' }, ttl: FAIL_TTL_MS };
  }
  try {
    const sql = getNeonSql();
    await sql`SELECT 1 AS ok`;
    return { status: 200, body: { ok: true, catalog: 'neon', db: 'connected' }, ttl: OK_TTL_MS };
  } catch (e) {
    logger.error('health_db.connect_failed', { route: 'health-db', err: e });
    return { status: 503, body: { ok: false, error: 'database_connect_failed' }, ttl: FAIL_TTL_MS };
  }
}

/**
 * Comprueba que la app pueda conectar a Postgres (Neon). Sin datos sensibles en la respuesta.
 * Es público (lo pueden sondear monitores externos), por eso lleva rate limit y caché corta.
 */
export async function GET(req) {
  const limited = await rateLimit(req, { limit: 30, windowMs: 60_000, id: 'health-db' });
  if (limited) return limited;

  let result = statusCache.get('status');
  if (!result) {
    result = await checkDatabase(getCatalogProvider());
    statusCache.set('status', result, result.ttl);
  }
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
