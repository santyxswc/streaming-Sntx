-- Índices de rendimiento para Luvana (Neon / PostgreSQL)
-- Optimiza consultas frecuentes: búsqueda por título/original_title, orden por rating,
-- feed global de moderación en chat y cálculo de tendencias por vistas.
-- Ejecutar: npm run migrate:neon

-- 1. Optimización para ordenación por rating / aclamadas por la crítica
CREATE INDEX IF NOT EXISTS idx_media_type_rating
  ON media (media_type, rating);

-- 2. Optimización para búsquedas exactas e IA (findMediaForAiLookup)
CREATE INDEX IF NOT EXISTS idx_media_title
  ON media (media_type, title);

CREATE INDEX IF NOT EXISTS idx_media_original_title
  ON media (media_type, original_title);

-- 3. Optimización para feed global de moderación de chat (listGlobalFeed)
CREATE INDEX IF NOT EXISTS idx_chat_messages_global_time
  ON chat_messages (created_at DESC, id DESC);

-- 4. Optimización para agregaciones de tendencias (getTrendingMedia)
CREATE INDEX IF NOT EXISTS idx_media_views_time_media
  ON media_views (viewed_at, media_id);
