# Impulso Jobs — Roles, permisos y acciones por perfil (alineado)

> Documento de referencia de **quién puede hacer qué**. Alineado con los planes definitivos (**Media / Alta / Anual**), la localización a **México** y los módulos nuevos (preguntas de filtrado, notificaciones, IA, CFDI, redes).
> Describe el **objetivo**; la §3 marca además qué está sembrado y en uso hoy. La implementación vive en `modules/iam/permissions/` (guard) y `database/seed-rbac.ts` (matriz).

## Contenido
1. [Roles del sistema](#1-roles-del-sistema)
2. [Acciones por perfil](#2-acciones-por-perfil)
3. [Matriz de permisos (component.action)](#3-matriz-de-permisos-componentaction)
4. [Acciones sobre planes y suscripciones](#4-acciones-sobre-planes-y-suscripciones)
5. [Beneficios "gated" por plan](#5-beneficios-gated-por-plan)

---

## 1. Roles del sistema

Tres roles de **plataforma** (en `user_roles`, fuente del `PermissionsGuard`): `ADMIN`, `EMPLOYER`, `CANDIDATE`. Dentro de una empresa existe además un rol interno (`company_users.role`) que **no** es rol de plataforma y **no** lo lee el guard — es pertenencia al equipo:

| Rol interno | Alcance dentro de la empresa |
| --- | --- |
| `OWNER` | Titular de la cuenta: empresa, equipo y facturación. Toda empresa conserva al menos uno. |
| `ADMIN` | Administra la empresa y su equipo, sin ser el titular. |
| `RECRUITER` | Publica vacantes y gestiona candidatos y postulaciones. |
| `MEMBER` | Consulta la información de la empresa. |

Gestionar el equipo y estos roles exige el permiso `company_users.manage`: el `ADMIN` de plataforma sobre cualquier empresa (back-office), el `EMPLOYER` sólo sobre la suya.

> Regla base: el backend valida SIEMPRE el permiso **y** la propiedad del recurso (*ownership*). El frontend solo muestra/oculta y enruta.

---

## 2. Acciones por perfil

### 2.1. Administrador (`ADMIN`) — gobierna la plataforma
- **Usuarios:** consultar, activar/desactivar, bloquear/desbloquear, eliminar (soft delete).
- **Roles y permisos:** crear/editar roles, asignar/quitar permisos y roles.
- **Catálogos (México):** administrar tipos de documento (CURP/RFC/INE), idiomas, estados de postulación, niveles de formación, tipos de empleo, **estados y municipios**, **regímenes fiscales SAT** y **usos de CFDI**.
- **Planes y suscripciones (billing):** crear/editar/activar planes (Media/Alta/Anual), definir beneficios, **precios en MXN**, IVA 16 %, vencimientos y cupos.
- **Facturación:** supervisar los CFDI emitidos.
- **Supervisión:** ver (solo lectura global) empresas, vacantes y postulaciones; ver métricas/dashboard.
- **Auditoría:** consultar `audit_logs`.
- **No hace:** postularse, publicar vacantes propias, ni comprar planes.

### 2.2. Empresa / Reclutador (`EMPLOYER`) — gestiona su contratación
Todo acotado por *ownership* (su empresa, sus vacantes).
- **Perfil de empresa:** consultar/editar (logo incluido); **datos fiscales** (RFC de solo lectura, razón social, régimen, C.P., uso de CFDI).
- **Usuarios de la empresa:** (OWNER/ADMIN internos) gestionar miembros y su rol interno.
- **Vacantes:** crear, editar, **pausar/reactivar/refrescar** (según el límite del plan, con edición de título si el plan lo permite), cerrar.
- **Preguntas de filtrado:** definir el cuestionario de screening por vacante.
- **Postulaciones:** consultar, filtrar, ver el **perfil, hoja de vida y respuestas de filtrado**, ver **datos de contacto** del candidato *(según plan)*, y **actualizar el estado** del proceso (con historial).
- **Banco de talento:** buscar candidatos (perfil público o que hayan postulado) y **consultar CV de la base de talento consumiendo cupo de visitas** *(según plan)*.
- **IA** *(según plan):* generar borrador de vacante con IA; obtener matching de candidatos.
- **Planes/suscripción:** comprar Media/Alta **por vacante** o contratar la **suscripción Anual**; pagar por Stripe (tarjeta/OXXO/SPEI/MSI); consultar sus promociones y **descargar sus facturas CFDI**.
- **Notificaciones:** el sistema envía automáticamente el **mensaje a no seleccionados** al cerrar la vacante.
- **No hace:** administrar roles de plataforma, ver datos de **otras** empresas, ni modificar información de candidatos.

### 2.3. Empleado / Aspirante (`CANDIDATE`) — gestiona su empleabilidad
Todo acotado por *ownership* (su perfil, sus postulaciones).
- **Cuenta:** registrarse, verificar correo, recuperar contraseña, **eliminar su cuenta y ejercer derechos ARCO** (LFPDPPP).
- **Perfil:** consultar/editar información personal, experiencia, educación, idiomas y habilidades (documento y correo no editables tras el registro).
- **Hoja de vida:** subir PDF (≤5 MB), marcar principal, descargar, eliminar.
- **Configuración:** definir visibilidad del perfil/información y disponibilidad inmediata.
- **Vacantes:** buscar y consultar; **postularse** (respondiendo las preguntas de filtrado).
- **Postulaciones:** consultar las suyas y el historial de estados (solo lectura); **recibir el mensaje automático** si no es seleccionado.
- **No hace:** cambiar el estado de postulaciones, ver postulaciones ajenas, ni gestionar vacantes/planes.

---

## 3. Matriz de permisos (`component.action`)

`✓` permitido · `—` no · `(propio)` limitado a sus recursos · `(global)` toda la plataforma · `(público)` sin rol/cualquiera · **`⊕`** = permitido pero **condicionado al plan activo** (ver §5).

La columna **Semilla** dice qué existe hoy en `backend/src/database/seed-rbac.ts`: `✅` sembrado y exigido por al menos un endpoint · `🌱` sembrado pero **aún sin endpoint que lo use** · `🕓` todavía no existe.

> ⚠️ El `PermissionsGuard` lee los permisos **de la base de datos**. Agregar un código a `seed-rbac.ts` no basta: hay que **volver a correr `pnpm seed:rbac`**, o el endpoint responderá 403.

| Permiso (`component.action`) | ADMIN | EMPLOYER | CANDIDATE | Semilla |
|---|:--:|:--:|:--:|:--:|
| `users.read` / `users.create` / `users.update` / `users.block` / `users.delete` | ✓ (global) | — | — | ✅ |
| `roles.read` / `roles.create` / `roles.update` / `roles.assign` | ✓ | — | — | ✅ |
| `permissions.assign` | ✓ | — | — | ✅ |
| `catalogs.read` | ✓ | ✓ (público) | ✓ (público) | 🌱 |
| `catalogs.manage` | ✓ | — | — | 🌱 |
| `audit.read` | ✓ | — | — | 🌱 |
| `companies.read` | ✓ (global) | ✓ (propio) | — | ✅ |
| `companies.create` (alta desde back-office) | ✓ (global) | — | — | ✅ |
| `companies.update` (incl. datos fiscales) | ✓ | ✓ (propio) | — | ✅ |
| `company_users.manage` | ✓ | ✓ (propio) | — | ✅ |
| `vacancies.read.public` | ✓ | ✓ | ✓ (público) | 🌱 |
| `vacancies.read` (gestión) | ✓ (global) | ✓ (propio) | — | ✅ |
| `vacancies.create` / `vacancies.update` | ✓ | ✓ (propio) | — | ✅ |
| `vacancies.status` (cerrar **y** pausar/reactivar/refrescar) | ✓ | ⊕ (propio) | — | ✅ |
| `vacancy_questions.manage` (preguntas de filtrado) | ✓ | ✓ (propio) | — | 🕓 |
| `applications.create` (postularse) | — | — | ✓ | ✅ |
| `applications.read` | ✓ (global) | ✓ (propio) | ✓ (propio) | ✅ |
| `applications.answers.read` (respuestas de filtrado) | ✓ | ✓ (propio) | — | 🕓 |
| `applications.contact.read` (email/teléfono) | ✓ | ⊕ (propio) | — | 🕓 |
| `applications.status.update` | ✓ | ✓ (propio) | — | ✅ |
| `candidates.search` | ✓ | ✓ | — | ✅ |
| `candidates.cv.read` (base de talento) | ✓ | ⊕ (cupo de visitas) | — | ✅ |
| `candidate_profile.read` / `.update` | ✓ (global) | — | ✓ (propio) | ✅ |
| `experiences/educations/languages/skills.manage` | — | — | ✓ (propio) | ✅ |
| `resumes.manage` | — | — | ✓ (propio) | ✅ |
| `settings.read` / `settings.update` | — | — | ✓ (propio) | ✅ |
| `ai.job_draft` (crear oferta con IA) | ✓ | ⊕ (propio) | — | 🕓 |
| `ai.match` (matching con IA) | ✓ | ⊕ (propio) | — | 🕓 |
| `plans.read` | ✓ | ✓ (público) | ✓ (público) | 🌱 |
| `plans.manage` | ✓ | — | — | 🌱 |
| `promotions.create` / `promotions.checkout` | — | ✓ (propio) | — | 🌱 |
| `promotions.read` | ✓ (global) | ✓ (propio) | — | 🌱 |
| `subscriptions.create` / `subscriptions.manage` | — | ✓ (propio) | — | 🕓 |
| `subscriptions.read` | ✓ (global) | ✓ (propio) | — | 🕓 |
| `invoices.read` (CFDI) | ✓ (global) | ✓ (propio) | — | 🕓 |
| `notifications.read` | ✓ | ✓ (propio) | ✓ (propio) | 🕓 |
| `account.delete` (ARCO — Cancelación) | ✓ | ✓ (propio) | ✓ (propio) | ✅ |
| `account.data_export` (ARCO — Acceso) | ✓ | ✓ (propio) | ✓ (propio) | ✅ |

**Notas de implementación:**

- **No existe `vacancies.pause`.** Pausar, reactivar, refrescar y cerrar comparten `vacancies.status`. El tope de pausas del plan se aplicará dentro del use-case (contra `pause_count` / `max_pauses`), no con un permiso aparte.
- Los endpoints públicos de vacantes (`GET /vacancies`, `GET /vacancies/:id`) **no llevan guard**: `vacancies.read.public` está sembrado por completitud, pero hoy nadie lo exige.
- `settings.read` se sembró junto a `settings.update` porque `GET /candidate/profile-settings` lo necesita.
- `catalogs.read` está sembrado, pero los catálogos de México se sirven hoy como **constantes** del backend/frontend, no por endpoint (ver `Impulso_Jobs_Modelo_ER.md`).
- **El contacto del postulado no está condicionado al plan.** `GET /company/applications` devuelve el correo de quien ya postuló, porque Media y Alta lo incluyen. `applications.contact.read` se reserva para la **base de talento** (candidatos que *no* han postulado), que llega con M12/M14.
- El rol de plataforma se verifica **además** del permiso donde hace falta: `applications.read` lo tienen los tres roles, así que el lado aspirante exige rol `CANDIDATE` y el lado empresa exige membresía en una empresa. Un `EMPLOYER` que llame a `/candidate/applications` recibe 403; un `CANDIDATE` que llame a `/company/applications`, 404.
- **`candidates.cv.read` ya está condicionado por cupo (M12).** El permiso deja pasar al `EMPLOYER`, pero el use-case comprueba `talent_access_grants`: sin visitas disponibles responde **402 `TALENT_QUOTA_EXHAUSTED`** con mensaje de upsell. Los candidatos que **ya postularon** a la empresa quedan fuera del cupo — son gratis y siempre accesibles, incluso con perfil privado.
- Los endpoints `/company/candidates/**` son de empresa: un `ADMIN` los tiene permitidos por matriz pero recibe 404 al no pertenecer a ninguna empresa. La vista global del back-office necesitaría su propio endpoint.
- **`account.data_export` se añadió en M13**, así que hace falta haber corrido `pnpm seed:rbac` después de esa versión o `GET /account/data-export` responderá 403.
- **La baja de la propia cuenta tiene dos topes de seguridad** además del permiso: no puede darse de baja el único `ADMIN` activo de la plataforma (`ACCOUNT_LAST_ADMIN`) ni el único `OWNER` de una empresa (`COMPANY_LAST_OWNER`). Además exige reconfirmar la contraseña.
- **Restaurar** (`POST /account/:id/restore`) exige `users.delete`, el mismo permiso que permite provocar la baja desde el back-office. Para *encontrar* las cuentas dadas de baja: `GET /admin/users?deleted=true`.

---

## 4. Acciones sobre planes y suscripciones

Catálogo definitivo: **Media** y **Alta** (pago único por publicación) + **Anual** (suscripción de empresa). Pasarela **Stripe México**.

### 4.1. Administrador
- Gobierna el catálogo (`plans.manage`): crea/edita Media/Alta/Anual, define beneficios (`plan_features`), **precios en MXN**, IVA 16 %, vencimientos, cupos de visitas y el badge "Más popular".
- Define el alcance de la **suscripción Anual**. Supervisa las facturas CFDI. **No compra.**

### 4.2. Empresa / Reclutador
- **Media / Alta:** compra **por vacante** (`promotions.create/checkout`). Métodos: tarjeta, **OXXO** *(solo si el monto ≤ $10,000 MXN)*, SPEI.
- **Anual:** contrata la **suscripción** (`subscriptions.create`). Métodos: tarjeta, SPEI, Meses Sin Intereses — **OXXO no aplica** (es recurrente). Gestiona/cancela vía Billing Portal.
- Recibe los beneficios del plan sobre la vacante y descarga su **CFDI** (`invoices.read`).

### 4.3. Aspirante
- No interactúa con planes. **Responde** las preguntas de filtrado, **recibe** el mensaje automático de no seleccionado, y **percibe** las vacantes destacadas/urgentes en el listado.

---

## 5. Beneficios "gated" por plan

Los permisos marcados `⊕` en la matriz existen para `EMPLOYER`, pero el `PermissionsGuard` los habilita solo si el **plan/suscripción activo** de la vacante o la empresa incluye el beneficio correspondiente:

| Acción `⊕` | Beneficio requerido | Media | Alta | Anual |
|---|---|:--:|:--:|:--:|
| `vacancies.pause` | `pause_reactivate` (nº) | — | 2 (con edición de título) | ilimitado* |
| `applications.contact.read` (base de talento) | `talent_db_access` | solo postulados | 20 visitas | según plan* |
| `candidates.cv.read` | `talent_db_access` (cupo) | 0 | 20 | según plan* |
| `ai.match` | `ai_candidate_matching` | — | ✓ | ✓* |
| `ai.job_draft` | `ai_job_creation` | — | ⚠️ por confirmar | ✓* |
| (destacada / urgente / confidencial / redes) | flags del plan | — | ✓ | ✓* |

\* El alcance exacto de la **suscripción Anual** sigue **por definir** (ver `Impulso_Jobs_Planes_Suscripciones.md`). La creación de ofertas con IA en Alta también está **por confirmar**.

> El consumo de `talent_db_access` se descuenta de `talent_access_grants` (M12/M14). Al agotarse el cupo, la acción se bloquea con mensaje de upsell.
