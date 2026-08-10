# AGENTS.md — Impulso Jobs

Este archivo define **cómo debe trabajar cualquier agente de IA** en este repositorio. Es de cumplimiento obligatorio. **Impulso Jobs** es un portal de empleabilidad para **México** que conecta candidatos y empresas, con monetización por planes. El repositorio contiene **dos aplicaciones**: la API (`backend/`, NestJS) y la web (`frontend/`, Angular: portal público + área de empresa + back-office).

**Antes de codificar:** lee la §10 (estado real y qué sigue) y consulta `README_CONTEXTO.md` para el índice de la especificación funcional.

---

## 1. Repositorio y stack

> **Estado a agosto 2026.** Lo marcado *(pendiente)* es objetivo, no realidad. Ver §10 para el mapa de avance.

- Gestor: **pnpm**, una instalación por app (no hay workspace raíz — *pendiente*). Node ≥ 20. **TypeScript estricto** en todo el repo (sin `any` salvo justificación).
- **Backend (`backend/`)**: NestJS 11 · TypeORM · **PostgreSQL o MySQL** según `DB_TYPE` · Passport‑JWT · **bcryptjs** · Swagger en `/docs` y `/docs-json`. Prefijo global `/api/v1`. Migraciones versionadas (`synchronize:false`).
- **Frontend (`frontend/`)**: Angular 20 standalone + **SSR** (Express) · Signals · **Tailwind CSS 3** · RxJS · Reactive Forms tipados · `@angular/cdk` para comportamiento accesible (overlay/modal/listbox).
- **Contrato (`packages/api-contract`) — *pendiente*.** Mientras no exista, el front **tipa a mano** el envelope en `core/models/api-response.models.ts` y los DTO en el `models/` de cada feature. Al crearlo, esos tipos se reemplazan por los generados.
- Tooling: ESLint + Prettier por app, Conventional Commits. Husky y Docker/compose: *pendientes*.

## 2. Reglas de oro (globales)

1. **Respeta la estructura de carpetas** de las secciones 4–6. No inventes carpetas ni cambies la de otra app/módulo.
2. **La API es la única fuente de verdad del contrato.** El backend publica OpenAPI en `/docs` y `/docs-json`. **Cero lógica de negocio en el front.** Mientras `packages/api-contract` no exista, los tipos del front se escriben a mano pero **se derivan del Swagger**, nunca al revés.
3. **Autorización SIEMPRE en el backend.** El front solo enruta/oculta según el rol que informa la API; nunca autoriza.
4. **Sin duplicar código.** Si algo se repite en 2+ lugares, súbelo a `common/` (api) o `shared/` (web) o `packages/`.
5. **Nombres de dominio idénticos** en ambas apps: candidate, company, vacancy, application, plan, promotion.
6. Lint, typecheck y tests deben pasar antes de dar una tarea por hecha.

---

## 3. Estructura del repositorio

```text
impulso-jobs/
├─ backend/                # API NestJS            (ver Sección 4)
├─ frontend/               # Web Angular + SSR     (ver Sección 5)
├─ template/               # HTML de referencia (Jobzilla) — solo maquetación, no se compila
├─ AGENTS.md · CLAUDE.md · README.md · README_CONTEXTO.md
├─ DEPLOY-CPANEL.md
└─ Impulso_Jobs_*.md       # especificación funcional (ER, roles, planes, México, Stripe)
```

Cada app se instala, compila y prueba por separado (`cd backend` / `cd frontend`). **No hay** `pnpm-workspace.yaml`, `package.json` raíz, `tsconfig.base.json` ni `docker-compose.yml`.

**Alias de rutas:** `@/` en ambas apps, con destinos distintos — backend `@/*` → `src/*`, frontend `@/*` → `src/app/*`. Úsalo en lugar de `../../`; no aplica a `templateUrl`/`styleUrl`.

**Contrato (`packages/api-contract`) — *pendiente*.** Cuando se cree, se regenerará con `pnpm gen:api` (descarga `/docs-json` y corre `openapi-typescript`/`ng-openapi-gen`) y la web importará desde `@impulso/api-contract`. Nunca edites a mano lo generado.

---

## 4. Backend — `backend/`

### 4.1. Estructura (obligatoria)

