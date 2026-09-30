#!/usr/bin/env bash
# Checklist automática tras un despliegue (solo lectura; el único POST se rechaza sin clave).
# Uso: scripts/verify-deploy.sh [url-base]    (por defecto, producción)
# Vars: VERIFY_ATTEMPTS (3) y VERIFY_RETRY_DELAY en segundos (10): el borde de Vercel puede tardar
#       unos segundos en servir la versión nueva. Sale con 1 si algún control falla.
set -u

BASE="${1:-${VERIFY_BASE_URL:-https://streaming-sntx.vercel.app}}"
BASE="${BASE%/}"
ATTEMPTS="${VERIFY_ATTEMPTS:-3}"
DELAY="${VERIFY_RETRY_DELAY:-10}"
UA='User-Agent: streaming-sntx-verify/1'
FAIL=0
HDR=$(mktemp); BODY=$(mktemp); trap 'rm -f "$HDR" "$BODY"' EXIT

ok()   { printf '  ok    %s\n' "$1"; }
fail() { printf '  FALLA %s\n' "$1"; FAIL=1; }

# fetch <método> <ruta> -> deja cabeceras en $HDR, cuerpo en $BODY y el código en $CODE
fetch() {
  CODE=$(curl -s -m 20 -X "$1" -H "$UA" -D "$HDR" -o "$BODY" -w '%{http_code}' "$BASE$2" 2>/dev/null) || CODE=000
}
header() { /usr/bin/grep -i "^$1:" "$HDR" | head -1 | sed -E "s/^[^:]+:[[:space:]]*//" | tr -d '\r'; }

# check <descripción> <código esperado o 'exp1|exp2'> <método> <ruta> [función de comprobación del cuerpo/cabeceras]
check() {
  local desc="$1" expected="$2" method="$3" path="$4" extra="${5:-}" n=1 why=""
  while [ "$n" -le "$ATTEMPTS" ]; do
    fetch "$method" "$path"; why=""
    [[ "|$expected|" == *"|$CODE|"* ]] || why="HTTP $CODE (esperado $expected)"
    if [ -z "$why" ] && [ -n "$extra" ]; then why=$($extra); fi
    [ -z "$why" ] && { ok "$desc"; return 0; }
    [ "$n" -lt "$ATTEMPTS" ] && sleep "$DELAY"
    n=$((n + 1))
  done
  fail "$desc: $why"
}

# --- comprobaciones del cuerpo o de las cabeceras (imprimen el motivo si fallan) ---
is_ok_json()    { /usr/bin/grep -q '"ok":true' "$BODY" || echo 'el cuerpo no contiene "ok":true'; }
is_db_up()      { /usr/bin/grep -q '"db":"connected"' "$BODY" || echo 'la base de datos no está conectada'; }
has_privacy()   { /usr/bin/grep -q 'Privacidad y cookies' "$BODY" || echo 'falta el título de la página'; }
no_cors()       { [ -z "$(header access-control-allow-origin)" ] || echo 'abre CORS en una ruta privada'; }
has_cors()      { [ -n "$(header access-control-allow-origin)" ] || echo 'falta CORS en una ruta pública de lectura'; }
no_content_xfo(){ [ -z "$(header x-frame-options)" ] || echo 'hereda X-Frame-Options'; }
embed_ancestors(){ header content-security-policy | /usr/bin/grep -q 'frame-ancestors tauri://localhost' || echo 'frame-ancestors no admite a Tauri'; }

security_headers() {
  local csp; csp=$(header content-security-policy)
  [ -n "$csp" ] || { echo 'sin Content-Security-Policy'; return; }
  case "$csp" in *"unsafe-eval"*) echo "la CSP permite unsafe-eval"; return;; esac
  case "$csp" in *"*.googleapis.com"*|*"*.firebaseio.com"*) echo "la CSP vuelve a tener comodines de Google/Firebase"; return;; esac
  [[ "$csp" == *"object-src 'none'"* ]] || { echo "falta object-src 'none'"; return; }
  [[ "$csp" == *"frame-ancestors 'none'"* ]] || { echo "falta frame-ancestors 'none'"; return; }
  [ "$(header x-frame-options)" = "DENY" ] || { echo 'X-Frame-Options no es DENY'; return; }
  [ "$(header x-content-type-options)" = "nosniff" ] || { echo 'falta nosniff'; return; }
  [ -z "$(header x-powered-by)" ] || { echo 'X-Powered-By visible'; return; }
  if [[ "$BASE" == https://* ]]; then
    header strict-transport-security | /usr/bin/grep -qE 'max-age=[0-9]{7,}' || echo 'falta HSTS con max-age largo'
  fi
}

echo "Verificación de $BASE"
echo "== Disponibilidad"
check "health"                               200        GET  /api/health    is_ok_json
check "health/db"                            200        GET  /api/health/db is_db_up
echo "== Cabeceras de seguridad"
check "cabeceras de la home (CSP, XFO, HSTS…)" 200      GET  /              security_headers
check "página puente /embed: solo Tauri la enmarca" 200 GET  /embed/WbziExW1-i4 embed_ancestors
check "/embed no hereda X-Frame-Options"     200        GET  /embed/WbziExW1-i4 no_content_xfo
echo "== Comportamiento"
check "/embed rechaza ids inválidos"         404        GET  /embed/corto
check "ruta de API inexistente da 404"       404        GET  /api/no-existe
check "página de privacidad"                 200        GET  /privacidad    has_privacy
check "ingesta rechaza sin clave"            '401|403|503' POST /api/ingest/tmdb
echo "== CORS"
check "el feed público abre CORS"            200        GET  /api/feed/home has_cors
check "el chat no abre CORS"                 '200|400|401|429' GET /api/chat/messages no_cors

if [ "$FAIL" -eq 0 ]; then echo "Despliegue verificado."; else echo "Hay controles que fallan: valora un rollback (docs/DELIVERY.md)."; fi
exit "$FAIL"
