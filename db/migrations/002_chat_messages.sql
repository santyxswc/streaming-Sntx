-- Chat por contenido (salas implícitas por media_id + episode_key)
-- Requiere PostgreSQL con gen_random_uuid (pgcrypto en versiones antiguas).
-- Ejecutar: npm run migrate:neon  o  psql $DATABASE_URL -f db/migrations/002_chat_messages.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  episode_key TEXT,
  author_uid TEXT NOT NULL,
  author_display_name TEXT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_time
  ON chat_messages (media_id, episode_key, created_at DESC, id DESC);

COMMENT ON TABLE chat_messages IS 'Mensajes de chat por obra; episode_key NULL = película o chat general de serie';
