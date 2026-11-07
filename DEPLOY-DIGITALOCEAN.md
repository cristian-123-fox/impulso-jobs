# Despliegue en DigitalOcean — Impulso Jobs

**Última actualización:** 7 de noviembre de 2026
**Sustituye a:** [`DEPLOY-CPANEL.md`](DEPLOY-CPANEL.md) para esta entrega.
**Checklist de entrega:** [`REVISION-ENTREGA.md`](REVISION-ENTREGA.md) §0.

---

## 0. Arquitectura recomendada

| Pieza | Recomendación |
|---|---|
| Servidor | 1 Droplet Ubuntu 24.04 LTS, mínimo 2 vCPU / 4 GB RAM |
| Backend | NestJS en `127.0.0.1:3000`, gestionado con PM2 |
| Frontend | Angular SSR en `127.0.0.1:4000` con PM2 (recomendado) o estático con Nginx |
| Base de datos | PostgreSQL 16 local, o MySQL 8 si migras desde cPanel |
| Proxy | Nginx + Certbot (Let's Encrypt) |
| Uploads | Disco del Droplet en `/var/www/impulso-jobs/uploads` |
| Backups | `pg_dump`/`mysqldump` + `tar` de uploads + snapshots de DigitalOcean |

> **¿Droplet o App Platform?** La plataforma guarda CV, fotos y logos en disco
> local (`UPLOADS_DIR`). App Platform tiene disco efímero; habría que mover los
> archivos a DigitalOcean Spaces. Para esta entrega, **Droplet** conserva el
> comportamiento actual y evita una migración extra.

> **¿SSR o estático?** El build es SSR (`outputMode: server`). Para no perder
> SEO, corre `server/server.mjs` con PM2 (opción A). Si eliges estático (opción
> B), el 301 y el fallback se configuran en Nginx.

---

## 1. Prerrequisitos

- Dominio `impulsojobs.com` con acceso al DNS.
- Droplet con Ubuntu 24.04 y llave SSH.
- Repositorio privado en GitHub.
- Secretos listos: JWT, base de datos, SMTP, Stripe y Google Client ID.
- Registros DNS (apuntando al IP del Droplet):

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | IP del Droplet |
| A | `www` | IP del Droplet |
| A | `api` | IP del Droplet |
| A | `demo` | IP del Droplet (solo si se conserva la demo) |

> Si vienes de cPanel, baja el TTL a 300 s antes del cambio para poder revertir
> rápido.

---

## 2. Preparar el Droplet

```bash
ssh root@IP_DEL_DROPLET

adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx git curl build-essential

# Node 22 + pnpm + PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
corepack enable
corepack prepare pnpm@latest --activate
npm i -g pm2
```

Crea la carpeta de la aplicación:

```bash
mkdir -p /var/www/impulso-jobs /var/www/impulso-jobs/uploads
chown -R deploy:deploy /var/www/impulso-jobs
```

---

## 3. Base de datos

### Opción A — PostgreSQL (recomendado si empiezas de cero)

```bash
apt install -y postgresql
sudo -u postgres psql
```

```sql
CREATE USER impulso WITH PASSWORD 'CAMBIA_ESTA_CLAVE';
CREATE DATABASE impulso_jobs OWNER impulso;
\q
```

### Opción B — MySQL (recomendado si migras desde cPanel)

```bash
apt install -y mysql-server
sudo mysql
```

```sql
CREATE DATABASE impulso_jobs
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'impulso'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE';
GRANT ALL PRIVILEGES ON impulso_jobs.* TO 'impulso'@'localhost';
FLUSH PRIVILEGES;
\q
```

> No expongas el puerto de la base de datos. Escucha solo en `127.0.0.1`.

---

## 4. Backend

```bash
su - deploy
git clone git@github.com:cristian-123-fox/impulso-jobs.git /var/www/impulso-jobs
cd /var/www/impulso-jobs/backend
```

Crea `backend/.env` (permisos `600`):

```env
NODE_ENV=production
PORT=3000

DB_TYPE=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=impulso
DB_PASSWORD=CAMBIA_ESTA_CLAVE
DB_NAME=impulso_jobs
DB_SYNCHRONIZE=false

JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
JWT_RESET_SECRET=<openssl rand -hex 32>
JWT_VERIFY_SECRET=<openssl rand -hex 32>

APP_WEB_URL=https://impulsojobs.com
APP_PUBLIC_URL=https://api.impulsojobs.com
CORS_ORIGIN=https://impulsojobs.com,https://www.impulsojobs.com

UPLOADS_DIR=/var/www/impulso-jobs/uploads

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=impulsowebjobs@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM="Impulso Jobs <impulsowebjobs@gmail.com>"

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2024-12-18.acacia

GOOGLE_CLIENT_ID=137355028824-pnrlrhge6ma3hf9rdfjbtmoqgtsn3mfe.apps.googleusercontent.com

ACCOUNT_RETENTION_DAYS=90
VACANCY_LIFETIME_DAYS=60
SUBSCRIPTION_EXPIRY_NOTICE_DAYS=7
SUBSCRIPTION_GRACE_PERIOD_DAYS=3
```

```bash
chmod 600 backend/.env
pnpm install
pnpm build
pnpm migration:run:prod
pnpm seed:prod -- --only=rbac,applications,plan-features
```

> Si el administrador no existe en esta base:
>
> ```bash
> SEED_ADMIN_EMAIL=admin@impulsojobs.com \
> SEED_ADMIN_PASSWORD='UNA_CLAVE_FUERTE' \
> pnpm seed:prod -- --only=admin
> ```
>
> `pnpm seed:prod` **no** resetea la contraseña de un admin existente. Para
> cambiarla: `SEED_ADMIN_PASSWORD=... SEED_ADMIN_RESET_PASSWORD=true`.

Arranca con PM2:

```bash
pm2 start dist/main.js --name impulso-api --update-env
pm2 save
pm2 startup systemd    # ejecuta el comando que imprima
```

### Nginx para la API

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

```bash
ln -s /etc/nginx/sites-available/impulso-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.impulsojobs.com
```

---

## 5. Frontend

### 5-A. SSR con PM2 (recomendado)

```bash
cd /var/www/impulso-jobs/frontend
pnpm install
pnpm build

PORT=4000 pm2 start dist/frontend/server/server.mjs \
  --name impulso-web --update-env
pm2 save
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
ln -s /etc/nginx/sites-available/impulso-web /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d impulsojobs.com -d www.impulsojobs.com
```

### 5-B. Estático con Nginx

```bash
cd /var/www/impulso-jobs/frontend
pnpm install
pnpm build
# Publica dist/frontend/browser en /var/www/impulso-jobs/web
rm -rf /var/www/impulso-jobs/web
cp -a dist/frontend/browser /var/www/impulso-jobs/web
```

`/etc/nginx/sites-available/impulso-web`:

```nginx
server {
    listen 80;
    server_name impulsojobs.com www.impulsojobs.com;

    root /var/www/impulso-jobs/web;
    index index.csr.html;

    # La portada va al listado de vacantes.
    location = / {
        return 301 /vacantes;
    }

    location / {
        try_files $uri $uri/ /index.csr.html;
    }
}
```

> `.htaccess` es de Apache: Nginx lo ignora. En modo estático el 301 y el
> fallback son las dos reglas de arriba. El guardia `scripts/check-dist.mjs`
> sigue evitando que se publiquen PDFs o un `index.html` viejo.

---

## 6. Uploads y respaldos

Si migras desde cPanel, copia la carpeta de archivos:

```bash
rsync -avz usuario@servidor-viejo:~/api/uploads/ \
  /var/www/impulso-jobs/uploads/
chown -R deploy:deploy /var/www/impulso-jobs/uploads
```

> `APP_PUBLIC_URL` debe estar definida **antes** de subir imágenes nuevas. Si ya
> hay filas con `localhost`, ejecuta `pnpm uploads:rehost:prod -- --confirm`.

Respaldos diarios (ejemplo en `/usr/local/bin/impulso-backup.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail
FECHA=$(date +%F)
mkdir -p /var/backups/impulso

# PostgreSQL
sudo -u postgres pg_dump impulso_jobs | gzip > \
  /var/backups/impulso/db-$FECHA.sql.gz

# MySQL (si aplica)
# mysqldump --single-transaction impulso_jobs | gzip > \
#   /var/backups/impulso/db-$FECHA.sql.gz

tar czf /var/backups/impulso/uploads-$FECHA.tar.gz \
  -C /var/www/impulso-jobs uploads

find /var/backups/impulso -type f -mtime +14 -delete
```

```bash
chmod +x /usr/local/bin/impulso-backup.sh
# crontab -e
0 3 * * * /usr/local/bin/impulso-backup.sh
```

Además, activa **snapshots semanales** del Droplet en DigitalOcean.

---

## 7. Cron de la aplicación

```bash
crontab -e
```

```cron
0 6 * * * cd /var/www/impulso-jobs/backend && /usr/bin/pnpm run billing:expire:prod >> /var/log/impulso-billing.log 2>&1
15 6 * * * cd /var/www/impulso-jobs/backend && /usr/bin/pnpm run vacancies:expire:prod >> /var/log/impulso-vacancies.log 2>&1
30 6 * * * cd /var/www/impulso-jobs/backend && /usr/bin/pnpm run views:consolidate:prod >> /var/log/impulso-views.log 2>&1
```

> Verifica la ruta real de `pnpm` con `which pnpm`. El comando debe ejecutarse
> desde `backend/` para que `dotenv` lea el `.env`.

---

## 8. Stripe

1. En el dashboard de Stripe, crea el endpoint:
   `https://api.impulsojobs.com/api/v1/payments/stripe/webhook`.
2. Eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `invoice.paid`
   - `customer.subscription.deleted`
3. Copia el `whsec_` a `backend/.env`.
4. Completa el onboarding de la cuenta (`charges_enabled` debe pasar a `true`).
5. Prueba tarjeta `4242 4242 4242 4242` y OXXO.

> La clave publicable (`pk_...`) no se usa: el checkout es alojado por Stripe.

---

## 9. Correo y Google

- **Correo:** `SMTP_USER=impulsowebjobs@gmail.com` y contraseña de aplicación de
  16 caracteres. Prueba registro, verificación y recuperación.
- **Google:** el Client ID debe coincidir en `backend/.env` y en
  `frontend/src/environments/environment.production.ts`. En Google Cloud,
  declara como orígenes autorizados:
  `https://impulsojobs.com`, `https://www.impulsojobs.com` y, si aplica,
  `https://demo.impulsojobs.com`.

---

## 10. Migración desde cPanel

1. **Base de datos:**
   - Si cPanel usa MySQL, mantén MySQL en DigitalOcean y migra con
     `mysqldump`/`mysql`.
   - Si quieres pasar a PostgreSQL, usa `pgloader` y valida tipos/fechas.
2. **Archivos:** copia `~/api/uploads/` (ver §6).
3. **Entorno:** recalcula `APP_WEB_URL`, `APP_PUBLIC_URL` y `CORS_ORIGIN`.
4. **Stripe:** el webhook apunta al mismo dominio `api.impulsojobs.com`; si
   cambia, actualízalo.
5. **Google:** añade los orígenes nuevos.
6. **DNS:** cambia los registros A y espera la propagación.
7. **Ventana de convivencia:** deja cPanel encendido hasta verificar el flujo
   completo; luego apágalo.

---

## 11. Verificación post-deploy

```bash
# API
curl -s https://api.impulsojobs.com/api/v1/plans | head -c 200

# Portada
curl -sI https://impulsojobs.com/ | head -n 3
# 301 + Location: /vacantes

# PDFs retirados
curl -sI "https://impulsojobs.com/legal/CIF%20CHRISTIAN-8.pdf" | head -n 1
curl -sI https://impulsojobs.com/legal/politica-privacidad.pdf | head -n 1
curl -sI https://impulsojobs.com/legal/terminos-condiciones.pdf | head -n 1
# los tres: 404

# Equipo
curl -s https://impulsojobs.com/nosotros | grep "Cristian Galaviz"
```

- [ ] Login con correo y con Google.
- [ ] Registro → verificación → recuperación.
- [ ] Flujo candidato: perfil, CV, postulación, guardadas.
- [ ] Flujo empresa: publicar, postulaciones, talento, promociones.
- [ ] Flujo admin: usuarios, empresas, roles, planes, pagos, legal.
- [ ] Compra de prueba en Stripe.
- [ ] Webhook de Stripe responde 200 (revisa el log de PM2).
- [ ] `GET /api/v1/payments/options` → `stripe` con `CARD, MSI, OXXO`.
- [ ] Correo de verificación y reset.
- [ ] Crons ejecutados (revisa `/var/log/impulso-*.log`).
- [ ] Respaldos generados.

---

## 12. Actualizaciones y rollback

```bash
cd /var/www/impulso-jobs
git pull

cd backend
pnpm install
pnpm build
pnpm migration:run:prod
pnpm seed:prod -- --only=rbac,applications,plan-features

cd ../frontend
pnpm install
pnpm build

pm2 reload impulso-api impulso-web
```

> Tras sembrar permisos, reinicia la API o llama a
> `POST /api/v1/permissions/refresh` con un token ADMIN.

**Rollback:** vuelve al commit anterior (`git checkout <hash>`), reconstruye y
recarga PM2; o restaura el snapshot del Droplet.

---

## 13. Pendientes de entrega

El checklist completo —incluidos los datos de demo, Stripe, correo y legal—
está en [`REVISION-ENTREGA.md`](REVISION-ENTREGA.md) §0.
