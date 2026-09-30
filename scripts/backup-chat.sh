#!/usr/bin/env bash
# Copia de seguridad de los datos que NO se pueden reconstruir: el chat y los perfiles de chat (Neon).
# El catálogo (`media`) no hace falta: se regenera con los scripts de ingesta.
#
# Uso:   DATABASE_URL=... scripts/backup-chat.sh           (o con la variable ya cargada de .env)
# Salida: backups/chat-AAAAMMDD-HHMM.sql.gz   (la carpeta `backups/` está en .gitignore)
#
# ATENCIÓN: el volcado contiene datos personales (mensajes, identificadores de usuario). Guárdalo
# cifrado o en un sitio privado; NUNCA lo subas al repositorio ni a artefactos de GitHub (en un
# repositorio público serían visibles). Solo lee: pg_dump no modifica la base de datos.
#
# Usa `pg_dump` si está instalado; si no, un contenedor de Docker (no hace falta instalar nada). El cliente
# debe ser igual o más nuevo que el servidor de Neon: ajusta PG_IMAGE si Neon sube de versión.
set -euo pipefail

OUT_DIR="${BACKUP_DIR:-backups}"
TABLES=(chat_messages chat_user_profiles)
STAMP="$(date +%Y%m%d-%H%M)"
OUT="$OUT_DIR/chat-$STAMP.sql.gz"
PG_IMAGE="${PG_IMAGE:-postgres:18-alpine}"
# Si algo falla, no dejes un archivo parcial que parezca una copia válida.
trap 'rc=$?; [ "$rc" -ne 0 ] && rm -f "$OUT"; exit $rc' EXIT

# Carga DATABASE_URL de .env.local / .env sin mostrarla, si no viene ya en el entorno.
if [ -z "${DATABASE_URL:-}" ]; then
  for f in .env.local .env; do
    [ -f "$f" ] && DATABASE_URL="$(/usr/bin/grep -E '^DATABASE_URL=' "$f" | head -1 | cut -d= -f2- | tr -d "\"'")" && [ -n "$DATABASE_URL" ] && break
  done
fi
[ -n "${DATABASE_URL:-}" ] || { echo "Falta DATABASE_URL (entorno, .env.local o .env)"; exit 2; }
export DATABASE_URL

mkdir -p "$OUT_DIR"
umask 077   # el volcado solo lo lee su dueño

ARGS=(--no-owner --no-privileges --clean --if-exists)
for t in "${TABLES[@]}"; do ARGS+=(-t "$t"); done

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "${ARGS[@]}" "$DATABASE_URL" | gzip > "$OUT"
else
  # `-e DATABASE_URL` sin valor copia la variable del entorno: no aparece en la línea de comandos.
  docker run --rm -e DATABASE_URL "$PG_IMAGE" sh -c 'pg_dump '"${ARGS[*]}"' "$DATABASE_URL"' | gzip > "$OUT"
fi

# Comprueba que el archivo es válido y no está vacío, y resume sin mostrar contenido.
gzip -t "$OUT"
for t in "${TABLES[@]}"; do
  n=$(gzip -dc "$OUT" | awk -v t="$t" '$0 ~ "^COPY public."t" " {c=1; next} c && /^\\\.$/ {c=0} c {n++} END {print n+0}')
  printf '  %-20s %s filas\n' "$t" "$n"
done
echo "Copia guardada en $OUT ($(du -h "$OUT" | cut -f1)). Protégela: contiene datos personales."
