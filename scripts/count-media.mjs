/**
 * Cuenta filas en media por tipo (movie/series).
 * Ejecutar: node scripts/count-media.mjs
 */
import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      process.env[m[1].trim()] = val;
    }
  });
}

const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!url) {
  console.error('Define DATABASE_URL en .env.local');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const [movies] = await sql`SELECT COUNT(*)::int as n FROM media WHERE media_type = 'movie'`;
const [series] = await sql`SELECT COUNT(*)::int as n FROM media WHERE media_type = 'series'`;
const [total] = await sql`SELECT COUNT(*)::int as n FROM media`;
await sql.end();

console.log('Películas:', movies.n);
console.log('Series:', series.n);
console.log('Total:', total.n);