`✅` construido · `🕓` pendiente.

```text
backend/src/
├─ common/                      # Transversal y reutilizable en TODOS los módulos
│  ├─ catalogs/              ✅ # constantes MX: mx-states, sat-tax-regimes, sat-cfdi-uses
│  ├─ decorators/            ✅ # @CurrentUser, @RequirePermissions, @ClientInfo, @ResponseMessage
│  ├─ dto/                   ✅ # PaginationQueryDto, PaginatedResponseDto
│  ├─ entities/              ✅ # BaseEntity (id varchar(36) UUID v4 + timestamps + soft delete)
│  ├─ exceptions/            ✅
│  ├─ filters/               ✅ # AllExceptionsFilter -> envoltura de error del contrato
│  ├─ interceptors/          ✅ # ResponseInterceptor (envoltura de éxito)
│  ├─ repositories/          ✅ # BaseRepository
│  ├─ types/                 ✅ # ApiResponse, ErrorCode, Role, TokenType, UserStatus
│  └─ utils/                 ✅ # password (bcryptjs + política), mx-identifiers, search, transaction
│
├─ database/                 ✅
│  ├─ migrations/               # migraciones TypeORM versionadas (10 a la fecha)
│  ├─ database.module.ts        # DataSource / TypeOrmModule (Postgres o MySQL vía DB_TYPE)
│  ├─ typeorm.config.ts         # config del DataSource (CLI y app)
│  ├─ run-migrations.ts         # runner (`migration:run` / `migration:revert`)
│  └─ seed-{rbac,admin,candidate,company}.ts
│
├─ modules/
│  ├─ iam/                      # GRUPO Identity & Access Management
│  │  ├─ auth/               ✅ # login, refresh, logout, reset, verificación de correo
│  │  ├─ users/              ✅ # usuarios (raíz de identidad, tokens, blacklist) + back-office
│  │  ├─ roles/              ✅ # roles + asignación a usuarios
│  │  ├─ permissions/        ✅ # permisos (component.action), components, actions, PermissionsGuard
│  │  └─ registration/       ✅ # POST /auth/register (empresa | candidato), transaccional
│  ├─ companies/             ✅ # perfil de empresa (fiscal/CFDI) + company_users + back-office
│  ├─ candidates/            ✅ # perfil, experiencia, educación, idiomas, skills, hoja de vida, configuración
│  ├─ vacancies/             ✅ # vacantes (CRUD, estado, pausar/reactivar/refrescar) + listado público
│  ├─ applications/          ✅ # postulaciones, catálogo de estados e historial de transiciones
│  ├─ audit/                 ✅ # AuditService + audit_logs
│  ├─ billing/               🕓 # planes, beneficios, promociones, suscripciones, órdenes, Stripe
│  └─ notifications/         🕓 # mensaje automático a no seleccionados, bandeja
│
├─ app.module.ts · app.controller.ts · app.service.ts
└─ main.ts                      # prefijo /api/v1, ValidationPipe, filtro+interceptor globales, Swagger, CORS
```

> **Los catálogos NO son un grupo de módulos.** Los de México (32 estados + municipios, regímenes fiscales SAT, usos de CFDI) son **constantes** en `common/catalogs/`, espejadas en el front. `languages` sí es entidad, y vive dentro de `modules/candidates/`. Los catálogos que aún no existen (estados de postulación, niveles de formación, tipos de empleo) se resuelven hoy con **enums** en el `enums/` de su módulo.

### 4.2. Dónde va cada cosa (por módulo hoja `modules/<grupo>/<modulo>/`)

| Carpeta | Contiene | Regla |
|---|---|---|
| `entities/` | Entidades TypeORM (persistencia). | Solo mapeo a BD, sin lógica. |
| `repositories/` | Acceso a datos: clases que envuelven el repo de TypeORM con métodos de dominio. | **Único** punto que toca TypeORM. Extienden un `BaseRepository` de `common/`. |
| `services/` | Servicios de dominio reutilizables (reglas puras, `PasswordHasher`, `TokenService`, cálculos). | Reutilizables por varios use-cases. Sin HTTP. |
| `use-cases/` | Un caso de uso = una clase con `execute()`. Orquesta repos + services, transacción y auditoría. | Aquí vive la lógica de aplicación. Una responsabilidad por clase. |
| `controllers/` | Endpoints REST. Reciben DTO, llaman al use-case, devuelven respuesta. | Finos. Guards + `@ApiTags` de Swagger. |
| `dto/` | DTOs request/response (class-validator) + mapper entity→response. | Nunca exponer entidades TypeORM por HTTP. |
| `enums/` | Enums del dominio (`DocumentType`, `VacancyStatus`, `CompanyMemberRole`, …). | Valores estables que aún no justifican una tabla de catálogo. |
| `<modulo>.module.ts` | Cableado (providers, imports, exports, tokens de DI). | Bind de repos/services/use-cases. |

