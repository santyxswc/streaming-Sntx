# Hoja de ruta: mejoras pendientes

Lo que queda por hacer para seguir mejorando el proyecto. El trabajo de DevSecOps de 2026-09-30 dejó
la seguridad, la entrega y la observabilidad en buen estado (ver [security-audit.md](security-audit.md)
y [DELIVERY.md](DELIVERY.md)); esto es lo que **falta o se dejó a propósito para después**, con el motivo,
qué hacer y cómo saber que está hecho.

Cada punto tiene un identificador `M-NN` para poder referirse a él en commits e incidencias.
**Esfuerzo:** S = unas horas · M = uno o dos días · L = varios días.

## Estado de partida (2026-09-30)

| Medida | Valor |
|---|---|
| Cobertura de pruebas (lógica de servidor) | ~32 % de sentencias; suelo en `vitest.config.mjs` (31/22/31/33) |
| Rutas de API sin ninguna prueba unitaria que las importe | 15 de 19 |
| Cobertura por archivo | `neonCatalog` 4,7 % · `tmdbCatalog` 17,5 % · `tmdb` 17,4 % · `neonChat` y `firestoreChat` 0 % |
| Hallazgos de seguridad abiertos | SEC-11 y SEC-19, ambos aceptados |
| Avisos de lint | 4 (todos en `ListingClient.js`) |

## Resumen por prioridad

| ID | Mejora | Por qué importa | Esfuerzo |
|---|---|---|---|
| **Alta** | | | |
| M-01 | Pruebas de los proveedores de catálogo y de las rutas sin cubrir | Es donde vive la mayor parte del riesgo y hoy casi no hay red de seguridad | L |
| M-02 | Compilar el código Rust en el CI del escritorio | Un PR que no compila llegó a salir con el CI en verde | M |
| M-03 | Pruebas automáticas de la app de escritorio | Los dos fallos de hoy (Error 153 y favoritos) los habría detectado una prueba | M |
| M-04 | Monitor externo de disponibilidad | Los disparos programados de GitHub no están garantizados | S |
| M-05 | Copias de seguridad automáticas | Hoy son manuales y la restauración de Neon cubre solo 6 horas | M |
| M-06 | Derechos de las personas: borrar cuenta y exportar datos | Hoy se atienden a mano; el chat no caduca | M–L |
| **Media** | | | |
| M-07 | Quitar `fonts.googleapis.com` de la CSP | Las fuentes ya son propias: un permiso que sobra | S |
| M-08 | `requestId` en todas las rutas y retención de logs | Solo las rutas con `withApiHandler` lo llevan; los logs duran ~1 h | M |
| M-09 | Exigir PR y CI en `main` | Decisión pospuesta; relevante cuando haya más personas | S |
| M-10 | CSP sin `unsafe-inline` (SEC-11) | Última defensa fuerte contra XSS | L |
| M-11 | Restringir la clave de API de Firebase a 3 servicios | Paso opcional de la guía de endurecimiento; no consta aplicado | S |
| M-12 | Scorecard, atestaciones de GitHub y política de licencias | Cierra el círculo de la cadena de suministro | S–M |
| M-13 | Empaquetar y distribuir la app de escritorio | Hoy solo se compila a mano | L |
| M-14 | Accesibilidad | Los formularios no asocian etiquetas y campos | M |
| M-15 | Presupuestos de rendimiento | Vite avisa de un bloque de 1 MB en el escritorio | M |
| **Baja / ideas** | | | |
| M-16 | Decidir si el sitio debe indexarse | Hoy lleva `noindex` en todo | S |
| M-17 | Deuda técnica menor | Lint, versión local de Node, registros de decisiones | S |
| M-18 | Resiliencia ante TMDB y OMDb | Reintentos y caché obsoleta ante un proveedor caído | M |

## Alta prioridad

### M-01 · Pruebas de proveedores de catálogo y rutas de API
- **Por qué:** `neonCatalog.js` (el proveedor de producción) está al 4,7 %, `neonChat` y `firestoreChat` al 0 %, y 15 de
  las 19 rutas de `src/app/api` no las importa ninguna prueba unitaria (chat, moderación, `auth/*`, `media/*`). Lo que sí está
  bien cubierto es la infraestructura (`rateLimit`, `apiHandler`, `logger`, `feedService`, todos > 90 %).
- **Qué hacer:** (1) un servicio `postgres` en el job web del CI con las migraciones de `db/migrations/` y pruebas de
  contrato reales de `neonCatalog` y `neonChat`; (2) `fetch` simulado para `tmdbCatalog`, `tmdb` y `tvmaze`; (3) una
  prueba por ruta que compruebe el contrato HTTP, el rate limit y que no se filtra información interna; (4) subir el suelo
  de cobertura de forma escalonada (35 → 45 → 50 %).
- **Hecho cuando:** ninguna ruta queda sin prueba y el suelo de `vitest.config.mjs` es ≥ 50 %.

