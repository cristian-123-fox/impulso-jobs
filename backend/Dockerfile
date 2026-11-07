# syntax=docker/dockerfile:1.7
#
# API de Impulso Jobs (NestJS) — imagen de producción.
#
#   docker build -t impulso-jobs-backend ./backend
#
# Etapas:
#   base       Node + pnpm (corepack) fijados.
#   fetch      `pnpm fetch`: descarga el store sólo con el lockfile, así que
#              esta capa se reutiliza mientras pnpm-lock.yaml no cambie.
#   build      dependencias completas + `nest build`.
#   prod-deps  sólo `dependencies` (--prod): las devDependencies nunca llegan
#              a la imagen final.
#   runtime    alpine + binario de Node (sin npm/corepack/yarn), usuario sin
#              privilegios, tini.
#
# La misma imagen sirve la API y las tareas de operador
# (`docker compose run --rm backend node dist/database/seed ...`).

ARG NODE_IMAGE=node:22.23.4-alpine3.24
# Debe ser la misma versión de Alpine que NODE_IMAGE (el binario enlaza musl
# y libstdc++ del sistema).
ARG RUNTIME_BASE=alpine:3.24

# Sólo para copiar el binario de Node a la imagen final.
FROM ${NODE_IMAGE} AS node-bin

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true \
    SCARF_ANALYTICS=false
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
FROM base AS fetch
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store-backend,target=/pnpm/store \
    pnpm fetch --store-dir /pnpm/store

# ---------------------------------------------------------------------------
FROM fetch AS build
# El backend no tiene dependencias nativas (bcryptjs, no bcrypt), así que no
# hace falta ejecutar ningún script de instalación.
RUN --mount=type=cache,id=pnpm-store-backend,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --ignore-scripts --store-dir /pnpm/store
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm run build \
 && find dist -type f \( -name '*.map' -o -name '*.tsbuildinfo' -o -name '*.d.ts' \) -delete

# ---------------------------------------------------------------------------
FROM fetch AS prod-deps
# `pnpm fetch` deja materializado el store virtual completo (dev incluido) en
# node_modules/.pnpm: se borra y se instala de cero sólo lo de producción.
#
# Después se quita el peso muerto en ejecución:
#   - typescript, ts-node y @types/*: llegan como peer opcional de typeorm
#     (sólo los usa para ejecutar migraciones .ts, nunca con dist/).
#   - typeorm/browser: la build ESM para navegador.
#   - tipos, mapas de fuente, documentación y tests de cada paquete.
RUN --mount=type=cache,id=pnpm-store-backend,target=/pnpm/store \
    rm -rf node_modules \
 && pnpm install --prod --frozen-lockfile --offline --ignore-scripts --store-dir /pnpm/store \
 && rm -rf node_modules/.pnpm/typescript@* node_modules/.pnpm/ts-node@* \
           node_modules/.pnpm/@types+* node_modules/.pnpm/typeorm@*/node_modules/typeorm/browser \
 && find node_modules/.pnpm -type f \( \
        -name '*.d.ts' -o -name '*.d.mts' -o -name '*.d.cts' -o -name '*.map' \
        -o -iname 'README*' -o -iname 'CHANGELOG*' -o -iname 'HISTORY*' \
        -o -name '*.markdown' -o -name '*.md' \) -delete \
 && find node_modules/.pnpm -type d -name '__tests__' -prune -exec rm -rf {} +

# ---------------------------------------------------------------------------
FROM ${RUNTIME_BASE} AS runtime

# Alpine pelado + el binario de Node de la imagen oficial (misma versión, misma
# musl). Borrar npm/yarn en una capa superior de node:alpine no adelgaza la
# imagen —siguen en la capa de abajo—; partir de alpine sí: fuera npm, npx,
# corepack, yarn y las cabeceras de C (~30 MB). tini como PID 1 reenvía
# SIGTERM a Node (que, como PID 1, lo ignoraría) y recoge huérfanos.
RUN apk add --no-cache libstdc++ tini \
 && addgroup -g 1000 node \
 && adduser -u 1000 -G node -s /bin/sh -D node \
 && mkdir -p /app/uploads \
 && chown node:node /app/uploads
COPY --from=node-bin /usr/local/bin/node /usr/local/bin/node

ENV NODE_ENV=production \
    PORT=3000 \
    UPLOADS_DIR=/app/uploads

WORKDIR /app
COPY --chown=root:root package.json ./
COPY --from=prod-deps --chown=root:root /app/node_modules ./node_modules
COPY --from=build --chown=root:root /app/dist ./dist

# El código es de root y de sólo lectura para la app; lo único escribible por
# `node` es /app/uploads, que en producción es un volumen. Ojo: el storage de
# CV usa `<cwd>/uploads` fijo, así que el volumen DEBE montarse en /app/uploads.
USER 1000:1000
EXPOSE 3000

# `GET /api/v1` (AppController): no toca la BD ni requiere sesión.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="impulso-jobs-backend" \
      org.opencontainers.image.description="API de Impulso Jobs (NestJS)" \
      org.opencontainers.image.source="https://github.com/cristian-123-fox/impulso-jobs" \
      org.opencontainers.image.licenses="UNLICENSED" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