**Flujo:** `Controller` → `UseCase.execute(command)` → `Repository` (datos) + `Service` (reglas) → `Mapper` → `ResponseDto`. Transacción y auditoría se orquestan en el `UseCase`.

### 4.3. Anatomía de un módulo (plantilla)

```text
modules/<grupo>/<modulo>/
├─ controllers/    <modulo>.controller.ts
├─ dto/            create-<x>.dto.ts · update-<x>.dto.ts · <x>-response.dto.ts · <x>.mapper.ts
├─ entities/       <x>.entity.ts
├─ enums/          <x>.enum.ts          (si el dominio tiene valores cerrados)
├─ repositories/   <x>.repository.ts   (+ <x>.repository.interface.ts si se inyecta por token)
├─ services/       <x>.service.ts       (solo si hay lógica de dominio reutilizable)
├─ use-cases/      create-<x>.use-case.ts · update-<x>.use-case.ts · ...
└─ <modulo>.module.ts
```

Los repositorios se inyectan por **token** (p. ej. `USER_REPOSITORY`) para poder mockearlos en tests.

### 4.4. Mapa de dominios → carpetas → endpoints

| Dominio / HU | Ubicación | Endpoints (`/api/v1`) | Estado |
|---|---|---|:--:|
| Login, refresh, logout | `modules/iam/auth/` | `POST auth/{login,refresh,logout}` | ✅ |
| Reset de contraseña | `modules/iam/auth/` | `POST auth/password-reset/{request,validate,confirm}` | ✅ |
| Verificación de correo | `modules/iam/auth/` | `GET auth/email-verification/confirm` · `POST …/resend` | ✅ |
| Registro (empresa \| candidato) | `modules/iam/registration/` | `POST auth/register` | ✅ |
| Roles, permisos (RBAC) | `modules/iam/roles/`, `modules/iam/permissions/` | `GET permissions` · `roles` CRUD · `roles/:id/permissions` · `users/:id/roles` | ✅ |
| Back-office de usuarios | `modules/iam/users/` | `admin/users` CRUD + `:id/roles`, `:id/status` | ✅ |
| Perfil de empresa (fiscal/CFDI) | `modules/companies/` | `GET/PUT company/profile` · `PATCH company/profile/logo` | ✅ |
| Back-office de empresas y equipo | `modules/companies/` | `admin/companies` CRUD + `:id/members` | ✅ |
| Perfil del candidato y subrecursos | `modules/candidates/` | `candidate/profile` (+ `photo`, `experience`, `education`, `languages`, `skills`) | ✅ |
| Hoja de vida | `modules/candidates/` | `candidate/resumes` (+ `:id/select`, `:id/download`) | ✅ |
| Configuración del candidato | `modules/candidates/` | `GET/PUT candidate/profile-settings` | ✅ |
| Vacantes (gestión) | `modules/vacancies/` | `company/vacancies` CRUD + `:id/{status,pause,reactivate,refresh}` | ✅ |
| Vacantes (público) | `modules/vacancies/` | `GET vacancies` · `GET vacancies/:id` | ✅ |
| Auditoría | `modules/audit/` (`AuditService`, invocado desde los use-cases) | — (sin endpoint de consulta aún) | ✅ |
| Postulaciones del aspirante | `modules/applications/` | `POST/GET candidate/applications` · `GET :id` · `GET :id/history` | ✅ |
| Postulaciones vistas por la empresa | `modules/applications/` | `GET company/applications` (+ `statuses`, `:id`, `:id/history`) · `PUT :id/status` | ✅ |
| Respuestas de filtrado (`application_answers`) | `modules/applications/` | — | 🕓 (M15) |
| Planes, beneficios, promociones, suscripciones, órdenes, Stripe | `modules/billing/` | — | 🕓 |
| Notificaciones | `modules/notifications/` | — | 🕓 |
| Catálogos MX | `common/catalogs/` (constantes) + `GET candidate/profile/catalogs/languages` | parcial | ✅ |

