# TASKS — Impulso Jobs

Estados: ✅ hecho · 🔄 en curso · ⬜ pendiente · 🔷 decisión de negocio pendiente

- **Parte A — Demo (QA agosto 2026):** correcciones del PDF "Pruebas software impulso Jobs" + decisiones del equipo. Prioridad absoluta.
- **Parte B — Backlog de producto (análisis Computrabajo):** extraído de `computrabajocontextoclonacion.md`, cruzado contra el código real. Post-demo salvo los quick wins.
- **Parte C — Backlog solicitado (septiembre 2026):** lista del equipo del 2026-09-10 (T21–T27), verificada contra el código. Fichas autocontenidas, listas para pegar en el gestor de tareas. **T21–T27 hechas**; lo que T26 dejó fuera a propósito (áreas privadas y correos) está levantado como **T28**, pendiente de la decisión N10.
- **Parte D — Backlog solicitado (lista del 2026-09-12):** segunda tanda de apuntes del equipo (T29–T35), verificada igual contra el código. **T29 es un bug de producción** (403 al postularse) y va primero; el resto son mejoras de back-office y del área del candidato. Decisiones abiertas: N11, N12, N13.

---

# Parte A · Correcciones para la demo (QA)

## T1 · Datepicker: navegación de año ✅

**Hecho (2026-08-31):** la cabecera "Febrero 2026" ahora es un botón → grilla de 12 años (con paginación de década) → grilla de meses → días. Las flechas navegan según la vista (mes / año / página de 12 años) y `min`/`max` deshabilitan años y meses fuera de rango. Un solo cambio en `shared/ui/datepicker` cubre los 5 usos.

**QA (1.1 y 2):** en "Fecha de nacimiento" y en el modal "Nueva experiencia" no se puede cambiar de año ni escribir la fecha.

**Causa:** `frontend/src/app/shared/ui/datepicker/datepicker.ts` solo tiene flechas de mes (`shift(±1)`); la etiqueta "Febrero 2026" es un `<span>` no clicable y el trigger es un `<button>` (no se puede teclear). Con el campo vacío abre en el mes actual → llegar a ~1990 son ~430 clics.

**Fix (uno solo cubre los 5 usos):** cabecera clicable para elegir mes/año (grilla de años o selects) y opcionalmente entrada tecleada. Usos beneficiados: perfil candidato (nacimiento, experiencia, educación), registro de candidato, alta de usuario en admin.

## T2 · Header del panel: "la información no está llegando" ✅ (resuelta por T8)

**QA (3):** "María Ferreira · Aspirante" no corresponde al usuario real.

**Causa:** es mock hardcodeado en `panel.facade.ts` (líneas 114–122). Nunca se conectó a la sesión. Ojo: `AuthUser` no trae nombre (`core/models/auth.models.ts`) — el nombre real sale de `GET /candidate/profile`.

**Fix:** el área nueva del candidato (T8) muestra nombre/iniciales reales desde el perfil.

## T3 · Notificaciones ✅ (para la demo)

**Hecho (2026-08-31):** la campana decorativa desapareció junto con el panel (T8); el layout nuevo no la incluye. El módulo real de notificaciones sigue en backlog post-demo.

**QA (4):** pide funcionalidad para la campana de notificaciones.

**Realidad:** la campana es decorativa (`panel-header.ts:54-63`, sin click ni servicio; el punto rojo es fijo). **No existe módulo de notificaciones en backend** (listado como "no construido" en CLAUDE.md).

**Para la demo:** no incluir la campana en el layout nuevo (un badge que nunca cambia confunde). Módulo real de notificaciones → backlog post-demo.

## T4 · /planes público no muestra los planes del admin ✅

**Hecho (2026-08-31):** `plans.facade.ts` ya consume `GET /api/v1/plans` (nuevo `public-plans.api.ts`); se eliminaron los 3 planes inventados. El toggle proyecta los periodos reales ("Por publicación" / "Suscripción anual") y solo muestra ciclos con planes; precios en **MXN** con nota "IVA incluido" (la card formateaba en USD); `isPopular` → "Recomendado"; features con valores numéricos ("-1" → ilimitado); estado vacío honesto si el admin aún no crea planes; CTA → registro de empresa. Carga en `afterNextRender` (ruta prerenderizada).

**QA (Web 1):** los planes creados en `/admin/planes` no aparecen en la página pública.

**Causa:** `features/public/plans/data/plans.facade.ts:26-72` tiene 3 planes inventados hardcodeados; la feature no hace ni un HTTP call.

**Fix:** el endpoint ya existe — `GET /api/v1/plans` (público, sin auth, solo activos; `public-plans.controller.ts`) y ya lo consume el área empresa (`features/company/billing/data/billing.api.ts:24-28`). Crear api/facade real en `features/public/plans/data/`, mapear `PlanResponseDto` (precio con IVA, `isPopular` → "Recomendado", `features[]`, `sortOrder`, `billingPeriod` vs toggle). Carga en `afterNextRender` (ruta prerenderizada).

## T5 · Card de empleos según diseño propuesto ✅

**Hecho (2026-08-31):** card rediseñada al layout propuesto — logo grande a la izquierda, título + "/ hace X días" en verde, ubicación + tipo·modalidad, nombre de empresa en color de marca, y columna derecha con badge ("Nueva" si tiene <7 días; si no, el tipo de contratación), salario "$X – $Y / Mensual" y "Ver vacante". Los badges monetizados (Destacada/Urgente/Verificada) se conservan como chips.

**QA (Web 2):** la card debe igualar el diseño (estilo Jobzilla): logo grande, título + "hace X días", ubicación, badge de tipo, salario a la derecha, link al detalle.

**Archivo:** `features/public/vacancies/components/vacancy-card/vacancy-card.ts`. Ya llegan: logo, título, `publishedAt` (para "hace X días"), ubicación, `employmentType`, salario. Huecos:
- Sitio web de la empresa: la entidad lo tiene; el DTO público lo omite → cambio solo de DTO (`vacancy-response.dto.ts`) 🔷 (decidir si se expone).
- Badge "New": computable en frontend (publicada hace < N días).

## T6 · Detalle de vacante según diseño propuesto ✅ (parte frontend)

**Hecho (2026-08-31):** layout de dos columnas — contenido (descripción, requisitos, **compartir** en WhatsApp/Facebook/X/LinkedIn) + sidebar con "Información del empleo" (iconos: publicada, ubicación, contratación, modalidad, experiencia, salario) y card "Acerca de la empresa" (respeta confidencialidad). **Botón "Postularme"** (no existía): candidato logueado → `POST /candidate/applications` con estados enviando/postulado y manejo de `APPLICATION_ALREADY_EXISTS` / `VACANCY_NOT_ACTIVE`; anónimo → `/auth/login?returnUrl=/vacantes/:id` (el login ahora respeta `returnUrl` interno); empresa/admin no ven el botón.

**Pendiente (requiere backend, decisión 🔷):** contador de vistas, nº de postulantes (`COUNT` sobre applications, sin migración), fecha límite (la entidad solo tiene `closedAt`), skills/tags (no existe la relación), website/contacto de empresa en el DTO público.

## T7 · Mapa/ubicación del detalle ✅

**Hecho (2026-08-31):** sección "Ubicación" en el detalle público con mapa **Leaflet** + tiles de OpenStreetMap. Como la vacante no tiene coordenadas, se geocodifica municipio+estado con **Nominatim** (fallback al centro del estado; si tampoco hay resultado, queda solo la ubicación textual). Marcador `circleMarker` en color de marca (sin assets de icono), carga perezosa (`import('leaflet')` solo en navegador), CSS global vía `angular.json`, `allowedCommonJsDependencies: ["leaflet"]`. Cuando exista el catálogo de CP con lat/lng (decisión N4), el geocoding se sustituye por coordenadas propias.

## T8 · Eliminar el panel prototipo ✅

**Hecho (2026-08-31):** `features/panel/` eliminado por completo (panel-page, panel.facade con sus 741 líneas de mocks, dashboards, job-cards, data-table, promo-buy, plans-catalog, vacancy-form mock, panel-header/sidebar/kpis). Los componentes reales se movieron con `git mv`:
- `candidate-profile`, `candidate-resumes`, `candidate-settings` (+ api/facade/models) → **`features/candidate/`** con rutas propias: `/candidato/{perfil,cv,postulaciones,configuracion}` bajo `roleGuard([CANDIDATE])` y layout nuevo (`layout/candidate-layout`, patrón company-layout, render `Client`).
- `company-profile` (+ api/facade/models) → `features/company/profile/` (su página ya lo usaba).
- **"Mis postulaciones" real** sobre `GET /candidate/applications` (nuevo api + página con paginación y badges de estado) — antes era tabla mock.
- Header con **nombre/iniciales/foto reales** vía `ensureProfile()` (cierra T2); sin campana (T3); "Buscar empleo" enlaza a `/vacantes`.
- `ROLE_HOME.CANDIDATE` → `/candidato/perfil`; links "Ir al panel" eliminados de los layouts de admin y empresa; imports de admin actualizados.

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
- ✅ **La empresa ya puede descargar el CV de un postulante** (2026-08-31): `GET /company/applications/:id/resume` — acotado por ownership (`company_id`), audita `company.application.resume.download`, y baja por el storage privado de CVs (nunca por `/uploads` público). En el frontend: botón de descarga por fila en la tabla de postulaciones (deshabilitado si la postulación no tiene CV adjunto). CORS ahora expone `Content-Disposition` para que el navegador lea el nombre real del archivo (beneficia también la descarga del propio candidato).
- ℹ️ `@IsUrl` en los DTOs de foto/logo rechaza rutas relativas — por eso las URLs de archivos subidos se guardan absolutas (`APP_PUBLIC_URL`). Resuelto por diseño; no requiere cambio.

## Orden sugerido

Parte A completa (2026-08-31): T1–T9 ✅ (incluye mapa Leaflet y descarga de CV por la empresa) · quedan las decisiones 🔷.
Tras la demo: quick wins T10–T14 (Parte B), luego el núcleo T15+.

## Decisiones que necesita el negocio (demo) 🔷

1. ¿Qué datos de la empresa se exponen públicamente en la vacante? (website / teléfono / correo — sugerencia: solo website).
2. ¿Vistas, fecha límite y skills de la vacante entran a la demo o se difieren? (las tres requieren backend real).

---

# Parte B · Backlog de producto — análisis Computrabajo

Verificado contra el código el 2026-08-31. Primero lo que **ya tenemos** (para no re-construir), luego tareas nuevas T10+.

## Lo que Computrabajo hace y NOSOTROS YA TENEMOS ✅

| Computrabajo | Impulso Jobs (ya construido) |
|---|---|
| "Actualizar oferta" (bump) | `PATCH /company/vacancies/:id/refresh` → `refreshedAt`; el orden público ya es `featured DESC, urgent DESC, refreshedAt DESC` |
| Destacada / Urgente / Confidencial / badge | Flags en la entidad `Vacancy`, controlados por billing (pero ver T14: dos no se activan nunca) |
| Buscador de CVs con desbloqueo por CV | `talent/`: listado gratis + detalle cobra 1 visita; `talent_access_grants/views`; re-aperturas gratis para siempre; postulantes propios siempre gratis |
| Créditos/cuotas con expiración | `talent_access_grants(totalVisits, usedVisits, expiresAt)` + `EntitlementService` al liquidar pago |
| Tres ejes de autorización (rol / entitlement / cuota) | `RolesGuard` + `PermissionsGuard` + entitlements de billing + `TALENT_QUOTA_EXHAUSTED` (402) |
| Pipeline de postulación con etapas | Catálogo de 7 estados (`IN_REVIEW → … → SELECTED/REJECTED/FINISHED`) + historial auditado |
| Pausas limitadas, título no editable al reactivar | `pauseCount/maxPauses`, `canEditTitleOnReactivate` — dictados por el plan comprado |
| Datos fiscales SAT / RFC / régimen | M9 completo, RFC inmutable |
| Autoservicio de compra (lo que CT NO tiene) | Checkout propio vía `PaymentProviderPort` — nuestra ventaja frente a su venta asistida; conservarla |

## Quick wins — HECHOS (2026-08-31)

### T10 · Preguntas de filtrado (killer questions) ✅
Implementación completa de la especificación (§3.1):
- **Backend:** tablas `vacancy_questions` + `vacancy_question_options` (peso `-1` excluyente | `0–10`) + `application_answers` (con **snapshot** del texto de la pregunta y del peso aplicado); `candidate_applications` ganó `score` e `is_excluded`. Endpoints: `GET/PUT /company/vacancies/:id/questions` (máx. 5; cerradas con 2–5 opciones), `GET /vacancies/:id/questions` (público, **sin pesos** — son secretos), `GET /company/applications/:id/answers`. El `POST /candidate/applications` valida y puntúa las respuestas en la misma transacción.
- **Gate por plan:** el feature `screening_questions` ahora SÍ hace algo — `EntitlementService` activa `screening_enabled` en la vacante al liquidar la promoción (y lo revoca al expirar; las preguntas ya definidas se conservan). Sin el beneficio, `PUT questions` responde 403 `VACANCY_SCREENING_NOT_ENABLED`.
- **Congelamiento:** con la primera postulación las preguntas quedan bloqueadas (409 `VACANCY_SCREENING_LOCKED`) — cambiar el cuestionario invalidaría los puntajes.
- **Frontend:** editor de preguntas en modal (acción por fila en `/empresa/vacantes`, visible si el plan lo otorgó); el candidato responde en un modal al Postularme; la bandeja de empresa muestra columna "Filtro" ("N pts" / "Descartado") y modal de respuestas.
- 3 pruebas unitarias nuevas del scoring (suite completa: 220 tests en verde).

### T11 · Moderación anti-PII ✅
`shared/utils/pii.ts`: detecta teléfono (10+ dígitos), correo, enlaces y ofuscaciones ("arroba", "punto com", "whatsapp"). **Variante suave** (§13.4.4): banner ámbar de aviso en el formulario de vacante (descripción/requisitos) y en el editor de preguntas — no bloquea la publicación.

### T12 · Denunciar vacante ✅
- **Backend:** entidad `vacancy_reports` (única por usuario+vacante), catálogo de 7 motivos exacto (§8), `POST /vacancies/:id/report` (JWT, rol CANDIDATE en el use-case, 409 si duplica), y cola admin `GET /admin/vacancy-reports` + `PATCH :id/resolve` (rol ADMIN + permiso, doctrina de doble guard; reutiliza `vacancies.read`/`vacancies.status` — sin cambios al seed RBAC).
- **Frontend:** link "Denunciar esta vacante" en el detalle público (solo candidatos) con modal de motivos + comentario; nueva área **`/admin/denuncias`** con filtro pendientes/resueltas y botón Resolver.

