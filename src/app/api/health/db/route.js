import { NextResponse } from 'next/server';
import { getNeonSql } from '@/server/db/neonSql';
import { getCatalogProvider } from '@/server/config/catalogEnv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Comprueba que la app pueda conectar a Postgres (Neon). Sin datos sensibles en la respuesta.
 */
export async function GET() {
  const catalog = getCatalogProvider();
  if (catalog !== 'neon') {
    return NextResponse.json(
      { ok: true, catalog, db: 'skipped' },
      { status: 200 }
    );
  }
  if (!process.env.DATABASE_URL && !process.env.NEON_DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: 'missing_database_url' },
      { status: 503 }
    );
  }
  try {
    const sql = getNeonSql();
    await sql`SELECT 1 AS ok`;
    return NextResponse.json({ ok: true, catalog: 'neon', db: 'connected' });
  } catch (e) {
    console.error('[health/db]', e);
    return NextResponse.json(
      { ok: false, error: 'database_connect_failed' },
      { status: 503 }
    );
  }
}
