# Auditoría de seguridad — streaming-Sntx

- **Fecha:** 2026-09-29
- **Alcance:** rutas de `src/app/api/*`, módulos de `src/server/*` que usan, `firestore.rules`, cabeceras HTTP, dependencias y CI.
- **Método:** revisión manual del código, `npm audit`, pruebas de cabeceras y CORS contra un build de producción.
- **No cubierto todavía:** despliegue real en Vercel (WAF, variables de entorno por entorno), `desktop/src-tauri`, pruebas dinámicas (ZAP).

## Resumen

| Severidad | Cantidad |
|---|---|
| Alta | 3 |
| Media | 5 |
| Baja | 5 |

Ya corregido durante la auditoría: dependencias críticas y altas (SEC-00), cabeceras/CSP/CORS (SEC-01), pipeline de seguridad en CI (SEC-02).

## Corregido

| ID | Hallazgo | Corrección |
|---|---|---|
| SEC-00 | 23 vulnerabilidades en dependencias (3 críticas, 7 altas) en web y 6 en desktop | `next` 16.3.7, `npm audit fix`. Web: 7 moderadas restantes (`firebase-admin`). Desktop: 0. |
| SEC-01 | CORS `*` en todo `/api/*`; CSP con `unsafe-eval` en producción y sin `object-src`, `base-uri`, `form-action`, `frame-ancestors`; `X-XSS-Protection` obsoleta; sin HSTS; `X-Powered-By` visible | `src/config/securityHeaders.mjs` con tests. CORS solo en rutas públicas de lectura. |
| SEC-02 | Sin análisis automatizado de seguridad | Dependabot, CodeQL, gitleaks y `npm audit` bloqueante en CI; permisos mínimos y acciones fijadas por SHA. |

## Hallazgos abiertos

### Alta

**SEC-03 — El limitador de tasa no es fiable en serverless**
`src/server/http/rateLimit.js:4` guarda los contadores en un `Map` en memoria. En Vercel cada instancia tiene su propia memoria y se reinicia en cada arranque en frío, así que el límite real es mucho mayor que el configurado. Además, sin cabecera `x-forwarded-for` (línea 24) todos los clientes comparten el bucket `'anonymous'`.
*Recomendación:* limitador con almacén compartido (Upstash Redis vía Marketplace) o reglas de rate limiting del Vercel Firewall en `/api/ai/*`, `/api/ingest/*` y `/api/chat/*`.

**SEC-04 — `/api/ai/search` permite abusar del coste de la API de IA**
`src/app/api/ai/search/route.js:18` no valida el tipo ni la longitud de `query` y reenvía el texto a DeepSeek. No exige sesión. El límite de 5 por minuto depende de SEC-03. `src/server/integrations/deepseek.js:20` no define `timeout`. `JSON.parse` de la respuesta del modelo (línea 63) no está aislado del resto de errores.
*Recomendación:* exigir `typeof query === 'string'` y un máximo (p. ej. 300 caracteres), `timeout` en axios, tope diario global de llamadas y, idealmente, exigir sesión de Firebase o BotID.

**SEC-05 — `/api/ingest/tmdb` es un endpoint de escritura expuesto en producción con protección débil**
`src/app/api/ingest/tmdb/route.js`:
- Sin rate limit, así que la clave `x-api-key` se puede probar por fuerza bruta.
- Comparación con `!==` (línea 54), no de tiempo constante. `moderationAuth.js` sí usa `timingSafeEqual`, por lo que el criterio es inconsistente.
- Secreto por defecto `'dev-ingest-secret'` cuando `NODE_ENV === 'development'` (línea 46).
- Devuelve `error.message` al cliente en el 500 (línea 162).
- Un solo request puede encadenar hasta 500 llamadas a TMDB y escrituras en Postgres.
*Recomendación:* sacar la ingesta del despliegue público (ya existe `scripts/ingest-tmdb.mjs`), o proteger con rate limit estricto, `timingSafeEqual`, sin secreto por defecto y mensaje de error genérico.

### Media

