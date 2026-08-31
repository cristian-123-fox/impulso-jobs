# TASKS — Correcciones para la demo (QA agosto 2026)

Fuente: PDF "Pruebas software impulso Jobs" + decisiones del equipo.
Estados: ✅ hecho · 🔄 en curso · ⬜ pendiente · 🔷 decisión de negocio pendiente

---

## T1 · Datepicker: navegación de año ⬜

**QA (1.1 y 2):** en "Fecha de nacimiento" y en el modal "Nueva experiencia" no se puede cambiar de año ni escribir la fecha.

**Causa:** `frontend/src/app/shared/ui/datepicker/datepicker.ts` solo tiene flechas de mes (`shift(±1)`); la etiqueta "Febrero 2026" es un `<span>` no clicable y el trigger es un `<button>` (no se puede teclear). Con el campo vacío abre en el mes actual → llegar a ~1990 son ~430 clics.

**Fix (uno solo cubre los 5 usos):** cabecera clicable para elegir mes/año (grilla de años o selects) y opcionalmente entrada tecleada. Usos beneficiados: perfil candidato (nacimiento, experiencia, educación), registro de candidato, alta de usuario en admin.

## T2 · Header del panel: "la información no está llegando" ⬜ (absorbida por T8)

**QA (3):** "María Ferreira · Aspirante" no corresponde al usuario real.

**Causa:** es mock hardcodeado en `panel.facade.ts` (líneas 114–122). Nunca se conectó a la sesión. Ojo: `AuthUser` no trae nombre (`core/models/auth.models.ts`) — el nombre real sale de `GET /candidate/profile`.

**Fix:** el área nueva del candidato (T8) muestra nombre/iniciales reales desde el perfil.

## T3 · Notificaciones ⬜

**QA (4):** pide funcionalidad para la campana de notificaciones.

**Realidad:** la campana es decorativa (`panel-header.ts:54-63`, sin click ni servicio; el punto rojo es fijo). **No existe módulo de notificaciones en backend** (listado como "no construido" en CLAUDE.md).

**Para la demo:** no incluir la campana en el layout nuevo (un badge que nunca cambia confunde). Módulo real de notificaciones → backlog post-demo.

## T4 · /planes público no muestra los planes del admin ⬜

**QA (Web 1):** los planes creados en `/admin/planes` no aparecen en la página pública.

**Causa:** `features/public/plans/data/plans.facade.ts:26-72` tiene 3 planes inventados hardcodeados; la feature no hace ni un HTTP call.

**Fix:** el endpoint ya existe — `GET /api/v1/plans` (público, sin auth, solo activos; `public-plans.controller.ts`) y ya lo consume el área empresa (`features/company/billing/data/billing.api.ts:24-28`). Crear api/facade real en `features/public/plans/data/`, mapear `PlanResponseDto` (precio con IVA, `isPopular` → "Recomendado", `features[]`, `sortOrder`, `billingPeriod` vs toggle). Carga en `afterNextRender` (ruta prerenderizada).

## T5 · Card de empleos según diseño propuesto ⬜

**QA (Web 2):** la card debe igualar el diseño (estilo Jobzilla): logo grande, título + "hace X días", ubicación, badge de tipo, salario a la derecha, link al detalle.

**Archivo:** `features/public/vacancies/components/vacancy-card/vacancy-card.ts`. Ya llegan: logo, título, `publishedAt` (para "hace X días"), ubicación, `employmentType`, salario. Huecos:
- Sitio web de la empresa: la entidad lo tiene; el DTO público lo omite → cambio solo de DTO (`vacancy-response.dto.ts`) 🔷 (decidir si se expone).
- Badge "New": computable en frontend (publicada hace < N días).

## T6 · Detalle de vacante según diseño propuesto ⬜

**QA (Web 3):** debe igualar el diseño de dos columnas (contenido + sidebar de info/empresa).

**Archivo:** `features/public/vacancies/pages/public-vacancy-detail-page/public-vacancy-detail-page.ts`. Por costo:
- **Solo frontend (hacer ya):** layout, sidebar, botones de compartir y **el botón "Postularme" que hoy NO existe** (logueado → aplicar; anónimo → login con redirect). ⚠️ Bloqueante demo.
- **Solo DTO backend (barato):** website/contacto de empresa 🔷 (sugerencia: solo website).
- **Backend real (diferir o decidir 🔷):** contador de vistas (columna/tracking nuevo), nº de postulantes (sin migración: `COUNT` sobre applications en el use-case público), fecha límite (la entidad solo tiene `closedAt`), skills/tags (no existe la relación en `Vacancy` — lo más caro).

## T7 · Mapa/ubicación del detalle ⬜ (diferir)

El diseño trae mapa; no hay integración de mapas. Para la demo: ubicación textual (estado/municipio ya vienen). Mapa → post-demo.

## T8 · Eliminar el panel prototipo ⬜ (la grande)

**Decisión del equipo:** nada del panel `/panel` debe mostrarse; todo funcional para la demo.

Hoy `ROLE_HOME` manda al candidato a `/panel` (`core/auth/auth.service.ts:16-20`), cuyo header, sidebar, KPIs, dashboards, "buscar empleos" y "mis postulaciones" son mock de `panel.facade.ts` (741 líneas, con precios en COP y ciudades sudamericanas). Solo perfil, CV y configuración pegan a la API real.

