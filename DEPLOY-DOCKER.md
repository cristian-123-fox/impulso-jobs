# Despliegue con Docker — Impulso Jobs

**Última actualización:** 7 de noviembre de 2026
**Alternativa a:** la ruta con PM2 de [`DEPLOY-DIGITALOCEAN.md`](DEPLOY-DIGITALOCEAN.md).
Mismo Droplet, mismo Nginx + Certbot en el host, mismos dominios; cambia cómo
se construye y se ejecuta la aplicación.

---

## 0. Qué hay

| Pieza | Dónde |
|---|---|
| Imagen de la API | `backend/Dockerfile` → `ghcr.io/cristian-123-fox/impulso-jobs-backend` |
| Imagen del portal (SSR) | `frontend/Dockerfile` → `ghcr.io/cristian-123-fox/impulso-jobs-frontend` |
| Orquestación | `docker-compose.prod.yml` (raíz) |
| Plantilla del `.env` del servidor | `deploy/.env.example` |
| Construir desde el código (local) | `docker-compose.build.yml` |
| CI (PR) | `.github/workflows/ci.yml` |
| CD (push a `main`) | `.github/workflows/cd.yml` |

```
                 Internet ── 443 ──> Nginx + Certbot (host)
                                      │                    │
                     api.impulsojobs.com           impulsojobs.com / www
                                      │                    │
                           127.0.0.1:3000          127.0.0.1:4000
                          ┌───────────┴───┐      ┌─────────┴────────┐
                          │ backend        │      │ frontend (SSR)   │
                          │ vol: uploads   │      └──────────────────┘
                          └───────┬────────┘
                    migrate ──────┤  (una vez por despliegue)
                          ┌───────┴────────┐
                          │ postgres 16    │  sin puerto publicado
                          │ vol: pgdata    │
                          └────────────────┘
```

**Servicios del compose:**

- `postgres` — PostgreSQL 16 (alpine). Datos en el volumen `impulso-jobs-pgdata`.
  **No publica ningún puerto**: sólo lo ven los contenedores.
- `migrate` — tarea de una sola vez con la imagen de la API: corre las
  migraciones y después las semillas idempotentes de catálogo
  (`rbac,applications,plan-features`, configurable con `MIGRATE_SEEDS`).
  La API no arranca hasta que termina bien, así que arranca ya con los
  permisos nuevos en la BD (no hace falta el reinicio que pide `pnpm seed`).
- `backend` — la API en `127.0.0.1:3000`. Uploads en el volumen
  `impulso-jobs-uploads`, montado en `/app/uploads`.
- `frontend` — el SSR de Angular en `127.0.0.1:4000`.

**Las imágenes:**

| Imagen | Tamaño (descomprimida / al descargar) | Contenido |
|---|---|---|
| backend | ~199 MB / ~58 MB | Alpine + binario de Node 22 + `dist/` + `node_modules` **sólo de producción** |
| frontend | ~148 MB / ~54 MB | Alpine + binario de Node 22 + `dist/frontend` (sin `node_modules`: el build de Angular empaqueta el servidor entero) |

Las dos corren como usuario sin privilegios (uid 1000), con `tini` como PID 1
(un `docker stop` termina en menos de un segundo), sistema de archivos de sólo
lectura, sin capabilities y con `HEALTHCHECK` propio:
`GET /api/v1` en la API y `GET /mantenimiento` (prerenderizada) en el portal.
Más de la mitad de cada imagen es el binario de Node; no llevan npm, corepack,
yarn, compiladores ni mapas de fuente.

---

## 1. Secretos de GitHub

En **Settings → Environments → `production`** (el job `deploy` usa ese
environment; puedes añadirle revisores obligatorios para aprobar cada
despliegue):

| Secreto | Obligatorio | Valor |
|---|---|---|
| `DEPLOY_HOST` | sí | IP o nombre del Droplet |
| `DEPLOY_USER` | sí | `deploy` (usuario del servidor, en el grupo `docker`) |
| `DEPLOY_SSH_KEY` | sí | Llave **privada** ed25519 dedicada a CI (ver §2.3) |
| `DEPLOY_PATH` | sí | `/opt/impulso-jobs` (carpeta con el compose y el `.env`) |
| `DEPLOY_PORT` | no | Puerto SSH si no es 22 |
| `DEPLOY_KNOWN_HOSTS` | recomendado | Salida de `ssh-keyscan -H IP_DEL_DROPLET`. Sin él, el job confía en la huella que reciba en ese momento |

**Si falta alguno de los cuatro obligatorios, el job `deploy` se omite sin
fallar** (deja un aviso): las imágenes se publican igual en GHCR.

