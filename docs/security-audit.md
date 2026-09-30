# Auditoría de seguridad — streaming-Sntx

- **Fecha:** 2026-09-29
- **Alcance:** rutas de `src/app/api/*`, módulos de `src/server/*` que usan, `firestore.rules`, cabeceras HTTP, dependencias y CI.
- **Método:** revisión manual del código, `npm audit`, pruebas de cabeceras y CORS contra un build de producción.
- **No cubierto todavía:** despliegue real en Vercel (WAF, variables de entorno por entorno), `desktop/src-tauri`, pruebas dinámicas (ZAP).

## Resumen

| Severidad | Cantidad |
|---|---|
| Alta | 0 |
| Media | 2 |
| Baja | 3 |

Ya corregido durante la auditoría: dependencias críticas y altas (SEC-00), cabeceras/CSP/CORS (SEC-01), pipeline de seguridad en CI (SEC-02), protección de la ruta de ingesta (SEC-05), fugas de configuración en errores de autenticación (SEC-06), limitador de tasa compartido (SEC-03), abuso de coste del buscador con IA (SEC-04), revocación de tokens (SEC-07), sondeo de la base de datos (SEC-08), errores de tipos ocultos en el build (SEC-12) y proxy de imágenes abierto latente (SEC-13).

## Corregido

| ID | Hallazgo | Corrección |
|---|---|---|
| SEC-00 | 23 vulnerabilidades en dependencias (3 críticas, 7 altas) en web y 6 en desktop | `next` 16.3.7, `npm audit fix`. Web: 7 moderadas restantes (`firebase-admin`). Desktop: 0. |
| SEC-01 | CORS `*` en todo `/api/*`; CSP con `unsafe-eval` en producción y sin `object-src`, `base-uri`, `form-action`, `frame-ancestors`; `X-XSS-Protection` obsoleta; sin HSTS; `X-Powered-By` visible | `src/config/securityHeaders.mjs` con tests. CORS solo en rutas públicas de lectura. |
| SEC-02 | Sin análisis automatizado de seguridad | Dependabot, CodeQL, gitleaks y `npm audit` bloqueante en CI; permisos mínimos y acciones fijadas por SHA. |
| SEC-05 | `/api/ingest/tmdb` sin protección contra fuerza bruta, comparación de clave no constante y `error.message` en el 500 | Comparación con `safeEqual` (`timingSafeEqual`, compartida con moderación), rate limit sobre intentos **fallidos** (10 cada 5 min por IP) para no bloquear la ingesta legítima, 503 genérico si falta la clave y 500 sin detalle interno. Riesgos residuales: el límite depende de SEC-03 y el secreto `dev-ingest-secret` sigue activo solo con `next dev` (aceptado: nunca se ejecuta en Vercel y lo usa el script local). |
| SEC-03 | El limitador de tasa vivía en memoria de cada instancia (inútil en serverless) y todos los clientes sin `x-forwarded-for` compartían un bucket | `rateLimit.js` pasa a fábrica con almacén intercambiable: Upstash Redis (contador `INCR` + `PEXPIRE NX` por REST, sin dependencias) cuando hay `UPSTASH_REDIS_REST_*` o `KV_REST_API_*`, y memoria en desarrollo. Si Redis falla o tarda más de 1,5 s se degrada a memoria y se registra el aviso (prioriza disponibilidad). Añadido `x-real-ip` como respaldo. Un test escanea `src` para que ninguna llamada omita `await`. **Pendiente de despliegue:** crear la base Redis y definir las variables; hasta entonces sigue en memoria. |
| SEC-04 | `/api/ai/search` sin validación de entrada, sin `timeout` y con salida del modelo sin normalizar | `query` debe ser texto de 1 a 300 caracteres (el input del cliente comparte el límite), `timeout` de 15 s y `max_tokens` de 400 en DeepSeek, y la respuesta del modelo se trata como entrada no confiable: JSON inválido → 502, tipos y longitudes normalizados, `type` restringido a `movie`/`series`. Riesgo residual: la ruta sigue sin exigir sesión. |
| SEC-07 | Los tokens de Firebase no se comprobaban contra revocación: un usuario deshabilitado conservaba acceso ~1 h | `verifyBearerUid(header, { checkRevoked })`. Se activa en moderación, `auth/admin` y en el envío de mensajes del chat (rutas de escritura y administración); las lecturas no pagan la llamada de red extra. `auth/id-token-revoked` y `auth/user-disabled` devuelven «tu sesión ya no es válida». |
| SEC-08 | `/api/health/db` público, sin límite y con una consulta real a Neon en cada petición | Rate limit de 30/min por IP y caché de 30 s (5 s si falla) con el `createTtlCache` existente, más `Cache-Control: no-store`. Se mantiene el campo `catalog` porque el README lo documenta. |
| SEC-12 | `typescript.ignoreBuildErrors: true` ocultaba errores de tipos en el build | Eliminado. La web no contiene ficheros TypeScript, así que no cambia el resultado, pero un futuro `.ts` ya no fallará en silencio. |
| SEC-13 | `images.remotePatterns` con `hostname: '**'` | Sustituido por una lista cerrada en `src/config/imageHosts.mjs` (`image.tmdb.org`, `static.tvmaze.com`, `cdn.cafecito.app`) con tests. Hoy las imágenes van `unoptimized`, por lo que el comodín no estaba activo, pero habría abierto un proxy de imágenes si se activaba el optimizador. La CSP mantiene `img-src https:` porque el catálogo antiguo puede contener otros dominios. |
| SEC-06 | Los errores de autenticación filtraban nombres de variables, ids de proyecto y rutas de docs | `formatVerifyAuthError` devuelve un mensaje genérico para errores de configuración; el detalle solo se registra en el servidor. |

## Hallazgos abiertos

### Media

**SEC-09 — `/api/auth/limit` da falsa sensación de protección**
`src/features/auth/components/AuthModal.js:54` la llama desde el cliente antes de `signInWithEmailAndPassword`. Un atacante llama directamente a Firebase Auth y se salta ese control. El límite real de fuerza bruta lo aporta Firebase, no esta ruta.
*Recomendación:* no presentarla como control de seguridad; activar Firebase App Check y, si se necesita, Identity Platform con protección de enumeración.

**SEC-10 — Dependencias con 7 avisos moderados pendientes**
Vienen de `firebase-admin` 13 → salto mayor a 14.5.0 (Dependabot PR #9). Requiere probar `verifyIdToken` y Firestore Admin antes de fusionar.

### Baja

**SEC-11 — Sin CSP estricta con nonces.** `script-src` mantiene `'unsafe-inline'`. Quitarlo exige nonces por petición y render dinámico. Riesgo aceptado por ahora.

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

1. ~~SEC-05 y SEC-06~~ (hecho).
2. ~~SEC-04~~ y ~~SEC-03~~ (hecho en código; falta provisionar Redis).
3. ~~SEC-07 y SEC-08~~ (hecho).
4. SEC-10 (`firebase-admin` 14) con pruebas.
5. ~~SEC-12 y SEC-13~~ (hecho). Resto de bajas: SEC-11, SEC-14 y SEC-15.