Plan:
1. Crear área real del candidato (p. ej. `/candidato`, patrón `layout/company-layout`): mover ahí `candidate-profile`, `candidate-resumes`, `candidate-settings` (+ sus api/facade) con **rutas propias** (el panel era una sola URL sin deep-links).
2. Cablear "Mis postulaciones" a `GET /candidate/applications` (backend ya existe; el panel mostraba tabla mock).
3. Header real: nombre/iniciales desde `GET /candidate/profile` (cierra T2), sin campana (T3).
4. `ROLE_HOME.CANDIDATE` → área nueva, con `roleGuard([CANDIDATE])`.
5. Borrar ruta `/panel`, `PanelPage`, `panel.facade.ts` y componentes mock (dashboards, job-cards, data-table, vacancy-form mock, promo-buy, plans-catalog, panel-header/sidebar/kpis). La intercepción admin/empresa deja de hacer falta.
6. "Buscar empleos" del candidato → enlace a `/vacantes` (lista pública real).

## T9 · Subida de archivos con almacenamiento local ✅

**Decisión del equipo:** los archivos se almacenan en el disco local del servidor (cPanel).

**Lo que YA existe (no rehacer):**
- ✅ **CV del candidato (PDF), de punta a punta:** `POST /candidate/resumes` multipart + validación (5 MB, mime, magic bytes `%PDF-`), puerto `CANDIDATE_RESUME_STORAGE` → `LocalCandidateResumeStorageService` (guarda en `uploads/candidate-resumes/<profileId>/<resumeId>.pdf`), select/download/delete, y frontend con `<input type="file">` + `FormData` (`candidate-resumes.ts`, `candidate-resume.api.ts`).

**Implementado (2026-08-31):**
- ✅ **Foto del candidato:** `POST /candidate/profile/photo` multipart (jpg/png/webp, máx. 5 MB, validado por magic bytes) + file picker con preview en el modal "Foto"; "Quitar foto" usa el `PATCH` con `null`. Al reemplazar/quitar se borra el archivo local anterior.
- ✅ **Logo de empresa:** `POST /company/profile/logo` multipart + botones "Subir logo"/"Quitar" en el perfil (cubre `/empresa/perfil` y el preview del panel: es el mismo componente).
- ✅ **Static serving:** `useStaticAssets` sobre `<UPLOADS_DIR>/public` bajo `/uploads` (fuera de `/api/v1`), caché immutable 30 días (cada subida genera nombre nuevo). URLs absolutas con `APP_PUBLIC_URL`. Los CVs quedan FUERA del directorio público (siguen bajando por endpoint autenticado). Smoke test OK (Content-Type y caché correctos).
- ✅ Puerto `PUBLIC_FILE_STORAGE` + `LocalPublicFileStorageAdapter` en `backend/src/common/storage/` (mismo patrón que `MAILER_PORT` / `PAYMENT_PROVIDER`: migrar a S3 = cambiar el `useClass` en `candidates.module` y `companies.module`).
- ✅ Documentado en `.env.example` (`UPLOADS_DIR`, `APP_PUBLIC_URL`) y `DEPLOY-CPANEL.md` (persistencia de `~/api/uploads`, respaldos). `uploads/` ya estaba en el `.gitignore` del backend.
- ✅ Códigos de error nuevos: `CANDIDATE_PHOTO_INVALID_TYPE/TOO_LARGE`, `COMPANY_LOGO_INVALID_TYPE/TOO_LARGE`, `FILE_TOO_LARGE` (tope multer).

---

## Hallazgos técnicos (deuda detectada al explorar)

- ✅ **Bloques `#region debug-point` eliminados** de `candidate-resume.use-case.ts` (hacían `fetch` a `127.0.0.1:7777` en cada subida de CV; deuda de AGENTS.md §339).
- ✅ **`ResponseInterceptor` ya deja pasar `StreamableFile`** sin envolverlo — el download de CV (`GET /candidate/resumes/:id/download`) funciona.
- ✅ **`FileInterceptor` con `limits.fileSize`** en CV (6 MB) e imágenes (6 MB; el use-case valida 5 MB con errorCode propio), y `MulterError` mapeado a 413 `FILE_TOO_LARGE` en `AllExceptionsFilter` (antes salía 500).
- ✅ `pnpm run lint` del backend queda sin errores (se corrigió `search.util.ts` y el `no-control-regex`; quedan solo warnings preexistentes en los e2e specs).
- ⬜ **La empresa no puede descargar el CV** de un postulante: `company-applications.controller.ts` expone metadatos del CV pero no tiene endpoint de descarga.
- ℹ️ `@IsUrl` en los DTOs de foto/logo rechaza rutas relativas — por eso las URLs de archivos subidos se guardan absolutas (`APP_PUBLIC_URL`).

## Orden sugerido

T9 ✅ → T8 → T4 → botón Postularme (T6) → T1 → T5 → resto de T6.

## Decisiones que necesita el negocio 🔷

1. ¿Qué datos de la empresa se exponen públicamente en la vacante? (website / teléfono / correo — sugerencia: solo website).
2. ¿Vistas, fecha límite y skills de la vacante entran a la demo o se difieren? (las tres requieren backend real).
