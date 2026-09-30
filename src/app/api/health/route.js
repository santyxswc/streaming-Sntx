import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness: el proceso responde. No toca la base de datos ni servicios externos, para que
 * el HEALTHCHECK de Docker o un balanceador no despierten Neon ni dependan de terceros.
 * La comprobación de dependencias (readiness) está en /api/health/db.
 */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
