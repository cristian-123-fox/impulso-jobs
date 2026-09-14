# Despliegue en cPanel — Impulso Jobs

Guía para publicar el proyecto en cPanel con **Node.js (Passenger) + SSH**.

## Arquitectura

| Parte | Qué es | Dónde va |
|---|---|---|
| **Frontend** | Angular compilado como **SPA estática** | Subdominio → `demo.impulsojobs.com` |
| **Backend** | NestJS como **app Node.js** | Subdominio → `api.impulsojobs.com` |
| **Base de datos** | **MySQL** de cPanel | — |

### Valores de este despliegue

| Variable | Valor |
|---|---|
| Web (frontend) | `https://demo.impulsojobs.com` |
| API (backend) | `https://api.impulsojobs.com` |
| `apiBaseUrl` (frontend) | `https://api.impulsojobs.com/api/v1` — ya fijado en `environment.production.ts` |
| `APP_WEB_URL` (.env API) | `https://demo.impulsojobs.com` |
| `CORS_ORIGIN` (.env API) | `https://demo.impulsojobs.com` |

## Requisitos previos

- cPanel con **“Setup Node.js App”** y **Terminal / SSH**.
- **Node.js 20+** (se elige al crear la Node.js App).
- Poder crear **bases MySQL** y **subdominios**.

> Nota DNS: además de los CNAME (`api` y `demo` → `impulsojobs.com`), en cPanel debes **crear ambos subdominios** (sección *Subdomains*) para que el servidor los enrute y les asigne carpeta.

---

## 1) Base de datos MySQL

1. cPanel → **MySQL® Databases**.
2. Crea una base (queda como `usuario_impulso`), un usuario y su contraseña.
3. **Add User To Database** → concede **ALL PRIVILEGES**.
4. Anota: `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` (llevan el prefijo `usuario_`).

---

## 2) Subdominios en cPanel

cPanel → **Domains / Subdomains**, crea los dos:

- `api` → `.impulsojobs.com` → carpeta p. ej. `api` (queda `~/api`).
- `demo` → `.impulsojobs.com` → deja su carpeta por defecto (p. ej. `~/demo`) — **anótala**, ahí va el frontend.

---

## 3) Subir el backend

Sube el contenido de `backend/` a la carpeta `~/api` (por **Git** o File Manager/FTP).

- **NO subas** `node_modules` (se instala en el servidor), `dist` (se compila en el servidor) ni `.env` (secretos).

---

## 4) Crear la Node.js App (API)

cPanel → **Setup Node.js App** → **Create Application**:

| Campo | Valor |
|---|---|
| Node.js version | **20 o superior** |
| Application mode | **Production** |
| Application root | `api` |
| Application URL | `api.impulsojobs.com` |
| Application startup file | `dist/main.js` |

Guárdala. Copia el comando **“Enter to the virtual environment”** que muestra arriba (algo como `source /home/USUARIO/nodevenv/api/20/bin/activate && cd /home/USUARIO/api`).

---

## 5) Terminal/SSH — configurar, compilar y sembrar

### 5.1 ⚠️ Activa el entorno virtual de Node (imprescindible)

`node`/`npm`/`npx` **solo existen dentro del entorno virtual** de la app. Si ves `bash: npm: command not found`, es porque no lo activaste.

Pega el comando del paso 4, o hazlo a mano:

```bash
ls ~/nodevenv/api/                              # muestra la versión, p. ej. 20
source ~/nodevenv/api/20/bin/activate && cd ~/api
node -v && npm -v                               # deben responder
```

> El entorno **no** queda activo entre sesiones: cada vez que abras una Terminal nueva para la API, vuelve a ejecutar el `source ~/nodevenv/api/.../bin/activate`.

### 5.2 Crea el `.env`

`nano .env` (usa `backend/.env.example` como referencia):

```env
NODE_ENV=production

DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=usuario_impulso
DB_PASSWORD=tu_password
DB_NAME=usuario_impulso
DB_SYNCHRONIZE=false

JWT_ACCESS_SECRET=<secreto largo aleatorio>
JWT_REFRESH_SECRET=<otro secreto largo aleatorio>

APP_WEB_URL=https://demo.impulsojobs.com
CORS_ORIGIN=https://demo.impulsojobs.com

# Archivos subidos (foto de perfil, logo, CV): almacenamiento LOCAL en disco.
# APP_PUBLIC_URL es la base de las URLs de imagen que se guardan en BD.
APP_PUBLIC_URL=https://api.impulsojobs.com

# Correo saliente (Resend). Sin RESEND_API_KEY los correos sólo van al log.
RESEND_API_KEY=re_<clave de https://resend.com/api-keys>
MAIL_FROM="Impulso Jobs <no-reply@impulsojobs.com>"
```

