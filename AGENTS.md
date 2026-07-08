# AGENTS.md — Impulso Jobs (monorepo)

Este archivo define **cómo debe trabajar cualquier agente de IA** en este monorepo. Es de cumplimiento obligatorio. **Impulso Jobs** es un portal de empleabilidad que conecta candidatos y empresas. El repositorio contiene **dos aplicaciones**: la API (NestJS) y la web (Angular: portal público + panel admin), más un paquete de contrato compartido.

---

## 1. Monorepo y stack

- Gestor: **pnpm workspaces**. Node LTS. **TypeScript estricto** en todo el repo (sin `any` salvo justificación).
- **Backend (`apps/api`)**: NestJS · TypeORM + PostgreSQL · Passport‑JWT · bcrypt · Swagger. Migraciones versionadas (`synchronize:false`).
- **Frontend (`apps/web`)**: Angular 17+ (standalone, Signals) · **Tailwind CSS** · RxJS · Reactive Forms tipados · `@angular/cdk` para comportamiento accesible (overlay/modal/listbox).
- **Contrato (`packages/api-contract`)**: tipos y cliente **generados desde el OpenAPI** del backend. La web NO escribe tipos de API a mano.
- Tooling compartido: ESLint + Prettier + Husky (pre-commit: lint + typecheck + test), Conventional Commits, Docker/compose.

## 2. Reglas de oro (globales)

1. **Respeta la estructura de carpetas** de las secciones 4–6. No inventes carpetas ni cambies la de otra app/módulo.
2. **La API es la única fuente de verdad del contrato.** El backend publica OpenAPI en `/docs` y `/docs-json`; el front consume `packages/api-contract`. **Cero lógica de negocio en el front.**
3. **Autorización SIEMPRE en el backend.** El front solo enruta/oculta según el rol que informa la API; nunca autoriza.
4. **Sin duplicar código.** Si algo se repite en 2+ lugares, súbelo a `common/` (api) o `shared/` (web) o `packages/`.
5. **Nombres de dominio idénticos** en ambas apps: candidate, company, vacancy, application, plan, promotion.
6. Lint, typecheck y tests deben pasar antes de dar una tarea por hecha.

---

## 3. Estructura del monorepo

```text
impulso-jobs/
├─ apps/
│  ├─ api/                 # Backend NestJS         (ver Sección 4)
│  └─ web/                 # Frontend Angular       (ver Sección 5)
├─ packages/
│  └─ api-contract/        # tipos + cliente generados desde el OpenAPI (compartido)
├─ pnpm-workspace.yaml
├─ package.json            # scripts raíz (dev, build, lint, test, gen:api)
├─ tsconfig.base.json      # paths y compilerOptions base
├─ docker-compose.yml      # api + db (+ web opcional)
├─ .editorconfig
└─ AGENTS.md
```

**Contrato (`packages/api-contract`)**: se regenera con `pnpm gen:api` (descarga `/docs-json` y corre `openapi-typescript`/`ng-openapi-gen`). La web importa desde `@impulso/api-contract`. Nunca edites a mano lo generado.

---

## 4. Backend — `apps/api`

### 4.1. Estructura (obligatoria)

```text
apps/api/src/
├─ common/                      # Transversal y reutilizable en TODOS los módulos
│  ├─ decorators/               # @CurrentUser, @RequirePermissions, @Roles
│  ├─ dto/                      # PaginationDto, PaginatedResponseDto, base responses
│  ├─ filters/                  # HttpExceptionFilter -> envoltura de error del contrato
│  ├─ interceptors/             # Logging, Transform (envoltura), Audit
│  ├─ types/                    # enums y tipos compartidos (Role, ErrorCode, TokenType)
│  └─ utils/                    # hashing, fechas, runInTransaction, helpers de paginación
│
├─ database/
│  ├─ migrations/               # migraciones TypeORM versionadas
│  ├─ database.module.ts        # registro del DataSource / TypeOrmModule
│  └─ typeorm.config.ts         # config del DataSource (para CLI y app)
│
├─ modules/
│  ├─ catalogs/                 # GRUPO de catálogos pequeños (un catálogo = un módulo)
│  │  ├─ identification-types/  # tipos de documento (CC, CE, PAS, NIT)
│  │  ├─ languages/             # idiomas (iso_code)
│  │  ├─ application-statuses/  # estados de postulación
│  │  ├─ education-levels/      # niveles de formación
│  │  └─ employment-types/      # tipos de empleo
│  ├─ iam/                      # GRUPO Identity & Access Management
│  │  ├─ auth/                  # login, refresh, reset, verificación de correo
│  │  ├─ users/                 # usuarios (raíz de identidad, tokens, blacklist)
│  │  ├─ roles/                 # roles
│  │  └─ permissions/           # permisos (component.action), components, actions
│  ├─ companies/               # perfil de empresa + company_users
│  ├─ candidates/              # perfil, experiencia, educación, idiomas, hoja de vida, configuración
│  ├─ vacancies/               # vacantes
│  ├─ applications/            # postulaciones + historial de estados
│  ├─ billing/                 # planes, beneficios, promoción de vacantes, órdenes
│  └─ audit/                   # servicio y persistencia de auditoría (audit_logs)
│
├─ app.module.ts
├─ app.controller.ts
├─ app.service.ts
└─ main.ts
```

