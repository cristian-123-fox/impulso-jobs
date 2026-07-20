# Despliegue en cPanel — Impulso Jobs

Guía para publicar el proyecto en un hosting **cPanel con Node.js (Passenger) + SSH**.

## Arquitectura

| Parte | Qué es | Dónde va |
|---|---|---|
| **Frontend** | Angular compilado como **SPA estática** | Dominio principal → `public_html/` (`tudominio.com`) |
| **Backend** | NestJS como **app Node.js** | Subdominio → `api.tudominio.com` |
| **Base de datos** | **MySQL** de cPanel | — |

> Reemplaza `tudominio.com` por tu dominio real en todos los pasos.

## Requisitos previos

- cPanel con **“Setup Node.js App”** y **Terminal / SSH**.
- **Node.js 20+** (se elige en el selector de la Node.js App).
- Poder crear **bases MySQL** y **subdominios**.

---

## 1) Base de datos MySQL

1. cPanel → **MySQL® Databases**.
2. Crea una base (queda como `usuario_impulso`), un usuario y su contraseña.
3. **Add User To Database** → concede **ALL PRIVILEGES**.
4. Anota: `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` (llevan el prefijo `usuario_`).

---

## 2) Backend (API) en `api.tudominio.com`

### 2.1 Subdominio

cPanel → **Domains / Subdomains** → crea `api.tudominio.com` apuntando a una carpeta, p. ej. `/home/usuario/impulso-api`.

### 2.2 Subir el código

- **Con Git (recomendado):** en **Terminal**, `git clone <repo> /home/usuario/impulso-api`.
- **Sin Git:** sube el contenido de `backend/` por File Manager/FTP.
- **NO subas** `node_modules` (se instala en el servidor Linux) ni `dist` (se compila en el servidor) ni `.env` (secretos).

### 2.3 Crear la Node.js App

cPanel → **Setup Node.js App** → **Create Application**:

| Campo | Valor |
|---|---|
| Node.js version | 20+ |
| Application mode | **Production** |
| Application root | carpeta del backend (`impulso-api`) |
| Application URL | `api.tudominio.com` |
| Application startup file | `dist/main.js` |

Guárdala (todavía no arrancará hasta el build).

### 2.4 Variables de entorno (`.env`)

Crea un `.env` en la carpeta del backend (usa `backend/.env.example` como plantilla) con **producción**:

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

APP_WEB_URL=https://tudominio.com
CORS_ORIGIN=https://tudominio.com
```

Genera secretos con: `openssl rand -hex 32` (uno distinto por cada `JWT_*_SECRET`).

### 2.5 Instalar, compilar y preparar la BD

En **Terminal**, entra al entorno virtual de la app (cPanel muestra el comando `source /home/usuario/nodevenv/.../bin/activate && cd ...` en “Setup Node.js App”), y ejecuta:

```bash
npm install -g pnpm        # una sola vez (o usa npm en su lugar)
pnpm install               # instala dependencias en Linux (bcryptjs, sin nativos)
pnpm run build             # compila a dist/

pnpm run migration:run:prod   # crea las tablas
pnpm run seed:rbac:prod       # roles y permisos (RBAC)
SEED_ADMIN_EMAIL=tu@correo.com SEED_ADMIN_PASSWORD='TuPass#123' pnpm run seed:admin:prod
```

### 2.6 Arrancar

**Setup Node.js App → Restart**. Verifica:

- `https://api.tudominio.com/api/v1` responde.
- `https://api.tudominio.com/docs` muestra Swagger.

---

## 3) Frontend (SPA) en el dominio principal

### 3.1 Apunta a la API

Edita `frontend/src/environments/environment.production.ts`:

```ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.tudominio.com/api/v1',
};
```

### 3.2 Compila (en tu máquina)

```bash
cd frontend
pnpm install
pnpm run build     # usa la config de producción (fileReplacements)
```

Salida: **`frontend/dist/frontend/browser/`** (incluye el `.htaccess` para el ruteo SPA).

### 3.3 Sube al dominio

Sube **todo el contenido** de `dist/frontend/browser/` a `public_html/` (o la carpeta del dominio principal). **Incluye el archivo `.htaccess`** (activa “mostrar archivos ocultos” en el File Manager si no lo ves).

### 3.4 SSL

cPanel → **SSL/TLS Status** → ejecuta **AutoSSL** para el dominio y el subdominio `api.`.

---

## 4) Verificación final

- `https://tudominio.com` carga la app y **navegar a rutas internas** (recargar en `/panel`, etc.) **no da 404** (gracias al `.htaccess`).
- Inicia sesión con el usuario admin sembrado.
- La API responde desde el subdominio y sin errores de CORS.

---

## Notas importantes

- ⚠️ **Correos (verificación / recuperación):** hoy el backend **solo escribe los enlaces en el log** (`ConsoleMailerAdapter`); **no envía correos reales**. Un usuario nuevo no recibirá el correo de verificación y **no podrá iniciar sesión** por el flujo normal. Opciones:
  1. Implementar un adaptador **SMTP** (nodemailer con la cuenta de correo de cPanel) — se puede agregar cuando quieras.
  2. Mientras tanto, usar los **seeders** para crear cuentas ya verificadas (`seed:admin:prod`, `seed:candidate:prod`, `seed:company:prod`).
- 🔁 **Redeploy del backend:** `git pull` (o subir cambios) → `pnpm install` → `pnpm run build` → `pnpm run migration:run:prod` → **Restart** en la Node.js App.
- 🔁 **Redeploy del frontend:** recompilar (`pnpm run build`) y resubir el contenido de `dist/frontend/browser/`.
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
