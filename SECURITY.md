# Política de seguridad

## Versiones soportadas

|Soporte|Versión (rama Principal)|
|-------|------------------------|
| Sí   | rama `main` / última release estable |

## Reportar una vulnerabilidad

Si crees haber encontrado un problema de seguridad en el código o en el despliegue, **no** abras un issue público con detalles del exploit.

- En GitHub, abre el repositorio → **Security** → **Report a vulnerability** / **Advisories** (flujo privado), o
- contacta con los mantenedores por un canal privado si lo indican en el repositorio.

Incluye, si es posible: pasos para reproducir, impacto estimado y versión afectada.

## Secretos y forks

- No incluyas API keys, `DATABASE_URL` ni JSON de service account en issues, PRs ni mensajes.
- Rota inmediatamente cualquier credencial que se haya publicado por error y elimina el historial o el mensaje en la plataforma si aplica.