### 4.2. Dónde va cada cosa (por módulo hoja `modules/<grupo>/<modulo>/`)

| Carpeta | Contiene | Regla |
|---|---|---|
| `entities/` | Entidades TypeORM (persistencia). | Solo mapeo a BD, sin lógica. |
| `repositories/` | Acceso a datos: clases que envuelven el repo de TypeORM con métodos de dominio. | **Único** punto que toca TypeORM. Extienden un `BaseRepository` de `common/`. |
| `services/` | Servicios de dominio reutilizables (reglas puras, `PasswordHasher`, `TokenService`, cálculos). | Reutilizables por varios use-cases. Sin HTTP. |
| `use-cases/` | Un caso de uso = una clase con `execute()`. Orquesta repos + services, transacción y auditoría. | Aquí vive la lógica de aplicación. Una responsabilidad por clase. |
| `controllers/` | Endpoints REST. Reciben DTO, llaman al use-case, devuelven respuesta. | Finos. Guards + `@ApiTags` de Swagger. |
| `dto/` | DTOs request/response (class-validator) + mapper entity→response. | Nunca exponer entidades TypeORM por HTTP. |
| `<modulo>.module.ts` | Cableado (providers, imports, exports, tokens de DI). | Bind de repos/services/use-cases. |

**Flujo:** `Controller` → `UseCase.execute(command)` → `Repository` (datos) + `Service` (reglas) → `Mapper` → `ResponseDto`. Transacción y auditoría se orquestan en el `UseCase`.

### 4.3. Anatomía de un módulo (plantilla)

```text
modules/<grupo>/<modulo>/
├─ controllers/    <modulo>.controller.ts
├─ dto/            create-<x>.dto.ts · update-<x>.dto.ts · <x>-response.dto.ts · <x>.mapper.ts
├─ entities/       <x>.entity.ts
├─ repositories/   <x>.repository.ts   (+ <x>.repository.interface.ts si se inyecta por token)
├─ services/       <x>.service.ts       (solo si hay lógica de dominio reutilizable)
├─ use-cases/      create-<x>.use-case.ts · update-<x>.use-case.ts · ...
└─ <modulo>.module.ts
```

Los repositorios se inyectan por **token** (p. ej. `USER_REPOSITORY`) para poder mockearlos en tests.

### 4.4. Mapa de dominios → carpetas

| Dominio / HU | Ubicación |
|---|---|
| Login, refresh, logout, reset de contraseña, verificación de correo | `modules/iam/auth/` |
| Usuarios (identidad, tokens, blacklist) | `modules/iam/users/` |
| Roles y permisos (RBAC), components, actions | `modules/iam/roles/`, `modules/iam/permissions/` |
| Registro empresa + perfil empresa + company_users | `modules/companies/` |
| Registro candidato + perfil + experiencia/educación/idiomas + hoja de vida + configuración | `modules/candidates/` |
| Vacantes (CRUD + estado) | `modules/vacancies/` |
| Postulaciones (aplicar, gestión, historial) | `modules/applications/` |
| Planes, beneficios, promoción de vacantes, órdenes | `modules/billing/` |
| Catálogos (tipos de documento, idiomas, estados, niveles, tipos de empleo) | `modules/catalogs/*` |
| Auditoría | `modules/audit/` + `common/interceptors/audit.interceptor.ts` |

> `POST /auth/register` vive en `iam/auth/` pero **orquesta** la creación en `companies/` o `candidates/` según `accountType`, en una transacción.

### 4.5. Seguridad, auditoría y datos

