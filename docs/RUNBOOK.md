# Runbook de operación e incidentes — streaming-Sntx

Guía para actuar cuando algo falla o se sospecha un problema de seguridad. Está pensada para
**una sola persona** operando el proyecto, así que prioriza pasos cortos y comprobables.

- **Modelo de amenazas:** [THREAT_MODEL.md](THREAT_MODEL.md) explica qué se protege y de quién.
- **Hallazgos de seguridad:** [security-audit.md](security-audit.md).
- **Notificar una vulnerabilidad:** [SECURITY.md](../SECURITY.md) (avisos privados de GitHub).

> **Regla de oro:** primero **contener** (cortar el daño), después **investigar**, después **arreglar**.
> Si dudas entre rotar un secreto o esperar a estar seguro, rota.

## 1. Dónde vive cada cosa

| Pieza | Dónde | Notas |
|---|---|---|
| Web y API | Vercel, proyecto `streaming-sntx` (equipo `Sntx`, plan Hobby) | Producción: `streaming-sntx.vercel.app` |
| Base de datos | Neon (Postgres) | Catálogo, chat, perfiles de chat y vistas |
| Sesiones y favoritos | Firebase: Auth y Firestore | El servidor usa el Admin SDK |
| Contadores de rate limit | Upstash Redis `upstash-kv-purple-curtain`, conectado desde Vercel | Prefijo de variables: `KV_` |
| Código, CI, alertas | GitHub `santyxswc/streaming-Sntx` | Actions, Dependabot, Security |
| Búsqueda con IA | DeepSeek | **Sin clave en producción hoy** |
| Datos de títulos | TMDB, TVmaze, OMDb | |
| Moderación de chat | `/admin/chat-moderacion` | **Sin configurar en producción hoy** (faltan `CHAT_ADMIN_UIDS` y `CHAT_MODERATION_SECRET`) |

Las variables de entorno de producción se gestionan en **Vercel → proyecto → Settings → Environment
Variables**. Los cambios solo llegan a los **despliegues nuevos**: después de tocar una variable hay que
redesplegar.

## 2. Severidad

| Nivel | Cuándo | Objetivo |
|---|---|---|
| **SEV-1** | Secreto expuesto o sospecha de acceso no autorizado; datos de usuarios comprometidos; sitio caído | Contener el mismo día |
| **SEV-2** | Función principal degradada (chat, login, catálogo) o abuso activo que consume cuota | En 24 h |
| **SEV-3** | Fallo menor, aviso del CI, vulnerabilidad sin explotación conocida | En la siguiente iteración |

## 3. Comprobación de estado

```bash
curl -s https://streaming-sntx.vercel.app/api/health
# {"ok":true}                                     → el servidor responde

curl -s https://streaming-sntx.vercel.app/api/health/db
# {"ok":true,"catalog":"neon","db":"connected"}   → Postgres accesible
# {"ok":false,"error":"database_connect_failed"}  → mira el playbook 3
# 429                                             → límite de 30/min por IP, espera

curl -s -o /dev/null -w "%{http_code}\n" https://streaming-sntx.vercel.app/api/feed/home
# 200
```

`/api/health/db` guarda su resultado 30 s (5 s si falló), así que tras arreglar la base de datos puede
tardar unos segundos en reflejarlo.

**Logs:** Vercel → proyecto → **Logs**. El servidor escribe **una línea JSON por evento**
(`src/server/observability/logger.js`): `{"ts","level","event",…}`, más `route` y `requestId` cuando
el evento ocurre dentro de una petición. Se busca por nombre de evento (`event:health_db.connect_failed`)
o por ruta, y el `requestId` es el `x-vercel-id` de la petición. Los textos se sanean y se redactan
claves, tokens, cadenas de conexión y correos; no se registran datos personales ni el texto de las
búsquedas. Filtra por nivel `error` o `warn` para ver solo lo que requiere atención.
**En el plan Hobby la retención de logs es corta** (del orden de una hora; compruébalo en tu panel):
copia el texto relevante al empezar el incidente o se perderá.