> ⚠️ **Entrecomilla todo valor con espacios o `<` `>`.** El wrapper de `node` del
> entorno virtual de CloudLinux lee el `.env` **como script de shell**, así que
> `MAIL_FROM=Impulso Jobs <no-reply@…>` hace que bash interprete el `<` como una
> redirección y ensucie cada invocación de `node` con
> `no-reply@…: No such file or directory`. Con comillas, dotenv y bash lo leen
> igual de bien. La alternativa es un remitente sin nombre visible
> (`MAIL_FROM=no-reply@impulsojobs.com`).

Genera cada secreto con: `openssl rand -hex 32`.

> ⚠️ **`APP_PUBLIC_URL` no es opcional.** La URL que compone se **guarda en la
> fila** (`companies.logo_url`, `candidate_profiles.profile_photo_url`), así que
> si falta, cada logo o foto que se suba queda con `http://localhost:3000/...`:
> el archivo sí se escribe en disco, pero el navegador no puede abrirlo y
> *parece* que la subida no se guardó (fue el bug T23 de la demo). Con
> `NODE_ENV=production` y sin la variable, el backend **no arranca** y lo dice
> por consola. Si ya hay filas rotas, definirla no las repara: hay que
> reescribirlas con `pnpm uploads:rehost` (§ 5.5).

> **Archivos subidos:** viven en `~/api/uploads/` (se crea solo). `uploads/public/`
> se sirve en `https://api.impulsojobs.com/uploads/...` (fotos y logos);
> `uploads/candidate-resumes/` es privado — los CV solo bajan por endpoint con
> JWT. El deploy es `git pull` + build, así que la carpeta **sobrevive a los
> deploys**; no la borres al limpiar, y inclúyela en los respaldos de cPanel.

### 5.3 Instala, compila y prepara la BD

```bash
npm install -g pnpm        # una sola vez (si falla por permisos, usa npm en su lugar)
pnpm install               # instala dependencias (bcryptjs puro, sin nativos)
pnpm run build             # compila a dist/

pnpm run migration:run:prod   # crea las tablas y siembra los catálogos que van por migración

# Un solo comando: RBAC + catálogos + administrador. Idempotente.
SEED_ADMIN_EMAIL=tu@correo.com SEED_ADMIN_PASSWORD='TuPass#123' pnpm run seed:prod
```

> `seed:prod` **no** crea las cuentas de prueba (candidato/empresa): con `NODE_ENV=production` las bloquea a propósito. Si las necesitas en un entorno de pruebas, `pnpm run seed:demo:prod`.

> **Alternativa sin pnpm:** puedes usar `npm` directamente — `npm install` → `npm run build` → `npm run migration:run:prod`, etc. Los scripts son `node dist/...` y funcionan igual.

### 5.4 Arranca

**Setup Node.js App → Restart**. Verifica:

- `https://api.impulsojobs.com/api/v1` responde.
- `https://api.impulsojobs.com/docs` muestra Swagger.

### 5.5 Si ya se subieron imágenes sin `APP_PUBLIC_URL`

Reescribe el host de las filas afectadas (**simula por defecto**, sólo escribe
con `--confirm`). Toca únicamente lo que subió el propio backend
(`/uploads/<carpeta>/<uuid>.<ext>`); las URLs externas se quedan como están.
No mueve archivos: los de disco ya están en su sitio.

```bash
source ~/nodevenv/api/20/bin/activate && cd ~/api
pnpm run uploads:rehost:prod                 # simulación: lista lo que cambiaría
pnpm run uploads:rehost:prod -- --confirm    # aplica
```

Sirve igual el día que cambie el dominio del API. Si alguna empresa tiene un
logo con URL externa legítima, acota con `-- --from=http://localhost:3000`.

> **Comprueba también que `~/api/uploads/` sobrevivió al último deploy** —
> `ls ~/api/uploads/public/company-logos | head`. Es una carpeta ignorada por
> git, así que un `git pull` no la toca; lo que sí la borra es limpiar el
> directorio a mano o recrear la app. Inclúyela en los respaldos de cPanel.

---

## 6) Frontend en `demo.impulsojobs.com`

> ⚠️ **Desde T16 (SEO) el build vuelve a ser SSR** (`outputMode: server` en `angular.json`): la lista y el detalle de vacantes se renderizan en el servidor con meta/OG/JSON-LD, igual que las landings `/trabajo/<area>-en-<estado>`. Eso pide desplegar el frontend como **app Node** (opción A). La opción estática (B) sigue funcionando pero **pierde el SSR** — los crawlers vuelven a recibir el cascarón CSR.

