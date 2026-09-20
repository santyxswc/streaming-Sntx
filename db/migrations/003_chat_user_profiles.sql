-- Nombre de usuario de chat (gamertag) por cuenta Firebase
-- Ejecutar: npm run migrate:neon

CREATE TABLE IF NOT EXISTS chat_user_profiles (
  uid TEXT PRIMARY KEY,
  chat_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_user_profiles_name_lower
  ON chat_user_profiles (lower(chat_name));

COMMENT ON TABLE chat_user_profiles IS 'Nombre visible en chat; único sin importar mayúsculas';
