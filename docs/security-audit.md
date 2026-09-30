# Auditoría de seguridad — streaming-Sntx

- **Fecha:** 2026-09-29
- **Alcance:** rutas de `src/app/api/*`, módulos de `src/server/*` que usan, `firestore.rules`, cabeceras HTTP, dependencias y CI.
- **Método:** revisión manual del código, `npm audit`, pruebas de cabeceras y CORS contra un build de producción.
- **No cubierto todavía:** despliegue real en Vercel (WAF, variables de entorno por entorno), pruebas dinámicas (ZAP) y el código de `desktop/src-tauri` más allá de su configuración y permisos.

## Resumen

| Severidad | Cantidad |
|---|---|
| Alta | 0 |
| Media | 0 |
| Baja | 3 |

Ya corregido durante la auditoría: dependencias críticas y altas (SEC-00), cabeceras/CSP/CORS (SEC-01), pipeline de seguridad en CI (SEC-02), protección de la ruta de ingesta (SEC-05), fugas de configuración en errores de autenticación (SEC-06), limitador de tasa compartido (SEC-03), abuso de coste del buscador con IA (SEC-04), revocación de tokens (SEC-07), sondeo de la base de datos (SEC-08), errores de tipos ocultos en el build (SEC-12), proxy de imágenes abierto latente (SEC-13) avisos pendientes de `firebase-admin` (SEC-10), espacio de usuario sin límites en Firestore (SEC-14), protecciones del repositorio (SEC-17) y las 9 alertas de CodeQL (SEC-18).

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
| SEC-10 | 7 avisos moderados de dependencias que colgaban de `firebase-admin` 13 | Migrado a `firebase-admin` 14.5.0 y `npm audit fix` para el `uuid` transitivo: **0 vulnerabilidades** en producción. La v14 elimina el espacio de nombres antiguo (`admin.auth()`, `admin.firestore()`, `admin.apps`…), lo que habría roto el chat, la moderación y el catálogo de Firestore en cada petición: el CI no lo detectaba porque nunca ejecuta esa parte y los tests simulaban la API antigua. Se migró a las importaciones modulares (`firebase-admin/app`, `/auth`, `/firestore`), se normaliza el código de error de Auth (con o sin prefijo `auth/`) y se añadió `firebaseAdminSdk.test.js`, que ejecuta el SDK real sin mocks; se comprobó que falla 4 de 4 con el código antiguo. Requiere Node ≥ 22. |
| SEC-14 | `users/{userId}/**` permitía a cada usuario crear cualquier documento o subcolección, con cualquier contenido y tamaño | Las reglas aceptan solo `users/{uid}/userData/watchlist` (lo único que escriben web y escritorio), con `items` como lista de hasta 500 elementos y sin otros campos al crear. En actualizaciones se valida qué campos cambian, no cuáles existen, para no romper documentos antiguos. 19 tests con el emulador (`npm run test:rules`, también en el CI): con las reglas antiguas fallan 9. **Pendiente de despliegue:** las reglas del repositorio no se publican solas (`firebase deploy --only firestore:rules` o pegarlas en la consola). |
| SEC-17 | `main` sin protección y sin secret scanning, push protection ni Dependabot alerts (verificado con la API de GitHub el 2026-09-30) | Activados y verificados con la API: ruleset `Proteger Main` activo sobre la rama por defecto (bloquea borrado y *force push*), Dependabot alerts y security updates, secret scanning, push protection y reporte privado de vulnerabilidades (el canal que promete `SECURITY.md` no existía hasta ahora). No se exige PR ni CI en verde para fusionar: es decisión de flujo de trabajo. Opcionales sin activar: *non-provider patterns* y *validity checks*. |
| SEC-18 | 9 alertas de CodeQL en la primera ejecución del análisis (4 *high*, 5 *medium*): inyección en logs y cadena de formato con texto del usuario (`multi-search`, `ingest/tmdb`), `stripHtml` que deja etiquetas si se anidan, regex sin ancla `tvmaze\.com`, y una lectura de archivo enviada por HTTP | `src/lib/text.mjs` con `sanitizeForLog` (sin saltos de línea ni caracteres de control, longitud acotada), `stripHtml` que repite la pasada hasta estabilizarse y `isTvmazeUrl` con el dominio anclado; los logs usan una cadena de formato constante con los valores como argumentos. De paso, `ingest/tmdb` ahora valida `page` y `maxPages` como enteros positivos (antes llegaban sin comprobar el tipo). 33 tests nuevos. La alerta `js/file-access-to-http` de `scripts/ingest-tvmaze.mjs` es un falso positivo (el script lee su archivo de progreso local y consulta una URL fija): se descarta en GitHub con justificación en lugar de suprimirla en el código. |
| SEC-06 | Los errores de autenticación filtraban nombres de variables, ids de proyecto y rutas de docs | `formatVerifyAuthError` devuelve un mensaje genérico para errores de configuración; el detalle solo se registra en el servidor. |
| SEC-09 | `/api/auth/limit` da falsa sensación de protección: quien llama directo a Firebase Auth se salta el límite y las reglas de contraseña del formulario | Aplicado en la consola de Firebase el 2026-09-30: política de contraseñas en modo *Exigir* (8 caracteres, mayúscula y número) y protección contra enumeración de correos. Dominios autorizados revisados: solo los predeterminados del proyecto. Verificado llamando a la API de Identity Toolkit sin pasar por el formulario: el registro con `abc` se rechaza con `PASSWORD_DOES_NOT_MEET_REQUIREMENTS` y el login con correo inexistente y con contraseña errónea devuelve el mismo `INVALID_LOGIN_CREDENTIALS`. No se usa App Check obligatorio porque la app de escritorio no puede obtener tokens de reCAPTCHA desde `tauri://localhost`. Pasos en [FIREBASE_AUTH_HARDENING.md](FIREBASE_AUTH_HARDENING.md). |

## Hallazgos abiertos

### Media

Ninguno abierto.

### Baja

**SEC-11 — Sin CSP estricta con nonces.** `script-src` mantiene `'unsafe-inline'`. Quitarlo exige nonces por petición y render dinámico. Riesgo aceptado por ahora.

**SEC-16 — El cliente de escritorio no define una CSP.** `desktop/src-tauri/tauri.conf.json` tiene `"csp": null`. El alcance de un XSS en el webview es limitado: solo se expone el comando de ejemplo `greet`, y los permisos son `core:default` y `opener:default` (sin sistema de archivos ni shell), pero falta la defensa en profundidad que sí tiene la web. Revisado solo en configuración y permisos; el resto de `src-tauri` no se auditó.
*Recomendación:* definir una CSP equivalente a la de la web (`default-src 'self'`; `connect-src` para la URL de la API y Firebase; `frame-src` para `youtube-nocookie.com`; `img-src https: data:`) y **probarla ejecutando la app** antes de publicarla.

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
4. ~~SEC-10~~ (hecho).
5. ~~SEC-12, SEC-13 y SEC-14~~ (hecho; falta publicar las reglas). Resto de bajas: SEC-11, SEC-15 y SEC-16.