- **JWT** access corto + refresh largo (persistido en `tokens_users`). Revocados/expirados → `blacklist_tokens`. Tokens de un solo uso (reset/verificación) → JWT 30 min, a blacklist tras uso.
- **RBAC:** rol de plataforma (`ADMIN`/`EMPLOYER`/`CANDIDATE`) en `user_roles`, fuente del `PermissionsGuard`. `company_users.company_role` es rol *dentro* de la empresa.
- **Ownership** validado en el use-case (candidato solo lo suyo; empresa solo sus vacantes/postulaciones), con al menos una prueba negativa.
- **Auditoría** de crear/actualizar/eliminar vía `AuditService` → `audit_logs` (actor, acción, entidad, entity_id, ip, user_agent, diff?).
- **Transacciones** (registro, cambios de estado con historial) con `runInTransaction`/QueryRunner y rollback ante error.
- **Contraseña:** mínimo 8, 1 mayúscula, 1 minúscula, 1 número, 1 especial. bcrypt. Nunca texto plano.
- **Migraciones:** toda entidad/cambio de esquema requiere migración en `database/migrations/`. Sin `synchronize`.

---

## 5. Frontend — `apps/web` (portal público + admin, con Tailwind)

### 5.1. Estructura (obligatoria)

```text
apps/web/src/app/
├─ core/                    # Singletons (providedIn:'root'), se cargan una vez
│  ├─ auth/                 # AuthService, tokens, refresh, sesión
│  ├─ interceptors/         # jwt, error, loading
│  ├─ guards/               # authGuard, roleGuard(['ADMIN'|'EMPLOYER'|'CANDIDATE'])
│  ├─ services/             # config, toast, breakpoint
│  └─ models/               # enums de rol y errorCode, tipos globales
│
├─ shared/                  # UI KIT (Tailwind) + utilidades reutilizables
│  ├─ ui/                   # PRESENTACIONALES (prefijo ij-), OnPush, solo Tailwind
│  │  ├─ button/ input/ select/ card/ modal/ table/ badge/ pagination/
│  │  ├─ tabs/              # (usa @angular/cdk para comportamiento; estilo Tailwind)
│  │  ├─ pricing-card/      # ij-pricing-card (Essential / Pro / Premium)
│  │  ├─ empty-state/ spinner/
│  ├─ directives/ pipes/
│  ├─ validators/           # email, password (MISMA política del backend), fechas
│  └─ models/               # view-models compartidos
│
├─ layout/                  # SHELLS por área
│  ├─ public-layout/        # navbar + footer del portal
│  ├─ admin-layout/         # sidebar + topbar del admin
│  └─ auth-layout/          # layout minimal (login/registro/reset/verificación)
│
├─ features/
│  ├─ public/               # ===== PÁGINA WEB (portal) =====
│  │  ├─ home/ auth/ vacancies/ candidate/ company/ plans/
│  └─ admin/                # ===== PANEL ADMIN =====
│     ├─ dashboard/ users/ roles/ plans/ catalogs/ audit/
│     └─ admin.routes.ts
│
├─ app.component.ts
├─ app.config.ts            # providers: router, http + interceptors, cdk
└─ app.routes.ts           # rutas raíz: portal / auth / admin (lazy + roleGuard)
```

**Estructura interna de cada feature** (portal y admin igual):
```text
<feature>/
├─ pages/          # CONTAINERS (smart): rutas, hablan con la fachada
├─ components/     # PRESENTACIONALES (dumb): solo input()/output(), OnPush
├─ data/          # <feature>.api.ts (cliente de @impulso/api-contract) + <feature>.facade.ts
├─ models/
└─ <feature>.routes.ts
```

### 5.2. Tailwind (configuración y tokens)

**Instalación** (en `apps/web`):
```bash
pnpm add -D tailwindcss postcss autoprefixer && npx tailwindcss init
```
**`tailwind.config.js`** — content + colores de marca (naranja CTA + azul corporativo de los mockups):
```js
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand:   { DEFAULT: '#ff6a00', 600: '#e85f00' }, // CTA naranja
        ink:     { DEFAULT: '#1f3b73' },                  // azul corporativo
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { xl: '0.75rem' },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
```
**`src/styles.css`**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
> El theming se hace con los **tokens de `tailwind.config`** (colores `brand`/`ink`, fuente, radios). **Prohibido** hex hardcodeado en features: usa `bg-brand`, `text-ink`, etc.

### 5.3. Reglas del frontend (evitar deuda técnica)

