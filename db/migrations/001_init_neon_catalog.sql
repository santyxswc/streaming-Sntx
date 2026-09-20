-- Catálogo Luvana en Neon (PostgreSQL)
-- Ejecutar: npm run migrate:neon   (o psql $DATABASE_URL -f ... si tienes psql instalado)

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'series')),
  title TEXT,
  original_title TEXT,
  overview TEXT,
  href TEXT,
  image TEXT,
  backdrop TEXT,
  year TEXT,
  rating TEXT,
  genres TEXT[] NOT NULL DEFAULT '{}',
  country TEXT,
  trailer TEXT,
  numeric_id BIGINT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_source JSONB,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_media_type_scraped_id
  ON media (media_type, scraped_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_media_year ON media (media_type, year);
CREATE INDEX IF NOT EXISTS idx_media_country ON media (media_type, country);
CREATE INDEX IF NOT EXISTS idx_media_genres ON media USING GIN (genres);

CREATE TABLE IF NOT EXISTS catalog_metadata (
  facet_key TEXT PRIMARY KEY CHECK (facet_key IN ('movies', 'series')),
  years TEXT[] NOT NULL DEFAULT '{}',
  countries TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO catalog_metadata (facet_key, years, countries)
VALUES ('movies', ARRAY['Todos']::TEXT[], ARRAY['Todos']::TEXT[])
ON CONFLICT (facet_key) DO NOTHING;

INSERT INTO catalog_metadata (facet_key, years, countries)
VALUES ('series', ARRAY['Todos']::TEXT[], ARRAY['Todos']::TEXT[])
ON CONFLICT (facet_key) DO NOTHING;