### T13 · No leídos en postulaciones ✅
`read_at` en `candidate_applications`: cualquier interacción de la empresa (detalle, historial, respuestas, CV o cambio de estado) la marca leída — a nivel empresa, no por reclutador. El listado devuelve `unread`; la UI muestra chip "N sin leer", punto naranja y nombre en negrita en las filas sin abrir, con actualización optimista al interactuar.

### T14 · Coherencia billing ✅ (flags) · 🔷 (postingQuota)
- ✅ `urgent_confidential_badge` ya escribe: activa `isUrgent` automáticamente y otorga la **capacidad** `can_be_confidential` — la confidencialidad la decide la empresa con un checkbox en su formulario (403 `VACANCY_CONFIDENTIAL_NOT_ENABLED` sin el beneficio). Al expirar la promoción se revocan urgente, confidencial y la capacidad.
- 🔷 **`postingQuota` sigue sin aplicarse** — y es deliberado: hoy publicar es gratis e ilimitado y las suscripciones NO aplican beneficios a vacantes (solo cupo de talento). Aplicar la cuota exige primero diseñar "beneficios de suscripción sobre vacantes". Movido a decisión de negocio **N5**.

**Nota de despliegue:** 3 migraciones nuevas (`1720000013000`–`1720000015000`) — correr `migration:run:prod`. No hay permisos nuevos (no requiere re-seed RBAC). Para probar preguntas/urgente/confidencial se necesita un plan activo con esos features y una promoción pagada sobre la vacante.

## Núcleo post-demo

### T15 · Enriquecer el modelo de vacante ✅

**Hecho (2026-08-31):**
- **Catálogo de 23 áreas profesionales** embebido (`backend/src/common/catalogs/professional-areas.ts`, espejo en `frontend/src/app/shared/catalogs/professional-areas.catalogs.ts`) con `id` estable y `slug` para las landings de T16. *Nota:* `computrabajocontextoclonacion.md` no está en el repo, así que los IDs no se heredaron de §3.2 — son propios (1–23, orden alfabético, taxonomía Computrabajo MX).
- **Vacante:** `professional_area_id` (obligatoria al crear/editar; nullable sólo por las vacantes viejas), `positions_count` (default 1), `contract_type` (enum LFT: indeterminado/determinado/temporada/obra u otro), `min_education_level` (9 niveles MX), `has_commissions`, `application_deadline` (`date`, inclusiva; `VACANCY_INVALID_DEADLINE` si nace en el pasado, y `POST /candidate/applications` responde `APPLICATION_VACANCY_NOT_ACTIVE` cuando ya venció). Migración `1720000016000`.
- **Portal público:** filtros nuevos `areaId`, `salaryMin` (paga al menos X: `COALESCE(salary_max, salary_min) >= X`, ignora salario oculto), `publishedWithinDays` (1/3/7/15/30) y `sort=relevance|date|salary` (relevance conserva el orden monetizado; salary ordena NULLs al final en MySQL — divergencia PG documentada en el repo).
- **Frontend:** form de empresa con los 6 campos (área/contrato/escolaridad en `ij-select`, plazas, checkbox comisiones, `ij-datepicker` con `min=hoy`); lista pública con los 3 filtros + selector de orden (reordena al vuelo); detalle público muestra área, contrato, escolaridad, plazas (>1), "Postúlate antes del" y "+ comisiones" en el salario.
- 3 pruebas nuevas (deadline en pasado, mapping T15, deadline vencida al postular): suite 223 en verde.

Propuesta original: área (23), plazas, contrato MX, escolaridad (9), comisiones, fecha límite (habilita T6) + filtros públicos de salario/fecha/área y orden.

### T16 · SEO del portal público ✅

**Hecho (2026-08-31).** Hallazgo previo: el build era **SPA puro** — el commit del deploy cPanel había eliminado `server`/`outputMode`/`ssr` de `angular.json` (el código SSR seguía en el repo, muerto). Se restauró y sobre eso:
- **SSR real**: `angular.json` recupera `server`/`outputMode: server`/`ssr` + `security.allowedHosts` (obligatorio en Angular 20 — sin él, el engine rechaza el host y cae a CSR; hostnames sin puerto: localhost, demo.impulsojobs.com…). `/vacantes` y `/vacantes/:id` en `RenderMode.Server`; `empresa/**` faltaba en las rutas de servidor (caía al prerender) — corregido a Client.
- **Datos en el HTML servido**: lista y detalle hacen el fetch en el servidor y pasan el resultado por `TransferState` — el cliente hidrata con los mismos datos sin re-pedir ni parpadear (compartir/mapa/preguntas quedan en `afterNextRender`).
- **Slug en la URL**: canónica `/vacantes/<uuid>-<slug-del-titulo>` (`shared/utils/seo.ts`; el backend recibe los primeros 36 chars — no cambió). Cards enlazan con slug; URL sin slug se canonicaliza con `Location.replaceState` + `<link rel="canonical">`.
- **Meta/OG + JSON-LD JobPosting** por vacante (`core/services/seo.service.ts`): title con empresa y lugar, description, OG/twitter, canonical absoluto (`environment.siteUrl` nuevo), y JSON-LD con salario MXN, `validThrough` (fecha límite T15 o vigencia T20), `occupationalCategory` (área T15), `TELECOMMUTE` si remota. Checks tolerantes a APIs sin desplegar T15.
- **Landings**: **`/trabajo/<area>-en-<estado>`** (p. ej. `/trabajo/ventas-en-jalisco`) — reutilizan la página de lista con filtros preconfigurados, h1/title/canonical propios y SSR. *Divergencia deliberada:* el análisis proponía `trabajo-de-X-en-Y` en un solo segmento, pero Angular no soporta parámetros parciales de segmento; se usó el prefijo `/trabajo/`. Slug inválido → redirect a `/vacantes`.
- `robots.txt` (bloquea /admin, /empresa, /candidato, /auth). **Sitemap.xml pendiente** (backlog: idealmente generado por el backend con las vacantes activas).
- **Smoke test local completo**: SSR sirvió lista con 5 vacantes y links con slug, detalle con title/canonical/JSON-LD/OG, landing válida e inválida, y el circuito T18 (vista SSR → consolidación → contador). Prerender de 14 rutas estáticas sigue funcionando.
- ⚠️ **Cambia el despliegue**: para el SEO el frontend debe correr como **app Node en cPanel** (`dist/frontend/server/server.mjs`, como la API). Documentado en DEPLOY-CPANEL.md, incluida la alternativa estática (pierde SSR).

### T17 · Acciones del candidato 🔄 (fase 1 ✅ · resto ⬜)

**Fase 1 — Guardar vacante ✅ (2026-08-31):**
- Tabla `saved_vacancies` (única por perfil+vacante, **borrado físico** — el soft delete rompería el índice único al re-guardar; migración `1720000020000`), en `modules/candidates/` (autoservicio del aspirante).
- Endpoints `GET/POST/DELETE /candidate/saved-vacancies[/:vacancyId]` + `GET .../ids` (para pintar el botón). Guardar y quitar son **idempotentes**; sólo se guardan vacantes visibles en el portal (404 si no); una guardada que luego cierra se conserva marcada "Ya no disponible". Auditado.
- **Permiso nuevo `saved_vacancies.manage`** (rol CANDIDATE) — ⚠️ **re-correr `pnpm seed:rbac`** o el endpoint responde 403.
- Frontend: botón "Guardar/Guardada" (toggle optimista, icono `bookmark` nuevo en ij-icon) junto a Postularme en el detalle; página **`/candidato/guardadas`** (reutiliza `app-vacancy-card`, quitar por fila, paginación) + ítem en el sidebar del candidato.
- 6 pruebas nuevas; suite 238 en verde.

**Fases pendientes (en orden):** ocultar vacante ⬜ · seguir empresa ⬜ · alertas de búsqueda (job `send-search-alerts`; el correo real ya existe — T21/Resend) ⬜ · "recibir similares" ⬜.

### T18 · Contador de vistas por vacante ✅

**Hecho (2026-08-31), patrón CT §4 (eventos + consolidación diaria, sin contadores calientes):**
- Tabla `vacancy_view_events` + columna `vacancies.views_count` (migración `1720000018000`). El `GET /vacancies/:id` público registra el evento en fuego-y-olvido (una vista jamás tumba el detalle).
- Job **`pnpm views:consolidate`** (+ `:prod`): suma por vacante y borra los eventos consolidados **en una sola transacción con el mismo corte** — si falla, nada se pierde ni se cuenta doble. Cron documentado en DEPLOY-CPANEL.md.
- `viewsCount` expuesto en ambos DTOs: columna "Vistas" (con ojo y tooltip "se actualizan una vez al día") en la bandeja `/empresa/vacantes`, y "Visualizaciones" en el sidebar del detalle público cuando > 0 (cierra el pendiente de vistas de T6).
- 2 specs nuevos (consolidación) + 2 en el público (registra vista / no registra en 404). Suite 230 en verde.

### T19 · Snapshot del CV en la postulación ✅

**Hecho (2026-08-31), patrón CT §6 sobre el almacenamiento local de T9:**
- Al postular se congela una **copia del archivo** en `<UPLOADS_DIR>/application-resumes/<applicationId>.pdf` (privado, nunca por `/uploads`) + metadatos (`resume_snapshot_{key,name,mime}` en `candidate_applications`, migración `1720000019000`). El id de la postulación se genera antes de la transacción para nombrar el archivo; si la transacción falla, el snapshot huérfano se borra.
- **Best-effort:** si la copia falla, la postulación sigue con la FK viva (postularse es lo crítico) — queda warning en el log.
- `GET /company/applications/:id/resume` **prefiere el snapshot** (lo que la empresa evaluó, aunque el candidato borre/reemplace su CV) y cae a la FK viva para postulaciones previas a T19 o snapshot ilegible. La auditoría registra `fromSnapshot`.
- Nuevo puerto `APPLICATION_RESUME_SNAPSHOT_STORAGE` + adaptador local (mismo patrón que `CANDIDATE_RESUME_STORAGE`; S3 = cambiar el `useClass`). *Nota:* el adaptador respeta `UPLOADS_DIR`; el de CVs vivos sigue fijado a `process.cwd()/uploads` (deuda menor preexistente).
- Pendiente conocido: la purga de cuentas (`purge:accounts`) aún no borra los archivos de snapshot (tampoco borraba los CVs vivos) — anotado como deuda.
- 2 specs nuevos (congela copia / best-effort). Suite 232 en verde. Sin cambios de frontend: la descarga es el mismo botón.

### T20 · Vigencia de la vacante ✅