**Monitor y alertas.** El workflow `Disponibilidad` (`.github/workflows/uptime.yml`) comprueba
producción con una programación de 15 minutos desde GitHub (GitHub puede retrasar u omitir los disparos programados cuando hay carga; el intervalo real no está garantizado) y **abre una incidencia con la etiqueta `uptime`** si
algo falla (GitHub te avisa por correo); la cierra cuando se recupera. No depende de los logs.
`scripts/uptime-check.sh` hace lo mismo a mano. `scripts/error-budget.sh` calcula la disponibilidad
de los últimos 30 días frente al objetivo de **99,5 %** (≈ 3,6 h de caída al mes) y cuánto
presupuesto de errores queda. Si se agota, prioriza estabilidad sobre funcionalidades nuevas.
Rendimiento real de los usuarios (Core Web Vitals): Vercel → proyecto → **Speed Insights**.

## 4. Verificación tras un despliegue o una recuperación

Los puntos 1, 5 y 6 y las cabeceras de seguridad se comprueban solos con `scripts/verify-deploy.sh` (lo ejecuta `post-deploy.yml`
tras cada despliegue a producción; ver [DELIVERY.md](DELIVERY.md)). Los demás siguen siendo manuales:

1. `/api/health` y `/api/health/db` responden bien (sección 3).
2. La portada carga filas con pósters y un tráiler se reproduce.
3. Iniciar sesión funciona, y «Mi lista» muestra los favoritos.
4. Enviar un mensaje en el chat de un título devuelve el mensaje en la conversación.
5. Consola del navegador (F12): sin errores de `Content Security Policy` (el único error esperado
   en local es `/_vercel/insights/script.js`, que solo existe en Vercel).
6. En **Actions**, el último CI de `main` está en verde.

## 5. Playbooks

### Playbook 1 — Despliegue defectuoso (rollback)

**Síntomas:** errores 500 tras un push, página en blanco, chat o login rotos.

1. **Contener:** en Vercel → **Deployments**, localiza el último despliegue de producción que
   funcionaba → menú **⋯** → **Instant Rollback** (o *Promote to Production*). En el plan Hobby puede
   limitarse al despliegue inmediatamente anterior.
2. Si esa opción no está disponible, revierte el cambio en Git y sube:
   ```bash
   git revert <sha-del-commit-malo>
   git push
   ```
3. Verifica con la sección 4.
4. **Investigar:** reproduce el fallo en local (`npm run build && npm start`), corrígelo con un test que
   lo detecte y súbelo por la vía normal.

### Playbook 2 — Secreto expuesto

**Cuándo:** alerta del job **Secret scan** (gitleaks), una clave pegada en un chat, issue o captura, o
un `.env` subido por error.

0. **Prevención ya activa:** *Secret scanning* y *Push protection* del repositorio bloquean el push que contiene un secreto conocido antes de que llegue al historial. Si un push se rechaza por esto, **no lo saltes**: rota ese secreto (paso 1) aunque no haya llegado a subirse.
1. **Contener, sin esperar a investigar:** rota el secreto (tabla de la sección 6). Un secreto que
   estuvo público debe darse por comprometido aunque se borre el commit.
2. Actualiza el valor en Vercel y **redespliega**.
3. **Revisar uso indebido:** panel del proveedor (accesos, consumo, consultas inusuales); en Firebase,
   la actividad de la cuenta de servicio; en Neon, la lista de conexiones.
4. **Limpiar el historial** solo si el secreto sigue visible: reescribir el historial no invalida nada por
   sí mismo, es un complemento a la rotación. Confirma que gitleaks pasa después.
5. Anota qué se expuso, durante cuánto tiempo y qué se rotó (sección 8).

### Playbook 3 — Base de datos caída o lenta

**Síntomas:** `/api/health/db` devuelve 503; el catálogo o el chat no cargan.

1. Consola de **Neon**: ¿el proyecto está activo o suspendido? En planes gratuitos el cómputo se
   suspende por inactividad y la primera petición tarda más; suele bastar reintentar.
2. Comprueba el **estado del servicio de Neon** y los límites de tu plan (almacenamiento, horas de
   cómputo, conexiones).
3. Si `DATABASE_URL` cambió (rotación) o falta, corrígela en Vercel y redespliega.
4. Los logs mostrarán el evento `health_db.connect_failed` con el detalle del error; el cliente nunca lo ve.
5. **Si se perdieron datos:** ver la sección 7 (copias de seguridad).

### Playbook 4 — Firebase Auth o Firestore degradado

**Síntomas:** no se puede iniciar sesión; el chat responde «Servicio de autenticación no
disponible»; «Mi lista» no sincroniza.