### 6.1 Compila (en tu máquina)

`apiBaseUrl` ya apunta a `https://api.impulsojobs.com/api/v1` y `siteUrl` (canonical/OG) a `https://demo.impulsojobs.com`. Si el dominio cambia, ajusta **ambos** en `environment.production.ts` y añade el hostname a `security.allowedHosts` de `angular.json` (sin él, el motor SSR de Angular 20 rechaza el host y sirve CSR).

```bash
cd frontend
pnpm install
pnpm run build     # usa la config de producción (fileReplacements)
```

Salida: `frontend/dist/frontend/` con **`browser/`** (estáticos + rutas prerenderizadas) y **`server/`** (el servidor SSR, `server.mjs`).

### 6.2-A Despliegue SSR (recomendado — habilita el SEO de T16)

Igual que la API: cPanel → **Setup Node.js App** sobre la carpeta del subdominio `demo`, sube `dist/frontend/` completo, **Application startup file** = `server/server.mjs` (Passenger fija el `PORT` solo). El ruteo lo hace el servidor Node.

> El `.htaccess` viaja dentro de `browser/`, no en la raíz de la app, así que Apache no lo lee y no estorba. Lo que **sí** rompe es mezclar los dos modos: si además copias el contenido de `browser/` a la raíz del subdominio, Apache empieza a atender las rutas con ese `.htaccess` en vez de Passenger. Elige A **o** B, no las dos.

### 6.2-B Despliegue estático (sin SSR)

Sube el contenido de `dist/frontend/browser/` a `~/demo` **incluyendo el `.htaccess`**, que ya viene con el fallback correcto (`index.csr.html`). No hay ningún paso manual.

> ⚠️ **No cambies ese fallback a `index.html`.** Con `outputMode: server`, el `index.html` de la raíz **no** es el cascarón de la app: son 249 bytes con un `<meta http-equiv="refresh" url="/vacantes">`, resultado de prerenderizar la ruta `''` que redirige a `vacantes`. Como `/vacantes` es `RenderMode.Server` y **no se prerenderiza**, el fallback lo atiende: devuelve el stub, el stub redirige a `/vacantes`, y así indefinidamente. Es un **bucle infinito de redirecciones** y el sitio no carga nunca.

> ⚠️ **HTTPS por duplicado.** Si activas *Force HTTPS Redirect* en cPanel, deja comentado el bloque `RewriteCond %{HTTPS} off` del `.htaccess`. Las dos reglas a la vez producen otro bucle.

### 6.3 SSL

cPanel → **SSL/TLS Status** → **Run AutoSSL** para `demo.impulsojobs.com` **y** `api.impulsojobs.com`.

---

## 7) Verificación final

- `https://demo.impulsojobs.com` carga y **recargar en rutas internas** (`/vacantes`, `/nosotros`, `/planes`) **no da 404 ni entra en bucle de redirecciones**.
- Comprueba el modo desde tu máquina: `curl -sI https://demo.impulsojobs.com/vacantes` debe responder `200`, y `curl -s https://demo.impulsojobs.com/vacantes | head -c 200` **no** debe contener `http-equiv="refresh"`. Si lo contiene, el fallback del `.htaccess` está mal (§6.2-B).
- En SSR (opción A), `curl -s https://demo.impulsojobs.com/vacantes` debe traer las vacantes ya renderizadas (busca `app-vacancy-card`). Si sólo ves el cascarón, el SSR no está activo: revisa que el *startup file* sea `server/server.mjs` y que el hostname esté en `security.allowedHosts` de `angular.json`.
- Inicia sesión con el usuario admin sembrado.
- La API responde desde el subdominio y **sin errores de CORS**.

---

## Notas importantes

- ✉️ **Correos (verificación / recuperación / notificaciones):** el proveedor es **Resend** y se activa **sólo con variables de entorno**, sin tocar código. `MailerModule` elige adaptador en este orden: `RESEND_API_KEY` → Resend · `SMTP_HOST` → SMTP con nodemailer (legado) · ninguna de las dos → consola, que **escribe el enlace en el log y no envía nada**. Al arrancar, el log dice cuál quedó activo (`[MailerModule] Correo: Resend`).
  1. Crea la clave en <https://resend.com/api-keys> (basta permiso *Sending access*) y ponla en `RESEND_API_KEY`.
  2. **Verifica el dominio** en Resend (añade los registros SPF y DKIM en el DNS del dominio en cPanel) y pon el remitente en `MAIL_FROM`. Si el dominio no está verificado, la API rechaza el envío: el correo **no sale** y el fallo queda en el log (es best-effort, no rompe el registro ni el reset).
  3. Ventaja sobre SMTP en cPanel: es HTTPS saliente, así que **no depende de que el hosting deje abierto el puerto 587**.
  4. Sin correo configurado, usa los **seeders** para cuentas ya verificadas (`seed:admin:prod`, `seed:candidate:prod`, `seed:company:prod`).