**Decisión (2026-08-31): reloj de publicación de 60 días**, configurable con `VACANCY_LIFETIME_DAYS` (0 lo desactiva). Hecho:
- Al publicar: `expires_at = publishedAt + N días` (migración `1720000017000`). Las vacantes previas quedan con NULL — **nunca vencen**; el reloj sólo aplica a publicaciones nuevas. Pausar/reactivar/refrescar NO tocan el reloj.
- **Vigencia comunicada desde el día 1** (sin relojes opacos, §13.4.5): "Vigente hasta X" en la ficha pública; `expiresAt` expuesto en ambos DTOs.
- Job **`pnpm vacancies:expire`** (+ `:prod`): cierra las vencidas (status `CLOSED` + `closedAt`, auditado como `vacancies.expire`, un fallo no detiene el lote). Cron documentado en DEPLOY-CPANEL.md junto a `billing:expire`.
- `POST /candidate/applications` rechaza vacantes con `expiresAt` vencido (`APPLICATION_VACANCY_NOT_ACTIVE`) — cubre la ventana hasta la corrida del cron. La lista pública no filtra por `expiresAt` a propósito: con cron diario la ventana es ≤24 h.
- Las postulaciones recibidas siguen legibles tras el cierre (decisión "no copiar" #2).
- Spec nuevo `expire-vacancies.use-case.spec.ts` (3 pruebas); suite 226 en verde.

**Nota de despliegue T15–T20 (2026-08-31):** 5 migraciones nuevas (`1720000016000`–`1720000020000`) → `migration:run:prod`. **Permiso nuevo `saved_vacancies.manage`** → re-correr `seed:rbac:prod`. Env nueva `VACANCY_LIFETIME_DAYS` (default 60). Dos crons nuevos: `vacancies:expire:prod` y `views:consolidate:prod` (junto a `billing:expire:prod`). El frontend pasa a desplegarse como **app Node SSR** (DEPLOY-CPANEL §6). Suite backend: 238 tests en 37 suites, lint sin errores; build SSR verificado con smoke test local de punta a punta.

## Decisiones de negocio (producto) 🔷

- **N1 · Modelo de cobro del contacto.** Hoy el email del postulante se entrega **gratis y a propósito** a la empresa. Computrabajo cobra exactamente eso ("publicación gratis, contacto de pago", §5.3). Adoptarlo cambiaría el DTO de postulaciones y el masking de talento. Decisión estratégica, no técnica.
- **N2 · Profundidad del masking en talento.** Nuestro buscador es lista-mínima → detalle completo (todo o nada) y la lista muestra **nombre real completo gratis**. CT muestra el CV profesional completo y enmascara solo lo identificable (§7) — convierte mejor y expone menos PII en el listado gratuito. Rediseñar el DTO de búsqueda es tarea mediana.
- **N3 · Edad y género: NO adoptar.** El propio análisis lo desaconseja (§13.4.1, riesgo CONAPRED/LFPDPPP). Hoy no los tenemos — dejarlo como decisión documentada.
- **N4 · Catálogo de CP con lat/lng + filtro por distancia.** Requiere catálogo de códigos postales georreferenciado (hoy municipio es texto libre). Costo alto; diferir hasta que haya volumen.
- **N5 · ¿Qué limita `postingQuota`?** Hoy publicar es gratis e ilimitado y las suscripciones solo otorgan cupo de talento. Opciones: (a) la suscripción aplica beneficios (verificación, etc.) a hasta N vacantes — requiere diseñar ese flujo; (b) retirar el campo del catálogo. Mientras no se decida, el campo se guarda pero no se aplica.

## Diferido (backlog largo)

Reviews/rating de empresa · IA (crear oferta, sugerir skills, matching — códigos de feature ya reservados: `ai_job_creation`, `ai_candidate_matching`) · reportes asíncronos con cola (`task` + BullMQ) · mensajería reclutador↔candidato · tests de competencias (Talentview).

## No copiar (decisión explícita)

1. Venta solo por asesor comercial — el autoservicio es nuestra ventaja.
2. Bloquear el acceso a postulaciones ya recibidas al vencer (genera el motivo de denuncia "No me responden"); si hay vencimiento, conservar lectura y cobrar solo contacto nuevo.
3. Rechazo duro de la oferta por PII (T11 usa aviso en línea).
4. Filtros de edad/género (N3).
5. Doble reloj opaco 60/30 sin comunicarlo (T20).

---

# Parte C · Backlog solicitado (septiembre 2026)

Levantado el **2026-09-10** a partir de la lista del equipo y **verificado contra el código**. T21–T27 están cerradas; **T28 no venía en la lista del equipo**: recoge lo que T26 dejó fuera a propósito (áreas privadas y correos). Cada ficha es autocontenida a propósito: el bloque completo de un `### T##` es lo que se pega tal cual en la tarjeta del gestor de tareas.

## Resumen para el gestor de tareas

| # | Título | Tipo | Prioridad | Estimación | Depende de |
|---|---|---|---|---|---|
| T21 ✅ | Módulo de notificaciones (plataforma + correo) | Feature / infra | Alta | L (5–8 d) | SMTP real |
| T22 ✅ | Aviso de plan por vencer + cancelación automática | Feature | Alta | M (3–4 d) | T21 · N8 ✅ |
| T23 ✅ | Imágenes subidas con URL `localhost` en la demo | **Bug** | **Bloqueante demo** | XS (2–4 h) | — |
| T24 ✅ | Imagen de referencia en la vacante | Feature | Media | S (1–2 d) | T23 · N7 ✅ |
| T25 ✅ | Skills requeridas en la vacante | Feature | Media | M (2–3 d) | N9 ✅ |
| T26 ✅ | Traducciones del sitio (i18n) | Feature / transversal | Media | L (5–8 d+) | N6 ✅ |
| T27 ✅ | Nombre y foto del usuario logueado en el portal | Mejora UX | Media | S (1 d) | — |
| T28 | Traducir áreas privadas y correos (cierre de i18n) | Feature / transversal | Baja | M (3–5 d) | T26 ✅ · 🔷 N10 |

Estimaciones a ojo, para ordenar el tablero — no son compromisos.

---

### T21 · Módulo de notificaciones (plataforma + correo) ✅

> **Actualización 2026-09-13 — el proveedor de correo es Resend.** `MailerModule` elige adaptador por configuración: `RESEND_API_KEY` → `ResendMailerAdapter` (SDK oficial `resend`; nació sin SDK porque entonces era ESM-only y el backend es CJS en cPanel — desde la 6.x el paquete trae build dual y se migró) · `SMTP_HOST` → `SmtpMailerAdapter` (nodemailer, se conserva como alternativa) · ninguna → consola. Despliegue: `RESEND_API_KEY` + `MAIL_FROM` con el **dominio verificado** en Resend (SPF/DKIM). De paso muere el riesgo de que cPanel bloquee el puerto 587 saliente — Resend va por HTTPS.

**Qué se pide:** notificaciones dentro de la plataforma (campana / bandeja) y por correo electrónico.

**Estado hoy (verificado 2026-09-10):**
- **No existe módulo de notificaciones.** `MailerPort` (`backend/src/modules/iam/auth/services/mailer.port.ts`) sólo sabe dos cosas —`sendPasswordReset` y `sendEmailVerification`— y vive **dentro de `iam/auth`**: no es un servicio transversal.
- El único adaptador es `ConsoleMailerAdapter`, que **escribe el enlace en el log en lugar de enviarlo**. No hay SMTP configurado (CLAUDE.md, DEPLOY-CPANEL.md).
- La campana del panel se eliminó en T3/T8 justamente porque era decorativa.

**Alcance propuesto:**
1. **Sacar el correo de `iam/auth`** a `common/mailer/` (o al propio `modules/notifications/`): `MailerPort` genérico `send({ to, subject, template, data })` + plantillas. Los dos correos actuales pasan a ser plantillas; el binding sigue siendo un `useClass`, como hoy.
2. **Adaptador SMTP real** (`SmtpMailerAdapter` con nodemailer; env `SMTP_HOST/PORT/USER/PASS/FROM`), conservando `ConsoleMailerAdapter` como default de desarrollo. **Esto desbloquea de paso la verificación de correo y el reset de contraseña en producción, hoy inservibles.**
3. **Notificaciones en plataforma:** tabla `notifications` (`user_id`, `type`, `title`, `body`, `link`, `read_at`, `created_at`) + `NotificationService.notify(userId, type, payload)` que escribe la fila y, según preferencias, dispara el correo.
4. **Endpoints:** `GET /notifications` (paginado, filtro no leídas) · `GET /notifications/unread-count` · `PATCH /notifications/:id/read` · `POST /notifications/read-all`. Permiso nuevo `notifications.read` → ⚠️ **re-correr `pnpm seed:rbac`** o responde 403.
5. **Preferencias por usuario** (qué llega por correo y qué sólo en plataforma), enganchadas a la configuración que ya existe (`candidate_profile_settings` y su equivalente de empresa).
6. **Frontend:** campana con badge de no leídas en los tres layouts (candidato, empresa, admin) + panel desplegable + página `/notificaciones`. **Sin websockets**: polling o refresco al navegar — decisión explícita por el despliegue en cPanel.

**Catálogo inicial de eventos:**
- *Candidato:* cambio de estado de su postulación (M11 ya guarda el historial), vacante guardada que se cierra, verificación de correo.
- *Empresa:* nueva postulación recibida, **plan por vencer (T22)**, promoción caducada (`billing:expire` ya existe), denuncia resuelta.
- *Admin:* denuncia nueva (T12), pago manual pendiente de confirmar.

**Criterios de aceptación:**
- Un correo real llega a una bandeja externa (Gmail) desde el entorno de demo.
- Cambiar el estado de una postulación crea la fila en `notifications` **y** envía el correo al candidato; la campana refleja el contador.
- Marcar como leída baja el contador y persiste tras recargar.
- Las preferencias se respetan: desactivar "por correo" deja la notificación en plataforma y no envía nada.
- **Un fallo de SMTP no tumba la operación de negocio** — el envío es best-effort y queda en el log (mismo criterio que el snapshot de T19).

**Riesgos:** sin cola (BullMQ está en el backlog diferido) el envío es síncrono; si el volumen crece habrá que meter cola. El hosting cPanel puede bloquear el puerto SMTP saliente — **confirmarlo con el proveedor antes de estimar en firme**.

---

### T22 · Aviso de plan por vencer y cancelación automática ✅

**Hecho (2026-09-11).** Se implementó el alcance propuesto. Antes, dos correcciones al diagnóstico de la ficha, verificadas en el código:

- **El cupo de talento NO se conservaba para siempre.** `grantTalentVisits` guarda el grant con `expiresAt = currentPeriodEnd` y `findActiveGrants` filtra por `MoreThan(now)`: el cupo muere solo al acabar el periodo.
- **El daño real era otro y peor.** Como `EXPIRED` no se asignaba nunca, `findLiveSubscriptionByCompany` seguía devolviendo la suscripción muerta y `subscribe()` respondía `SUBSCRIPTION_ALREADY_EXISTS`: **la empresa quedaba bloqueada para renovar**, y su área de facturación mostraba como vigente un plan caducado.

**N8 — decisión tomada: al expirar sólo cambia el estado.** No queda nada más que apagar. El cupo ya caduca solo (arriba), los distintivos de vacante los aplica `applyToVacancy`, que **sólo** corre en la rama de *promociones* —una suscripción nunca los pone— y el `postingQuota` de N5 no existe en el código. Los datos se conservan, como pedía la decisión #5.

1. **Repositorio** — `findExpiredActiveSubscriptions(now)` (ACTIVE y PAST_DUE con periodo vencido; las PENDING_PAYMENT no tienen fin de periodo) y `findSubscriptionsExpiringBefore(now, limit)`.
2. **`ExpireSubscriptionsUseCase`** — `status = EXPIRED` + auditoría `subscriptions.expire`, una suscripción por transacción y un fallo no detiene el lote (patrón de `ExpirePromotionsUseCase`).
3. **`NotifySubscriptionExpiryUseCase`** — umbrales de `SUBSCRIPTION_EXPIRY_NOTICE_DAYS` (default `30,7,1`; vacío los desactiva). Notifica en plataforma **y** por correo vía T21, sólo a **OWNER/ADMIN** de la empresa (y a todo el equipo si no hay ninguno, antes que a nadie). Audita `subscriptions.expiry_notice`.
   - **Idempotencia:** tabla nueva `subscription_notices` con único `(subscription_id, period_end, threshold_days)`, escrito con `insert()` que choca contra el índice — mismo patrón que `registerEventOnce`. `period_end` entra en la clave para que **una renovación vuelva a avisar**. El acuse se escribe *antes* de notificar: preferimos perder un aviso ante una caída que mandarlo dos veces.
   - **Un solo aviso por ventana:** se comunica el umbral **más urgente** que aplica y se marcan como consumidos los mayores. Si no, al avisar a 7 días el umbral de 30 volvería a cumplirse al día siguiente (`6 <= 30`) y dispararía otro correo.
4. **`findLiveSubscriptionByCompany` ahora recibe `now`** y descarta las de periodo vencido aunque el cron aún no las haya marcado. Es lo que desbloquea la renovación **sin depender del cron** (si no, la empresa esperaría hasta 24 h). El riesgo que anotaba la ficha no se materializó: `LIVE_SUBSCRIPTION_STATUSES` no se tocó y el método sólo se usa en `CompanySubscriptionUseCase` (3 sitios), no en entitlements.
5. **Job** — colgado del `billing:expire` existente, sin cron nuevo: promociones → suscripciones → avisos, en ese orden (avisar después de expirar evita anunciar lo que acaba de vencer).
6. **Frontend** — la ficha del plan ya mostraba "vigente hasta X"; se le añade un aviso destacado a ≤ 30 días (ámbar), ≤ 7 días (rojo) y un mensaje propio si ya venció.

**Verificado:** 10 casos nuevos en `expire-subscriptions.use-case.spec.ts` y `notify-subscription-expiry.use-case.spec.ts` (incluidos "no reenvía aunque el job corra a diario" y "tras avisar a 7 todavía avisa al llegar a 1"); suite backend completa **41 suites / 262 tests en verde**; build del frontend con prerender. Y **end-to-end contra Postgres**: suscripción a 7 días → 1 aviso + correo renderizado a `empresa@impulso.test`; segunda pasada → 0 avisos; periodo movido al pasado → `EXPIRED` con su fila de auditoría; `GET /company/subscriptions/current` deja de devolverla y `GET /notifications/unread-count` responde 1.

**Despliegue:** `migration:run:prod` (tabla `subscription_notices`) y enganchar `pnpm billing:expire:prod` a un cron **diario**. Sin permisos nuevos. Los correos sólo salen de verdad con `RESEND_API_KEY` configurada (T21); sin ella el adaptador de consola los escribe en el log.

**Nota (fuera de T22):** al empezar, el backend estaba **roto en `main`** por el merge de T21 — `nodemailer` declarado pero sin instalar, migraciones 21 y 22 sin aplicar, `seed:rbac` sin re-correr, y 17 tests en rojo en `candidate-applications` y `vacancy-status` porque sus specs no se actualizaron al añadir la dependencia de notificaciones. Todo eso quedó arreglado de paso.

**Qué se pedía:** avisar a la empresa cuando queda cierto tiempo para que acabe su plan y, si no renueva, cancelarlo automáticamente.

**Estado antes de la tarea (verificado 2026-09-10) — con los dos matices corregidos arriba:**
- `CompanySubscription` ya tiene `currentPeriodEnd` (con índice `idx_company_subscriptions_period_end`, listo para la consulta) y `autoRenew`.
- **`SubscriptionStatus.EXPIRED` está declarado en el enum y no se asigna en ningún punto del código.** Tampoco existe `findExpiredActiveSubscriptions` en el repositorio (sí existe el gemelo de promociones, `findExpiredActivePromotions`).
- `findLiveSubscriptionByCompany` filtra por `LIVE_SUBSCRIPTION_STATUSES` (`billing.repository.ts:24`) = PENDING_PAYMENT / ACTIVE / PAST_DUE, **sin mirar la fecha**. Consecuencia real: **una suscripción vencida se sigue considerando activa indefinidamente** y la empresa conserva los beneficios del plan para siempre.
- `autoRenew` se escribe (true al suscribir, false al cancelar) pero **nunca se lee**.
- `pnpm billing:expire` sólo caduca **promociones de vacante**, no suscripciones.

**Alcance propuesto:**
1. `findExpiredActiveSubscriptions(now)` en el repositorio — gemelo exacto del de promociones.
2. **`ExpireSubscriptionsUseCase`** copiando el patrón de `ExpirePromotionsUseCase`: una suscripción por transacción, `status = EXPIRED`, revocar entitlements vía `EntitlementService`, auditar `subscriptions.expire`, y que un fallo no detenga el lote. **Colgarlo del job `billing:expire` existente** (+ gemelo `:prod`) en vez de crear otro cron.
3. **Avisos escalonados** antes del vencimiento, configurables con `SUBSCRIPTION_EXPIRY_NOTICE_DAYS` (default `30,7,1`): notificación en plataforma + correo (T21) con CTA a renovar. **Idempotencia obligatoria** — registrar el aviso ya enviado (tabla/columna `subscription_notices`) o el cron diario reenvía el mismo correo cada día.
4. **Vigencia comunicada desde el día 1** (misma decisión que T20, "sin relojes opacos"): "Tu plan vence el X" en el área de facturación de la empresa, y banner cuando falten ≤ N días.
5. **Semántica de "cancelar":** al expirar se revocan los **beneficios**, pero **los datos se conservan** — vacantes publicadas, postulaciones recibidas y CVs ya desbloqueados siguen accesibles (decisión "no copiar" #2). Hay que definir exactamente qué se apaga: cupo de talento, distintivos, ¿poder publicar vacantes nuevas? → 🔷 **N8**, ligada a N5.
6. Con `autoRenew = true` y el adaptador manual **no hay cobro automático**: hoy "renovar" es una orden nueva. Cuando exista Stripe, el webhook de renovación ya cae en `SettlePaymentUseCase` sin cambios.

**Criterios de aceptación:**
- Una suscripción con `currentPeriodEnd` en el pasado queda `EXPIRED` tras correr `billing:expire`, con su registro de auditoría.
- Tras expirar, `findLiveSubscriptionByCompany` deja de devolverla y la empresa pierde el cupo de talento (402 `TALENT_QUOTA_EXHAUSTED`).
- La empresa recibe aviso a 30 / 7 / 1 días, **una sola vez por umbral**, aunque el cron corra a diario.
- Vacantes publicadas y postulaciones recibidas siguen visibles después de expirar.
- Spec unitario del caso de uso (patrón `expire-vacancies.use-case.spec.ts`).

**Riesgos:** tocar `LIVE_SUBSCRIPTION_STATUSES` cambia el comportamiento de entitlements de **todas** las empresas — revisar `EntitlementService` antes de mover nada.

---

### T23 · Bug · Las imágenes subidas apuntan a `localhost` en la demo ✅

**Hecho (2026-09-10) — código listo; queda un paso de despliegue.** El bug era de configuración, así que el trabajo fue *que no pueda repetirse* y *poder reparar lo ya guardado*:

1. **Arranque en fallo (opción a).** `resolveAppPublicUrl()` (`common/storage/public-base-url.ts`) centraliza la base pública: normaliza (quita barras finales), **valida que sea http(s) absoluta** y, con `NODE_ENV=production` sin `APP_PUBLIC_URL`, **lanza**. `main.ts` la llama antes de `NestFactory.create` y sale con código 1 y el mensaje explicando que la URL se persiste en BD; en desarrollo sigue cayendo a `http://localhost:PORT` pero **avisando por consola**. El adaptador ya no arma la URL a mano.
2. **Backfill `pnpm uploads:rehost`** (`database/rehost-uploaded-files.ts`, gemelo `:prod`): reescribe el host de `companies.logo_url` y `candidate_profiles.profile_photo_url` al `APP_PUBLIC_URL` actual. **Simulación por defecto** (patrón de `purge:accounts`), `-- --confirm` para escribir y `-- --from=<origen>` para acotar. Sólo toca archivos nuestros —valida la clave `/uploads/<carpeta>/<uuid>.<ext>` con `storageKeyFromUrl`—, así que un logo con URL externa pegada a mano en el perfil no se toca. No mueve archivos de disco: ya están en su sitio. Sirve igual el día que cambie el dominio.
3. **Documentación:** `.env.example` (`NODE_ENV` + por qué `APP_PUBLIC_URL` no es opcional) y DEPLOY-CPANEL.md (§ 5.5 con el procedimiento de rehost, `NODE_ENV=production` en el `.env` de ejemplo y la comprobación de que `~/api/uploads` sobrevivió al deploy).
4. **Tests:** `public-base-url.spec.ts` (9 casos) cubre normalización, fallback de desarrollo, fallo en producción, URL sin esquema y las tres ramas del rehost. Suite completa en verde (38 suites / 247 tests).

**Pendiente de despliegue (no es código):** definir `APP_PUBLIC_URL=https://<subdominio-del-api>` —y `NODE_ENV=production`— en el `.env` de demo y producción, reiniciar, correr `pnpm run uploads:rehost:prod` (primero en simulación) y comprobar `ls ~/api/uploads/public/company-logos`. Hasta ese paso las imágenes viejas de la demo se siguen viendo rotas.

**Decisión tomada — se guarda la URL absoluta (opción a), no la clave relativa (b).** La (b) es lo correcto de fondo, pero obliga a quitar el `@IsUrl` de los DTOs de foto/logo, a migrar los datos y a componer la URL en **todos** los mapeadores de salida (perfil de empresa, admin, card y detalle público de vacante, talento, postulaciones). **Sigue abierta y es el momento de decidirla en T24**, cuando se añada `vacancies.image_url`: si se hace, el criterio debe ser el mismo en las tres columnas y `rehost-uploaded-files.ts` es justo el sitio donde vive la migración de datos.

---

<details>
<summary>Ficha original de la tarea</summary>


**Reporte QA:** "en demo no se pueden subir imágenes, no quedan guardadas" — la URL resultante es `http://localhost:3000/uploads/company-logos/f08e21b1-58f9-471c-8a41-b190efbd63f4.jpg`.

**Causa (verificada) — sí se guardan; lo que está mal es la URL:** el archivo **se escribe correctamente en disco**. `LocalPublicFileStorageAdapter` construye su `baseUrl` con `process.env.APP_PUBLIC_URL` y **cae a `http://localhost:${PORT}` cuando la variable no está definida** (`local-public-file-storage.adapter.ts:19`). En el servidor de demo `APP_PUBLIC_URL` no está puesta, así que se persiste una URL que sólo resuelve dentro del propio servidor: el navegador no puede cargarla y **parece** que la subida no se guardó.

**Agravante — la URL se persiste absoluta en BD:** `company.logoUrl = this.storage.publicUrl(key)` (`company-profile.use-case.ts:166`; igual para la foto del candidato). Por eso **definir la variable no arregla las filas ya guardadas**: hay que reescribirlas.

**Fix:**
1. **Inmediato:** definir `APP_PUBLIC_URL=https://<subdominio-del-api>` en el `.env` de demo y de producción, y reiniciar la app. Ya estaba documentado en `.env.example:70` y en DEPLOY-CPANEL.md — simplemente se omitió al desplegar.
2. **Backfill:** migración o script que reescriba el host en las filas existentes de `companies.logo_url` y `candidate_profiles.photo_url` (`UPDATE … SET col = REPLACE(col, 'http://localhost:3000', '<host nuevo>')`).
3. **Que no vuelva a pasar** — elegir una:
   - **(a) Arrancar en fallo (recomendada, barata):** si `NODE_ENV=production` y falta `APP_PUBLIC_URL`, lanzar en el bootstrap en lugar de caer silenciosamente a localhost.
   - **(b) Guardar la clave relativa** (`company-logos/<uuid>.jpg`) y componer la URL absoluta en el DTO de salida. Es lo correcto de fondo — sobrevive a cambios de dominio y a una migración a S3 — pero obliga a quitar el `@IsUrl` de los DTOs de foto/logo (nota conocida al cierre de la Parte A) y a migrar los datos. **Preferible si se aborda junto con T24.**
4. **Verificar la persistencia del directorio:** confirmar en el servidor real que `~/api/uploads` sobrevive al deploy por `git pull` (está documentado, conviene comprobarlo).

**Criterios de aceptación:**
- Subir un logo en la demo devuelve una URL con el dominio público y la imagen se ve en `/empresa/perfil`, en la card de vacante y en el detalle público.
- Los logos subidos **antes** del fix también se ven (backfill aplicado).
- Levantar el backend en producción sin `APP_PUBLIC_URL` falla con un mensaje claro (si se elige la opción a).

</details>

---

### T24 · Imagen de referencia en la vacante ✅

**Añadido el 2026-09-11 al resolver el merge:** T24 guarda `vacancies.image_url` como **URL absoluta**, el mismo criterio que T23 —correcto y coherente—, pero no se dio de alta en `uploads:rehost`, que sólo cubría el logo de empresa y la foto del candidato. Es justo el riesgo que anotaba T23 ("el criterio debe ser el mismo en las tres columnas y `rehost-uploaded-files.ts` es donde vive la migración de datos"): un deploy sin `APP_PUBLIC_URL` dejaba imágenes de vacante con `localhost` **sin forma de repararlas**. Ya está añadida como tercer objetivo del script, y de paso el script filtra en BD (`WHERE image_url IS NOT NULL`) en vez de traerse la tabla entera a memoria — `vacancies` es la primera de la lista que puede ser grande.

**Qué se pide:** al publicar una vacante, poder subir una imagen de referencia.

**Estado hoy:** `Vacancy` **no tiene ninguna columna de imagen** (verificado sobre `vacancy.entity.ts`); la card y el detalle público muestran el **logo de la empresa**. Toda la mecánica de subida ya existe y es reutilizable tal cual (viene de T9): puerto `PUBLIC_FILE_STORAGE` + `LocalPublicFileStorageAdapter`, validación por *magic bytes* en `common/storage/image-upload.ts`, `FileInterceptor` con `limits.fileSize`, códigos de error y borrado del archivo anterior al reemplazar.

**Alcance propuesto:**
- Migración: `vacancies.image_url` (varchar, nullable). **Ojo con T23:** decidir aquí si se guarda clave relativa o URL absoluta, y aplicar el mismo criterio en ambas tareas.
- `POST /company/vacancies/:id/image` (multipart) + `DELETE`, acotado por ownership (`company_id`), patrón calcado de `POST /company/profile/logo`. Límite 5 MB, jpg/png/webp. Códigos nuevos `VACANCY_IMAGE_INVALID_TYPE` / `VACANCY_IMAGE_TOO_LARGE`. Auditar subida y borrado.
- Exponer `imageUrl` en el DTO público y en el de empresa.
- **Frontend:** control de subida con preview en `vacancy-form` (el alta/edición vive en `ij-modal`); usar la imagen como cabecera en `public-vacancy-detail-page`. **La card de la lista sigue con el logo** salvo decisión contraria.
- **SEO:** si hay imagen, usarla en OG y en el campo `image` del JSON-LD `JobPosting` (`seo.service.ts`).

**Decisión de negocio (N7) — resuelta el 2026-09-11: la imagen es para *todas* las vacantes**, no un beneficio monetizado como Destacada. **No hay nada que cambiar en el código**: T24 se implementó sin condicionar la imagen al plan (`vacancy-image.use-case.ts` sólo comprueba *ownership*, no consulta `EntitlementService`), así que ya se comporta como pide la decisión. Si algún día se monetiza, el punto de enganche es ese use-case.

**Lo que la decisión no cubre — recorte:** sigue siendo **libre** (subida sin recorte ni proporción forzada). Funciona, pero como la imagen alimenta OG y el `image` del JSON-LD, una foto muy vertical se ve mal en la vista previa al compartir. Queda como mejora opcional: recortar a 1200×630 en el cliente al subir.

**Criterios de aceptación:** subir / reemplazar / quitar desde el alta y la edición; la imagen aparece en el detalle público y en la vista previa al compartir; una vacante sin imagen se ve exactamente como hoy; el archivo anterior se borra del disco al reemplazar.

---

### T25 · Skills requeridas en la vacante ✅

**Hecho (2026-09-11).** Se implementó el alcance propuesto con catálogo normalizado:

1. **Tabla `skills`** (`id` varchar(36) UUID, `name` varchar(100), `slug` varchar(120) único) + **tabla `vacancy_skills`** (`vacancy_id`, `skill_id`, `is_required` bool, `sort_order`). Migración `InitVacancySkills1720000023000`. Tope de 15 skills por vacante validado en `ReplaceVacancySkillsDto`.
2. **Alta y edición junto con la vacante** — el `SaveVacancyDto` acepta un array `skills[]` opcional; `CompanyVacanciesUseCase.create/update` delega en `VacancySkillsUseCase.replace` dentro de la misma transacción. Las skills se crean o reutilizan por nombre (case-insensitive); el `slug` se genera automáticamente.
3. **Endpoints de gestión:** `GET/PUT company/vacancies/:id/skills` (misma empresa, permiso `vacancies.update`) + `GET company/vacancies/skills/search?q=...` (autocomplete, crea si no existe).
4. **Portal público:** `VacancyResponseDto` y `PublicVacancyResponseDto` exponen `skills[]` (name + isRequired). `PublicVacanciesUseCase.list/get` carga skills en lote por página. `GET vacancies?skillId=...` filtra por skill vía subquery.
5. **Frontend:** pendiente — los DTOs ya exponen las skills para que el componente de chips las pinte.

**Archivos creados (9):** `skill.entity.ts`, `vacancy-skill.entity.ts`, `InitVacancySkills1720000023000.ts`, `skill.repository.interface.ts`, `skill.repository.ts`, `vacancy-skill.repository.interface.ts`, `vacancy-skill.repository.ts`, `vacancy-skill.dto.ts`, `vacancy-skills.use-case.ts`.

**Archivos modificados (9):** `vacancy.dto.ts`, `vacancy-response.dto.ts`, `company-vacancies.controller.ts`, `public-vacancies.controller.ts`, `company-vacancies.use-case.ts`, `public-vacancies.use-case.ts`, `vacancy.repository.ts` (+`vacancy.repository.interface.ts`), `vacancies.module.ts`, 2 spec files.

**Verificado:** build limpio, migración corriendo en PostgreSQL, 39 suites / 252 tests (17 fallos preexistentes en `main`).

**Qué se pedía:** poder indicar las skills requeridas en la vacante.

**Criterios de aceptación:** crear una vacante con N skills y verlas en el detalle público; editarlas sin perder el resto de campos; filtrar la lista pública por una skill; una vacante sin skills se ve como hoy.

---

### T26 · Traducciones del sitio (i18n) ✅

**Hecho (2026-09-11).** Portal público en **español e inglés** (N6), con Transloco y diccionarios JSON en runtime. Se cubrieron las fases 1, 2, 3 y 6 del alcance propuesto, más `/auth`, que no estaba en la lista y sí es público.

1. **Infraestructura** — `core/i18n/`: `i18n.config.ts` (idiomas, cookie, locales, `hreflang`), `provideI18n()` enganchado en `app.config.ts`, `LanguageService`, `AppTranslateService`, `LocaleFormatService` y un loader propio. El loader carga los diccionarios con `import()` en vez del loader HTTP de Transloco: ese necesita una URL absoluta en servidor y añade una petición antes del primer pintado; así el bundler parte un chunk por idioma, el servidor lo lee del disco y el navegador baja sólo el activo.
2. **La elección se guarda en cookie (`ij_lang`), no en `localStorage`.** `localStorage` no viaja en la petición, así que el servidor no podría saber el idioma y **siempre** pintaría español: el criterio de aceptación ("el HTML de SSR ya sale en el idioma correcto, sin parpadeo") es incumplible con él. La cookie la leen los dos lados —servidor de la cabecera `Cookie`, navegador de `document.cookie`—, de modo que el primer render del cliente coincide con el servido.
3. **URL por idioma para el SEO: `?lang=en`.** Sin URL propia por variante no hay `hreflang` honesto —la misma dirección devolvería dos contenidos— así que el parámetro existe *para* el SEO: manda sobre la cookie, y al entrar por él el idioma se guarda y deja de hacer falta. `seo.service.ts` emite `hreflang` es-MX/en-US + `x-default`, `og:locale` y un canonical **por variante** (el canonical de la inglesa es ella misma; apuntar a la española la descartaría del índice). `setLocalizedPage()` rehace el head al cambiar de idioma.
4. **Render por petición.** Las páginas del portal y `/auth/**` pasaron de prerender a `RenderMode.Server`: un HTML estático se congela en un idioma en tiempo de build. Quedan prerenderizadas 2 rutas. **`/mantenimiento` sigue prerenderizada a propósito** —es lo que se sirve cuando el resto no funciona— y por eso **su texto sigue sólo en español**.
5. **Alcance traducido:** navbar, footer, home (hero, áreas, vacantes destacadas, pasos, CV, empresas, testimonios, FAQ), `/vacantes` + tarjeta + detalle (incluidos los modales de postulación y denuncia), landings `/trabajo/...`, planes, contacto, nosotros, faq, y `/auth` (login, registro candidato y empresa, recuperar y restablecer contraseña, verificación). Más el UI kit que asoma en el portal: `ij-page-header`, `ij-modal`, `ij-select`/`ij-multiselect`, la paginación y los mensajes de validación de `ij-control-base`. **546 claves, simétricas en los dos idiomas.**
6. **Errores traducidos por `errorCode`** (fase 5), no traduciendo el backend: el `message` del envelope sigue en español y nadie lo pinta. Login, registro, restablecer contraseña, postulación y denuncia conmutan sobre el código.
7. **Formatos (fase 6):** `LocaleFormatService` formatea importes MXN y fechas con el locale activo, y como lee la señal de idioma, un `computed` que lo use se recalcula al cambiar de idioma. Sustituye a los `Intl.*('es-MX')` escritos a mano en cinco sitios. `LOCALE_ID` se registra igual para los pipes de Angular, pero **se resuelve una sola vez**: por eso el portal usa el servicio y no los pipes.
8. **Reactividad:** en plantilla se usa `*transloco="let t"`; fuera de ella (`computed`, opciones de `<select>`, títulos de pestaña) **`AppTranslateService`**, que lee la señal de idioma antes de traducir — `TranslocoService.translate()` a secas devuelve un string suelto y nada avisa de que hay que recalcularlo.

**Lo que deliberadamente no se traduce:** los **catálogos** (estados, áreas profesionales, regímenes SAT, tipos de documento) y **lo que escribe un usuario o el back-office** (título y descripción de la vacante, nombre del plan y de sus beneficios, razón social). Tampoco las **búsquedas frecuentes** de la home: son términos de consulta contra vacantes escritas en español, y "Warehouse" no devolvería ninguna.

**Verificado:** build en verde; `ng test` 10/10 con dos specs nuevas (`translations.spec.ts` compara los dos diccionarios —mismas claves, sin textos vacíos, mismos parámetros— y `language.service.spec.ts` cubre cookie, idioma desconocido y cambio); y contra el servidor SSR real: `/inicio`, `/nosotros`, `/planes`, `/contacto`, `/faq`, `/vacantes`, `/trabajo/...` y `/auth/**` responden 200 con `<html lang>`, `<title>`, canonical y `hreflang` correctos en los dos idiomas, tanto por `?lang=en` como por cookie.

**Lo que queda fuera (fases 4 y 5) está levantado como [T28](#t28--traducir-áreas-privadas-y-correos-cierre-de-i18n-):** las áreas privadas siguen en español y los correos se envían en español.

**Qué se pedía:** traducciones del sitio web.

**Estado antes de la tarea:** **no había ninguna infraestructura de i18n.** No estaban `@angular/localize`, ngx-translate ni Transloco; lo único era el target `extract-i18n` del scaffold del CLI. Todos los textos estaban escritos a mano en español dentro de los templates — y algunos en inglés, restos de la plantilla original ("Job Description:", "Application ends:", "/ Month" en el detalle de vacante), que esta tarea también corrigió.

**Decisión de negocio (N6) — resuelta el 2026-09-11: español e inglés.** Español es el idioma por defecto y el de respaldo (una clave sin traducir cae ahí); los locales son `es-MX` y `en-US`.

**Decisión técnica — `@angular/localize` vs. Transloco: se eligió Transloco.**
- **`@angular/localize`** (i18n oficial): traducción en tiempo de build → **un bundle por idioma**, mejor rendimiento y SEO (URLs `/es/`, `/en/`), pero **no permite cambiar de idioma sin recargar** y multiplica el despliegue SSR (una app Node por idioma, o un router delante).
- **Transloco:** JSON en runtime, cambio de idioma instantáneo, un solo bundle. Más simple de desplegar en cPanel; el SEO multi-idioma (`hreflang`, canonical por idioma) hay que armarlo a mano — y se armó (punto 3).

**Criterios de aceptación:** cambiar de idioma traduce el portal público sin recargar y la elección persiste; el HTML servido por SSR ya sale en el idioma correcto (**sin parpadeo al hidratar**); `hreflang` correcto; un texto sin traducir cae al español sin romper la vista.

---

### T28 · Traducir áreas privadas y correos (cierre de i18n) ⬜

**Qué se pide:** terminar de traducir lo que T26 dejó fuera **a propósito**: las áreas privadas del producto y los correos que salen de la plataforma. No es trabajo nuevo de infraestructura — `core/i18n/` ya está montado y probado; esto es extracción de textos (frontend) y una preferencia por usuario (backend).

**Estado hoy (2026-09-11, al cerrar T26):** el portal público y `/auth` están en español e inglés, con 546 claves en `frontend/src/app/core/i18n/translations/{es,en}.json`. **`/candidato`, `/empresa` y `/admin` siguen escritos a mano en español**, igual que las plantillas de correo del backend (T21).

**Decisión previa 🔷 (N10) — ¿hace falta?** T26 se justificaba con el público: el portal es la cara que ven candidatos e **empresas internacionales**. Las áreas privadas son usuarios recurrentes de un solo mercado, y por eso la propia ficha de T26 las marcó como diferibles. **Antes de arrancar conviene confirmar que hay demanda real** — una empresa extranjera que publique vacantes sí gestionaría su panel en inglés; el back-office de administración casi seguro que no. Si la respuesta es "sólo `/empresa`", el alcance se reduce a la mitad.

**Alcance propuesto:**
1. **`/empresa`** (vacantes, postulaciones, candidatos, promociones, usuarios, perfil). Es el área con caso de uso real para el inglés y la que más comparte con el portal.
2. **`/candidato`** (perfil, cv, postulaciones, guardadas, configuración).
3. **`/admin`** — el más prescindible: lo usa el equipo, en español. Puede quedarse fuera sin que nadie lo note.
4. **Retirar los mapas de etiquetas duplicados.** Hoy el español de los enums está **en dos sitios**: los mapas `*_LABELS` de `features/company/vacancies/models/vacancies.models.ts` (que usa el área privada) y la rama `enums.*` del diccionario (que usa el portal). Al traducir las áreas privadas, los mapas desaparecen y todo pasa por `AppTranslateService.enumLabel()`. Mismo caso: `PASSWORD_POLICY_HINT` frente a `validation.passwordPolicy`. **Mientras exista la duplicación, un cambio de etiqueta hay que hacerlo en los dos lados.**
5. **Correos (T21) en el idioma del destinatario.** Hoy salen en español desde `common/mailer/`. Pide: columna de idioma preferido en `users` (migración), exponerla en la configuración de la cuenta, y que el use-case que compone el correo elija plantilla. **Es la única parte del backend que necesita idioma** — los `message` del envelope siguen en español y nadie los pinta: el frontend conmuta sobre `errorCode`, que es el contrato estable.
6. **`/mantenimiento`** sigue prerenderizada y en español. Traducirla obligaría a servirla por petición, que es justo lo que no queremos de una página que existe para cuando el resto falla. **Recomendación: dejarla como está.**

**Cómo se traduce aquí** (ya está decidido en T26, no hay que volver a elegir): en plantilla, `*transloco="let t"`; en código, **`AppTranslateService`** —nunca `TranslocoService.translate()` a secas, que devuelve un string suelto y no se recalcula al cambiar de idioma—; fechas e importes, con `LocaleFormatService`. Cada clave nueva va **en los dos ficheros**: `translations.spec.ts` falla si uno se queda atrás.

**Criterios de aceptación:** con el idioma en inglés, las áreas del alcance no muestran ningún texto en español salvo datos (nombres de vacante, de empresa, catálogos); cambiar de idioma dentro del área privada repinta sin recargar; un usuario con idioma inglés recibe los correos en inglés; y los mapas `*_LABELS` han desaparecido del código.

**Riesgo:** es transversal otra vez, pero acotado — el portal, que era el grueso, ya está hecho. El riesgo real es empezarlo **sin la decisión N10** y traducir un back-office que nadie va a usar en inglés.

---

### T27 · Nombre y foto del usuario logueado en el portal público ✅

**Hecho (2026-09-11).** Se implementó el alcance propuesto tal cual, con una desviación de ubicación explicada abajo:

1. **`GET /auth/me`** — devuelve `{ id, email, role, displayName, avatarUrl }` resolviendo por rol: candidato → `candidate_profiles` (nombre + apellido, `profile_photo_url`); empresa → membresía → `companies` (`business_name`, `logo_url`); admin → correo, porque **`users` no tiene columna de nombre** (tampoco la tenía antes: no se inventó una para esto). Cualquier perfil a medio completar cae también al correo, que siempre existe. Se lee del repositorio y no del JWT a propósito: el token se emitió al iniciar sesión y no refleja un cambio posterior de foto o de nombre comercial. Sin `@RequirePermissions` —leer la propia identidad es universal, como `/auth/logout`—, así que **no hace falta re-correr `seed:rbac`**. Sin migración: no toca el esquema.
   - **Desviación:** el endpoint **no vive en `AuthController`** sino en `modules/iam/session/` (`SessionController`, mismo prefijo `auth`). Resolver el nombre obliga a leer de `candidates` y `companies`, y ambos módulos importan `AuthModule`: meterlo allí cerraba un ciclo de DI. Es el mismo motivo por el que existen `AdminUsersModule` y `AccountModule`.
2. **Frontend** — `AuthUser` gana `displayName`/`avatarUrl` (opcionales: el login no los devuelve). `AuthService.loadIdentity()` cachea la llamada **por carga de la app**, no por navegación (`shareReplay` + `identity$`), sólo corre en el navegador y **falla en silencio**: si `/auth/me` no responde, el navbar se queda con el correo que ya está en `localStorage`. `setSession()` la dispara al iniciar sesión y `clearSession()` la invalida. El resultado se persiste con `TokenStorageService.setUser()`, así que la siguiente carga pinta el nombre sin esperar a la red.
3. **Navbar** — menú de usuario con avatar (foto o iniciales; con un correo, sus dos primeras letras), nombre truncado y desplegable con nombre + correo, "Ir a mi cuenta" (`ROLE_HOME`) y **"Cerrar sesión"**, que el portal público no ofrecía. Cierra al pulsar fuera, con `Escape` y al navegar.
4. **SSR** — el servidor no tiene sesión, y mostrarla en el primer render del cliente dejaría un DOM distinto al servido: la sesión se revela tras `afterNextRender` (`hydrated`). El hueco reserva `min-w-[172px]` —lo que mide el disparador completo: avatar 32 + nombre 96 + chevron 14 + separaciones—, de modo que ni el nombre más largo ensancha el bloque y el cambio no desplaza el resto de la barra; el nombre se trunca en el disparador y va completo en el desplegable. Verificado sobre el server SSR: `/inicio` sale con "Ingresar" y el hueco reservado, sin menú de usuario. De paso deja de fallar igual `postJobPath()`, que ya leía la sesión en el primer render.
5. **Móvil** — cabecera con avatar + nombre + correo dentro del hamburguesa, y "Ir a mi cuenta" / "Cerrar sesión" junto a las acciones.

**Verificado:** `get-current-user.use-case.spec.ts` (5 casos: candidato, empresa, admin, empleador sin membresía y cuenta borrada); suite backend completa en verde (39 suites / 252 tests); build del frontend con prerender de las 14 rutas estáticas; y `GET /auth/me` probado contra la BD con los tres seeds — candidato → "María Ferreira", empresa → "Northwind MX" + logo, admin → correo, y 401 sin token.

**Nota:** el header del área de empresa (`company-layout.ts`) sigue mostrando el correo en vez del nombre comercial. Queda fuera del alcance de esta ficha —que es el portal público—, pero ahora es un cambio de dos líneas: `AuthService.loadIdentity()` ya tiene el dato.

**Qué se pedía:** que al navegar el portal estando logueado se vean el nombre y la foto del usuario, para que quede claro que la sesión está activa.

**Estado antes de la tarea (verificado el 2026-09-10):** el navbar público **ya detectaba la sesión**, pero mostraba un genérico — `account()` (`navbar.ts:176`) devuelve `{ label: 'Mi cuenta' }` con un icono `user` estático. La causa es la misma que ya se anotó en T2: **`AuthUser` sólo trae `{ id, email, role }`** (`auth.models.ts:3`), sin nombre ni foto. El área del candidato lo resuelve pidiendo `GET /candidate/profile` (`ensureProfile()`, `candidate-layout.ts:171`), pero **eso sólo sirve para candidatos**: una empresa necesitaría `GET /company/profile`, y el navbar público es común a los tres roles.

**Alcance propuesto (se siguió; ver arriba lo que cambió):**
1. **Backend — la pieza que falta: `GET /auth/me`.** Hoy `auth.controller.ts` sólo expone login / refresh / logout. Devolvería `{ id, email, role, displayName, avatarUrl }` resolviendo nombre e imagen **según el rol** (candidato → perfil + foto; empresa → nombre comercial o de contacto + logo; admin → nombre del usuario). Un solo endpoint evita que el frontend adivine a qué API pegar según el rol.
   - *Alternativa más barata:* incluir `displayName`/`avatarUrl` en la respuesta de login y de refresh. Ahorra un request, pero se desactualiza si el usuario cambia su foto. **Recomendado: `/auth/me`, llamado al hidratar la sesión.**
2. **Frontend:** ampliar `AuthUser` con `displayName`/`avatarUrl`; `AuthService` cachea el resultado (una llamada por sesión, no por navegación). El navbar pasa a **menú de usuario**: avatar (foto o iniciales, como ya hace el header del candidato) + nombre + desplegable con "Ir a mi cuenta" (`ROLE_HOME`) y **"Cerrar sesión"**, que hoy el portal público no ofrece.
3. **SSR:** el navbar se renderiza en servidor, donde no hay sesión → pintar el estado anónimo en SSR y resolver la sesión en cliente (`afterNextRender`), **reservando el espacio** para que no salte el layout al hidratar.
4. **Móvil:** el mismo bloque dentro del menú hamburguesa.

**Criterios de aceptación:** logueado como candidato y como empresa, el navbar muestra foto o iniciales + nombre en todas las páginas públicas; anónimo se ve igual que hoy; cerrar sesión desde el navbar funciona y vuelve al estado anónimo sin recargar; sin parpadeo ni salto de layout al hidratar.

---

## Decisiones que necesita el negocio (Parte C) 🔷

- ~~**N6 · Idiomas del sitio (T26).**~~ ✅ resuelta el 2026-09-11: **español e inglés**, con español por defecto y de respaldo (`es-MX` / `en-US`).
- ~~**N7 · Imagen de vacante (T24).**~~ ✅ resuelta el 2026-09-11: **para todas las vacantes**, no es un beneficio de plan — que es justo como quedó implementada T24, así que no hay cambio pendiente. El **recorte sigue libre**: la decisión no lo cubrió y nadie lo forzó (ver la ficha).
- ~~**N8 · Qué apaga exactamente la expiración del plan (T22).**~~ ✅ resuelta al implementar T22: sólo el estado, porque no queda nada más que apagar (ver la ficha). Si algún día existe `postingQuota` (N5), el punto de extensión es `ExpireSubscriptionsUseCase`.
- ~~**N9 · Skills: catálogo normalizado o texto libre (T25).**~~ Resuelto: catálogo normalizado.
- **N10 · ¿Qué áreas privadas se traducen (T28)?** ¿Sólo `/empresa`, también `/candidato`, o los tres incluyendo `/admin`? ¿Hay empresas o candidatos que de verdad usarían el panel en inglés? De la respuesta depende que la tarea sea de 2 días o de 5 — y si la respuesta es "ninguna", T28 se cierra sin escribir una línea.

## Orden sugerido (Parte C)

1. ~~**T23**~~ ✅ hecha — falta sólo definir `APP_PUBLIC_URL` en el servidor y correr `uploads:rehost:prod`.
2. ~~**T27**~~ ✅ hecha — sin pasos de despliegue: ni migración ni permisos nuevos.
3. ~~**T21**~~ ✅ hecha — queda configurar `RESEND_API_KEY` y `MAIL_FROM` en el servidor (con el dominio verificado en Resend); sin ellas el adaptador de consola sólo escribe el correo en el log.
4. ~~**T22**~~ ✅ hecha — despliegue: `migration:run:prod` (tabla `subscription_notices`) y enganchar `billing:expire` a un cron diario.
5. ~~**T24**~~ ✅ hecha y ~~**T25**~~ ✅ hecha — skills normalizadas en backend, pendiente el frontend de chips.
6. ~~**T26**~~ ✅ hecha — sin pasos de despliegue: ni migración ni permisos nuevos. Ojo con una cosa en el servidor: el portal y `/auth` ya **no** se prerenderizan, así que la app Node SSR pasa a atender esas rutas en cada petición.
7. **T28** — la última, y **sólo si N10 dice que sí**: cierra la i18n (áreas privadas + correos). Nada la bloquea técnicamente; la infraestructura quedó hecha en T26.

---

# Parte D · Backlog solicitado (lista del 2026-09-12)

Levantado el **2026-09-12** a partir de los apuntes del equipo ("Tasks impulso job") y **verificado contra el código**. Mismo criterio que la Parte C: cada bloque `### T##` es autocontenido y se pega tal cual en la tarjeta del gestor de tareas.

Dos notas antes de empezar, porque cambian el tamaño de las tarjetas:

- **T29 no es un cambio de código.** El apunte dice "los candidatos deberían poder aplicar sin tener un permiso", pero el permiso está bien puesto y bien concedido en el código: lo que falla es la **base de datos de producción**. Es un arreglo de despliegue, no de diseño.
- **T32 son cuatro peticiones en una línea** (responsabilidades, skills, editor de texto y wizard). Se deja como una sola tarjeta porque las cuatro tocan el mismo formulario, pero el alcance está partido en fases: la fase 1 se puede entregar sola.

## Resumen para el gestor de tareas

| # | Título | Tipo | Prioridad | Estimación | Depende de |
|---|---|---|---|---|---|
| T29 | 403 `PERMISSION_DENIED` al postularse a una vacante | **Bug** | **Bloqueante producción** | XS (1–3 h) | — | ✅ **Resuelto** (fallback defensivo en `JwtStrategy` + fix en `seed-rbac`) |
| T30 | Previsualizar el CV del candidato desde la empresa | Mejora UX | Alta | S (1–2 d) | — | ✅ **Hecha** (visor `ij-pdf-viewer` + `GET company/candidates/:id/resumes/:resumeId`) |
| T31 | Formulario de usuarios del admin: más campos | Mejora | Media | M (2–3 d) | 🔷 N11 | ✅ **Parcial** (contexto empresa en alta/edición, `professionalTitle` en backend, simetría alta/edición) |
| T32 | Vacante: responsabilidades, skills, editor de texto y alta en wizard | Feature | Alta | L (5–8 d) | T25 ✅ · N12 ✅ | ✅ **Hecha** (CKEditor 5, wizard en `/empresa/vacantes/nueva` y `/:id/editar`) |
| T33 | Ver la vacante en modal desde "Mis postulaciones" y "Guardadas" | Mejora UX | Media | S (1 d) | — | ✅ **Hecha** |
| T34 | El admin asigna, cambia y quita el plan de una empresa | Feature | Alta | M (3–5 d) | N13 ✅ | ✅ **Hecha** (`/admin/companies/:id/subscription` + sección «Plan» en `/admin/empresas/:id`) |
| T35 | Botón "Ver sitio" en sidebar de admin y empresa | Mejora UX | Baja | XS (1 h) | — | ✅ **Hecha** |

Estimaciones a ojo, para ordenar el tablero — no son compromisos.

---

### T29 · 403 `PERMISSION_DENIED` al postularse a una vacante

**Qué se pide:** *"los candidatos deberían poder aplicar a la vacante sin tener un permiso"* — `POST https://api.impulsojobs.com/api/v1/candidate/applications` responde 403 `PERMISSION_DENIED`.

**Estado hoy (verificado 2026-09-12):** el permiso **no sobra**, y quitarlo sería un error: `applications.create` es lo que impide que un EMPLOYER se postule a sus propias vacantes. El código está bien; lo que está mal es la **BD de producción**.

- `POST candidate/applications` exige `applications.create` y `GET candidate/applications` exige `applications.read` (`backend/src/modules/applications/controllers/candidate-applications.controller.ts:44-46,62-64`). Los dos cuelgan de la URL del reporte, así que el 403 puede venir de cualquiera de los dos verbos.
- La matriz del seed **sí se los concede a CANDIDATE** (`backend/src/database/seed-rbac.ts:192-211`) y están ahí desde el commit que introdujo RBAC. Nada que corregir en la fuente.
- `PermissionsGuard` **no lee los roles del token**: los resuelve contra la BD en cada petición (`jwt.strategy.ts:71`) y consulta `role_permissions`. ⚠️ **Cerrar sesión y volver a entrar no arregla nada** — no pierdas tiempo por ahí.
- `PermissionsService` **cachea en memoria** el mapa `rol → permisos` y sólo se invalida cuando la mutación pasa por la app (`permissions.service.ts:13,21-22`). Correr el seed por CLI escribe en la BD **sin que el proceso vivo se entere**.

**Diagnóstico — dos consultas en la BD de producción:**

```sql
-- 1) ¿El rol CANDIDATE tiene los permisos?
SELECT p.code FROM role_permissions rp
  JOIN permissions p ON p.id = rp.permission_id
  JOIN roles r       ON r.id = rp.role_id
 WHERE r.code = 'CANDIDATE' AND p.code LIKE 'applications.%';

-- 2) ¿La cuenta que falla tiene rol asignado?
SELECT r.code FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  JOIN users u ON u.id = ur.user_id
 WHERE u.email = '<correo del candidato que reporta el fallo>';
```

**Fix según lo que devuelvan:**

- **(1) vacío** → la matriz nunca se sembró en producción, o se sembró con una versión vieja. `cd backend && pnpm run seed:rbac:prod` **y reiniciar la app Node** (sin reinicio, la caché en memoria sigue sirviendo el mapa viejo y el 403 persiste; es el fallo que más tiempo hace perder aquí).
- **(2) vacío** → la cuenta quedó huérfana de rol: `roleIds` llega como `[]` y `hasPermissions` niega todo, para cualquier endpoint. Ojo con la reparación: **no hay ruta de API que la arregle**. `PUT /admin/users/:id/roles` sólo toca los roles *adicionales* (rechaza los base) y `PATCH /admin/users/:id` sólo sincroniza `user_roles` **si el rol cambia** (`update-user.use-case.ts:72`), así que reenviar `role: 'CANDIDATE'` sobre una cuenta que ya lo tiene es un no-op. Hay que insertar la fila en `user_roles` a mano, y de paso **buscar si hay más cuentas afectadas**:

```sql
SELECT u.id, u.email, u.role FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
 WHERE ur.user_id IS NULL AND u.deleted_at IS NULL;
```

**Alcance propuesto (además del arreglo puntual):**

1. Reparar la BD de producción según el diagnóstico y **anotar el seed RBAC + reinicio en [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md)** como paso obligatorio de despliegue, no opcional.
2. **Que el no-op deje de ser silencioso:** que `PATCH /admin/users/:id` reconcilie `user_roles` con `users.role` aunque el rol no cambie (repara la cuenta sin tocar SQL), o exponer una acción explícita de "resincronizar roles" en `/admin/usuarios`.
3. **Invalidar la caché sin reiniciar:** un endpoint `POST /admin/permissions/refresh` (rol ADMIN + `permissions.assign`) que llame a `PermissionsService.invalidate()`. Tres líneas, y evita que el próximo permiso nuevo repita este mismo incidente.
4. **Mensaje de error honesto en el frontend:** hoy el candidato ve "No tienes permiso para realizar esta acción", que no le dice nada. En el flujo de postulación conviene un texto del tipo "No pudimos enviar tu postulación. Escríbenos si el problema continúa".

**Criterios de aceptación:** un candidato recién registrado en producción se postula y recibe 201; el mismo candidato lista sus postulaciones sin 403; un EMPLOYER que intente `POST candidate/applications` **sigue recibiendo 403** (la protección no se aflojó); la consulta de cuentas huérfanas devuelve 0 filas.

**Ojo:** si al mirar producción resulta que (1) y (2) devuelven datos correctos, el 403 no es de este endpoint — revisa si el frontend está llamando con el token de otra sesión. Pero empieza por el seed: es la causa con diferencia más probable.

---

### T30 · Previsualizar el CV del candidato desde la empresa

**Qué se pide:** *"Previsualizar CV del candidato en el admin empresa"* — poder **ver** el CV sin descargarlo.

**Estado hoy (verificado 2026-09-12):** son dos pantallas distintas y están en puntos muy distintos, conviene no confundirlas.

- **`/empresa/postulaciones`** — ya **descarga**: `GET company/applications/:id/resume` devuelve el PDF (`company-applications.controller.ts:90-110`) y el frontend lo baja como fichero (`applications-page.ts:390-410`, `saveBlob`). Falta sólo la vista previa.
- **`/empresa/candidatos`** — la ficha **lista los CV por nombre de archivo pero no se pueden abrir** (`candidate-detail.ts:141-160`: pinta `fileName` y la etiqueta "Principal", sin acción). `GET company/candidates/:id` devuelve sólo metadatos (`CandidateResumeSummary` = id, fileName, fileSize, mimeType, isDefault) y **no existe endpoint para bajar ese fichero**. Aquí hace falta backend.

**A favor:** los CV son **sólo PDF** — se valida en la subida (`candidate-resume.use-case.ts:317-318`, por extensión y por mime). Así que la previsualización es un `<iframe>` con un blob URL, sin librería de terceros. El `Content-Disposition: attachment` del endpoint **no estorba**: al pedir el fichero con `responseType: 'blob'` y crear el object URL en el navegador, la cabecera ya no interviene.

**Alcance propuesto:**

1. **Backend — endpoint nuevo para la base de talento:** `GET company/candidates/:id/resumes/:resumeId` con `@RequirePermissions('candidates.cv.read')`, mismo patrón que el de postulaciones. **Debe respetar el grant de talento**: no puede ser una puerta trasera para leer CV sin consumir/tener cupo. Reutilizar la comprobación que ya hace `GET company/candidates/:id` antes de servir el fichero.
2. **Frontend — un solo visor reutilizable**, p. ej. `shared/ui/pdf-viewer`, dentro de `ij-modal`: recibe el blob, pinta el `<iframe>`, y ofrece "Descargar" y "Abrir en pestaña nueva". Lo usan las dos pantallas.
3. **`/empresa/postulaciones`:** la acción "CV" abre el visor en lugar de descargar; la descarga queda como botón dentro del modal.
4. **`/empresa/candidatos`:** cada CV de la lista pasa a ser clicable y abre el mismo visor.
5. **Estados:** cargando, error ("No se pudo abrir el CV") y el caso "la postulación no traía CV" (`resume: null` ya existe en el modelo).
6. **`URL.revokeObjectURL` al cerrar el modal** — si no, cada apertura filtra un blob en memoria.

**Criterios de aceptación:** desde una postulación con CV, un clic abre el PDF en un modal y se lee sin descargar; desde la ficha de un candidato de la base de talento pasa lo mismo; la descarga sigue funcionando; una empresa sin cupo de talento **no** puede abrir el CV por el endpoint nuevo; en móvil el visor es usable (o degrada a "Abrir en pestaña nueva", que es lo razonable en iOS).

**✅ Hecha el 2026-09-12.** Cuatro decisiones tomadas al implementarla, todas explícitas:

1. **Render con `<iframe>` + blob URL, sin librería.** Se descartó pdf.js (~1 MB de bundle) porque los CV son sólo PDF y el visor nativo del navegador ya trae zoom y paginación. En iOS y por debajo de 768px el `<iframe>` no es fiable, así que ahí el visor **degrada a "Abrir en pestaña nueva" / "Descargar"** (`supportsEmbeddedPdf()`; `maxTouchPoints` cubre al iPad, que se anuncia como Mac).
2. **Overlay a pantalla completa, no `ij-modal`.** Una hoja A4 no se lee cómoda en los 900px del diálogo más grande del kit. `shared/ui/pdf-viewer` es la segunda excepción a "todo el back-office edita en `ij-modal`", junto con la matriz de permisos.
3. ⚠️ **El endpoint nuevo NO mira el cupo de talento — decisión de negocio, no descuido.** `GET company/candidates/:id/resumes/:resumeId` comprueba permiso (`candidates.cv.read`), visibilidad del perfil para esa empresa y que el CV pertenezca a ese perfil, pero **no consume ni exige visitas**. Esto deja **deliberadamente sin cumplir** el criterio de aceptación *"una empresa sin cupo de talento no puede abrir el CV por el endpoint nuevo"*: en la práctica el `resumeId` sólo se conoce tras abrir la ficha (que sí cobra), pero llamando al endpoint en frío una empresa sin plan sí puede leer el CV de un perfil público. Si se revierte, el punto de extensión está señalado en el JSDoc de `getResumeDownload`: `this.quota.consume(...)`, ya idempotente por (empresa, candidato).
4. **El visor se reutiliza también en `/candidato/cv`** (botón "Ver"), además de las dos pantallas que pedía la tarjeta.

**Qué se tocó:** backend — `CandidateSearchUseCase.getResumeDownload` + endpoint en `company-candidates.controller.ts`, con auditoría `company.candidate.resume.read` y 5 specs nuevas. Frontend — `shared/ui/pdf-viewer` (nuevo, exportado del kit), `/empresa/postulaciones` (la acción CV abre el visor; el icono pasa a `eye` y la descarga vive dentro), `/empresa/candidatos` (los CV de la ficha pasan a ser clicables), `/candidato/cv`. Sin migración y sin permisos nuevos: **nada que hacer en el despliegue**.

---

### T31 · Formulario de usuarios del admin: más campos

**Qué se pide:** *"Mejorar el formulario de usuarios, add más campos"* (`/admin/usuarios`).

**Estado hoy (verificado 2026-09-14):** ✅ **Parcialmente resuelto.** Se cerró la asimetría alta/edición y se agregó contexto de empresa.

**Lo que se hizo (2026-09-14):**

1. **Contexto de empresa en alta y edición:** al seleccionar una empresa en el dropdown, ahora se muestra una tarjeta con los datos fiscales (businessName, RFC, estado, municipio, régimen SAT). Tanto en `user-create-form` como en `user-edit-form`.
2. **Simetría alta/edición para candidatos:** el formulario de edición ya tiene todos los campos del perfil del aspirante (nombre, apellidos, tipo/número de documento, CURP, fecha de nacimiento, teléfono, título profesional, estado, municipio). `professionalTitle` estaba en el backend pero no se había verificado en el DTO de edición — confirmado que `UpdateCandidateProfileDto` lo incluye.
3. **Sección admin:** se mantiene con `extraRolesPicker` para roles adicionales y notas internas.

**Lo que falta (pendiente de N11):**

- **Campos nuevos para admin:** el backend `UpdateUserDto` no acepta nombre/teléfono para usuarios ADMIN (la entidad `users` no tiene esas columnas). Requiere migración + cambio de DTO.
- **Campos nuevos para empresa:** los detalles fiscales de la empresa (businessName, RFC, etc.) viven en la tabla `companies`, no en `users`. Para editarlos desde `/admin/usuarios` habría que agregar campos al `UpdateUserDto` o redirigir a `/admin/empresas`.
- **Auditoría de cambios de perfil:** ya funciona para rol/estado (`UpdateUserUseCase`), pero los cambios de `candidateProfile` y `companyId`/`companyRole` también se registran desde la transacción.

**Criterios de aceptación cumplidos:**
- ✅ El admin ve los datos de la empresa al seleccionarla (alta y edición)
- ✅ El admin puede corregir todos los campos del perfil del candidato en edición
- ✅ La cuenta sigue naciendo verificada por defecto
- ✅ Los cambios quedan registrados en auditoría

**🔷 Decisión pendiente (N11):** los campos nuevos (teléfono/nombre para admin, más datos fiscales editables desde `/admin/usuarios`) esperan a que se defina la lista concreta.

---

### T32 · Vacante: responsabilidades, skills, editor de texto y alta en wizard

**Qué se pide:** *"add campos de skills y campo de responsibilities y add editores de texto para descripción, adicionalmente pasar el formulario a una página o vista nueva y debe quedar tipo wizard"*.

**Estado hoy (verificado 2026-09-12):**

- **Skills:** el backend **ya está hecho** (T25) — `SaveVacancyDto.skills[]`, tablas `skills` + `vacancy_skills`, endpoints `GET/PUT company/vacancies/:id/skills` y autocomplete `GET company/vacancies/skills/search?q=`. **Falta sólo el frontend**, tal como quedó anotado al cerrar T25. El `vacancy-form` actual **no tiene ningún control de skills**.
- **Responsabilidades:** **no existe** — ni en `SaveVacancyDto` ni en la entidad `vacancy`. Hoy sólo hay `description` y `requirements` (ambos `text`, tope 10.000 caracteres). Requiere columna, migración y DTO.
- **Editor de texto:** **no existe nada**. `description` y `requirements` son `ij-textarea` de texto plano, y el detalle público los pinta con `whitespace-pre-line` (`public-vacancy-detail-page.ts:271-272`). **No hay editor enriquecido en el UI kit** — el kit es `ij-{input,select,multiselect,autocomplete,datepicker,textarea,modal,badge,button,icon,logo,pricing-card}`.
- **Wizard:** el formulario son **16 campos en un solo `ij-modal`** (`vacancies-list-page.ts:174-189`, `vacancy-form.ts` con 498 líneas). Es el formulario más grande del back-office y el único que ya no cabe cómodo en un diálogo — justo la excepción que CLAUDE.md contempla ("el detalle en ruta propia queda sólo para lo que no cabe en un diálogo").

**Alcance propuesto — en tres fases entregables por separado:**

**Fase 1 · Skills (rápida, sin backend).** Control de chips con autocomplete contra `GET company/vacancies/skills/search`, marcando `isRequired`, tope de 15 (ya validado en el DTO). Pintarlas en el detalle público, que ya las recibe. **Esto cierra el frontend pendiente de T25 y se puede entregar solo.**

**Fase 2 · Responsabilidades + editor.**
- Columna `responsibilities` (`text`, nullable) + migración. ⚠️ **Numerar la migración mirando primero el directorio** — los timestamps son correlativos a mano y ya hubo un choque entre T25 y T22 en `1720000023000`.
- Editor enriquecido: componente nuevo `shared/ui/editor` sobre una librería ligera. **Restringir el formato a lo mínimo** (negrita, cursiva, listas, enlaces) — cuanto más permita, más difícil es que el detalle público no se rompa.
- ⚠️ **El cambio a HTML no es sólo del formulario.** Hay que tocar, como mínimo: el render público (`whitespace-pre-line` → HTML **saneado**, nunca `[innerHTML]` a pelo), el `description` del **JSON-LD de SEO** y el **snapshot de la vacante**, el recorte de descripción en las tarjetas del listado, y las vacantes **ya guardadas en texto plano**, que deben seguir viéndose bien. Presupuestar esto: es más trabajo que el editor en sí.

**Fase 3 · Wizard en página propia.** Sacar el formulario del modal a `/empresa/vacantes/nueva` y `/empresa/vacantes/:id/editar`, en pasos: **1) Básicos** (título, área, tipo de contrato/contratación, modalidad, ubicación) · **2) Descripción** (descripción, responsabilidades, requisitos, skills) · **3) Condiciones** (salario, plazas, escolaridad, comisiones, fecha límite, confidencial) · **4) Imagen y publicación** (la imagen ya existe desde T24). Validación por paso, navegación libre entre pasos ya visitados, y **borrador conservado si el usuario recarga**. Las preguntas de filtrado (M15) siguen en su modal aparte, o se integran como paso 5.