- **Smart vs Dumb:** los containers (`pages/`) hablan con la fachada; los presentacionales solo `input()/output()`, `ChangeDetectionStrategy.OnPush`, y **no** inyectan servicios de datos.
- **Facade por feature:** una clase (o store con Signals) expone estado + acciones; un solo lugar por feature toca la API.
- **UI Kit único:** botones, cards, modales, tablas, tabs y la `pricing-card` se **componen** de piezas `ij-*` de `shared/ui/` (estilizadas con Tailwind y comportamiento vía `@angular/cdk`). Las features **no** reescriben estilos ni usan CDK directamente.
- **Cliente de API generado** desde `@impulso/api-contract` (no tipos a mano). Mapear DTO→ViewModel si la UI lo necesita.
- **Forms reactivos tipados**; validadores reutilizables en `shared/validators/` con la **misma política de contraseña** del backend.
- Estado del servidor con async pipe/Signals; nada de `subscribe` manual sin `takeUntilDestroyed`; `trackBy` en listas.
- Cada vista de datos tiene estados **loading / empty / error** explícitos.
- Ruteo con **lazy loading** y `roleGuard` por `canMatch`: el bundle del admin no se descarga si el usuario no es `ADMIN`.

### 5.4. Ruteo raíz por área (`app.routes.ts`)

```ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./layout/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/home/home.component').then(m => m.HomeComponent) },
      { path: 'vacantes', loadChildren: () => import('./features/public/vacancies/vacancies.routes').then(m => m.routes) },
      { path: 'candidato', canMatch: [roleGuard(['CANDIDATE'])], loadChildren: () => import('./features/public/candidate/candidate.routes').then(m => m.routes) },
      { path: 'empresa',   canMatch: [roleGuard(['EMPLOYER'])],  loadChildren: () => import('./features/public/company/company.routes').then(m => m.routes) },
      { path: 'planes',    loadChildren: () => import('./features/public/plans/plans.routes').then(m => m.routes) },
    ] },
  { path: 'auth', loadComponent: () => import('./layout/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    loadChildren: () => import('./features/public/auth/auth.routes').then(m => m.routes) },
  { path: 'admin', canMatch: [roleGuard(['ADMIN'])],
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.routes) },
  { path: '**', redirectTo: '' },
];
```

### 5.5. Feature → dominio backend

`candidate/` ↔ candidates · `company/` ↔ companies · `vacancies/` ↔ vacancies · `applications` (dentro de candidate/company) ↔ applications · `plans/` ↔ billing · admin `roles/` ↔ iam · admin `plans/` ↔ billing · admin `catalogs/` ↔ catalogs · admin `audit/` ↔ audit.

---

## 6. Convenciones compartidas

- **Contrato de API:** REST/JSON, base `/api/v1`. Error único `{ statusCode, message, errorCode, details? }` con `errorCode` enum estable. Paginación `{ page, pageSize, sort? }` → `{ items, page, pageSize, total }`. Fechas ISO‑8601 UTC. Moneda con `currency` explícito (COP).
- **Nombres:** archivos kebab-case con sufijo de rol (`login.use-case.ts`, `user.repository.ts`, `create-company.dto.ts`); clases PascalCase. BD snake_case, IDs UUID v4 (smallint en catálogos), `created_at`/`updated_at`/`deleted_at`.
- **TS estricto** en ambas apps. ESLint + Prettier + Husky. Conventional Commits.

## 7. Tests

- **Backend:** use-cases con mocks de repos/services (sin BD); repos en integración (docker); e2e de endpoints clave con prueba negativa de autorización/ownership.
- **Frontend:** unit de presentacionales (inputs/outputs) y de la facade; e2e del flujo principal por feature.

## 8. Definition of Done

- Lint, typecheck y tests en verde en la app afectada. Contrato regenerado si cambió la API.
- **Backend:** estructura respetada; TypeORM solo en `repositories/`; controller fino; lógica en use-cases; guards + ownership; auditoría y transacciones donde aplican; migración corre en base limpia; Swagger actualizado.
- **Frontend:** sin `any`; componentes OnPush; ningún presentacional inyecta servicios de datos; piezas reutilizadas del UI Kit (sin CSS duplicado); tipos desde `@impulso/api-contract`; estados loading/empty/error; theming con tokens de Tailwind (sin hex hardcodeado).

## 9. Haz / No hagas

**Haz** — reutiliza `common/`/`shared/`/`packages/`; un use-case por operación; inyecta repos por token; compón la UI del kit `ij-*`; genera tipos del OpenAPI.

**No hagas** — no pongas lógica en controllers ni consultes TypeORM fuera de `repositories/`; no autorices en el front; no crees carpetas fuera del patrón; no expongas entidades TypeORM por HTTP; no uses `synchronize:true` ni dejes cambios de esquema sin migración; no uses `@angular/cdk` ni hex de color directamente en features (van en el UI Kit / tokens).