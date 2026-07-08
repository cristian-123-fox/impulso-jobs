# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

**[AGENTS.md](AGENTS.md) is the authoritative spec** — architecture, folder structure, domain map, security/RBAC model, conventions, and Definition of Done all live there. Read it first and follow it. This file only records where the current repo **diverges from that target** and the concrete commands, so it does not repeat AGENTS.md.

## Current state vs. the AGENTS.md target

The repo is an early scaffold and does not yet match AGENTS.md. Reconcile toward the spec as things are built; until then, note:

- Apps live in **`backend/`** and **`frontend/`**, not `apps/api` / `apps/web`. There is **no pnpm workspace root** and no `packages/api-contract` yet — each app is installed, built, and tested on its own (`cd` into it). The root scripts AGENTS.md references (`pnpm dev`, `gen:api`, …) do not exist.
- The backend DB layer supports **MySQL *and* PostgreSQL**, chosen at runtime by `DB_TYPE` (a MySQL/cPanel deployment is a target). AGENTS.md assumes Postgres only.
- Frontend is **Angular 20 with SSR**; Tailwind, the `ij-*` UI kit, and the `core/shared/layout/features` structure are not set up yet.
- Only the backend `common/` and `database/` layers plus the default `app.*` exist; the `modules/*` domains (iam, candidates, companies, vacancies, …) are not built yet.
- The implemented response envelope in `backend/src/common` (`{ success, statusCode, message, content | errors[] }`) differs from the error contract in AGENTS.md §6 (`{ statusCode, message, errorCode, details? }`); reconcile before building out modules.

## Commands

Both apps use pnpm. Backend on `:3000`, frontend on `:4200`.

- **Backend** (`cd backend`): `pnpm run start:dev` (watch) · `pnpm run build` · `pnpm run start:prod` (`node dist/main`) · `pnpm test` — single test: `pnpm test -- app.controller` or `pnpm test -- -t "name"` · `pnpm run test:e2e` · `pnpm run lint` · `pnpm run format`
- **Frontend** (`cd frontend`): `pnpm start` · `pnpm run build` · `pnpm test` · `pnpm run serve:ssr:frontend`

## Tooling notes (not in AGENTS.md)

- **Path aliases** use `@/` in both apps but with **different targets** — Backend: `@/*` → `src/*` (resolved by the Nest CLI at build, no `tsc-alias`; Jest via `moduleNameMapper`). Frontend: `@/*` → `src/app/*` (resolved by the Angular build from `tsconfig.json` `paths`). Prefer `@/…` over `../…` for cross-directory imports; keep `templateUrl`/`styleUrl` relative (the alias does not apply to component resource URLs).
- **pnpm 10 blocks native build scripts.** Approved ones are pinned per app under `package.json` → `pnpm.onlyBuiltDependencies` (backend: `bcrypt`; frontend: `esbuild`, `@parcel/watcher`, `lmdb`, `msgpackr-extract`). When adding a native dep, add it there and run `pnpm rebuild <pkg>`.
- **Frontend SSR:** `src/main.server.ts` must pass the `BootstrapContext` to `bootstrapApplication` (required since Angular 20.1) or the build fails at route extraction with `NG0401`.
- **cPanel:** `bcrypt` is a native module — install deps *on the Linux server* so it fetches the right prebuild, or switch to `bcryptjs`. Set `DB_TYPE=mysql` with `DB_SYNCHRONIZE=false` in production.