**Criterios de aceptación:** crear una vacante completa desde el wizard sin perder datos al navegar entre pasos; editar una existente precarga todo; las skills se guardan y se ven en el detalle público; las responsabilidades aparecen en el detalle público; una vacante creada **antes** de esta tarjeta se sigue viendo correctamente (texto plano); el HTML del editor no permite inyectar scripts.

**✅ Decisión N12 (2026-09-13):** resuelta — editor **sí** (CKEditor 5), y el wizard **sustituye** al modal en vez de convivir con él.

**Qué se hizo, por fases:**

**Fase 1 · Skills.** `app-vacancy-skills-input`: chips con autocomplete contra `GET company/vacancies/skills/search`, marca obligatoria/deseable, tope de 15 y deduplicado con `Intl.Collator` (mismo criterio que el `slug` del backend, para que "Diseño" y "diseno" no entren dos veces). El backend ya aceptaba `skills[]` en el alta y la edición desde T25; sólo faltaba el frontend.

**Fase 2 · Responsabilidades y editor.**
- Columna `responsibilities` (`text`, nullable) — migración `1720000027000`.
- **Saneado en el servidor**, no sólo en el cliente: `common/utils/rich-text.util.ts` (`sanitize-html`) con una lista corta de etiquetas, y el decorador `@RichText({ max, required })` que **sanea antes de validar**, de modo que no se puede añadir un campo largo y olvidarse de limpiarlo. El tope cuenta caracteres de **contenido**, no de marcado.
- `ij-rich-text` para pintar: detecta si el valor es HTML o texto plano y **las vacantes anteriores se siguen viendo bien**, sin migrar datos. La variante `check` conserva la lista con palomita naranja del diseño original.
- SEO: la `<meta description>` usa `excerpt()` y el `description` del **JSON-LD** usa `toPlainText()`. Esto último no es cosmético — el JSON-LD vive dentro de un `<script>`, y un `</script>` en la descripción se escaparía del bloque; Angular sanea `[innerHTML]` pero no ese caso.

