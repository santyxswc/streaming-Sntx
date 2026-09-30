#!/usr/bin/env bash
# Comprobación de disponibilidad (solo lectura: GET). Sale con código 1 si algo falla.
# Uso: scripts/uptime-check.sh [url-base]    (por defecto, producción)
# Variables: UPTIME_ATTEMPTS (3), UPTIME_RETRY_DELAY en segundos (15), UPTIME_TIMEOUT (15)
set -u

BASE="${1:-${UPTIME_BASE_URL:-https://streaming-sntx.vercel.app}}"
BASE="${BASE%/}"
ATTEMPTS="${UPTIME_ATTEMPTS:-3}"
DELAY="${UPTIME_RETRY_DELAY:-15}"
TIMEOUT="${UPTIME_TIMEOUT:-15}"
FAIL=0

# check <nombre> <ruta> <patrón que debe aparecer en el cuerpo (vacío = solo el estado)>
check() {
  local name="$1" path="$2" pattern="$3" code body n=1
  while [ "$n" -le "$ATTEMPTS" ]; do
    body=$(mktemp)
    code=$(curl -s -m "$TIMEOUT" -o "$body" -w '%{http_code}' -H 'User-Agent: streaming-sntx-uptime/1' "$BASE$path" 2>/dev/null) || code=000
    if [ "$code" = "200" ] && { [ -z "$pattern" ] || grep -q "$pattern" "$body"; }; then
      rm -f "$body"; printf '  ok    %s (intento %d)\n' "$name" "$n"; return 0
    fi
    rm -f "$body"
    [ "$n" -lt "$ATTEMPTS" ] && sleep "$DELAY"
    n=$((n + 1))
  done
  printf '  FALLA %s: HTTP %s tras %d intentos\n' "$name" "$code" "$ATTEMPTS"
  FAIL=1
}

echo "Disponibilidad de $BASE"
check "health"    "/api/health"    '"ok":true'
check "health/db" "/api/health/db" '"db":"connected"'
check "home"      "/"              ''

[ "$FAIL" -eq 0 ] && echo "Todo disponible." || echo "Hay comprobaciones que fallan."
exit "$FAIL"