### M-02 · Compilar Rust en el CI del escritorio
- **Por qué:** el CI del escritorio ejecuta `tsc` y `vite build`, pero no compila `src-tauri`. El PR de Dependabot #28
  (tauri 2.11.1) **no compilaba** y el CI estaba en verde.
- **Qué hacer:** instalar las librerías de WebKitGTK en el runner y añadir `cargo check --locked` (valorar `cargo clippy`).
  Probado en local en una copia aislada del repositorio: `cargo check --locked` tarda ~50 s.
- **Hecho cuando:** un cambio que rompa la compilación de Rust falla el CI.

### M-03 · Pruebas automáticas del escritorio
- **Por qué:** el escritorio no tiene ninguna prueba. Dos fallos reales se encontraron a mano: el Error 153 de YouTube
  ([SEC-20](security-audit.md)) y el icono de favoritos que no se repintaba.
- **Qué hacer:** llevar al CI los guiones que se usaron para verificarlo: servir `desktop/dist` con la CSP **exacta** de
  `tauri.conf.json` y recorrerlo con Playwright (portada, ficha, login fallido, favoritos al instante, cero violaciones de CSP).
- **Hecho cuando:** un job del CI ejecuta esas comprobaciones en cada PR que toque `desktop/`.

### M-04 · Monitor externo de disponibilidad
- **Por qué:** el workflow `Disponibilidad` está programado cada 15 minutos, pero GitHub no garantiza el intervalo: el
  2026-09-30, pasadas más de 3 horas desde su creación, no había lanzado ninguna ejecución programada (solo la manual). Antes de confiar en él, comprueba con
  `gh run list --workflow Disponibilidad` que hay ejecuciones con evento `schedule`.
- **Qué hacer:** añadir un servicio externo gratuito (UptimeRobot, Better Stack…) sobre `/api/health` y `/api/health/db`,
  con aviso por correo. `scripts/uptime-check.sh` puede seguir como segunda señal. Si el servicio recibe un desafío de
  seguridad de Vercel, añadir una regla de firewall que permita su agente.
- **Hecho cuando:** una caída simulada genera una alerta en menos de 10 minutos sin intervención.

### M-05 · Copias de seguridad automáticas
- **Por qué:** la restauración de Neon cubre **6 horas** y no hay snapshots programados (son de pago). Existe
  `scripts/backup-chat.sh`, pero es manual. Hoy el chat está vacío, así que el riesgo crece con el uso real.
- **Qué hacer:** según el plan: snapshots programados de Neon, o una tarea programada que ejecute el script y suba el
  volcado **cifrado** a un almacenamiento privado. **Nunca como artefacto de GitHub**: en un repositorio público sería visible.
  Añadir la exportación de Firestore (favoritos) y de usuarios de Firebase Auth, y **probar una restauración** en una base distinta.
- **Hecho cuando:** hay una copia reciente fuera de Neon y una restauración probada y documentada en el [runbook](RUNBOOK.md).

### M-06 · Derechos de las personas
- **Por qué:** borrar a una persona se hace a mano en tres sitios ([runbook](RUNBOOK.md), playbook 11). Los mensajes del chat
  no caducan solos, y la moderación no tiene API de borrado ni bloqueo.