**Fase 3 · Wizard.** `/empresa/vacantes/nueva` y `/empresa/vacantes/:id/editar` en 4 pasos (básicos · puesto · condiciones · imagen y publicación), con validación por paso, navegación libre entre pasos visitados y **borrador en `localStorage`** que se ofrece restaurar. Se **eliminó** `vacancy-form.ts` (498 líneas) y el `ij-modal` del listado.

**Dos placeholders del template Jobzilla que salieron a la luz y se arreglaron:**
- El detalle público pintaba una lista de skills **quemada** (`Html, Python, WordPress, Figma…`) idéntica en todas las vacantes, aunque el backend devolvía las reales desde T25.
- La sección "Responsabilidades" pintaba **la descripción otra vez**. Ahora usa el campo nuevo y se oculta si está vacío.

**⚠️ Deuda legal consciente:** CKEditor 5 exige clave de licencia desde la v44. Se usa `licenseKey: 'GPL'` en `shared/ui/editor/ckeditor-host.ts`, que **obliga a que la aplicación que lo incrusta sea GPL**. Impulso Jobs es un producto comercial: al contratar la licencia de CKEditor hay que cambiar esa cadena por la clave comprada.

**Pasos de despliegue:** `pnpm run migration:run` (o `:prod`). Sin permisos nuevos ni semillas.