**SEC-06 — Fuga de detalles de configuración en errores de autenticación**
`src/app/api/chat/messages/route.js:115` y `src/app/api/chat/profile/route.js:18` devuelven `formatVerifyAuthError(e)`. Para errores de configuración (`MISSING_ENV`, `PROJECT_MISMATCH`, `INIT_FAILED`) el mensaje incluye ids de proyecto y referencias internas. Cualquier petición con una cabecera `Authorization: Bearer x` puede provocarlo.
*Recomendación:* devolver un mensaje genérico al cliente y registrar el detalle solo en el servidor.

**SEC-07 — Los tokens de Firebase no se comprueban contra revocación**
`src/server/db/firebaseAdmin.js:146` usa `verifyIdToken(token)` sin `checkRevoked`. Un usuario deshabilitado o con sesión revocada conserva acceso hasta que expira el token (≈1 h). Es relevante en `chat/moderation` y `auth/admin`.
*Recomendación:* `verifyIdToken(token, true)` al menos en rutas de moderación.

**SEC-08 — `/api/health/db` público, sin límite y con consulta real**
`src/app/api/health/db/route.js:27` ejecuta `SELECT 1` en cada petición anónima (despierta el cómputo de Neon y consume cuota) y revela qué proveedor de catálogo se usa.
*Recomendación:* rate limit, caché corta y respuesta mínima; o proteger detrás de un secreto.

**SEC-09 — `/api/auth/limit` da falsa sensación de protección**
`src/features/auth/components/AuthModal.js:54` la llama desde el cliente antes de `signInWithEmailAndPassword`. Un atacante llama directamente a Firebase Auth y se salta ese control. El límite real de fuerza bruta lo aporta Firebase, no esta ruta.
*Recomendación:* no presentarla como control de seguridad; activar Firebase App Check y, si se necesita, Identity Platform con protección de enumeración.

**SEC-10 — Dependencias con 7 avisos moderados pendientes**
Vienen de `firebase-admin` 13 → salto mayor a 14.5.0 (Dependabot PR #9). Requiere probar `verifyIdToken` y Firestore Admin antes de fusionar.

### Baja

**SEC-11 — Sin CSP estricta con nonces.** `script-src` mantiene `'unsafe-inline'`. Quitarlo exige nonces por petición y render dinámico. Riesgo aceptado por ahora.

**SEC-12 — `typescript.ignoreBuildErrors: true` en `next.config.mjs`.** Oculta errores de tipos en el build. El proyecto es JavaScript, pero conviene retirarlo.

**SEC-13 — `images.remotePatterns` con `hostname: '**'`.** Con `unoptimized: true` no hay proxy de imágenes, pero cualquier `https:` se acepta. Limitar a los dominios reales del catálogo.

**SEC-14 — Reglas de Firestore sin validación de esquema ni tamaño en `users/{userId}/**`.** Cada usuario puede escribir datos arbitrarios en su propio espacio. Bajo impacto; añadir límites si crece el uso.

**SEC-15 — Privacidad.** Firebase Analytics envía datos de uso a Google. Falta aviso de privacidad/cookies si el sitio se abre a público real.

## Controles que ya funcionan bien

- Todas las consultas SQL usan plantillas etiquetadas de `postgres`; no hay `sql.unsafe` ni concatenación.
- No hay `dangerouslySetInnerHTML` ni `innerHTML` en `src`: el contenido del chat lo escapa React.
- Los parámetros hacia TMDB se construyen con `URLSearchParams`, sin inyección en la ruta.
- Moderación: comparación de secreto con `timingSafeEqual`, allowlist de UIDs y validación de UUID en cursores.
- Entrada del chat validada (longitud, `mediaId`, `episodeKey`) y token verificado antes de escribir.
- `firestore.rules`: denegación por defecto, escritura del catálogo bloqueada, datos de usuario aislados por `uid`.
- Secretos fuera del repositorio (`.env*` ignorados) y gitleaks limpio sobre el historial completo.

## Orden de corrección sugerido

1. SEC-05 y SEC-06: cambios pequeños en el servidor, mucho riesgo menos.
2. SEC-04: validación de entrada, `timeout` y tope de coste.
3. SEC-03: decidir almacén compartido o reglas del Vercel Firewall.
4. SEC-07 y SEC-08.
5. SEC-10 (`firebase-admin` 14) con pruebas.
6. Baja: SEC-11 a SEC-15.