1. Revisa el **estado de los servicios de Firebase/Google Cloud** y la consola del proyecto.
2. «Servicio de autenticación no disponible» es un error de **configuración del servidor**: el detalle
   está en los logs (evento `auth.token_rejected`, con el código de error de Firebase en `code`). Causas habituales: `FIREBASE_SERVICE_ACCOUNT_BASE64` ausente o
   mal formada, o el proyecto de la cuenta de servicio no coincide con `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
   Guía: [FIREBASE_SERVICE_ACCOUNT.md](FIREBASE_SERVICE_ACCOUNT.md).
3. Si «Mi lista» falla solo al guardar, revisa las reglas de Firestore publicadas (los clientes solo
   escriben en `users/{uid}/userData/watchlist`, con `items` de hasta 500 elementos).

### Playbook 5 — Almacén del rate limit caído (Upstash)

**Síntomas:** en los logs aparece el evento `ratelimit.store_unavailable` (nivel `warn`).

- **Efecto:** el servicio sigue funcionando. Los límites pasan a contarse **por instancia** y se reinician
  en cada arranque en frío, es decir, protegen bastante menos.
- **Acción:** revisa la base de Upstash y sus límites. Si el aviso es permanente, comprueba que
  `KV_REST_API_URL` y `KV_REST_API_TOKEN` siguen definidas en Vercel. Mientras dure, vigila el consumo
  de terceros (playbook 7).

### Playbook 6 — Chat abusivo o spam

**Detectar:** el panel `/admin/chat-moderacion` **solo lista** mensajes (no borra ni bloquea) y
**hoy no está configurado en producción**. Para activarlo:

1. En Firebase → Authentication → Users, copia tu **UID**.
2. En Vercel añade `CHAT_ADMIN_UIDS=<tu-uid>` (varios UIDs separados por coma) y redespliega.
3. Inicia sesión y abre `/admin/chat-moderacion`. Detalles: [CHAT_MODERATION.md](CHAT_MODERATION.md).

**Actuar** (no hay API para ello; se hace a mano):

1. **Bloquear al autor:** Firebase → Authentication → Users → **⋯ → Disable account**. El envío de
   mensajes comprueba revocación, así que queda rechazado de inmediato. Editar su apodo puede seguir
   funcionando hasta que caduque su token (~1 h).
2. **Borrar mensajes:** en el editor SQL de Neon. Empieza siempre por un `SELECT` y usa una transacción:
   ```sql
   -- ver lo que vas a borrar
   SELECT id, media_id, created_at, left(body, 80) AS texto
   FROM chat_messages WHERE author_uid = '<UID>' ORDER BY created_at DESC LIMIT 50;

   BEGIN;
   DELETE FROM chat_messages WHERE author_uid = '<UID>';   -- o: WHERE id = '<UUID-del-mensaje>'
   -- comprueba el número de filas afectadas y entonces:
   COMMIT;                                                 -- o ROLLBACK; si algo no cuadra
   ```
3. Si el ataque es masivo y desde varias cuentas, reduce temporalmente los límites del chat en el código
   (`src/app/api/chat/messages/route.js`) y despliega, o usa reglas del **Vercel Firewall**.

### Playbook 7 — Abuso de coste (IA o ingesta)

**Buscador con IA.** Hoy `DEEPSEEK_API_KEY` no está en producción, así que no hay gasto. Si la activas y
ves consumo anómalo:

1. **Interruptor de emergencia:** elimina `DEEPSEEK_API_KEY` en Vercel y redespliega. La ruta responde
   «El asistente IA no está disponible» sin llamar a DeepSeek.
2. Revoca la clave en el panel de DeepSeek si sospechas que se filtró (playbook 2).
3. Endurece antes de reactivar: exigir sesión de Firebase, bajar el límite de 5/min o añadir un tope
   diario.

**Ingesta.** `POST /api/ingest/tmdb` escribe en el catálogo.

1. **Interruptor de emergencia:** elimina `INGEST_SECRET_KEY` en Vercel y redespliega. La ruta responde
   503 hasta que vuelva a definirse.
2. Si hubo intentos: 401 repetidos y 429 en los logs indican fuerza bruta contra la clave. Rota la clave
   (sección 6) y valora retirar la ruta del despliegue público.

### Playbook 8 — Vulnerabilidad crítica en una dependencia

**Cuándo:** el paso `npm audit` del CI falla, o llega una alerta de Dependabot.

1. Consulta el aviso: paquete, versión corregida, y si tu código usa la función afectada.
2. `npm audit fix` para la corrección sin cambio mayor; si exige un salto mayor, sigue el patrón de
   SEC-10: lee las notas de la versión, prueba **contra el servicio real** (los tests con mocks no
   detectan un cambio de API) y ejecuta `npm test`, `npm run lint` y `npm run build`.
3. Sube por la vía normal y verifica con la sección 4.

### Playbook 9 — Fallo del CI

| Job o paso | Qué significa | Acción |
|---|---|---|
| **Secret scan** (gitleaks) | Posible secreto en el código o el historial | Playbook 2 |
| `npm audit` | Vulnerabilidad alta o crítica en producción | Playbook 8 |
| **Docker → Trivy (puerta)** | Vulnerabilidad **CRITICAL con corrección** en la imagen | Actualiza el paquete o la imagen base; Dependabot propone nuevos digests |
| **Docker → Trivy (informe)** | Solo informa: HIGH/CRITICAL con corrección, no bloquea | Revisa la tabla del resumen del job |
| **Docker → Trivy «no pudo completar el escaneo»** | Fallo del escáner (p. ej. no descargó su base de datos) | Solo avisa; reintenta el job |
| **Docker → Prueba de arranque** | La imagen no llega a `healthy` | Lee `docker logs` en la salida del job |
| **Reglas de Firestore** | Un cambio en las reglas rompe un caso permitido o abre uno prohibido | Corrige `firestore.rules` o el test |
| **CodeQL** | Patrón inseguro detectado | Pestaña Security → Code scanning |

### Playbook 10 — Caída de un tercero

| Servicio | Efecto | Acción |
|---|---|---|
| TMDB / TVmaze / OMDb | Los tráilers y fichas nuevos tardan o fallan; lo ya guardado en Neon sigue disponible | Esperar; no hay acción de código |
| YouTube | Los tráilers no se reproducen | Esperar; el resto de la web funciona |
| DeepSeek | La búsqueda con IA falla | Mensaje genérico al usuario; ver playbook 7 |
| Upstash | Rate limit degradado | Playbook 5 |

### Playbook 11 — Solicitud de borrado de datos de una persona

1. **Firebase Auth:** Authentication → Users → **⋯ → Delete account**. Anota el `uid` antes.
2. **Firestore:** borra el documento `users/<uid>/userData/watchlist` desde la consola.
3. **Neon** (`media_views` no guarda identificadores de usuario y no hace falta tocarla):
   ```sql
   BEGIN;
   DELETE FROM chat_messages      WHERE author_uid = '<UID>';
   DELETE FROM chat_user_profiles WHERE uid        = '<UID>';
   COMMIT;
   ```
4. Los logs de Vercel caducan solos por su retención corta.
5. Responde a la persona confirmando qué se borró y cuándo.

## 6. Rotación de secretos

Después de **cada** rotación: actualizar el valor en Vercel, **redesplegar** y verificar (sección 4).

| Secreto | Cómo generar uno nuevo | Efecto al rotar | Verificar |
|---|---|---|---|
| `DATABASE_URL` | Neon → tu proyecto → **Roles** → restablecer contraseña del rol (o crear otro) y copiar la nueva cadena de conexión | Las conexiones antiguas fallan hasta redesplegar | `/api/health/db` |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Firebase → Configuración del proyecto → **Cuentas de servicio** → *Generar nueva clave privada*; convertir con `base64 -w0 clave.json`. **Después borra la clave antigua** en Google Cloud → IAM → Cuentas de servicio → Claves. Guía: [FIREBASE_SERVICE_ACCOUNT.md](FIREBASE_SERVICE_ACCOUNT.md) | Sin redespliegue, el chat y la moderación fallan | Enviar un mensaje en el chat |
| `INGEST_SECRET_KEY` | `openssl rand -hex 32` | El script de ingesta local necesita el mismo valor en tu `.env` | Petición sin clave → 401 |
| `CHAT_MODERATION_SECRET` | `openssl rand -hex 32` | Los scripts que la usen deben actualizarse | Petición con la clave vieja → 401 |
| `CHAT_ADMIN_UIDS` | No es un secreto: lista de UIDs autorizados | Quitar un UID retira el acceso | `/api/auth/admin` con esa cuenta → `admin:false` |
| `TMDB_API_KEY` | Tu cuenta de TMDB → Ajustes → API | Sin ella los tráilers nuevos no se resuelven | Abrir un título sin tráiler guardado |
| `DEEPSEEK_API_KEY` | Panel de DeepSeek → API keys (crea la nueva y borra la antigua) | La IA cae hasta redesplegar | Una búsqueda con IA |
| `OMDB_API_KEY` | Nueva clave desde el sitio de OMDb | Fichas complementarias | Abrir un detalle |
| `KV_REST_API_TOKEN` / `KV_REST_API_URL` | Panel de Upstash de la base. Al estar gestionadas por la integración de Vercel, comprueba después que la variable de Vercel coincide | Si no coinciden, el limitador degrada a memoria (playbook 5) | Logs sin el evento `ratelimit.store_unavailable` |
| `NEXT_PUBLIC_*` | **No son secretos** (van en el JavaScript del navegador) | — | — |
| Tokens personales de GitHub (`gh`) | GitHub → Settings → Developer settings | Solo afecta a tu terminal | `gh auth status` |

Tras rotar un secreto en producción, actualiza también tu `.env` local si lo usas.

## 7. Copias de seguridad y recuperación

| Dato | ¿Reproducible? | Cómo se recupera |
|---|---|---|
| Catálogo (`media`, `catalog_metadata`) | **Sí** | `npm run migrate:neon` (esquema) y los scripts de ingesta (`npm run ingest:tmdb…`, `npm run ingest:tvmaze`) |
| Chat (`chat_messages`), perfiles (`chat_user_profiles`) | **No** | Solo desde una copia de seguridad |
| Vistas (`media_views`) | No (es una métrica) | Se puede perder sin gran daño |
| Favoritos (Firestore) | No | Exportación de Firestore desde Google Cloud |
| Cuentas (Firebase Auth) | No | Exportación de usuarios de Firebase |

**Estado actual:** hay un script de copia manual, pero ninguna copia automática. Acciones recomendadas:

1. Comprueba en Neon la **ventana de restauración a un punto en el tiempo** que incluye tu plan y cómo
   se usa (ramas de restauración).
2. Copia manual periódica de lo no reproducible con `scripts/backup-chat.sh`:
   ```bash
   scripts/backup-chat.sh        # genera backups/chat-AAAAMMDD-HHMM.sql.gz
   ```
   Usa `pg_dump` o, si no está instalado, un contenedor de Docker con el cliente de la misma versión que el
   servidor de Neon (`PG_IMAGE`, hoy `postgres:18-alpine`). Solo lee, valida el archivo y borra el parcial si falla.
   Guarda el resultado **fuera del repositorio** y cifrado: contiene mensajes y `uid`. No lo subas a un
   artefacto de GitHub: en un repositorio público sería visible.
3. Prueba una restauración al menos una vez, en una base distinta: una copia que nunca se restauró no
   está verificada.

## 8. Después del incidente

Escribe una nota breve (sin culpas, en `docs/incidents/AAAA-MM-DD-titulo.md` si quieres conservarla) con:

- **Qué pasó** y cómo se detectó.
- **Cronología:** inicio, detección, contención, resolución.
- **Impacto:** usuarios o datos afectados, coste.
- **Causa raíz** y qué falló en los controles.
- **Acciones:** qué se corrige, con responsable y fecha.

Después, actualiza [THREAT_MODEL.md](THREAT_MODEL.md) si el incidente reveló una amenaza no recogida, y
añade a este runbook cualquier paso que hubieras echado en falta.

## 9. Interruptores de emergencia

| Quiero detener… | Acción | Reversible |
|---|---|---|
| El gasto de la IA | Eliminar `DEEPSEEK_API_KEY` en Vercel y redesplegar | Sí |
| La ingesta al catálogo | Eliminar `INGEST_SECRET_KEY` y redesplegar (responde 503) | Sí |
| A un usuario concreto en el chat | Deshabilitar su cuenta en Firebase | Sí |
| Un despliegue defectuoso | *Instant Rollback* en Vercel (playbook 1) | Sí |
| Tráfico abusivo desde un origen | Regla de IP en el **Vercel Firewall** | Sí |