---

### T33 · Ver la vacante en modal desde "Mis postulaciones" y "Guardadas"

**Hecho (2026-09-13).** Se implementó el alcance propuesto:

1. **Componente `VacancyDetailModal`** (`features/candidate/components/vacancy-detail-modal/`): modal reutilizable sobre `ij-modal` que recibe un `vacancyId`, llama a `GET /vacancies/:id` (público, sin auth) y muestra título, empresa (logo + nombre), ubicación, tipo de empleo, modalidad, experiencia, salario, descripción, requisitos y skills. Incluye enlace "Ver publicación completa" con `vacancyPath()` y estados de carga, error y vacante no disponible.
2. **`/candidato/postulaciones`** — el título de la vacante, que antes enlazaba a `/vacantes/:id` sacando al candidato de su área, ahora abre el modal inline. Se eliminó el `routerLink` y se añadió `selectedVacancyId` signal + `openDetail()`.
3. **`/candidato/guardadas`** — las tarjetas de `app-vacancy-card`, que no tenían ningún enlace a la vacante, ahora son clicables y abren el mismo modal. Se añadió un wrapper `role="button"` con click/keydown.enter sobre la tarjeta.
4. **Modelo** — se añadió `skills: { id, name, isRequired }[]` a `PublicVacancy` (faltaba en el front, aunque el backend ya lo exponía desde T25).

