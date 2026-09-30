# Docker

La imagen empaqueta la web (Next.js en modo `standalone`) y se ejecuta sin privilegios. El
despliegue principal sigue siendo Vercel; Docker sirve para ejecutar el mismo artefacto en
local o en cualquier host con contenedores.

## Ejecutar en local

```bash
docker compose up --build          # http://localhost:3000
WEB_PORT=3100 docker compose up    # si el 3000 está ocupado (p. ej. por `npm run dev`)
docker compose down
```

Requiere `docker`, `docker-buildx` y `docker-compose`. Los secretos se leen de tu `.env` al
**arrancar** el contenedor (`env_file`); no forman parte de la imagen.

## Qué contiene y qué no

- **Build args:** solo `NEXT_PUBLIC_*`. Son públicos (acaban en el JavaScript del navegador).
  Nunca pases secretos como build args: quedan en `docker history`.
- **Secretos** (`DATABASE_URL`, claves de API, `FIREBASE_SERVICE_ACCOUNT_BASE64`...): solo en
  tiempo de ejecución, con `-e`, `--env-file` o `env_file` en compose.
- `.dockerignore` excluye todos los `.env*` (salvo `.env.example`) y credenciales. Es
  importante: Next.js copia los `.env` locales al bundle `standalone`, así que sin esa
  exclusión acabarían dentro de la imagen. Un test (`tests/unit/dockerfiles.test.js`) lo vigila.
- Sin `npm`, `corepack` ni `yarn` en la imagen final: solo se ejecuta `node server.js`, y así
  no hay gestor de paquetes a mano (ni las vulnerabilidades de sus dependencias internas).
- Sin `sharp`/`libvips`: las imágenes van `unoptimized`. Si se activa el optimizador de
  imágenes de Next, hay que quitar `outputFileTracingExcludes` en `next.config.mjs`.

## Endurecimiento

| Medida | Dónde |
|---|---|
| Base fijada por digest (Dependabot propone actualizaciones) | `Dockerfile` |
| Usuario `node` (uid 1000), no root | `Dockerfile` |
| `npm ci --ignore-scripts`: sin código de instalación de dependencias | `Dockerfile` |
| Sistema de archivos de solo lectura, `tmpfs` para `/tmp` y la caché de Next | `docker-compose.yml` |
| `cap_drop: ALL`, `no-new-privileges` | `docker-compose.yml` |
| Puerto publicado solo en `127.0.0.1` | `docker-compose.yml` |
| `init: true` (PID 1 gestiona señales y procesos huérfanos) | `docker-compose.yml` |

## Comprobaciones en el CI

El job `docker` de `.github/workflows/ci.yml` valida la imagen en cada push y pull request:

| Paso | Qué hace | ¿Bloquea? |
|---|---|---|
| Hadolint | Buenas prácticas del `Dockerfile` | Solo con errores (los avisos se muestran) |
| Construir | `docker build` de la imagen | Sí, si no compila |
| Prueba de arranque | Arranca la imagen con las restricciones de `docker-compose.yml` y espera a `healthy`, `/api/health` y uid distinto de 0 | Sí |
| Trivy, informe | HIGH y CRITICAL **con corrección disponible**: tabla en el log, resumen del job y pestaña Security | **Nunca** |
| Trivy, puerta | CRITICAL **con corrección disponible** | **Sí** (código de salida 10) |

Si Trivy no puede ejecutarse (por ejemplo, no descarga su base de datos) solo emite una
advertencia: un fallo de infraestructura no bloquea el despliegue. Las vulnerabilidades sin
corrección disponible no se reportan, porque no se pueden arreglar.

Las versiones de Hadolint y Trivy están en `.github/tools/Dockerfile`, fijadas por digest y
mantenidas por Dependabot. Para reproducirlo en local:

```bash
docker run --rm -i "$(awk '/AS hadolint/{print $2}' .github/tools/Dockerfile)" hadolint - < Dockerfile
docker save streaming-sntx:local -o /tmp/image.tar
docker run --rm -v /tmp:/work "$(awk '/AS trivy/{print $2}' .github/tools/Dockerfile)" \
  image --input /work/image.tar --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed
```

## Salud

- `GET /api/health`: liveness, sin dependencias externas. Lo usa el `HEALTHCHECK` de la imagen.
- `GET /api/health/db`: readiness, comprueba la conexión a Postgres (con rate limit y caché).

## HTTPS

HSTS y `upgrade-insecure-requests` se calculan al compilar. Si el contenedor se sirve detrás
de HTTPS, construye con `--build-arg FORCE_HTTPS_HEADERS=1`.
