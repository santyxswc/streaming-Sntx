# Moderación del chat (feed global)

Vista y API para ver **todos los mensajes** de la plataforma (todas las salas / `media_id`), útil para supervisión.

## Configuración (servidor)

Define **al menos una** de estas opciones:

| Variable | Uso |
|----------|-----|
| `CHAT_ADMIN_UIDS` | UIDs de Firebase separados por coma. Quien inicie sesión con uno de esos usuarios puede abrir la UI en `/admin/chat-moderacion` (el navegador envía el ID token). |
| `CHAT_MODERATION_SECRET` | Secreto largo y aleatorio. Envíalo en la cabecera `X-Moderation-Secret` (scripts, cron, integraciones). Si lo configuras y envías un valor incorrecto en esa cabecera, la petición será rechazada. |

Si no configuras ninguna, el endpoint responde `503` con un mensaje de configuración pendiente.

## UI

- Ruta: **`/admin/chat-moderacion`**
- Requiere sesión Firebase y UID listado en `CHAT_ADMIN_UIDS`.
- **Acceso:** con sesión iniciada, si tu UID está en `CHAT_ADMIN_UIDS` verás **«Moderación chat»** (icono escudo) en el menú desplegable del avatar (navbar) y en el menú móvil.
- Filtro opcional por `mediaId` (slug del contenido).
- `robots: noindex` en la página.

`GET /api/auth/admin` (con `Authorization: Bearer <ID token>`) devuelve `{ data: { admin: true|false } }` para mostrar u ocultar ese enlace sin exponer UIDs en el cliente.

## API

`GET /api/chat/moderation/messages`

**Autenticación (una de):**

- `Authorization: Bearer <Firebase ID token>` y UID en `CHAT_ADMIN_UIDS`
- `X-Moderation-Secret: <mismo valor que CHAT_MODERATION_SECRET>`

**Query:**

| Parámetro | Descripción |
|-----------|-------------|
| `limit` | 1–100 (por defecto 50) |
| `beforeId` | UUID del último mensaje de la página anterior (paginación hacia mensajes más antiguos) |
| `afterId` | UUID del mensaje **más reciente** que ya tienes: devuelve solo mensajes **más nuevos** (para tiempo real; no combinar con `beforeId`) |
| `mediaId` | Opcional: solo mensajes de esa sala |

**Respuesta:** `{ success, data: { messages, nextBeforeId } }` (`nextBeforeId` es `null` en respuestas solo con `afterId`).

La UI `/admin/chat-moderacion` hace polling (~2,5 s) con `afterId` y pausa si la pestaña está en segundo plano.

Solo disponible con **`CHAT_PROVIDER=neon`** (Postgres).
