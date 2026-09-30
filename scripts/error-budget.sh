#!/usr/bin/env bash
# Presupuesto de errores sencillo: disponibilidad medida por las ejecuciones del monitor
# (workflow "Disponibilidad", una cada ~15 min) frente a un objetivo (SLO).
# Uso:   scripts/error-budget.sh
# Vars:  SLO_TARGET (99.5, en %), WINDOW_DAYS (30), WORKFLOW ("Disponibilidad"), REPO
# Sale con 1 si el presupuesto está agotado (disponibilidad por debajo del objetivo).
set -u

REPO="${REPO:-santyxswc/streaming-Sntx}"
WORKFLOW="${WORKFLOW:-Disponibilidad}"
TARGET="${SLO_TARGET:-99.5}"
DAYS="${WINDOW_DAYS:-30}"
SINCE=$(date -u -d "-$DAYS days" +%F)

RESULT=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --created ">=$SINCE" --limit 1000 \
  --json conclusion --jq '[.[].conclusion] | map(select(. == "success" or . == "failure")) | "\(map(select(. == "success")) | length) \(map(select(. == "failure")) | length)"') || {
  echo "No se pudieron leer las ejecuciones de '$WORKFLOW'."
  echo "Si el workflow es nuevo, publícalo primero (push a main): hasta entonces GitHub no lo conoce."
  exit 2; }

read -r OK BAD <<<"$RESULT"
TOTAL=$((OK + BAD))
if [ "$TOTAL" -eq 0 ]; then
  echo "Sin ejecuciones de '$WORKFLOW' en los últimos $DAYS días: todavía no hay datos."
  exit 0
fi

awk -v ok="$OK" -v bad="$BAD" -v total="$TOTAL" -v target="$TARGET" -v days="$DAYS" -v wf="$WORKFLOW" 'BEGIN {
  avail = 100 * ok / total
  allowed = total * (100 - target) / 100          # comprobaciones fallidas permitidas
  used = allowed > 0 ? 100 * bad / allowed : (bad > 0 ? 100 : 0)
  printf "Ventana: %d días · Workflow: %s\n", days, wf
  printf "Comprobaciones: %d (%d ok, %d fallidas)\n", total, ok, bad
  printf "Disponibilidad: %.3f %% (objetivo %.2f %%)\n", avail, target
  printf "Presupuesto de errores consumido: %.0f %% (%.1f de %.1f fallos permitidos)\n", used, bad, allowed
  if (avail < target) { print "ESTADO: presupuesto agotado"; exit 1 }
  print "ESTADO: dentro del presupuesto"
}'
