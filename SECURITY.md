# Política de seguridad

## Mantenedor

| Rol | Nombre | GitHub |
|-----|--------|--------|
| Mantenedor principal | Santiago Caicedo | [@santyxswc](https://github.com/santyxswc) |

Santiago Caicedo es el autor y mantenedor principal de streaming-Sntx y quien recibe, evalúa y corrige los reportes de seguridad.

## Versiones soportadas

|Soporte|Versión (rama Principal)|
|-------|------------------------|
| Sí   | rama `main` / última release estable |

## Reportar una vulnerabilidad

Si crees haber encontrado un problema de seguridad en el código o en el despliegue, **no** abras un issue público con detalles del exploit.

- Usa el reporte privado de GitHub: [**Report a vulnerability**](https://github.com/santyxswc/streaming-Sntx/security/advisories/new), o
- escribe directamente al mantenedor principal, [@santyxswc](https://github.com/santyxswc), por un canal privado.

Incluye, si es posible: pasos para reproducir, impacto estimado y versión afectada.

### Qué esperar

- Confirmación de recibido en un máximo de **72 horas**.
- Una primera evaluación (si se acepta y su gravedad) en un máximo de **7 días**.
- Las correcciones se publican en una nueva release y, cuando aplica, con un aviso de seguridad (GitHub Security Advisory) que da crédito a quien reportó, si así lo desea.

## Secretos y forks

- No incluyas API keys, `DATABASE_URL` ni JSON de service account en issues, PRs ni mensajes.
- Rota inmediatamente cualquier credencial que se haya publicado por error y elimina el historial o el mensaje en la plataforma si aplica.

## Documentación de seguridad y operación

- [Modelo de amenazas](docs/THREAT_MODEL.md): qué se protege, de quién y con qué controles.
- [Informe de auditoría](docs/security-audit.md): hallazgos, correcciones y riesgos pendientes.
- [Runbook de incidentes](docs/RUNBOOK.md): cómo contener, investigar y recuperar; rotación de secretos.
