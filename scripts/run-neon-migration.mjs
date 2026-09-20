/**
 * Aplica todos los .sql en db/migrations/ en orden (001, 002, …).
 * Carga .env.local y usa DATABASE_URL o NEON_DATABASE_URL.
 *
 *   npm run migrate:neon
 */
import postgres from 'postgres';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!url) {
  console.error('Define DATABASE_URL o NEON_DATABASE_URL en .env.local');
  process.exit(1);
}

const migrationsDir = resolve(root, 'db/migrations');
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

async function main() {
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    for (const file of files) {
      const sqlFile = resolve(migrationsDir, file);
      const content = readFileSync(sqlFile, 'utf8');
      await sql.unsafe(content);
      console.log('Migración aplicada:', file);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