> `POST /auth/register` vive en **`iam/registration/`** (módulo propio, no dentro de `auth/`) y **orquesta** la creación en `companies/` o `candidates/` según `accountType`, en una transacción.
> La auditoría se dispara **desde el use-case** vía `AuditService`; no hay `audit.interceptor.ts`.

### 4.5. Seguridad, auditoría y datos

- **JWT** access corto + refresh largo (persistido en `tokens_users`). Revocados/expirados → `blacklist_tokens`. Tokens de un solo uso (reset/verificación) → JWT 30 min, a blacklist tras uso.
- **RBAC:** rol de plataforma (`ADMIN`/`EMPLOYER`/`CANDIDATE`) en `user_roles`, fuente del `PermissionsGuard`. El rol *dentro* de la empresa vive en `company_users.role` (`OWNER`/`ADMIN`/`RECRUITER`/`MEMBER`): es pertenencia, no permiso, y no lo lee el guard. Gestionarlo exige `company_users.manage`, y toda empresa conserva al menos un `OWNER`.
- **Ownership** validado en el use-case (candidato solo lo suyo; empresa solo sus vacantes/postulaciones), con al menos una prueba negativa.
- **Auditoría** de crear/actualizar/eliminar vía `AuditService` → `audit_logs` (actor, acción, entidad, entity_id, ip, user_agent, diff?).
- **Transacciones** (registro, cambios de estado con historial) con `runInTransaction`/QueryRunner y rollback ante error.
- **Contraseña:** mínimo 8, 1 mayúscula, 1 minúscula, 1 número, 1 especial (`common/utils/password-policy.ts`). **bcryptjs**. Nunca texto plano.
- **Migraciones:** toda entidad/cambio de esquema requiere migración en `database/migrations/`. Sin `synchronize`. IDs = UUID v4 generados en la app y guardados como `varchar(36)` (portable Postgres/MySQL, ver `common/entities/base.entity.ts`).
- **Seed de RBAC:** el `PermissionsGuard` lee los permisos **de la base de datos**. Todo permiso nuevo se agrega a `database/seed-rbac.ts` (`PERMISSION_CODES` + `MATRIX`) y **exige volver a correr `pnpm seed:rbac`**, o el endpoint responde 403.

---

## 5. Frontend — `frontend/` (portal público + admin, con Tailwind)

### 5.1. Estructura (obligatoria)

`✅` construido · `🕓` pendiente.

