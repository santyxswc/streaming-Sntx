#!/usr/bin/env bash
# Comprueba por la API de GitHub (solo lectura) que las protecciones del repositorio
# siguen activas y que no hay alertas graves abiertas. Sale con código 1 si algo falla.
#
# Uso:   scripts/check-repo-posture.sh [owner/repo]
# Nota:  leer `security_and_analysis` y los rulesets exige permisos de administrador.
#        El GITHUB_TOKEN de Actions no los tiene; en CI hay que usar un token propio
#        (ver .github/workflows/posture.yml).
set -u

REPO="${1:-${GITHUB_REPOSITORY:-santyxswc/streaming-Sntx}}"
BRANCH="${POSTURE_BRANCH:-main}"
R="repos/$REPO"
FAIL=0

ok()   { printf '  ok    %s\n' "$1"; }
fail() { printf '  FALLA %s\n' "$1"; FAIL=1; }

# check <descripcion> <valor real> <valor esperado>
check() { if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (actual: ${2:-vacío}, esperado: $3)"; fi; }

gh auth status >/dev/null 2>&1 || { echo "gh no está autenticado"; exit 2; }

echo "Postura de $REPO (rama $BRANCH)"

echo "== Protección de la rama"
PROT=$(gh api "$R/branches/$BRANCH" --jq '.protected' 2>/dev/null) || PROT="no se pudo leer la rama"
check "rama protegida" "$PROT" "true"
RULESETS=$(gh api "$R/rulesets" --jq '[.[] | select(.enforcement=="active" and .target=="branch")] | length')
[ "${RULESETS:-0}" -ge 1 ] && ok "ruleset de rama activo" || fail "no hay ruleset de rama activo"
RULES=$(gh api "$R/rules/branches/$BRANCH" --jq '[.[].type] | join(",")' 2>/dev/null)
case ",$RULES," in *,deletion,*) ok "bloquea el borrado de $BRANCH";; *) fail "no bloquea el borrado de $BRANCH";; esac
case ",$RULES," in *,non_fast_forward,*) ok "bloquea el force push";; *) fail "no bloquea el force push";; esac

echo "== Seguridad del repositorio"
SA=$(gh api "$R" --jq '.security_and_analysis | to_entries[] | "\(.key)=\(.value.status)"' 2>/dev/null)
for k in secret_scanning secret_scanning_push_protection dependabot_security_updates; do
  check "$k" "$(printf '%s\n' "$SA" | sed -n "s/^$k=//p")" "enabled"
done
check "reporte privado de vulnerabilidades" "$(gh api "$R/private-vulnerability-reporting" --jq '.enabled' 2>/dev/null)" "true"
if gh api -i "$R/vulnerability-alerts" 2>/dev/null | head -1 | grep -q " 204"; then
  ok "alertas de Dependabot activas"
else
  fail "alertas de Dependabot desactivadas"
fi

echo "== Alertas abiertas (críticas y altas)"
check "Dependabot" "$(gh api "$R/dependabot/alerts?state=open&severity=critical,high&per_page=100" --jq 'length' 2>/dev/null)" "0"
check "code scanning" "$(gh api "$R/code-scanning/alerts?state=open&severity=critical,high&per_page=100" --jq 'length' 2>/dev/null)" "0"
check "secret scanning" "$(gh api "$R/secret-scanning/alerts?state=open&per_page=100" --jq 'length' 2>/dev/null)" "0"

echo "== CI en $BRANCH"
LAST=$(gh run list --repo "$REPO" --branch "$BRANCH" --workflow CI --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null)
check "último CI" "$LAST" "success"

if [ "$FAIL" -eq 0 ]; then echo "Postura correcta."; else echo "Hay controles que fallan."; fi
exit "$FAIL"
