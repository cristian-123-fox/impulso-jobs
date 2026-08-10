# Impulso Jobs

Portal de empleabilidad para **México** que conecta candidatos y empresas. Compuesto por una API (NestJS) y una aplicación web (Angular con SSR).

📖 **Documentación funcional y de arquitectura:** empieza por [README_CONTEXTO.md](README_CONTEXTO.md) (índice + estado del desarrollo) y [AGENTS.md](AGENTS.md) (arquitectura y convenciones).

## 📁 Estructura

```
impulso-jobs/
├── backend/    # API REST — NestJS 11 (gestor: pnpm)
├── frontend/   # Aplicación web — Angular 20 + SSR (gestor: pnpm)
└── template/   # HTML de referencia para la maquetación (no se compila)
```

## 🧰 Stack

| Área      | Tecnología                                             | Gestor |
|-----------|--------------------------------------------------------|--------|
| Backend   | NestJS 11, TypeORM, PostgreSQL **o** MySQL, JWT, Swagger, Jest | pnpm |
| Frontend  | Angular 20, SSR (Express), Tailwind CSS 3, Angular CDK, Karma | pnpm |

## ✅ Requisitos previos

- **Node.js** ≥ 20 (probado con v22)
- **pnpm** — `npm install -g pnpm`
- **PostgreSQL** o **MySQL** con una base vacía creada

## 🚀 Puesta en marcha

Cada aplicación se instala y ejecuta de forma independiente.

### Backend (`backend/`)

```bash
cd backend
pnpm install
cp .env.example .env    # ajusta DB_TYPE, credenciales y secretos JWT
pnpm run migration:run  # crea el esquema
pnpm run seed:rbac      # roles + matriz de permisos (imprescindible)
pnpm run seed:admin     # usuario administrador inicial
pnpm run start:dev      # modo desarrollo con recarga en caliente
```

La API queda disponible en `http://localhost:3000/api/v1` y la documentación Swagger en `http://localhost:3000/docs`.

> `seed:rbac` es obligatorio: el guard de permisos lee la matriz desde la base de datos. Vuelve a ejecutarlo cada vez que se agregue un permiso.
> Seeds opcionales con datos de ejemplo: `pnpm run seed:candidate` y `pnpm run seed:company`.

### Frontend (`frontend/`)

```bash
cd frontend
pnpm install
pnpm start              # equivale a: ng serve
```

La aplicación queda disponible en `http://localhost:4200/` y recarga automáticamente al modificar el código.

## 🏗️ Build de producción

```bash
# Backend
cd backend && pnpm run build      # salida en backend/dist/

# Frontend
cd frontend && pnpm run build     # salida en frontend/dist/
```

Para servir el frontend con SSR tras el build:

```bash
cd frontend && pnpm run serve:ssr:frontend
```

## 🧪 Tests

```bash
# Backend (Jest)
cd backend && pnpm test           # unitarios
cd backend && pnpm run test:e2e   # end-to-end
cd backend && pnpm run test:cov   # cobertura

# Frontend (Karma + Jasmine)
cd frontend && pnpm test
```

## 📝 Scripts útiles

| Comando                    | App      | Descripción                                          |
|----------------------------|----------|------------------------------------------------------|
| `pnpm run start:dev`       | backend  | Modo desarrollo (watch)                              |
| `pnpm run migration:run`   | backend  | Aplica las migraciones pendientes                    |
| `pnpm run migration:revert`| backend  | Revierte la última migración                         |
| `pnpm run seed:rbac`       | backend  | Siembra roles, permisos y la matriz                  |
| `pnpm run seed:admin`      | backend  | Crea el usuario administrador                        |
| `pnpm run lint`            | backend  | Lint + fix (ESLint)                                  |
| `pnpm run format`          | backend  | Formatea (Prettier)                                  |
| `pnpm start`               | frontend | Modo desarrollo (`ng serve`)                         |
| `pnpm run watch`           | frontend | Build en watch (desarrollo)                          |

Los scripts de base de datos tienen un gemelo `:prod` (`migration:run:prod`, `seed:rbac:prod`, …) que ejecuta la versión compilada de `dist/`.

## 📄 Documentación específica

- [README_CONTEXTO.md](README_CONTEXTO.md) — índice de la documentación y estado del desarrollo
- [AGENTS.md](AGENTS.md) — arquitectura, convenciones y Definition of Done
- [CLAUDE.md](CLAUDE.md) — notas de tooling y divergencias respecto al objetivo
- [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md) — despliegue en producción
- [backend/README.md](backend/README.md) · [frontend/README.md](frontend/README.md)