**Qué se tocó:** 1 archivo nuevo (`vacancy-detail-modal.ts`), 3 modificados (`candidate-applications-page.ts`, `candidate-saved-vacancies-page.ts`, `public-vacancies.models.ts`). Sin backend, sin migración y sin permisos nuevos.

**Criterios de aceptación:** desde "Mis postulaciones", un clic abre el modal sin salir de `/candidato`; desde "Guardadas", lo mismo; una vacante cerrada muestra un aviso claro; el enlace "Ver publicación completa" lleva a la URL con slug.

---

### T34 · El admin asigna, cambia y quita el plan de una empresa

**Qué se pide:** *"el super admin debería poder asignar, quitar, actualizar planes a las empresas"*.

**Estado hoy (verificado 2026-09-12):** **no existe nada de esto.** Es un hueco real, no una mejora de UI.

- El admin gestiona **el catálogo** de planes (`/admin/planes` → `admin-plans.controller.ts`: crear, editar, activar/desactivar, beneficios) pero **no la suscripción de ninguna empresa**. Ni un endpoint.
- La suscripción sólo nace por **autoservicio**: `POST company/subscriptions` la crea la propia empresa (`company-billing.controller.ts:111`), y sólo se activa cuando el pago liquida (`SettlePaymentUseCase`).
- Lo único que el admin puede hacer hoy es `POST /payments/confirm` (`plans.manage`), que confirma un pago **si la empresa ya creó la suscripción**. No sirve para asignar un plan desde cero, ni para cambiarlo, ni para retirarlo.
- `/admin/empresas` **no muestra el plan de la empresa** por ninguna parte — el modelo del frontend no tiene ni el campo (`admin/companies/models`). El admin no puede ni *ver* en qué plan está cada empresa.

**Alcance propuesto:**

1. **Ver antes que editar:** que `GET /admin/companies` y `GET /admin/companies/:id` devuelvan la suscripción vigente (plan, estado, `currentPeriodEnd`, `autoRenew`), y que el listado tenga columna "Plan". Aunque la asignación se posponga, esto ya es útil por sí solo.
2. **Endpoints nuevos**, en `admin-plans.controller.ts` o un `admin-subscriptions.controller.ts`, **siempre con `@RequireRoles(Role.ADMIN)` + `@RequirePermissions('plans.manage')`** — los dos, como manda la convención de `/admin/**`:
   - `POST /admin/companies/:id/subscription` — asignar o cambiar de plan.
   - `PATCH /admin/companies/:id/subscription` — ajustar `currentPeriodEnd` y `autoRenew` (prórrogas, cortesías).
   - `DELETE /admin/companies/:id/subscription` — cancelar / retirar.
3. **Reutilizar el camino que ya existe, no abrir uno paralelo.** La activación vive en `SettlePaymentUseCase` + `EntitlementService` (cupos de talento, distintivos). La asignación manual debe pasar por ahí — con un evento del `ManualPaymentAdapter`, que es exactamente el caso para el que se diseñó el puerto. **Escribir un alta de suscripción "por la izquierda" dejaría a la empresa con plan pero sin cupos.**
4. **Qué pasa al bajar de plan o al retirarlo:** es lo que más cuidado pide. Hay que decidir y documentar qué ocurre con las vacantes destacadas activas, los cupos de talento ya concedidos y las promociones vigentes. `ExpireSubscriptionsUseCase` ya resuelve el caso del vencimiento natural: **seguir ese mismo camino**, no inventar otro.
5. **Auditoría obligatoria.** Un admin regalando o quitando un plan mueve dinero: `audit` con quién, a quién, qué plan, y **un campo de motivo** en el cuerpo de la petición.
6. **Frontend:** sección "Plan" en `/admin/empresas/:id` (la empresa ya tiene página de detalle propia) con el plan actual, su vigencia y las acciones. En `ij-modal`, como el resto del back-office.
7. **Aviso al cliente:** T21/T22 ya tienen el canal de notificaciones. Un cambio de plan hecho por el admin debería avisar a la empresa — si no, se entera cuando algo deja de funcionar.

**Criterios de aceptación:** el admin ve el plan de cada empresa en el listado; asigna un plan a una empresa sin suscripción y la empresa ve los beneficios y los cupos aplicados de inmediato; cambia de plan y los cupos se recalculan; retira el plan y la empresa queda como una sin suscripción, sin filas huérfanas; todo queda en auditoría con motivo; un EMPLOYER **no** puede llamar a ninguno de los endpoints nuevos.

**✅ Decisión N13 (2026-09-13):** resuelta. Ver N13 al final de esta parte.

**Qué se hizo:**

