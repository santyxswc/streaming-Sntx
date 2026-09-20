import postgres from 'postgres';

let sqlInstance;

function normalizeDatabaseUrl(raw) {
  if (raw == null || typeof raw !== 'string') return raw;
  let u = raw.trim();
  if (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim();
  }
  // Neon añade channel_binding=require; el driver `postgres` en Node (p. ej. Vercel) suele fallar al conectar.
  try {
    const parsed = new URL(u);
    parsed.searchParams.delete('channel_binding');
    u = parsed.toString();
  } catch {
    u = u.replace(/[&?]channel_binding=[^&]*/gi, '');
    u = u.replace(/\?&/, '?').replace(/&&+/g, '&');
  }
  return u;
}

/**
 * Cliente Postgres singleton para Neon (connection string en DATABASE_URL o NEON_DATABASE_URL).
 */
export function getNeonSql() {
  if (sqlInstance) return sqlInstance;
  const raw = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  const url = normalizeDatabaseUrl(raw);
  if (!url) {
    throw new Error('DATABASE_URL o NEON_DATABASE_URL requerido cuando CATALOG_PROVIDER=neon');
  }
  sqlInstance = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });
  return sqlInstance;
}