No hace falta ningún secreto para publicar en GHCR: el workflow usa el
`GITHUB_TOKEN` con `packages: write`. Los paquetes nacen **privados** (el
repositorio lo es) y quedan ligados al repo por la etiqueta
`org.opencontainers.image.source`.

> Los secretos de la aplicación (JWT, BD, Stripe, SMTP) **no** van a GitHub:
> viven sólo en el `.env` del servidor.

---

## 2. Preparar el servidor (una vez)

Parte de un Droplet con lo de [`DEPLOY-DIGITALOCEAN.md`](DEPLOY-DIGITALOCEAN.md)
§1–§2 (usuario `deploy`, `ufw`, Nginx, Certbot). Node, pnpm y PM2 **no** hacen
falta en esta ruta.

### 2.1 Docker

```bash
curl -fsSL https://get.docker.com | sh       # Docker Engine + plugin compose
usermod -aG docker deploy                    # el usuario de CI puede usar docker
systemctl enable --now docker
docker compose version
```

> **ufw y Docker:** los puertos que Docker publica se saltan `ufw`. Por eso el
> compose los publica sólo en `127.0.0.1`: no los abras a `0.0.0.0`.

### 2.2 Carpeta, compose y `.env`

```bash
su - deploy
sudo mkdir -p /opt/impulso-jobs && sudo chown deploy:deploy /opt/impulso-jobs
cd /opt/impulso-jobs
# Copia aquí docker-compose.prod.yml y deploy/.env.example (scp desde tu equipo):
#   scp docker-compose.prod.yml deploy/.env.example deploy@IP:/opt/impulso-jobs/
mv .env.example .env
chmod 600 .env
nano .env            # rellena claves: openssl rand -hex 32 para cada JWT_*
```

Después de esto, cada despliegue de CD vuelve a subir `docker-compose.prod.yml`;
el `.env` **nunca** lo toca salvo la línea `TAG=`.

Lo mínimo a revisar en `.env`: `DB_PASSWORD`, los cuatro `JWT_*_SECRET`,
`APP_WEB_URL`, `APP_PUBLIC_URL` (sin ella la API no arranca), `CORS_ORIGIN`,
`SMTP_*`, `STRIPE_*`, `GOOGLE_CLIENT_ID`. **No cambies** `DB_HOST=postgres` ni
`UPLOADS_DIR=/app/uploads`.

### 2.3 Llave SSH para CI

En tu equipo (no en el servidor):

```bash
ssh-keygen -t ed25519 -C "github-actions-impulso" -f impulso_deploy -N ""
ssh-copy-id -i impulso_deploy.pub deploy@IP_DEL_DROPLET
ssh-keyscan -H IP_DEL_DROPLET            # → secreto DEPLOY_KNOWN_HOSTS
```

El contenido de `impulso_deploy` (privada) va al secreto `DEPLOY_SSH_KEY`;
después borra la copia local.

### 2.4 Iniciar sesión en GHCR

Las imágenes son privadas: el servidor necesita leerlas. Crea un **token
clásico** en GitHub (Settings → Developer settings → Personal access tokens →
Tokens (classic)) con **sólo** el scope `read:packages`, y en el servidor:

```bash
echo "TOKEN" | docker login ghcr.io -u USUARIO_GITHUB --password-stdin
```

La credencial queda en `~deploy/.docker/config.json`. Si el token caduca, los
despliegues fallan en `docker compose pull` hasta repetir este paso.

### 2.5 Primer arranque

```bash
cd /opt/impulso-jobs
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --wait
docker compose -f docker-compose.prod.yml ps
curl -s http://127.0.0.1:3000/api/v1       # {"success":true,...}
curl -sI http://127.0.0.1:4000/ | head -3  # 301 → /vacantes
```

Administrador inicial (una vez):

```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps \
  -e SEED_ADMIN_EMAIL=admin@impulsojobs.com \
  -e SEED_ADMIN_PASSWORD='UNA_CLAVE_FUERTE' \
  backend node dist/database/seed --only=admin
```

> Para no escribir `-f docker-compose.prod.yml` cada vez:
> `echo 'COMPOSE_FILE=docker-compose.prod.yml' >> .env`. Los ejemplos de abajo
> lo siguen poniendo para ser explícitos.

### 2.6 Nginx

Igual que en [`DEPLOY-DIGITALOCEAN.md`](DEPLOY-DIGITALOCEAN.md) §4 y §5-A: los
puertos son los mismos que con PM2.

`/etc/nginx/sites-available/impulso-api`:

