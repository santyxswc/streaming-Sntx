# Catálogo: Neon (PostgreSQL) y Firebase

## Inicio rápido con Neon (CLI)

Neon recomienda enlazar el proyecto con un solo comando (genera o enlaza proyecto y suele escribir `DATABASE_URL` en `.env`):

```bash
npx neonctl@latest init
```

También puedes instalar la CLI globalmente: `npm i -g neonctl` o `brew install neonctl` (si está disponible en tu entorno). Más detalles en la [documentación de Neon](https://neon.com/).

Tras tener la connection string, define `DATABASE_URL` (o `NEON_DATABASE_URL`) y ejecuta la migración SQL de este repo (sección siguiente).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `CATALOG_PROVIDER` | `firebase` (por defecto) o `neon` |
| `DATABASE_URL` o `NEON_DATABASE_URL` | Cadena de conexión Postgres (Neon); **solo servidor**, nunca `NEXT_PUBLIC_*` |
| `TMDB_API_KEY` | Necesaria para `ingest:tmdb` y para resolver tráilers |
| `INGEST_SECRET_KEY` | Protege `POST /api/ingest/tmdb` (cabecera `x-api-key`); en `next dev` se usa un valor de desarrollo |

Con `CATALOG_PROVIDER=neon`, las rutas `/api/media*`, búsqueda, recomendaciones, tráilers e IA usan Postgres a través de `src/server/catalog/catalogRepository.js`.

## Migración inicial

1. Crear proyecto en [Neon](https://neon.com/) y copiar la connection string.
2. Aplicar el esquema (en Windows no hace falta `psql`; usa Node):

```bash
npm run migrate:neon
```

(Requiere `DATABASE_URL` en `.env.local`.) Si tienes [PostgreSQL](https://www.postgresql.org/download/) instalado con `psql` en el PATH, también puedes usar: `psql "$DATABASE_URL" -f db/migrations/001_init_neon_catalog.sql` (en PowerShell carga antes las variables o usa el comando desde Git Bash).

3. Poblar el catálogo con los scripts de ingesta (hacen upsert por `id`, así que se pueden re-ejecutar sin duplicar):

**TMDB** (películas y series; pasa por `POST /api/ingest/tmdb`, así que necesita el servidor en marcha con `npm run dev`):

```bash
npm run ingest:tmdb -- --type=movie --max-pages=20
npm run ingest:tmdb -- --type=series --full
npm run ingest:tmdb -- --type=movie --full --year=2024   # TMDB limita a 500 páginas por consulta
```

En PowerShell, donde los argumentos `--type`/`--full` a veces no llegan, usa los atajos `npm run ingest:tmdb:movie:full`, `ingest:tmdb:series:full` y sus variantes `:es:full` (solo idioma original español).

**TVmaze** (series; conecta directo a `DATABASE_URL`, no necesita el servidor):

```bash
npm run ingest:tvmaze -- --pages=5
npm run ingest:tvmaze:full            # retoma automáticamente desde .ingest-state/
```

Para contar filas por tipo: `node scripts/count-media.mjs`.

## Catálogo con Firebase (producción)

Con `CATALOG_PROVIDER=firebase`, el catálogo usa Firestore y el **Admin SDK** en el servidor. En Vercel necesitas:

| Variable | Obligatorio |
|----------|-------------|
| `CATALOG_PROVIDER` | `firebase` (explícito; si hay `DATABASE_URL` sin esto, se usa Neon) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo del service account; ver `docs/FIREBASE_SERVICE_ACCOUNT.md` |

Además, crear los índices de Firestore (puede tardar unos minutos):

```bash
firebase deploy --only firestore:indexes
```

## Activación en producción

1. Validar listados, filtros, detalle y búsqueda con datos reales en staging.
2. **Neon**: En Vercel, `CATALOG_PROVIDER=neon` y `DATABASE_URL` (secret).
3. **Firebase**: `CATALOG_PROVIDER=firebase` y `FIREBASE_SERVICE_ACCOUNT`; `firebase deploy --only firestore:indexes`.
4. Mantener Firebase para Auth y favoritos.

## Tráilers

Los tráilers **no requieren columnas nuevas ni escrituras**: `src/server/trailers/trailerService.js` usa el tráiler guardado en `media.trailer` si existe y, si no, lo resuelve contra TMDB con el identificador que cada ingesta dejó en `payload` (id TMDB, `externals.imdb` / `externals.thetvdb` de TVmaze) o, como último recurso, por título y año. El resultado se cachea en memoria y en el CDN.

La CSP de `next.config.mjs` solo permite iframes de YouTube (`youtube-nocookie.com`) y de Firebase Auth.

## Checklist de paridad

- [ ] `/api/media` listado + paginación
- [ ] `/api/media/detail` y páginas `[type]/[slug]`
- [ ] `/api/media/metadata` años/países
- [ ] `/api/media/search`
- [ ] `/api/media/recommendations`
- [ ] `/api/ai/search`
- [ ] `/api/media/trailer` resuelve tráilers
- [ ] `/api/ingest/tmdb` escribe en Neon
