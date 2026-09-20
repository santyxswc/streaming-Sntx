-- Visitas a películas y series para Tendencias
-- Ejecutar tras 001_init_neon_catalog.sql (o usar migrate:neon que aplica todas)

CREATE TABLE IF NOT EXISTS media_views (
  id BIGSERIAL PRIMARY KEY,
  media_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_views_media_id ON media_views (media_id);
CREATE INDEX IF NOT EXISTS idx_media_views_viewed_at ON media_views (viewed_at DESC);
