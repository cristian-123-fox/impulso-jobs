# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

**[AGENTS.md](AGENTS.md) is the authoritative spec** — architecture, folder structure, domain map, security/RBAC model, conventions, and Definition of Done all live there. Read it first and follow it. This file only records where the current repo **diverges from that target** and the concrete commands, so it does not repeat AGENTS.md.

## Current state vs. the AGENTS.md target

AGENTS.md describes the **target**. These are the deliberate, still-standing divergences (structure and layering inside each app already follow the spec):

- Apps live in **`backend/`** and **`frontend/`**, not `apps/api` / `apps/web`. There is **no pnpm workspace root** and no `packages/api-contract` — each app is installed, built, and tested on its own (`cd` into it), and there are no root-level scripts. The frontend therefore **hand-writes its API types** under each feature's `models/` (see `core/models/api-response.models.ts`), derived from the Swagger.
- The backend DB layer supports **MySQL *and* PostgreSQL**, chosen at runtime by `DB_TYPE` (MySQL/cPanel is the live deployment). IDs are **app-generated UUID v4 stored as `varchar(36)`** (`common/entities/base.entity.ts`) so the schema is portable — no `uuid` column type, no DB extension.
- Password hashing uses **`bcryptjs`** (pure JS), not `bcrypt` — chosen so cPanel needs no native build.
- **Response envelope** is `{ success, statusCode, message, content }` / `{ success, statusCode, message, errorCode?, errors[] }` (`common/types/api-response.types.ts`), not the flat shape in AGENTS.md §6. `errorCode` comes from `common/types/error-code.enum.ts` and is the stable contract the frontend switches on.
- **Catalogs are not a `modules/catalogs/` group.** MX states/municipios, SAT tax regimes and CFDI uses are embedded constants in `backend/src/common/catalogs/` (mirrored in `frontend/src/app/shared/catalogs/mx.catalogs.ts`); `languages` is an entity inside `modules/candidates/`.
- `POST /auth/register` lives in its own **`modules/iam/registration/`**, not inside `iam/auth/`.
- Frontend adds two areas AGENTS.md does not list: **`features/panel/`** (prototype dashboard shell, mock data in `panel.facade.ts`, but its candidate/company profile, resumes and settings sub-components hit the real API) and **`features/company/`** + `layout/company-layout/`.

### What is built (Aug 2026)

- **Backend** — `modules/`: `iam/{auth,users,roles,permissions,registration}`, `candidates`, `companies`, `vacancies`, `audit`. 16 controllers, 37 use-cases, 10 migrations, 24 unit specs. Swagger at `/docs` + `/docs-json`, global prefix `/api/v1`.
- **Not built** — `modules/applications/` (postulaciones), `modules/billing/` (planes, Stripe, promociones, suscripciones), notifications, screening questions, talent bank, AI. No e2e tests yet.
- **Frontend** — public portal (home, vacantes, planes, nosotros, contacto, faq, mantenimiento), auth (login, registro empresa/candidato, reset, verificación), `/admin` (usuarios, empresas, roles), `/empresa/vacantes`, `/panel`. UI kit is `ij-{input,select,multiselect,autocomplete,datepicker,textarea,modal,badge,button,icon,logo,pricing-card}` — **no** `ij-table`/`card`/`pagination`/`tabs`/`spinner`/`empty-state` yet (admin uses a local `admin-pagination`, panel a local `data-table`).

## Commands

Both apps use pnpm. Backend on `:3000` (`/api/v1`, docs at `/docs`), frontend on `:4200`.

- **Backend** (`cd backend`): `pnpm run start:dev` (watch) · `pnpm run build` · `pnpm run start:prod` (`node dist/main`) · `pnpm test` — single test: `pnpm test -- app.controller` or `pnpm test -- -t "name"` · `pnpm run test:e2e` · `pnpm run lint` · `pnpm run format`
- **Backend DB** (`cd backend`): `pnpm run migration:run` · `pnpm run migration:revert` · seeds `pnpm run seed:rbac` (roles + matriz de permisos), `seed:admin`, `seed:candidate`, `seed:company`. Each has a `:prod` twin that runs the compiled `dist/` version. **Re-run `seed:rbac` after adding any permission code** — the guard reads the DB, not the source list.
- **Frontend** (`cd frontend`): `pnpm start` · `pnpm run build` · `pnpm test` · `pnpm run serve:ssr:frontend`

## Tooling notes (not in AGENTS.md)

- **Path aliases** use `@/` in both apps but with **different targets** — Backend: `@/*` → `src/*` (resolved by the Nest CLI at build, no `tsc-alias`; Jest via `moduleNameMapper`). Frontend: `@/*` → `src/app/*` (resolved by the Angular build from `tsconfig.json` `paths`). Prefer `@/…` over `../…` for cross-directory imports; keep `templateUrl`/`styleUrl` relative (the alias does not apply to component resource URLs).
- **pnpm 10 blocks native build scripts.** Approved ones are pinned per app under `package.json` → `pnpm.onlyBuiltDependencies` (backend: none — the list is empty on purpose, there are no native deps; frontend: `esbuild`, `@parcel/watcher`, `lmdb`, `msgpackr-extract`). When adding a native dep, add it there and run `pnpm rebuild <pkg>`.
- **Frontend SSR:** `src/main.server.ts` must pass the `BootstrapContext` to `bootstrapApplication` (required since Angular 20.1) or the build fails at route extraction with `NG0401`. `/auth/**` is prerendered, so any API call on init must go inside `afterNextRender`.
- **cPanel:** the frontend deploys as a **static SPA** and the backend as a Node app on a subdomain — see [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md). Set `DB_TYPE=mysql` with `DB_SYNCHRONIZE=false` in production and run `migration:run:prod` + the `:prod` seeds. **No SMTP yet** — `MAILER_PORT` is bound to `ConsoleMailerAdapter`, which logs the verification/reset link instead of sending it. Swap the adapter binding in `auth.module.ts` when credentials exist.