- 🧪 **El entorno virtual se activa por sesión:** cada Terminal nueva de la API requiere `source ~/nodevenv/api/.../bin/activate`.
- 🔁 **Redeploy del backend:** activar venv → `git pull` (o subir cambios) → `pnpm install` → `pnpm run build` → `pnpm run migration:run:prod` → `pnpm run seed:prod` → **Restart** en la Node.js App.
  > `seed:prod` es idempotente y hay que ejecutarlo **siempre**: si la versión nueva añadió permisos (p. ej. `users.create`, `companies.create`), sin él los endpoints responden `403 PERMISSION_DENIED` aunque el código esté desplegado.
  >
  > ⚠️ **El Restart no es opcional y va después del seed.** La app cachea el mapa rol→permisos en memoria (`PermissionsService`) y el seed escribe en la BD por fuera del proceso: sin reiniciar, los permisos nuevos siguen dando `403` aunque la BD ya esté bien. Es el fallo que más tiempo hace perder aquí.
- 🔁 **Redeploy del frontend:** recompilar (`pnpm run build`) y resubir `dist/frontend/` (SSR, opción A: **Restart** de su Node.js App) o `dist/frontend/browser/` (estático, opción B).
- 🔐 **bcryptjs:** se cambió `bcrypt` (nativo) por `bcryptjs` (JS puro) → sin compilación en el servidor. Los hashes existentes siguen siendo válidos.
- 🚫 **Nunca subas** `node_modules`, el `dist` del backend, ni el `.env` con secretos.

## Scripts de producción (backend)

| Script | Qué hace |
|---|---|
| `pnpm run build` | Compila NestJS a `dist/` |
| `pnpm run start:prod` | Arranca `node dist/main` (Passenger lo hace por ti) |
| `pnpm run migration:run:prod` | Ejecuta migraciones (JS compilado, sin ts-node) |
| `pnpm run seed:prod` | **Todas las semillas de un tirón**: roles/permisos, catálogos y admin. Idempotente |
| `pnpm run seed:demo:prod` | Lo anterior + cuentas de prueba. Con `NODE_ENV=production` exige `-- --force` |
| `pnpm run seed:rbac:prod` | Sólo roles/permisos (sigue existiendo; `seed:prod` ya lo incluye) |
| `pnpm run seed:admin:prod` | Sólo el admin |
| `pnpm run seed:candidate:prod` / `seed:company:prod` | Sólo las cuentas de prueba verificadas |
| `pnpm run billing:expire:prod` | Caduca promociones vencidas y revierte los distintivos |
| `pnpm run vacancies:expire:prod` | Cierra vacantes cuya vigencia (`VACANCY_LIFETIME_DAYS`, 60 por defecto) venció |
| `pnpm run views:consolidate:prod` | Suma los eventos de vista al contador `views_count` de cada vacante |
| `pnpm run uploads:rehost:prod` | Reescribe el host de las URLs de imagen ya guardadas (§ 5.5). Simulación salvo `-- --confirm` |

## Tareas programadas (cron)

Ninguno de los jobs corre solo: prográmalos en **cPanel → Cron Jobs** (una vez al día es suficiente). Recuerda activar el entorno virtual de Node de la app (§5.1) dentro del comando, por ejemplo:

```bash
0 6 * * * source /home/USUARIO/nodevenv/api/22/bin/activate && cd /home/USUARIO/api && pnpm run billing:expire:prod >> ~/logs/billing-expire.log 2>&1
15 6 * * * source /home/USUARIO/nodevenv/api/22/bin/activate && cd /home/USUARIO/api && pnpm run vacancies:expire:prod >> ~/logs/vacancies-expire.log 2>&1
30 6 * * * source /home/USUARIO/nodevenv/api/22/bin/activate && cd /home/USUARIO/api && pnpm run views:consolidate:prod >> ~/logs/views-consolidate.log 2>&1
```

La purga de cuentas (`purge:accounts:prod`) y el rehost de imágenes (`uploads:rehost:prod`) son deliberadamente manuales (simulación por defecto, `-- --confirm` para escribir).
