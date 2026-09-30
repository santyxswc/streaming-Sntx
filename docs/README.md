# Documentación

## Seguridad

| Documento | Para qué sirve |
|---|---|
| [security-audit.md](security-audit.md) | Hallazgos de la auditoría (SEC-00 a SEC-18), con su corrección o el riesgo aceptado. |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Activos, fronteras de confianza, amenazas y riesgo residual. |
| [FIREBASE_AUTH_HARDENING.md](FIREBASE_AUTH_HARDENING.md) | Ajustes de Firebase Auth en la consola y cómo comprobarlos contra la API real. |
| [FIREBASE_SERVICE_ACCOUNT.md](FIREBASE_SERVICE_ACCOUNT.md) | Cuenta de servicio de Firebase Admin para el servidor. |
| [CHAT_MODERATION.md](CHAT_MODERATION.md) | Cómo funciona la moderación del chat global. |

## Operación

| Documento | Para qué sirve |
|---|---|
| [RUNBOOK.md](RUNBOOK.md) | Verificación tras un despliegue, rollback y respuesta a incidentes. |
| [DOCKER.md](DOCKER.md) | Imagen endurecida: construcción, ejecución y análisis. |
| [CATALOG_NEON.md](CATALOG_NEON.md) | Catálogo en Neon (PostgreSQL) y su migración desde Firebase. |

## Scripts relacionados

| Script | Qué hace |
|---|---|
| `scripts/check-repo-posture.sh` | Comprueba por la API de GitHub (solo lectura) las protecciones del repositorio y las alertas abiertas. Sale con código 1 si algo falla. |
