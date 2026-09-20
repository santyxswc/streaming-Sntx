# Catálogo dual: Firebase + Neon (PostgreSQL)

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
| `INGEST_FULL` | `1` para modo full (todas las páginas hasta vacío) |
| `INGEST_TYPE` | `movie` o `series` (útil en PowerShell donde `--type` puede no propagarse) |

Con `CATALOG_PROVIDER=neon`, las rutas `/api/media*`, búsqueda, recomendaciones, IA y `/api/scrape` usan Postgres.

## Migración inicial

1. Crear proyecto en [Neon](https://neon.com/) y copiar la connection string.
2. Aplicar el esquema (en Windows no hace falta `psql`; usa Node):

```bash
npm run migrate:neon
```

(Requiere `DATABASE_URL` en `.env.local`.) Si tienes [PostgreSQL](https://www.postgresql.org/download/) instalado con `psql` en el PATH, también puedes usar: `psql "$DATABASE_URL" -f db/migrations/001_init_neon_catalog.sql` (en PowerShell carga antes las variables o usa el comando desde Git Bash).

3. Poblar datos vía scraping de **lamovie.org** (el scraper no lee Firestore: siempre trae del API público y hace upsert en la base activa, así recuperas el mismo catálogo por **slug** que antes si la fuente coincide).

Con el servidor en marcha (`npm run dev`), `.env.local` ya con `CATALOG_PROVIDER=neon` y `DATABASE_URL`:

**Catálogo completo** (una petición por página hasta que no haya más; evita el límite de 30 páginas por defecto):

```bash
# Películas (bash/Git Bash)
npm run ingest:la-movie -- --type=movie --full

# Series (bash/Git Bash)
npm run ingest:la-movie -- --type=series --full
```

**PowerShell / Windows** (los arg `--type` y `--full` a veces no llegan; usar estos scripts):

```powershell
# Películas (modo full, hasta página vacía)
npm run ingest:movie:full

# Series (modo full, hasta página vacía)
npm run ingest:series:full
```

O con variables de entorno:
```powershell
$env:INGEST_FULL="1"; $env:INGEST_TYPE="series"; npm run ingest:la-movie
```

Para continuar desde una página concreta: `--start-page=31` o `$env:INGEST_START_PAGE="31"`.

**Solo N páginas** (pruebas):

```bash
npm run ingest:la-movie -- --type=movie --max-pages=15
npm run ingest:la-movie -- --type=series --max-pages=15
# PowerShell: $env:INGEST_TYPE="series"; $env:INGEST_MAX_PAGES="15"; npm run ingest:la-movie
```

**API `POST /api/scrape`** (header `x-api-key`):

| Campo | Efecto |
|--------|--------|
| `all: true` o `fullCatalog: true` | En **una sola petición** recorre desde `page` hasta la última página reportada (máx. `SCRAPER_MAX_PAGES_PER_REQUEST`, por defecto 5000). Puede tardar mucho o cortarse por timeout en Vercel; en local suele ir bien. |
| `page`, sin `all` | Solo esa página (~50 ítems). |

La respuesta incluye `totalPages`, `pagesProcessed`, `count`.

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
4. Mantener Firebase para Auth, favoritos y watch parties hasta migrarlos.

## Reproductor (embeds) y CSP

Los enlaces de reproducción **no se guardan en Neon**: el detalle sigue usando `numeric_id` (ID del post en lamovie.org) y `/api/media/player` consulta la API pública de lamovie.org para obtener `embeds`.

- Si `numeric_id` quedó vacío pero el **JSON completo** está en la columna `payload` del ingest, el código usa `payload.numericId` / `payload._id` como respaldo.
- Si en el iframe ves **«This content is blocked. Contact the site owner…»**, suele ser la **Content-Security-Policy** bloqueando el dominio del embed. En este proyecto la CSP está en `next.config.mjs` (`frame-src 'self' https: blob:`) para permitir iframes HTTPS de cualquier servidor de video.
- **Firebase Analytics / gtag** cargan scripts desde `googletagmanager.com` y `google-analytics.com`; la misma CSP incluye esos orígenes en `script-src` y `connect-src` para que no se bloqueen.

## Checklist de paridad

- [ ] `/api/media` listado + paginación
- [ ] `/api/media/detail` y páginas `[type]/[slug]`
- [ ] `/api/media/metadata` años/países
- [ ] `/api/media/search`
- [ ] `/api/media/recommendations`
- [ ] `/api/ai/search`
- [ ] `/api/scrape` escribe en Neon
