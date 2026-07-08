# Impulso Jobs

Plataforma de empleo compuesta por una API (NestJS) y una aplicación web (Angular con SSR), organizada como monorepo.

## 📁 Estructura

```
impulso-jobs/
├── backend/    # API REST — NestJS 11 (gestor: pnpm)
└── frontend/   # Aplicación web — Angular 20 + SSR (gestor: pnpm)
```

## 🧰 Stack

| Área      | Tecnología                          | Gestor |
|-----------|-------------------------------------|--------|
| Backend   | NestJS 11, TypeScript, Jest         | pnpm   |
| Frontend  | Angular 20, SSR (Express), Karma    | pnpm   |

## ✅ Requisitos previos

- **Node.js** ≥ 20 (probado con v22)
- **pnpm** — `npm install -g pnpm`

## 🚀 Puesta en marcha

Cada aplicación se instala y ejecuta de forma independiente.

### Backend (`backend/`)

```bash
cd backend
pnpm install
pnpm run start:dev      # modo desarrollo con recarga en caliente
```

La API queda disponible en `http://localhost:3000/`.

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

| Comando                    | Descripción                                   |
|----------------------------|-----------------------------------------------|
| `pnpm run start:dev`       | Backend en modo desarrollo (watch)            |
| `pnpm run lint`            | Lint + fix del backend (ESLint)               |
| `pnpm run format`          | Formatea el backend (Prettier)                |
| `pnpm start`               | Frontend en modo desarrollo (`ng serve`)      |
| `pnpm run watch`           | Build del frontend en watch (desarrollo)      |

## 📄 Documentación específica

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
