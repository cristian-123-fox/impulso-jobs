# Impulso Jobs — Prompts por módulo · Acciones por perfil · Planes para empresas

> Documento de trabajo para construir la plataforma. Las **convenciones técnicas** (monorepo, estructura del backend, Tailwind, contrato OpenAPI, Clean/layered, RBAC, auditoría) viven en `AGENTS.md`; aquí se define **qué hace cada perfil** y **qué construir en cada módulo**. Cada prompt de módulo se ejecuta en `apps/api` y su UI equivalente en `apps/web`.

## Contenido
1. [Roles del sistema y acciones por perfil](#1-roles-del-sistema-y-acciones-por-perfil)
2. [Matriz de permisos (component.action)](#2-matriz-de-permisos-componentaction)
3. [Prompts por módulo (M0–M14)](#3-prompts-por-módulo-m0m14)
4. [Planes para empresas (detallado)](#4-planes-para-empresas-detallado)

---

## 1. Roles del sistema y acciones por perfil

Tres roles de **plataforma** (en `user_roles`, fuente del `PermissionsGuard`): `ADMIN`, `EMPLOYER`, `CANDIDATE`. Dentro de una empresa existe además un rol interno (`company_users.company_role`: `OWNER`/`ADMIN`) que no es rol de plataforma.

### 1.1. Administrador (`ADMIN`)
Gobierna la plataforma. **No** participa en procesos de selección; supervisa y configura.
- **Usuarios:** consultar, activar/desactivar, bloquear/desbloquear, eliminar (soft delete).
- **Roles y permisos:** crear/editar roles, asignar/quitar permisos, asignar/quitar roles a usuarios.
- **Catálogos:** administrar tipos de documento, idiomas, estados de postulación, niveles de formación, tipos de empleo.
- **Planes y beneficios (billing):** crear/editar/activar planes, definir beneficios y precios, marcar "Más popular".
- **Supervisión:** ver (solo lectura global) empresas, vacantes y postulaciones; ver métricas/dashboard.
- **Auditoría:** consultar la bitácora del sistema (`audit_logs`).
- **No hace:** postularse, publicar vacantes propias, ni comprar promociones.

### 1.2. Empresa / Reclutador (`EMPLOYER`)
Gestiona **su** empresa y sus procesos de contratación. Todo acotado por *ownership*.
- **Perfil de empresa:** consultar y editar (logo incluido); el NIT es de solo lectura.
- **Usuarios de la empresa:** (OWNER/ADMIN) invitar/gestionar miembros y su rol interno.
- **Vacantes:** crear, editar, pausar y cerrar; ver el detalle y las postulaciones por vacante.
- **Postulaciones recibidas:** consultar, filtrar, ver el perfil/hoja de vida del candidato y **actualizar el estado** del proceso (con historial).
- **Búsqueda de candidatos:** buscar en el banco a candidatos con perfil público o que hayan postulado a sus vacantes (según visibilidad y beneficios del plan).
- **Planes/promociones:** comprar un plan para promocionar una vacante, hacer checkout y consultar el estado de la promoción.
- **No hace:** administrar roles de plataforma, ver datos de **otras** empresas, ni modificar información de los candidatos.

### 1.3. Empleado / Aspirante (`CANDIDATE`)
Gestiona **su** perfil y sus postulaciones. Todo acotado por *ownership*.
- **Cuenta:** registrarse, verificar correo, recuperar contraseña, eliminar su cuenta.
- **Perfil:** consultar y editar información personal, experiencia, educación, idiomas y habilidades (el documento y el correo no se editan tras el registro).
- **Hoja de vida:** subir PDF (máx. 5 MB), marcar una como principal, descargar y eliminar.
- **Configuración:** definir visibilidad del perfil/información y disponibilidad inmediata.
- **Vacantes:** buscar y consultar vacantes; **postularse**.
- **Postulaciones:** consultar sus postulaciones y el historial de estados (solo lectura).
- **No hace:** cambiar el estado de postulaciones, ver postulaciones ajenas, ni gestionar vacantes/planes.

---

## 2. Matriz de permisos (component.action)

Semilla base para el módulo RBAC (M2). `✓` = permitido; `—` = no. `(propio)` = limitado a recursos del usuario/empresa; `(global)` = alcance de toda la plataforma; `(público)` = disponible sin rol o para cualquier autenticado.

| Permiso (`component.action`) | ADMIN | EMPLOYER | CANDIDATE |
|---|:--:|:--:|:--:|
| `users.read` | ✓ (global) | — | — |
| `users.update` / `users.block` / `users.delete` | ✓ | — | — |
| `roles.read` / `roles.create` / `roles.update` | ✓ | — | — |
| `roles.assign` / `permissions.assign` | ✓ | — | — |
| `catalogs.read` | ✓ | ✓ (público) | ✓ (público) |
| `catalogs.manage` | ✓ | — | — |
| `audit.read` | ✓ | — | — |
| `companies.read` | ✓ (global) | ✓ (propio) | — |
| `companies.update` | ✓ | ✓ (propio) | — |
| `company_users.manage` | ✓ | ✓ (propio) | — |
| `vacancies.read` (privado, gestión) | ✓ (global) | ✓ (propio) | — |
| `vacancies.read.public` | ✓ | ✓ | ✓ (público) |
| `vacancies.create` / `vacancies.update` / `vacancies.status` | ✓ | ✓ (propio) | — |
| `applications.create` (postularse) | — | — | ✓ |
| `applications.read` | ✓ (global) | ✓ (propio) | ✓ (propio) |
| `applications.status.update` | ✓ | ✓ (propio) | — |
| `candidates.search` | ✓ | ✓ (según visibilidad) | — |
| `candidates.cv.read` | ✓ | ✓ (público o postuló) | — |
| `candidate_profile.read` / `.update` | ✓ (global) | — | ✓ (propio) |
| `experiences.manage` / `educations.manage` / `languages.manage` / `skills.manage` | — | — | ✓ (propio) |
| `resumes.manage` | — | — | ✓ (propio) |
| `settings.update` | — | — | ✓ (propio) |
| `plans.read` | ✓ | ✓ (público) | ✓ (público) |
| `plans.manage` | ✓ | — | — |
| `promotions.create` / `promotions.checkout` | — | ✓ (propio) | — |
| `promotions.read` | ✓ (global) | ✓ (propio) | — |
| `account.delete` (propia) | ✓ | ✓ | ✓ |

> El backend valida SIEMPRE estos permisos + el *ownership* del recurso. El frontend solo muestra/oculta y enruta según lo que informa la API.

---

## 3. Prompts por módulo (M0–M14)

> Formato de cada bloque: objetivo · roles que lo usan · endpoints · entidades · reglas clave · casos excepcionales · DoD. Antepón `AGENTS.md` como contexto.

### M0 · Core / Infra (`apps/api` base)
```text
OBJETIVO: cimientos antes de features.
ROLES: n/a (transversal).
ALCANCE: scaffold NestJS (common/database/modules) · DataSource+typeorm.config · ValidationPipe global ·
  HttpExceptionFilter (envoltura de error) · interceptores (logging/transform/audit) · decoradores
  (@CurrentUser/@RequirePermissions) · PaginationDto + runInTransaction · Swagger /docs + /docs-json + health ·
  modules/audit (audit_logs + AuditService) · entidad users + BaseRepository + migración inicial.
DoD: docker compose up levanta api+db; migración en base limpia; /health y /docs responden; OpenAPI publicado.
```

### M1 · Auth / Login — HU-001
```text
OBJETIVO: login seguro con JWT (access+refresh), intentos fallidos y bloqueo temporal.
ROLES: todos (autenticación).
ENDPOINTS: POST /auth/login · POST /auth/refresh · POST /auth/logout.
ENTIDADES: users (extender), tokens_users, blacklist_tokens.
REGLAS: solo usuarios registrados/activos/no bloqueados · 3 fallos => bloqueo 3 min · access corto + refresh
  persistido · revocados/expirados/logout => blacklist · bloquear login si email_verified_at es NULL (errorCode) ·
  registrar last_login/ip/device + auditoría · mensajes genéricos (no revelar si el correo existe).
EXCEPCIONES: correo/clave vacíos o inválidos, usuario eliminado/suspendido/bloqueado, token expirado, refresh inválido.
DoD: bloqueo por intentos, refresh y rechazo de token en blacklist con pruebas.
```

### M2 · Roles y Permisos (RBAC) — HU-002
```text
OBJETIVO: administrar roles/permisos (component.action) y el guard de autorización reutilizable.
ROLES: ADMIN (gestiona). Consumido por todos los módulos (guard).
ENDPOINTS: GET/POST/PUT /roles, GET /roles/{id} · GET/POST/DELETE /roles/{id}/permissions/... ·
  POST/DELETE /users/{id}/roles/...
ENTIDADES: roles, permissions, components, actions, role_permissions, user_roles.
REGLAS: roles base ADMIN/EMPLOYER/CANDIDATE · unicidad de code · sin duplicados en joins · solo ADMIN administra ·
  seed de components/actions/permisos según la matriz de la Sección 2.
ENTREGABLE CLAVE: PermissionsGuard + @RequirePermissions('recurso.accion').
EXCEPCIONES: rol duplicado, permiso inválido, usuario sin permiso administrando.
DoD: guard bloquea a usuario sin permiso (prueba negativa); seed ejecutable.
```

### M3 · Recuperar contraseña — HU-003
```text
OBJETIVO: reset por magic link, token de un solo uso, invalidación de sesiones.
ROLES: todos.
ENDPOINTS: POST /auth/password-reset/request · /validate · /confirm.
REGLAS: token JWT 30 min asociado a user_id · máx 3/24h · un solo uso => blacklist · nueva clave cumple política ·
  al confirmar invalida todos los access/refresh activos · cuentas inactivas/bloqueadas no aplican · respuesta genérica.
EXCEPCIONES: correo inválido/no registrado, cuenta inactiva, token expirado/usado/manipulado, clave débil, exceso 24h.
DoD: token no reutilizable; sesiones previas invalidadas.
```

### M4 · Verificación de correo — HU-004
```text
OBJETIVO: verificación por magic link al registrarse; sin verificar no hay login.
ROLES: todos.
ENDPOINTS: GET /auth/email-verification/confirm · POST /auth/email-verification/resend.
REGLAS: registro inicia no verificado · token 30 min un solo uso · máx 3 reenvíos/24h · login bloqueado con
  email_verified_at NULL (errorCode dedicado) · correo ya verificado no reenvía.
EXCEPCIONES: correo no registrado, token expirado/usado/manipulado, ya verificado, cuenta eliminada/suspendida, exceso.
DoD: login rechazado sin verificación; confirmación marca timestamp; reenvío respeta límite.
```

### M5 · Registro (Empresa + Candidato) — HU-005 / HU-006
```text
OBJETIVO: endpoint único de registro que discrimina por accountType, en una transacción.
ROLES: público (crea EMPLOYER o CANDIDATE).
ENDPOINT: POST /auth/register (accountType: company | candidate).
COMPANY: crea users + companies + company_users(OWNER) + rol EMPLOYER · únicos: email, tax_id.
CANDIDATE: crea users + candidate_profiles + rol CANDIDATE + envía verificación · únicos: email, document_number · birthDate no futura.
REGLAS: clave con política, bcrypt · toda la operación en transacción con rollback · registrar IP/dispositivo/fecha + auditoría.
EXCEPCIONES: accountType inválido, correo/clave inválidos o duplicados, campos de perfil vacíos, duplicados, fallo en cualquier paso.
DoD: rollback verificado; verificación disparada en candidato.
```

### M6 · Perfil Candidato — HU-007 a HU-010 (+ Habilidades)
```text
OBJETIVO: perfil del candidato en pestañas: información, experiencia, educación, idiomas, habilidades.
ROLES: CANDIDATE (propio).
ENDPOINTS: GET/PUT /candidate/profile · PATCH /candidate/profile/photo ·
  .../experience · .../education · .../languages · .../skills (GET/POST/PUT/DELETE).
REGLAS: solo su propio perfil · email/documento no editables · fechas válidas (inicio<=hoy; fin>=inicio; "actual"=>fin nula) ·
  idioma del catálogo sin duplicar (nativo=>niveles Nativo) · summary<=1000, responsabilidades<=2000 · auditar cambios.
EXCEPCIONES: no autenticado, sin rol, campos vacíos, fechas inválidas, duplicado de idioma, recurso ajeno.
DoD: prueba negativa de acceso cruzado; validaciones de fecha/actual/nativo.
```

### M7 · Hoja de vida — HU-011
```text
OBJETIVO: múltiples hojas de vida en PDF, con una principal.
ROLES: CANDIDATE (propio).
ENDPOINTS: GET/POST /candidate/resumes · PATCH .../{id}/select · GET .../{id}/download · DELETE .../{id}.
REGLAS: solo PDF <=5MB · conservar nombre · una sola principal (al marcar otra, desmarca la anterior) · si se elimina la
  principal y hay otras, la más reciente pasa a principal · borrar del storage al eliminar · auditar.
EXCEPCIONES: no PDF, excede tamaño, archivo no encontrado, errores de carga/descarga/eliminación.
DoD: invariante "exactamente una principal" por transacción; rechazo de no-PDF/>5MB.
```

### M8 · Configuración del candidato — HU-013
```text
OBJETIVO: visibilidad de perfil/información + disponibilidad.
ROLES: CANDIDATE (propio).
ENDPOINTS: GET/PUT /candidate/profile-settings.
REGLAS: profile_visibility (Público/Privado) — privado no aparece en búsquedas · information_visibility (Completa/Parcial) ·
  is_immediately_available (Sí/No) · cambios inmediatos · valores del catálogo · auditar.
DoD: efecto de "Privado" verificado contra la búsqueda (M12).
```

### M9 · Perfil Empresa — HU-014
```text
OBJETIVO: consultar/actualizar el perfil corporativo.
ROLES: EMPLOYER (su empresa).
ENDPOINTS: GET/PUT /company/profile · PATCH /company/profile/logo.
REGLAS: solo su empresa · NIT de solo lectura · razón social obligatoria · correo/URL válidos · descripción<=2000 ·
  foundation_year<=año actual · auditar (usuario/fecha/IP).
EXCEPCIONES: empresa no encontrada, razón social vacía, correo/URL inválidos, intento de modificar NIT o empresa ajena.
DoD: NIT inmutable y acceso a empresa ajena verificados con prueba negativa.
```

### M10 · Vacantes — HU-017
```text
OBJETIVO: CRUD de vacantes y gestión de estado.
ROLES: EMPLOYER (propias) · lectura pública para candidatos.
ENDPOINTS: GET/POST/PUT /company/vacancies · GET .../{id} · PATCH .../{id}/status · GET público de vacantes/detalle.
REGLAS: solo sus vacantes · empresa activa · campos mínimos (título, descripción, tipo, modalidad, ubicación, estado) ·
  estados Activa/Pausada/Cerrada (Cerrada no recibe postulaciones; Pausada no se muestra; editable si no está Cerrada) ·
  filtros por estado/tipo · auditar.
EXCEPCIONES: empresa inactiva, vacante ajena/inexistente, campos vacíos, estado inválido, editar cerrada.
DoD: vacante Cerrada rechaza postulación (coordinar M11); filtros ok.
```

### M11 · Postulaciones — HU-012 / HU-015
```text
OBJETIVO: aplicar a vacantes (candidato) y gestionar el proceso (empresa) con historial.
ROLES: CANDIDATE (aplica/consulta lo suyo) · EMPLOYER (gestiona lo de sus vacantes).
ENDPOINTS candidato: POST /candidate/applications · GET /candidate/applications · GET .../{id}.
ENDPOINTS empresa: GET /company/applications · GET .../{id} · PUT .../{id}/status · GET .../{id}/history.
ENTIDADES: candidate_applications, application_status, application_status_history.
REGLAS: candidato solo lo suyo; vacante Activa al aplicar; se conserva histórica si se cierra la vacante · empresa solo
  postulaciones de sus vacantes · estado desde catálogo => genera historial (previous/current/changed_by) · no se eliminan
  postulaciones, solo cambia estado · ver HdV mientras activa/histórica · auditar.
EXCEPCIONES: rol incorrecto, postulación/vacante inexistente, acceso cruzado, estado inválido, error de historial.
DoD: cada cambio deja rastro en historial + auditoría; candidato no ve postulaciones ajenas.
```

### M12 · Búsqueda de candidatos — HU-016
```text
OBJETIVO: banco de hojas de vida para empresas, con filtros, visibilidad y paginación.
ROLES: EMPLOYER.
ENDPOINTS: GET /company/candidates · GET /company/candidates/search · GET .../{id}.
REGLAS: visible solo perfil Público o que haya postulado a una vacante de la empresa · privado sin postulación => oculto/
  bloqueado con mensaje · filtros (nombre, cargo, ciudad, nivel, idiomas, habilidades, años de experiencia) · orden por
  relevancia/fecha · paginación y límites · empresa no modifica datos · auditar consultas de HdV.
  El acceso extendido a HdV puede depender del beneficio del plan (ver Sección 4).
EXCEPCIONES: perfil privado sin autorización, parámetros inválidos, sin resultados.
DoD: perfil Privado sin postulación no accesible; paginación y filtros combinados.
```

### M13 · Eliminar cuenta — (soft delete)
```text
OBJETIVO: baja de cuenta con borrado lógico y retención.
ROLES: cualquiera (su propia cuenta); ADMIN puede restaurar.
ENDPOINTS: DELETE /account · [ADMIN] POST /account/{id}/restore.
REGLAS: deleted_at en users + propagación lógica · invalidar todas las sesiones (blacklist) · bloquear login · retención
  configurable antes de purga · conservar postulaciones/vacantes como históricas · auditar.
DoD: cuenta eliminada no inicia sesión; históricos preservados; auditado.
```

### M14 · Planes y promoción de vacantes — (billing)
```text
OBJETIVO: monetizar la publicación mediante planes aplicables a una vacante. (Detalle completo en la Sección 4.)
ROLES: ADMIN (catálogo de planes) · EMPLOYER (compra/promoción).
ENTIDADES: plans, plan_features, plan_feature_values, vacancy_promotions, promotion_orders.
ENDPOINTS admin: GET/POST/PUT /admin/plans · PATCH /admin/plans/{id}/status · GET/POST /admin/plan-features · PUT /admin/plans/{id}/features.
ENDPOINTS público/empresa: GET /plans · POST /company/vacancies/{id}/promotions · POST /company/promotions/{id}/checkout ·
  POST /payments/webhook · GET /company/promotions · GET /company/vacancies/{id}/promotion.
DoD: GET /plans reproduce la pantalla; el pago activa la promoción y fija ends_at; el cron expira y revierte flags; webhook idempotente.
```

---

## 4. Planes para empresas (detallado)

Monetización de la publicación: la empresa **compra un plan para promocionar una vacante** (Essential / Pro / Premium). El catálogo es administrable por el ADMIN.

### 4.1. Catálogo de planes (semilla, según la pantalla "Mejora tu vacante")

| Beneficio (`feature.code`) | Tipo | Essential | Pro | Premium |
|---|---|:--:|:--:|:--:|
| `publication_days` | numeric | 60 | 60 | 60 |
| `unlimited_contact_data` | boolean | ✓ | ✓ | ✓ |
| `application_boost` | percent | — | 20 | 40 |
| `priority_ranking` | boolean | — | ✓ | ✓ |
| `featured_listing` | boolean | — | ✓ | ✓ |
| `urgent_search` | boolean | — | ✓ | ✓ |
| `company_confidentiality` | boolean | — | — | ✓ |
| `extra_cv_access` | numeric | — | — | 10 |

Precios semilla (COP, "desde", + IVA 19%): **Essential 100.095 · Pro 175.395 (Más popular) · Premium 215.145**.

### 4.2. Acciones por perfil sobre los planes

**Administrador (`ADMIN`) — gobierna el catálogo (`plans.manage`):**
- Crear/editar/activar planes; definir precio, moneda, IVA, duración (`duration_days`), badge "Más popular" y orden.
- Administrar el catálogo de beneficios (`plan_features`) y la matriz `plan_feature_values` (incluir/excluir + valor).
- No compra promociones.

**Empresa / Reclutador (`EMPLOYER`) — compra y promociona (`promotions.create/checkout`, sobre vacante propia):**
- Ver los planes disponibles con precio + IVA (`GET /plans`).
- Comprar un plan para una vacante propia y en estado válido; hacer checkout y pagar en la pasarela.
- Consultar el estado de sus promociones y la promoción activa de cada vacante.
- Recibir los beneficios del plan sobre la vacante (destacada, prioridad, urgente; y en Premium, confidencialidad y cuota extra de HdV).

**Aspirante (`CANDIDATE`):** no interactúa con planes; solo percibe el efecto (ve vacantes destacadas/prioritarias en el listado).

### 4.3. Flujo de compra (resumen)

1. `GET /plans` → la empresa ve Essential/Pro/Premium con precio + IVA.
2. `POST /company/vacancies/{id}/promotions { planId }` → crea `vacancy_promotion` (`pending_payment`) + `promotion_order` (subtotal, IVA, total) en transacción; congela `price_paid`.
3. `POST /company/promotions/{id}/checkout` → el adaptador `PaymentProvider` devuelve la URL de pago.
4. La empresa paga; la pasarela llama `POST /payments/webhook` (**idempotente**) → `order = paid`, `promotion = active`, `starts_at = now`, `ends_at = now + duration_days`.
5. Se aplican los flags a la vacante (`is_featured`, `has_priority`, `is_urgent`; y en Premium: confidencialidad + cuota `extra_cv_access`).
6. Cron diario: al vencer `ends_at`, `promotion = expired` y se revierten los flags.

### 4.4. Efectos de los beneficios (wiring con otros módulos)
- **`priority_ranking` / `featured_listing` / `urgent_search`** → afectan el **orden y el resaltado** de la vacante en el listado público (M10) hacia candidatos.
- **`company_confidentiality`** (Premium) → **oculta la identidad** de la empresa (nombre/logo) en la vista pública de la vacante.
- **`extra_cv_access`** (Premium, 10) → **cuota de desbloqueos** de hojas de vida en la búsqueda de candidatos (M12).
- **`application_boost` (+20/40%)** → tratar como **peso de visibilidad/objetivo de marketing**, no como garantía dura (decisión a confirmar).

### 4.5. Reglas y casos excepcionales (billing)
- Solo `EMPLOYER` y solo sobre vacantes de su empresa; una vacante Cerrada no se promociona.
- A lo sumo **una promoción activa** por vacante (definir política de upgrade/renovación).
- Webhook **idempotente** (por `external_reference`); job **reconciliador** por si el webhook no llega.
- Excepciones: plan inactivo/inexistente, vacante ajena/cerrada, promoción ya activa, pago rechazado/expirado, webhook duplicado.

> Decisiones abiertas (confirmar antes de M14): moneda/IVA y si el precio es fijo o "desde" (dinámico), proveedor de pago + facturación electrónica, política de upgrade/renovación, semántica de `application_boost` y modelo de cuota de `extra_cv_access`.
