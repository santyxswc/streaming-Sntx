# syntax=docker/dockerfile:1

# Imagen base fijada por digest: el build es reproducible y una etiqueta movida no
# introduce cambios sin revisar. Dependabot (ecosistema docker) propone los nuevos digests.
ARG NODE_IMAGE=node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402

# ---------------------------------------------------------------- dependencias
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: ninguna dependencia ejecuta código de instalación durante el build.
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

# ----------------------------------------------------------------------- build
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Las variables NEXT_PUBLIC_* se incrustan en el JavaScript del cliente al compilar, así
# que son públicas por definición: se pasan como build args. NUNCA pases aquí secretos
# (claves de API, DATABASE_URL, cuenta de servicio): los build args quedan en
# `docker history`. Los secretos se inyectan al ARRANCAR el contenedor.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CAFECITO_USERNAME
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
# Ponlo a 1 si el contenedor se sirve detrás de HTTPS: activa HSTS y
# upgrade-insecure-requests, que se calculan al compilar (ver next.config.mjs).
ARG FORCE_HTTPS_HEADERS=0

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CAFECITO_USERNAME=$NEXT_PUBLIC_CAFECITO_USERNAME \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID \
    FORCE_HTTPS_HEADERS=$FORCE_HTTPS_HEADERS \
    DOCKER_BUILD=1 \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --------------------------------------------------------------------- runtime
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="streaming-Sntx" \
      org.opencontainers.image.source="https://github.com/santyxswc/streaming-Sntx"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Solo lo que necesita el servidor: el bundle "standalone" trae únicamente las
# dependencias que el código usa de verdad, sin node_modules completo ni fuentes.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Next escribe su caché en .next/cache; debe existir y ser escribible por `node`.
RUN mkdir -p .next/cache && chown node:node .next/cache

# Usuario sin privilegios (uid 1000, incluido en la imagen oficial de Node).
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
