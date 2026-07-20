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
```

Genera cada secreto con: `openssl rand -hex 32`.

### 5.3 Instala, compila y prepara la BD

```bash
npm install -g pnpm        # una sola vez (si falla por permisos, usa npm en su lugar)
pnpm install               # instala dependencias (bcryptjs puro, sin nativos)
pnpm run build             # compila a dist/

pnpm run migration:run:prod   # crea las tablas
pnpm run seed:rbac:prod       # roles y permisos (RBAC)
SEED_ADMIN_EMAIL=tu@correo.com SEED_ADMIN_PASSWORD='TuPass#123' pnpm run seed:admin:prod
```

> **Alternativa sin pnpm:** puedes usar `npm` directamente — `npm install` → `npm run build` → `npm run migration:run:prod`, etc. Los scripts son `node dist/...` y funcionan igual.

### 5.4 Arranca

**Setup Node.js App → Restart**. Verifica:

- `https://api.impulsojobs.com/api/v1` responde.
- `https://api.impulsojobs.com/docs` muestra Swagger.

---

## 6) Frontend (SPA) en `demo.impulsojobs.com`

### 6.1 Compila (en tu máquina)

`apiBaseUrl` ya apunta a `https://api.impulsojobs.com/api/v1`.

```bash
cd frontend
pnpm install
pnpm run build     # usa la config de producción (fileReplacements)
```

Salida: **`frontend/dist/frontend/browser/`** (incluye el `.htaccess` para el ruteo SPA).

### 6.2 Sube al subdominio

Sube **todo el contenido** de `dist/frontend/browser/` a la **carpeta del subdominio `demo`** (`~/demo`). **Incluye el `.htaccess`** (activa “mostrar archivos ocultos” en el File Manager, o sube un `.zip` y extráelo).

### 6.3 SSL

cPanel → **SSL/TLS Status** → **Run AutoSSL** para `demo.impulsojobs.com` **y** `api.impulsojobs.com`.

---

## 7) Verificación final

- `https://demo.impulsojobs.com` carga la app y **recargar en rutas internas** (`/panel`, etc.) **no da 404** (gracias al `.htaccess`).
- Inicia sesión con el usuario admin sembrado.
- La API responde desde el subdominio y **sin errores de CORS**.

---

## Notas importantes

- ⚠️ **Correos (verificación / recuperación):** hoy el backend **solo escribe los enlaces en el log** (`ConsoleMailerAdapter`); **no envía correos reales**. Un usuario nuevo no recibirá el correo de verificación y **no podrá iniciar sesión** por el flujo normal. Opciones:
  1. Implementar un adaptador **SMTP** (nodemailer con la cuenta de correo de cPanel) — se puede agregar cuando quieras.
  2. Mientras tanto, usar los **seeders** para cuentas ya verificadas (`seed:admin:prod`, `seed:candidate:prod`, `seed:company:prod`).
- 🧪 **El entorno virtual se activa por sesión:** cada Terminal nueva de la API requiere `source ~/nodevenv/api/.../bin/activate`.
- 🔁 **Redeploy del backend:** activar venv → `git pull` (o subir cambios) → `pnpm install` → `pnpm run build` → `pnpm run migration:run:prod` → **Restart** en la Node.js App.
- 🔁 **Redeploy del frontend:** recompilar (`pnpm run build`) y resubir el contenido de `dist/frontend/browser/` a `~/demo`.
- 🔐 **bcryptjs:** se cambió `bcrypt` (nativo) por `bcryptjs` (JS puro) → sin compilación en el servidor. Los hashes existentes siguen siendo válidos.
- 🚫 **Nunca subas** `node_modules`, el `dist` del backend, ni el `.env` con secretos.

## Scripts de producción (backend)

| Script | Qué hace |
|---|---|
| `pnpm run build` | Compila NestJS a `dist/` |
| `pnpm run start:prod` | Arranca `node dist/main` (Passenger lo hace por ti) |
| `pnpm run migration:run:prod` | Ejecuta migraciones (JS compilado, sin ts-node) |
| `pnpm run seed:rbac:prod` | Siembra roles/permisos |
| `pnpm run seed:admin:prod` | Crea/actualiza el admin |
| `pnpm run seed:candidate:prod` / `seed:company:prod` | Cuentas de prueba verificadas |
