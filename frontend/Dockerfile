# syntax=docker/dockerfile:1.7
#
# Portal de Impulso Jobs (Angular 20 SSR) — imagen de producción.
#
#   docker build -t impulso-jobs-frontend ./frontend
#
# El builder `@angular/build:application` empaqueta el servidor SSR entero en
# dist/frontend/server (sólo importa módulos de Node), así que la imagen final
# NO lleva node_modules: sólo Alpine, el binario de Node, tini y el dist.
#
# ⚠️ `apiBaseUrl` y `siteUrl` se fijan en tiempo de build desde
# src/environments/environment.production.ts: cambiar de dominio exige
# reconstruir la imagen. Los hosts que acepta el SSR salen de
# `security.allowedHosts` (angular.json) y se pueden ampliar en ejecución con
# NG_ALLOWED_HOSTS (lista separada por comas); un host no listado no da error:
# se sirve CSR en silencio y se pierde el SEO.

ARG BUILD_IMAGE=node:22.23.4-trixie-slim
# NODE_IMAGE aporta sólo el binario de Node; RUNTIME_BASE debe ser su misma
# versión de Alpine (el binario enlaza musl y libstdc++ del sistema).
ARG NODE_IMAGE=node:22.23.4-alpine3.24
ARG RUNTIME_BASE=alpine:3.24

FROM ${NODE_IMAGE} AS node-bin

# ---------------------------------------------------------------------------
# Build en glibc (Debian): esbuild, lmdb y msgpackr-extract traen binarios
# precompilados para glibc; en musl alguno tendría que compilarse.
FROM ${BUILD_IMAGE} AS build
ENV PNPM_HOME=/pnpm \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true \
    NG_CLI_ANALYTICS=false
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store-frontend,target=/pnpm/store \
    pnpm fetch --store-dir /pnpm/store \
 && pnpm install --frozen-lockfile --offline --store-dir /pnpm/store

COPY angular.json tsconfig.json tsconfig.app.json tailwind.config.js ./
COPY scripts ./scripts
COPY public ./public
COPY src ./src
# `pnpm run build` = ng build (configuración production) + scripts/check-dist.mjs,
# el guardia que impide publicar PDFs privados o un index.html viejo.
RUN pnpm run build \
 && find dist -type f -name '*.map' -delete

# ---------------------------------------------------------------------------
FROM ${RUNTIME_BASE} AS runtime

# Alpine pelado + el binario de Node de la imagen oficial (misma versión, misma
# musl). Borrar npm/yarn en una capa superior de node:alpine no adelgaza la
# imagen —siguen en la capa de abajo—; partir de alpine sí: fuera npm, npx,
# corepack, yarn y las cabeceras de C (~30 MB). tini como PID 1 reenvía
# SIGTERM a Node (que, como PID 1, lo ignoraría) y recoge huérfanos.
RUN apk add --no-cache libstdc++ tini \
 && addgroup -g 1000 node \
 && adduser -u 1000 -G node -s /bin/sh -D node
COPY --from=node-bin /usr/local/bin/node /usr/local/bin/node

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app
# El código es de root: el proceso (`node`) no puede reescribirlo.
COPY --from=build --chown=root:root /app/dist/frontend ./dist/frontend

USER 1000:1000
EXPOSE 4000

# /mantenimiento está prerenderizada: prueba el motor de Angular sin depender
# de la API. 127.0.0.1 está en allowedHosts.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/mantenimiento').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="impulso-jobs-frontend" \
      org.opencontainers.image.description="Portal de Impulso Jobs (Angular SSR)" \
      org.opencontainers.image.source="https://github.com/cristian-123-fox/impulso-jobs" \
      org.opencontainers.image.licenses="UNLICENSED" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/frontend/server/server.mjs"]