- **Qué hacer:** un endpoint autenticado «borrar mi cuenta» que elimine Auth, Firestore y las filas de Neon; uno de
  «exportar mis datos»; una política de retención del chat (p. ej. borrado automático tras N meses); y acciones de borrado y
  bloqueo en el panel de moderación. Revisar el texto de [/privacidad](https://streaming-sntx.vercel.app/privacidad) con
  alguien que conozca la normativa de tu país: es informativo, no asesoría legal.
- **Hecho cuando:** una solicitud de borrado se resuelve en un clic y con prueba automática.

## Media prioridad

### M-07 · Limpiar la CSP
`style-src` todavía permite `https://fonts.googleapis.com`, pero las fuentes se alojan en `src/app/fonts`. Quitarlo en
`src/config/securityHeaders.mjs`, ajustar la prueba de `securityHeaders.test.js` y confirmar con el e2e (que ya vigila las
violaciones de CSP) que no rompe nada.

### M-08 · Contexto en todos los logs y retención
Solo las rutas envueltas por `withApiHandler` añaden `requestId` a los logs; las del chat, `auth/*` y otras escriben la ruta a
mano. Envolverlas (o un helper equivalente). Aparte, en el plan Hobby los logs duran ~1 h: valorar Sentry (plan gratuito) para
errores o un *log drain*. Revisar una vez al mes Speed Insights y `scripts/error-budget.sh`.

### M-09 · Protección de `main`
Hoy el ruleset bloquea el borrado y el force push, pero permite subir directo. Si se suma más gente o el sitio tiene uso real:
exigir PR y los checks del CI, con el mantenedor como *bypass actor*, porque los PR de release-please no ejecutan el CI. Razones
y compensaciones en [DELIVERY.md](DELIVERY.md).

### M-10 · CSP sin `unsafe-inline` (SEC-11)
Exige nonces por petición o *hashes* y renderizado dinámico: un cambio de arquitectura con coste en caché y rendimiento. Medir
primero el impacto en LCP y en la caché del CDN. Mientras tanto la defensa está en `object-src 'none'`, `base-uri 'self'`, los
hosts exactos de `connect-src` y `frame-ancestors 'none'`.

### M-11 · Restringir la clave de API de Firebase
El punto 4 de [FIREBASE_AUTH_HARDENING.md](FIREBASE_AUTH_HARDENING.md) es opcional y **no consta como aplicado**: en Google Cloud
Console, limitar la clave a Identity Toolkit, Token Service y Cloud Firestore. **No** restringir por *referrer*: la app de
escritorio se ejecuta desde `tauri://`.

### M-12 · Cadena de suministro, segunda parte
Workflow de OpenSSF Scorecard con su insignia; atestaciones de procedencia nativas de GitHub (`gh attestation verify`) además
de las actuales; lista de licencias permitidas en `dependency-review.yml`.

### M-13 · Distribución del escritorio
Empaquetar (AppImage, deb, msi, dmg) desde el workflow de release, firmar los binarios y añadir actualización automática
firmada (`tauri-plugin-updater`). La app depende de la web para los tráilers (`/embed`), y `connect-src`/`frame-src` de su CSP
están fijados a `https://streaming-sntx.vercel.app`; documentarlo si se publica apuntando a otra API.

### M-14 · Accesibilidad
Los campos del formulario de acceso no asocian etiqueta y campo (por eso los tests usan `input[type=…]` en lugar de
`getByLabel`). Corregirlo, añadir `axe-core` al e2e y revisar contrastes y foco del reproductor.

### M-15 · Rendimiento
Lighthouse CI con presupuestos; en el escritorio, `vite build` avisa de un bloque de ~1 MB (dividir con `import()` dinámico);
revisar el LCP de la portada con el tráiler de fondo.

## Baja prioridad e ideas

- **M-16 · Indexación.** Todas las respuestas llevan `X-Robots-Tag: noindex, nofollow`, así que el sitio no aparece en
  buscadores. Es una decisión válida mientras sea un proyecto de portafolio; si se quiere descubrimiento, cambiar esa
  cabecera, añadir `sitemap.xml` y metadatos Open Graph.
- **M-17 · Deuda menor.** Los 4 avisos de lint de `src/app/listing/[type]/ListingClient.js`; usar `.nvmrc` también en local
  (tu máquina usa Node 26 y el CI 22); instalar `gitleaks` (el hook solo avisa si falta); registros de decisiones (ADR).
- **M-18 · Resiliencia.** TMDB y OMDb ya tienen un tope de 8 s; siguen sin reintentos con espera ni servir contenido caducado
  (`stale-if-error`) cuando un proveedor falla.

## Mantenimiento recurrente

| Cuándo | Tarea |
|---|---|
| Cada semana | Revisar los PR de Dependabot y el informe de ZAP (`dast.yml`); mirar que el monitor sigue lanzando ejecuciones `schedule` |
| Cada mes | `scripts/error-budget.sh`; Speed Insights; `scripts/check-repo-posture.sh`; crear un snapshot manual de Neon |
| Cada trimestre | Rotar secretos ([runbook, sección 6](RUNBOOK.md)); repasar la [auditoría](security-audit.md) y el [modelo de amenazas](THREAT_MODEL.md); probar una restauración |
| Antes de abrir el sitio a más gente | M-05, M-06 y revisar `/privacidad` |
| Cuando algo cambie | Actualizar estos documentos: hay una prueba (`docsLinks.test.js`) que avisa de enlaces rotos |

## Decisiones tomadas que se pueden revisar

| Decisión | Dónde está | Cuándo reconsiderarla |
|---|---|---|
| `main` admite subida directa | [DELIVERY.md](DELIVERY.md) | M-09 |
| Sin `vercel.json` (región y duración por defecto) | [DELIVERY.md](DELIVERY.md) | Si cambia la región de Neon o aparecen cron jobs |
| `unsafe-inline` aceptado (SEC-11) | [security-audit.md](security-audit.md) | M-10 |
| Sin COEP/CORP (SEC-19): romperían YouTube y TMDB | [security-audit.md](security-audit.md) | Si esos terceros envían sus cabeceras |
| Sin App Check: el escritorio no puede obtener tokens | [FIREBASE_AUTH_HARDENING.md](FIREBASE_AUTH_HARDENING.md) | Si el escritorio incorpora su propio proveedor |
| Las pruebas e2e corren contra un build local, no contra el Preview (protegido) | [DELIVERY.md](DELIVERY.md) | Si se decide guardar un secreto de *bypass* |
