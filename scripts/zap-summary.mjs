// Resume un informe JSON de ZAP (zap-report.json) en Markdown para el resumen del job.
// Uso: node scripts/zap-summary.mjs zap/zap-report.json >> "$GITHUB_STEP_SUMMARY"
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/zap-summary.mjs <zap-report.json>');
  process.exit(2);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
const alerts = (report.site ?? []).flatMap((s) => s.alerts ?? []);
const risk = (a) => String(a.riskdesc ?? '').split(' ')[0] || 'Desconocido';
const order = ['High', 'Medium', 'Low', 'Informational'];

const counts = {};
for (const a of alerts) counts[risk(a)] = (counts[risk(a)] ?? 0) + 1;

const lines = ['### ZAP baseline (informe, no bloquea)', '', '| Riesgo | Alertas |', '|---|---|'];
for (const r of order) lines.push(`| ${r} | ${counts[r] ?? 0} |`);
if (alerts.length) {
  lines.push('', '| Riesgo | Alerta | Instancias |', '|---|---|---|');
  const sorted = [...alerts].sort((a, b) => order.indexOf(risk(a)) - order.indexOf(risk(b)));
  for (const a of sorted) lines.push(`| ${risk(a)} | ${a.name} | ${a.instances?.length ?? a.count ?? 1} |`);
}
console.log(lines.join('\n'));