```text
frontend/src/app/
├─ core/                    # Singletons (providedIn:'root'), se cargan una vez
│  ├─ auth/              ✅ # AuthService, TokenStorageService
│  ├─ interceptors/      ✅ # auth-token, refresh          🕓 error, loading
│  ├─ guards/            ✅ # authGuard, roleGuard([Role.ADMIN|EMPLOYER|CANDIDATE])
│  ├─ models/            ✅ # api-response, auth, Role, ErrorCode (espejo del backend)
│  └─ services/          🕓 # config, toast, breakpoint
│
├─ shared/                  # UI KIT (Tailwind) + utilidades reutilizables
│  ├─ ui/                   # PRESENTACIONALES (prefijo ij-), OnPush, solo Tailwind
│  │  ├─ input/ textarea/ select/ multiselect/ autocomplete/ datepicker/   ✅ (CDK + Tailwind)
│  │  ├─ button/ badge/ modal/ icon/ logo/ pricing-card/ forms/            ✅
│  │  └─ card/ table/ pagination/ tabs/ empty-state/ spinner/              🕓
│  ├─ catalogs/          ✅ # mx.catalogs.ts (estados/municipios, régimenes SAT, usos CFDI)
│  ├─ validators/        ✅ # password (MISMA política del backend), passwords-match, mx-identifiers
│  ├─ models/            ✅ # view-models compartidos (pricing)
│  └─ directives/ pipes/ 🕓
│
├─ layout/                  # SHELLS por área
│  ├─ public-layout/     ✅ # navbar + footer + scroll-top
│  ├─ auth-layout/       ✅ # layout minimal (login/registro/reset/verificación)
│  ├─ admin-layout/      ✅ # shell del back-office
│  └─ company-layout/    ✅ # shell del área de empresa
│
├─ features/
│  ├─ public/               # ===== PORTAL PÚBLICO =====
│  │  ├─ home/ vacancies/ plans/ about/ contact/ faq/ maintenance/   ✅
│  │  └─ auth/           ✅ # login, registro empresa/candidato (stepper), reset, verificación
│  ├─ admin/                # ===== BACK-OFFICE (ADMIN) =====
│  │  ├─ users/ companies/ roles/   ✅   ·   dashboard/ plans/ catalogs/ audit/   🕓
│  │  └─ shared/admin-pagination/   ✅ (local mientras no exista ij-pagination)
│  ├─ company/              # ===== ÁREA DE EMPRESA (EMPLOYER) =====
│  │  └─ vacancies/      ✅ # listado + detalle + formulario
│  └─ panel/             ⚠️  # shell de dashboard portado del prototipo: `panel.facade.ts` sirve
│                            # DATOS DE DEMOSTRACIÓN. Sus sub-vistas de perfil de candidato,
│                            # hojas de vida, configuración y perfil de empresa SÍ usan la API real.
│                            # Migrar lo demás a features/admin|company y retirarlo.
│
├─ app.component.ts
├─ app.config.ts            # providers: router, http + interceptors, hydration/SSR
└─ app.routes.ts            # rutas raíz (lazy + guards) — ver 5.4
```

**Estructura interna de cada feature** (portal, admin y empresa igual):
```text
<feature>/
├─ pages/          # CONTAINERS (smart): rutas, hablan con la fachada
├─ components/     # PRESENTACIONALES (dumb): solo input()/output(), OnPush
├─ data/           # <feature>.api.ts (HttpClient sobre environment.apiBaseUrl) + <feature>.facade.ts
├─ models/         # DTO de la API + view-models de la feature
└─ <feature>.routes.ts
```

### 5.2. Tailwind (configuración y tokens)

Ya instalado (Tailwind 3 + `@tailwindcss/forms` + `autoprefixer`). La fuente de verdad es **[frontend/tailwind.config.js](frontend/tailwind.config.js)**; los estilos globales, **[frontend/src/styles.scss](frontend/src/styles.scss)** (que además importa `@angular/cdk/overlay-prebuilt.css`).

Familias de tokens definidas:

| Token | Uso |
|---|---|
| `brand` (`DEFAULT #e47c3f`, `600`, `50`) | Naranja de marca: CTA, foco, acentos. |
| `ink` (`DEFAULT #1f3b73`, `900`, `950`, `card`) | Azul corporativo y superficies oscuras (footer, panel). |
| `body`, `muted`, `surface`, `line` | Neutrales del portal (texto, fondos, bordes). |
| `footer-fg`, `footer-muted` | Grises sobre fondo oscuro. |
| `accent.{green,pink,amber,blue}` + `*-soft` | Acentos decorativos (categorías, badges). |
| `font-sans` = Rubik → Inter → system-ui · `rounded-xl` · `shadow-{card,float,search,header}` · `max-w-container` (1240px) | Tipografía, radios, sombras y ancho del contenedor. |

> El theming se hace **solo con estos tokens**. **Prohibido** hex hardcodeado en features: usa `bg-brand`, `text-ink`, `border-line`, etc. Si falta un color, se agrega al config, no al componente.
> `@tailwindcss/forms` pinta de azul el foco de los controles nativos; `styles.scss` lo sobreescribe con el naranja de marca a nivel `base` — no lo repitas por componente.

### 5.3. Reglas del frontend (evitar deuda técnica)