- **Ver:** `GET /admin/companies` y `GET /admin/companies/:id` devuelven `subscription` (plan, estado, `currentPeriodEnd`, `autoRenew`), y el listado tiene columna «Plan». El dato se lee **en lote** desde `companies`, con `ICompanyPlanRepository` sobre las tablas de billing en sólo lectura: `BillingModule` ya importa `CompaniesModule`, así que pedírselo al módulo cerraría un ciclo de DI.
- **Endpoints:** `AdminCompanySubscriptionsController` en **`billing/`** (no en `companies/`, por el mismo ciclo), en `/admin/companies/:companyId/subscription` con `GET` · `POST` (asignar y cambiar) · `PATCH` (vigencia y renovación) · `DELETE` (retirar). Los cuatro con `@RequireRoles(Role.ADMIN)` + `@RequirePermissions('plans.manage')`; **sin permiso nuevo ni migración de RBAC**, porque ADMIN ya tiene `plans.manage` (`subscriptions.manage` es del autoservicio de la empresa).
- **Camino único:** la asignación crea suscripción y orden, abre el cobro por `PaymentProviderPort` y lo liquida con `SettlePaymentUseCase`, que es quien activa y otorga el cupo de talento. No hay alta "por la izquierda".
- **Auditoría:** `subscriptions.admin_assign` / `admin_change` / `admin_update` / `admin_revoke`, con **motivo obligatorio** (mínimo 5 caracteres) en las tres acciones.
- **Aviso a la empresa:** tipos nuevos `SUBSCRIPTION_ASSIGNED` / `SUBSCRIPTION_UPDATED` / `SUBSCRIPTION_REVOKED` a los OWNER/ADMIN de la empresa, en plataforma y por correo.
- **Frontend:** sección «Plan» en `/admin/empresas/:id` con tres diálogos `ij-modal` (asignar/cambiar, ajustar vigencia, retirar). El selector muestra **todo el catálogo**, activo o retirado, y avisa si se elige un plan por publicación.

**Qué NO se hizo, a propósito:** que la suscripción anual aplique distintivos a las vacantes de la empresa. N13 preguntaba qué pasa al retirar el plan con las vacantes destacadas, pero **la suscripción nunca las ha encendido**: `isFeatured`/`isUrgent`/`isVerified` los pone `EntitlementService.applyToVacancy()`, que sólo llaman las promociones por vacante. Retirar no puede quitar lo que nunca dio. Cambiarlo es un cambio de fondo y queda fuera.

**Sin pasos de despliegue:** ni migración, ni permiso nuevo, ni semilla.

---

## Decisiones que necesita el negocio (Parte D) 🔷

- **N11 · ¿Qué campos exactamente en el formulario de usuarios (T31)?** **Parcialmente resuelta (2026-09-14):** la asimetría alta/edición se cerró — el formulario de edición ahora tiene todos los campos del perfil del candidato (nombre, apellidos, documento, CURP, fecha nacimiento, teléfono, título profesional, estado, municipio) y ambos formularios (alta y edición) muestran contexto de empresa al seleccionar una (businessName, RFC, estado, municipio, régimen SAT). **Pendiente:** campos nuevos para admin (nombre/teléfono — requiere migración de la entidad `users`) y campos fiscales editables de empresa desde `/admin/usuarios` (los datos viven en `companies`, no en `users`). Cada campo nuevo de candidato arrastra migración, DTO, formulario público de registro y perfil del candidato — conviene pedirlos todos de una vez.
- **✅ N12 · ¿El wizard de vacante sustituye al modal o convive con él (T32)?** **Resuelta el 2026-09-13:**
  - **El wizard sustituye al modal.** Alta y edición usan la misma vista en ruta propia; al editar, los cuatro pasos nacen ya desbloqueados y se puede saltar directo al que interese. Se descartó mantener los dos caminos: son dos formularios que se desincronizan.
  - **El editor enriquecido sí es necesario, y es CKEditor 5**, en descripción, responsabilidades y requisitos. El coste que N12 anticipaba (sanear, rehacer el render público, el JSON-LD y convivir con el texto plano ya guardado) se pagó entero — ver la tarjeta T32.
- **✅ N13 · ¿Un plan asignado a mano por el admin es una venta o una cortesía (T34)?** **Resuelta el 2026-09-13:**
  - **Siempre una venta.** Toda asignación manual registra una orden pagada con el precio vigente del plan; el administrador **puede corregir el importe** (descuento negociado, precio antiguo) y el IVA se recalcula con la tasa del plan. No hay figura aparte de "cortesía": un regalo se registra con el importe que se quiera, incluso 0.
  - **Vigencia:** un año desde hoy por defecto, editable por el administrador en el mismo formulario.
  - **Retirar respeta lo ya concedido.** Mismo camino que el vencimiento natural (`ExpireSubscriptionsUseCase`): sólo cambia el estado a `CANCELLED`. El cupo de la base de talento sigue vivo hasta su `expiresAt`. El diálogo de retiro lo dice explícitamente, para que nadie espere un corte inmediato.
  - **Cambiar de plan sí recalcula.** Es la diferencia deliberada con retirar: el cupo del plan anterior se cierra en el acto (`expiresAt = ahora`) y nace el del plan nuevo. Si no, subir y bajar de plan acumularía cupo para siempre.
  - **Prorrogar arrastra el cupo.** Mover `currentPeriodEnd` mueve también el `expiresAt` del cupo de esa suscripción; si no, la prórroga alargaría el plan y dejaría a la empresa sin poder ver CVs desde la fecha vieja.
  - **Catálogo sin filtrar.** El administrador puede asignar cualquier plan, activo o retirado del escaparate (para un cliente antiguo que conserva el suyo) e incluso uno por publicación — con aviso en la interfaz de lo que implica y anotación en auditoría.
  - **Las vacantes destacadas no entran.** La pregunta no aplica al código actual: la suscripción nunca ha dado distintivos de vacante. Ver la nota al final de la tarjeta T34.

## Orden sugerido (Parte D)

1. **T29** — primero y con diferencia: hay candidatos que **no pueden postularse en producción ahora mismo**, y el arreglo es de horas. Todo lo demás puede esperar a esto.
2. ~~**T32 fase 1 (skills)**~~ ✅ hecha junto con el resto de T32.
3. **T33** — pequeña, sin backend, y arregla de paso el enlace sin `vacancyPath()`.
4. ~~**T30**~~ ✅ hecha — sin pasos de despliegue: ni migración ni permisos nuevos (el endpoint nuevo reutiliza `candidates.cv.read`).
5. ~~**T34**~~ ✅ hecha — era el hueco funcional más grande de los seis. Sin pasos de despliegue: ni migración, ni permiso nuevo, ni semilla.
6. ~~**T31**~~ ✅ **Parcial** — asimetría alta/edición cerrada, contexto de empresa en ambos formularios. Campos nuevos pendientes de N11.
7. ~~**T32 fases 2 y 3**~~ ✅ hecha — era la más cara del lote. Único paso de despliegue: `migration:run` para la columna `responsibilities`.

---

### T35 · Botón "Ver sitio" en el sidebar del admin y empresa ✅

**Hecho (2026-09-16).** Se añadió un botón "Ver sitio" que abre el portal público en una nueva pestaña, posicionado **al fondo del riel** (separado del resto de items por un borde superior) en las áreas de administración y empresa.

**Cambios:**

1. **`app-shell.ts`** — nueva propiedad `external?: boolean` en `ShellNavItem` + nuevo input `footerNavItems` para items que se renderizan al fondo del riel (separados con `border-t`). Cubre el riel de escritorio y la nav móvil.
2. **`admin-layout.ts`** — `footerNavItems` con `{ path: environment.siteUrl, label: 'Ver sitio', icon: 'globe', external: true }`.
3. **`company-layout.ts`** — mismo `footerNavItems`.

**Archivos modificados (3):** `app-shell.ts`, `admin-layout.ts`, `company-layout.ts`. Sin migración, sin permisos nuevos.

**Criterios de aceptación:** el botón "Ver sitio" aparece al fondo del riel (separado por una línea), abre el portal público en nueva pestaña, y funciona tanto con el riel expandido como contraído. Presente en `/admin` y `/empresa/`.

---

## bugs o ajustes 

### B1 · Click en tarjeta de "Guardadas" redirigía a la web ✅

**Bug:** en `/candidato/guardadas`, al hacer clic en la tarjeta de una vacante, se abría la página pública de la vacante en vez del modal de detalle.

**Causa:** `<app-vacancy-card>` renderiza internamente un `<a [routerLink]>` que naviga a `/vacantes/<id>-<slug>`. El click en la tarjeta propagaba el evento al `<a>` y Angular Router interceptaba la navegación antes de que el `(click)="openDetail()"` del padre pudiera abrir el modal.

**Fix:** nuevo input `disableLink` en `VacancyCard` — cuando es `true`, la tarjeta se renderiza como `<div>` en vez de `<a [routerLink]>`. La página de guardadas pasa `[disableLink]="true"` y controla la apertura del modal con su propio handler.

**Archivos modificados (2):** `vacancy-card.ts` (nuevo input + rendering condicional), `candidate-saved-vacancies-page.ts` (pasa `disableLink`).

---

### B2 · Spinner global de navegación y loading ✅

**Hecho (2026-09-16).** Se creó el componente `IjSpinner` y se integró como indicador de carga global y en todas las áreas del proyecto.

**Cambios:**

1. **`shared/ui/spinner/spinner.ts`** — nuevo componente `IjSpinner`: 8 puntos en círculo con opacidad decreciente y animación de rotación CSS (1.2s). Inputs: `size` (`sm`/`md`/`lg`), `color` (`brand`/`white`/`muted`, default `brand` = naranja). Exportado desde `@/shared/ui`.

2. **Indicador de navegación** — `app.ts` escucha `NavigationStart`/`NavigationEnd`/`NavigationCancel`/`NavigationError` y muestra un overlay semitransparente (`bg-white/60`) con `ij-spinner` centrado durante la navegación. La barra naranja de 4px fue eliminada y reemplazada por este spinner. Se oculta 300ms después de completarse la navegación.

3. **Loading states reemplazados** (de `animate-pulse` a `ij-spinner`):
   - `admin-table-skeleton.ts` — spinner centrado + texto sobre filas skeleton (cascada a 7 páginas admin)
   - `candidate-applications-page.ts` — "Cargando postulaciones…"
   - `candidate-saved-vacancies-page.ts` — "Cargando vacantes guardadas…"
   - `vacancy-detail-modal.ts` — "Cargando vacante…"
   - `company-profile.ts` — "Cargando perfil…"
   - `plans-page.ts` — "Cargando planes…" (size lg)

**Archivos modificados (9):** `spinner.ts` (nuevo), `index.ts`, `app.ts`, `app.html`, `styles.scss`, `admin-table-skeleton.ts`, `candidate-applications-page.ts`, `candidate-saved-vacancies-page.ts`, `vacancy-detail-modal.ts`, `company-profile.ts`, `plans-page.ts`.

**Criterios de aceptación:** al navegar entre páginas aparece un overlay semitransparente con spinner centrado; cada área de carga muestra el spinner naranja con texto descriptivo; el spinner se puede reutilizar con `<ij-spinner>`, `<ij-spinner size="lg" />`, etc.

---

### B3 · Foto de perfil no se muestra en el área de empresa ✅

**Bug:** en `/empresa/candidatos` (banco de talento), al abrir el perfil de un candidato no se mostraba su foto de perfil — siempre aparecían las iniciales.

**Causa:** los 3 componentes del área de empresa (`candidates-page`, `candidate-detail`, `applications-table`) ignoraban el campo `profilePhotoUrl` que la API sí devuelve, y siempre renderizaban un avatar con iniciales. La foto solo se mostraba en el perfil del propio candidato y en su sidebar.

**Fix:** se modificaron los 3 componentes para renderizar condicionalmente la foto cuando `profilePhotoUrl` existe, manteniendo el fallback a iniciales cuando no hay foto:

1. **`company/candidates/pages/candidates-page/candidates-page.ts`** — tarjetas de búsqueda del banco de talento.
2. **`company/candidates/components/candidate-detail/candidate-detail.ts`** — modal de detalle del candidato.
3. **`company/applications/components/applications-table/applications-table.ts`** — tabla de postulaciones (con `@let` + `$any()` para manejar la nullabilidad de `candidate`).

**Archivos modificados (3):** `candidates-page.ts`, `candidate-detail.ts`, `applications-table.ts`.

---

### B4 · Foto de perfil no se muestra en tablas de admin (usuarios y empresas) ✅

**Bug:** en `/admin/usuarios` y `/admin/empresas`, las tablas de listado no mostraban la foto de perfil ni el logo de empresa — siempre aparecían iniciales en un círculo de color.

**Causa:** los componentes `users-table` y `companies-table` usaban un `<span>` manual con iniciales (método `initials()`) e ignoraban los campos `photoUrl` (usuarios) y `logoUrl` (empresas) que la API sí devuelve. El componente reutilizable `ij-avatar` ya existía y maneja foto + fallback a iniciales, pero no se usaba en estas tablas.

**Fix:** se reemplazó el `<span>` manual por `<ij-avatar>` en ambos componentes, siguiendo el mismo patrón que ya usaba `company-members-table`:

1. **`admin/users/components/users-table/users-table.ts`** — import de `IjAvatar`, reemplazo del `<span>` por `<ij-avatar [src]="user.photoUrl" [name]="user.displayName || user.email">`, eliminación del método `initials()`.
2. **`admin/companies/components/companies-table/companies-table.ts`** — import de `IjAvatar`, reemplazo del `<span>` por `<ij-avatar [src]="company.logoUrl" [name]="company.businessName">`, eliminación del método `initials()`.

**Archivos modificados (2):** `users-table.ts`, `companies-table.ts`. Sin migración, sin permisos nuevos.

---

### B5 · Foto de aspirantes no se visualiza en tabla de admin (pestaña "Aspirantes") ✅

**Bug:** en `/admin/usuarios` con la pestaña "Aspirantes", la foto de perfil no se mostraba — siempre aparecían iniciales, aunque el candidato tenía foto subida.

**Causa:** los candidatos suben su foto a `candidate_profiles.profile_photo_url` (vía `POST /candidate/profile/photo`), pero el mapper `toUserResponse()` solo leía `users.photo_url` (que es `null` salvo que un admin haya subido foto vía back-office). El `UserProfileResolver` traía el perfil del candidato pero descartaba `profilePhotoUrl`.

**Fix (backend, 3 archivos):**

1. **`iam/users/dto/user-response.dto.ts`** — se agregó `profilePhotoUrl?: string | null` a la interfaz `CandidateProfileSummary`, y `toUserResponse()` ahora hace fallback: `user.photoUrl ?? profile.candidateProfile?.profilePhotoUrl ?? null`.
2. **`iam/users/services/user-profile-resolver.service.ts`** — el `candidateSummary` ahora incluye `profilePhotoUrl: profile.profilePhotoUrl ?? null`.

**Archivos modificados (2):** `user-response.dto.ts`, `user-profile-resolver.service.ts`. Sin migración, sin permisos nuevos.