```nginx
server {
    listen 80;
    server_name api.impulsojobs.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`/etc/nginx/sites-available/impulso-web`:

```nginx
server {
    listen 80;
    server_name impulsojobs.com www.impulsojobs.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/impulso-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/impulso-web /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.impulsojobs.com -d impulsojobs.com -d www.impulsojobs.com
```

⚠️ **`proxy_set_header Host $host` es obligatorio en el portal.** El SSR sólo
renderiza para los hosts de `security.allowedHosts` (`angular.json`:
`impulsojobs.com`, `www.impulsojobs.com`, `demo.impulsojobs.com`, `localhost`,
`127.0.0.1`). Con otro host **no da error: sirve CSR en silencio** y se pierde
el SEO. Para un dominio nuevo sin reconstruir la imagen, añádelo a
`NG_ALLOWED_HOSTS` en `.env` (separados por comas) y `up -d`. Compruébalo con:

```bash
curl -s -H 'Host: impulsojobs.com' http://127.0.0.1:4000/nosotros | grep -o 'ng-server-context="ssr"'
```

⚠️ `apiBaseUrl` y `siteUrl` del portal se fijan **al construir la imagen**
(`frontend/src/environments/environment.production.ts`). Cambiar el dominio de
la API exige un commit y una imagen nueva, no basta con el `.env`.

---

## 3. CI/CD

**CI** (`ci.yml`) — en cada pull request, sólo para la app que cambió
(`dorny/paths-filter`):

- backend: `pnpm install --frozen-lockfile`, `eslint` **sin** `--fix`,
  `pnpm test`, `pnpm run build`.
- frontend: `ng test --watch=false --browsers=ChromeHeadless` (Karma) y
  `pnpm run build` (SSR + `check-dist.mjs`).

**CD** (`cd.yml`) — en cada push a `main` y a mano (*Actions → CD → Run
workflow*):

1. Corre CI (el mismo workflow, reutilizado). Si falla, no se publica nada.
2. Construye las dos imágenes con Buildx y caché de GitHub Actions y las sube a
   GHCR como `sha-<commit corto>` y `latest`.
3. `deploy` (environment `production`): sube `docker-compose.prod.yml` por
   `scp`, fija `TAG=sha-<commit>` en el `.env` del servidor, y ejecuta
   `docker compose pull` + `up -d --wait` (espera a que `migrate` termine y a
   que la API y el portal estén sanos; si no, el job falla) y
   `docker image prune -af --filter until=168h`.

---

## 4. Operación

Todo desde `/opt/impulso-jobs`. `run --rm --no-deps` crea un contenedor
temporal con la imagen de la API y el mismo `.env`, sin arrancar `migrate` ni
publicar puertos.

```bash
DC="docker compose -f docker-compose.prod.yml"

$DC ps
$DC logs -f --tail=200 backend
$DC restart backend            # p. ej. tras sembrar permisos a mano

# Semillas (las de catálogo ya las corre `migrate` en cada despliegue)
$DC run --rm --no-deps backend node dist/database/seed --list
$DC run --rm --no-deps backend node dist/database/seed --only=rbac

# Migraciones a mano
$DC run --rm --no-deps backend node dist/database/run-migrations run
$DC run --rm --no-deps backend node dist/database/run-migrations revert

# Purga de cuentas (simulación; añade --confirm para borrar)
$DC run --rm --no-deps backend node dist/database/purge-accounts

# Reescribir el host de las imágenes guardadas (simulación; --confirm escribe)
$DC run --rm --no-deps backend node dist/database/rehost-uploaded-files

# psql
$DC exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

### Cron de la aplicación

`crontab -e` del usuario `deploy` (equivale a §7 de la guía con PM2):

```cron
0 6 * * *  cd /opt/impulso-jobs && docker compose -f docker-compose.prod.yml run --rm --no-deps backend node dist/database/expire-promotions >> /var/log/impulso/billing.log 2>&1
15 6 * * * cd /opt/impulso-jobs && docker compose -f docker-compose.prod.yml run --rm --no-deps backend node dist/database/expire-vacancies >> /var/log/impulso/vacancies.log 2>&1
30 6 * * * cd /opt/impulso-jobs && docker compose -f docker-compose.prod.yml run --rm --no-deps backend node dist/database/consolidate-vacancy-views >> /var/log/impulso/views.log 2>&1
```

```bash
sudo mkdir -p /var/log/impulso && sudo chown deploy:deploy /var/log/impulso
```

> Ruta de `docker` en cron: `/usr/bin/docker` (compruébalo con `which docker`).
> Los logs de los contenedores rotan solos (10 MB × 5 por servicio).

---

## 5. Respaldos

Los datos viven en dos volúmenes con nombre fijo: `impulso-jobs-pgdata` y
`impulso-jobs-uploads`. `/usr/local/bin/impulso-backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
FECHA=$(date +%F)
DEST=/var/backups/impulso
mkdir -p "$DEST"
cd /opt/impulso-jobs

# PostgreSQL (volcado lógico, consistente con el servicio en marcha)
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > "$DEST/db-$FECHA.sql.gz"

# Uploads (CV, fotos, logos), en sólo lectura
docker run --rm -v impulso-jobs-uploads:/data:ro -v "$DEST":/backup alpine:3.24 \
  tar czf "/backup/uploads-$FECHA.tar.gz" -C /data .

find "$DEST" -type f -mtime +14 -delete
```

```cron
0 3 * * * /usr/local/bin/impulso-backup.sh >> /var/log/impulso/backup.log 2>&1
```

(el usuario que lo ejecute debe estar en el grupo `docker` y poder escribir en
`/var/backups/impulso`). Mantén además los **snapshots semanales** del Droplet.

**Restaurar:**

```bash
DC="docker compose -f docker-compose.prod.yml"
$DC stop backend frontend
gunzip -c /var/backups/impulso/db-FECHA.sql.gz | \
  $DC exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
# (sobre una BD vacía: si hace falta, recrea antes el volumen pgdata)

docker run --rm -v impulso-jobs-uploads:/data -v /var/backups/impulso:/backup alpine:3.24 \
  sh -c 'tar xzf /backup/uploads-FECHA.tar.gz -C /data && chown -R 1000:1000 /data'
$DC up -d --wait
```

---

## 6. Rollback

Cada despliegue deja `TAG=sha-<commit>` en el `.env`. Para volver atrás:

```bash
cd /opt/impulso-jobs
docker image ls 'ghcr.io/cristian-123-fox/impulso-jobs-*'   # tags disponibles en local
sed -i 's/^TAG=.*/TAG=sha-abc1234/' .env                     # el commit bueno
docker compose -f docker-compose.prod.yml up -d --wait
```

Si el tag ya no está en local, `up` lo baja de GHCR (en
*github.com/cristian-123-fox?tab=packages* están todos). El siguiente push a
`main` vuelve a desplegar `HEAD`; para congelarlo, desactiva el workflow CD o
revierte el commit.

⚠️ **Las migraciones no se revierten solas.** Si la versión mala añadió una
migración incompatible con la anterior, revierte **antes** de cambiar el tag,
todavía con la imagen nueva (una migración por llamada):

```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps backend node dist/database/run-migrations revert
```

Ante la duda, restaura el respaldo de §5.

---

## 7. Pasar de PM2 a Docker en el mismo Droplet

1. Respaldo completo (§6 de la guía con PM2).
2. Volcar la BD del host: `sudo -u postgres pg_dump impulso_jobs > /tmp/db.sql`.
3. Preparar Docker y la carpeta (§2.1–§2.4) y levantar sólo la BD:
   `docker compose -f docker-compose.prod.yml up -d postgres`.
4. Restaurar: `cat /tmp/db.sql | docker compose -f docker-compose.prod.yml exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`.
5. Copiar los uploads al volumen:

   ```bash
   docker volume create impulso-jobs-uploads
   docker run --rm -v impulso-jobs-uploads:/data -v /var/www/impulso-jobs/uploads:/src:ro alpine:3.24 \
     sh -c 'cp -a /src/. /data/ && chown -R 1000:1000 /data'
   ```

6. `pm2 stop impulso-api impulso-web && pm2 save`, y
   `docker compose -f docker-compose.prod.yml up -d --wait`. Los puertos son
   los mismos: Nginx no cambia.
7. Verificar (§11 de la guía con PM2) y, cuando todo esté bien,
   `pm2 delete impulso-api impulso-web` y apagar el PostgreSQL del host.

> **MySQL:** el compose trae PostgreSQL. Si la base sigue en MySQL (migración
> desde cPanel), hay que añadir un servicio `mysql:8` al compose (o apuntar
> `DB_HOST` a un MySQL accesible desde la red de Docker) y quitar la
> dependencia de `postgres` en `migrate` y `backend`. Es una adaptación que no
> está hecha: decide el motor antes del primer despliegue.

---

## 8. Probar las imágenes en local

```bash
cp deploy/.env.example .env      # en la raíz; .env está en .gitignore
# Ajusta para local: APP_PUBLIC_URL=http://localhost:3000, JWT_* con cualquier valor
docker compose -f docker-compose.prod.yml -f docker-compose.build.yml up -d --build --wait
curl -s http://127.0.0.1:3000/api/v1
docker compose -f docker-compose.prod.yml -f docker-compose.build.yml down -v   # -v borra los volúmenes
```

Sólo construir: `docker build -t impulso-jobs-backend ./backend` y
`docker build -t impulso-jobs-frontend ./frontend`.