- **Smart vs Dumb:** los containers (`pages/`) hablan con la fachada; los presentacionales solo `input()/output()`, `ChangeDetectionStrategy.OnPush`, y **no** inyectan servicios de datos.
- **Facade por feature:** una clase (o store con Signals) expone estado + acciones; un solo lugar por feature toca la API.
- **UI Kit único:** botones, cards, modales, tablas, tabs y la `pricing-card` se **componen** de piezas `ij-*` de `shared/ui/` (estilizadas con Tailwind y comportamiento vía `@angular/cdk`). Las features **no** reescriben estilos ni usan CDK directamente. **Nada de Angular Material** — los controles de formulario son propios (CDK + Tailwind). Si una pieza del kit aún no existe (tabla, paginación, tabs, spinner, empty-state), créala en `shared/ui/` en vez de duplicarla en la feature.
- **Tipos de la API a mano, derivados del Swagger** mientras no exista `@impulso/api-contract`: envelope en `core/models/`, DTO en el `models/` de cada feature. Mapear DTO→ViewModel si la UI lo necesita.
- **SSR:** hay rutas prerenderizadas (`/auth/**`). Cualquier llamada a la API en la inicialización va dentro de `afterNextRender`; nada de `window`/`document` fuera de guardas de plataforma. Evita `[innerHTML]` en `<svg>` — `ij-icon` renderiza formas estructurales.
- **Forms reactivos tipados**; validadores reutilizables en `shared/validators/` con la **misma política de contraseña** del backend.
- Estado del servidor con async pipe/Signals; nada de `subscribe` manual sin `takeUntilDestroyed`; `trackBy` en listas.
- Cada vista de datos tiene estados **loading / empty / error** explícitos.
- Ruteo con **lazy loading** y `roleGuard` por `canMatch`: el bundle del admin no se descarga si el usuario no es `ADMIN`.

### 5.4. Ruteo raíz por área (`app.routes.ts`)

Todo es **lazy** y las áreas privadas se cierran con `canMatch` (el bundle no se descarga si el rol no coincide). Estructura vigente:

| Ruta | Layout | Guard | Contenido |
|---|---|---|---|
| `/` | — | — | redirige a `/vacantes` |
| `/inicio`, `/vacantes`, `/planes`, `/nosotros`, `/contacto`, `/faq` | `public-layout` | — | portal público |
| `/mantenimiento` | *(sin layout)* | — | página de mantenimiento |
| `/auth/**` | `auth-layout` | — | login, registro, reset, verificación (**prerenderizado**) |
| `/panel` | *(propio)* | `authGuard` | shell de dashboard (ver ⚠️ en §5.1) |
| `/empresa/vacantes` | `company-layout` | `roleGuard([Role.EMPLOYER])` | gestión de vacantes |
| `/admin/{usuarios,empresas,roles}` | `admin-layout` | `roleGuard([Role.ADMIN])` | back-office |
| `**` | — | — | redirige a `/` |

Las rutas de cara al usuario van **en español**; los identificadores del código, en inglés.

### 5.5. Feature → dominio backend

`public/vacancies/` ↔ vacancies (público) · `company/vacancies/` ↔ vacancies (gestión) · `panel` perfil/CV/config ↔ candidates · `panel` perfil de empresa ↔ companies · admin `usuarios`/`roles` ↔ iam · admin `empresas` ↔ companies · `public/plans/` ↔ billing *(hoy estático)* · pendientes: applications, billing, admin `catalogs`/`audit`.

---

## 6. Convenciones compartidas

- **Contrato de API:** REST/JSON, base `/api/v1`. **Envelope único** (`common/types/api-response.types.ts`), aplicado por `ResponseInterceptor` y `AllExceptionsFilter`:
  - éxito → `{ success: true, statusCode, message, content }`
  - error → `{ success: false, statusCode, message, errorCode?, errors: [{ message, field?, code? }] }`

  `errorCode` es el enum estable de `common/types/error-code.enum.ts`; **el front reacciona a `errorCode`, nunca al `message`**. Paginación `{ page, pageSize, sort? }` → `{ items, page, pageSize, total }`. Fechas ISO‑8601 UTC. Moneda con `currency` explícito: **MXN** (el proyecto es México; cualquier referencia a COP es histórica).
- **Nombres:** archivos kebab-case con sufijo de rol (`login.use-case.ts`, `user.repository.ts`, `create-company.dto.ts`); clases PascalCase. BD snake_case; IDs **UUID v4 en `varchar(36)`** generados en la app (smallint autoincremental en catálogos), `created_at`/`updated_at`/`deleted_at`.
- **TS estricto** en ambas apps. ESLint + Prettier. Conventional Commits. *(Husky: pendiente — por ahora corre lint/test a mano antes de cerrar una tarea.)*

## 7. Tests

- **Backend:** use-cases con mocks de repos/services, sin BD (24 specs hoy: auth, registro, roles, usuarios, empresas, candidatos). *Pendientes:* integración de repositorios y **e2e de endpoints clave con prueba negativa de autorización/ownership** — obligatorio al construir applications y billing.
- **Frontend:** unit de presentacionales (inputs/outputs) y de la facade; e2e del flujo principal por feature. *Pendiente en su mayoría.*

## 8. Definition of Done

- Lint, typecheck y tests en verde en la app afectada. Swagger actualizado si cambió la API.
- **Backend:** estructura respetada; TypeORM solo en `repositories/`; controller fino; lógica en use-cases; `@RequirePermissions` + validación de ownership en el use-case; auditoría y transacciones donde aplican; **migración** que corre en base limpia; si hay permisos nuevos, `seed-rbac.ts` actualizado y re-ejecutado.
- **Frontend:** sin `any`; componentes OnPush; ningún presentacional inyecta servicios de datos; piezas reutilizadas del UI Kit (sin CSS duplicado); estados loading/empty/error; theming con tokens de Tailwind (sin hex hardcodeado); no rompe el build SSR.

## 9. Haz / No hagas

**Haz** — reutiliza `common/` (api) y `shared/` (web); un use-case por operación; inyecta repos por token; compón la UI del kit `ij-*`; deriva los tipos del front del Swagger.

**No hagas** — no pongas lógica en controllers ni consultes TypeORM fuera de `repositories/`; no autorices en el front; no crees carpetas fuera del patrón; no expongas entidades TypeORM por HTTP; no uses `synchronize:true` ni dejes cambios de esquema sin migración; no uses `@angular/cdk` ni hex de color directamente en features (van en el UI Kit / tokens); no metas Angular Material; no uses tipos de columna específicos de un motor (el esquema debe correr en Postgres **y** MySQL).

---

## 10. Estado del proyecto y qué sigue

**Construido (backend):** identidad completa (registro empresa/candidato, login, refresh, logout, reset, verificación de correo, bloqueo por intentos, blacklist de tokens), RBAC con guard por permiso y back-office de usuarios/empresas/roles, perfil de candidato con experiencia/educación/idiomas/habilidades/hojas de vida/configuración, perfil de empresa con datos fiscales CFDI, vacantes (CRUD, estado, pausar/reactivar/refrescar) con listado público, y **postulaciones con historial de estados**. El circuito candidato↔empresa ya cierra de punta a punta. Despliegue en cPanel documentado y funcionando.

**Siguiente frontera, en orden:**

1. **Frontend de postulaciones** — el backend de M11 está listo pero **no tiene UI**: falta el botón "postularme" en el detalle de vacante, "mis postulaciones" para el aspirante, y la bandeja del reclutador con filtros, detalle y cambio de estado.
2. **Preguntas de filtrado** (`vacancy_questions` + `application_answers`, M15) — el módulo de postulaciones ya deja el hueco preparado.
3. **`modules/billing/` + Stripe** — planes, beneficios, promociones por vacante, suscripción anual, órdenes y CFDI. Ver `Impulso_Jobs_Planes_Suscripciones.md` y `Impulso_Jobs_Stripe.md`. **Bloqueado** por las decisiones de precio/alcance listadas en `README_CONTEXTO.md`.
4. **Notificaciones** (mensaje automático a no seleccionados, M16) y **SMTP real** — hoy `MAILER_PORT` usa `ConsoleMailerAdapter`, que solo escribe el enlace en el log. `VacancyStatusUseCase.close()` y `ApplicationsModule` ya exponen lo que ese módulo necesita.
5. **Deuda conocida:** e2e de autorización/ownership; piezas faltantes del UI Kit (`table`, `pagination`, `tabs`, `spinner`, `empty-state`); retirar los datos de demostración de `features/panel/`; `packages/api-contract`; **y limpiar la instrumentación de depuración commiteada en `candidates/use-cases/candidate-resume.use-case.ts`** (seis bloques `#region debug-point` que hacen `fetch` a `127.0.0.1:7777` en cada subida de CV).