# TASKS — Impulso Jobs

Estados: ✅ hecho · 🔄 en curso · ⬜ pendiente · 🔷 decisión de negocio pendiente

- **Parte A — Demo (QA agosto 2026):** correcciones del PDF "Pruebas software impulso Jobs" + decisiones del equipo. Prioridad absoluta.
- **Parte B — Backlog de producto (análisis Computrabajo):** extraído de `computrabajocontextoclonacion.md`, cruzado contra el código real. Post-demo salvo los quick wins.
- **Parte C — Backlog solicitado (septiembre 2026):** lista del equipo del 2026-09-10 (T21–T27), verificada contra el código. Fichas autocontenidas, listas para pegar en el gestor de tareas. **T23 y T27 hechas** (2026-09-10 y 2026-09-11); el resto sin empezar.

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

**Fases pendientes (en orden):** ocultar vacante ⬜ · seguir empresa ⬜ · alertas de búsqueda (job `send-search-alerts`; bloqueado por SMTP real) ⬜ · "recibir similares" ⬜.

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

Levantado el **2026-09-10** a partir de la lista del equipo y **verificado contra el código**. T23 y T27 están cerradas. Cada ficha es autocontenida a propósito: el bloque completo de un `### T##` es lo que se pega tal cual en la tarjeta del gestor de tareas.

## Resumen para el gestor de tareas

| # | Título | Tipo | Prioridad | Estimación | Depende de |
|---|---|---|---|---|---|
| T21 | Módulo de notificaciones (plataforma + correo) | Feature / infra | Alta | L (5–8 d) | SMTP real |
| T22 | Aviso de plan por vencer + cancelación automática | Feature | Alta | M (3–4 d) | T21 · 🔷 N8 |
| T23 ✅ | Imágenes subidas con URL `localhost` en la demo | **Bug** | **Bloqueante demo** | XS (2–4 h) | — |
| T24 | Imagen de referencia en la vacante | Feature | Media | S (1–2 d) | T23 · 🔷 N7 |
| T25 ✅ | Skills requeridas en la vacante | Feature | Media | M (2–3 d) | 🔷 N9 |
| T26 | Traducciones del sitio (i18n) | Feature / transversal | Media | L (5–8 d+) | 🔷 N6 |
| T27 ✅ | Nombre y foto del usuario logueado en el portal | Mejora UX | Media | S (1 d) | — |

Estimaciones a ojo, para ordenar el tablero — no son compromisos.

---

### T21 · Módulo de notificaciones (plataforma + correo) ⬜

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

### T22 · Aviso de plan por vencer y cancelación automática ⬜

**Qué se pide:** avisar a la empresa cuando queda cierto tiempo para que acabe su plan y, si no renueva, cancelarlo automáticamente.

**Estado hoy (verificado 2026-09-10) — el hueco es mayor de lo que parece:**
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

### T24 · Imagen de referencia en la vacante ⬜

**Qué se pide:** al publicar una vacante, poder subir una imagen de referencia.

**Estado hoy:** `Vacancy` **no tiene ninguna columna de imagen** (verificado sobre `vacancy.entity.ts`); la card y el detalle público muestran el **logo de la empresa**. Toda la mecánica de subida ya existe y es reutilizable tal cual (viene de T9): puerto `PUBLIC_FILE_STORAGE` + `LocalPublicFileStorageAdapter`, validación por *magic bytes* en `common/storage/image-upload.ts`, `FileInterceptor` con `limits.fileSize`, códigos de error y borrado del archivo anterior al reemplazar.

**Alcance propuesto:**
- Migración: `vacancies.image_url` (varchar, nullable). **Ojo con T23:** decidir aquí si se guarda clave relativa o URL absoluta, y aplicar el mismo criterio en ambas tareas.
- `POST /company/vacancies/:id/image` (multipart) + `DELETE`, acotado por ownership (`company_id`), patrón calcado de `POST /company/profile/logo`. Límite 5 MB, jpg/png/webp. Códigos nuevos `VACANCY_IMAGE_INVALID_TYPE` / `VACANCY_IMAGE_TOO_LARGE`. Auditar subida y borrado.
- Exponer `imageUrl` en el DTO público y en el de empresa.
- **Frontend:** control de subida con preview en `vacancy-form` (el alta/edición vive en `ij-modal`); usar la imagen como cabecera en `public-vacancy-detail-page`. **La card de la lista sigue con el logo** salvo decisión contraria.
- **SEO:** si hay imagen, usarla en OG y en el campo `image` del JSON-LD `JobPosting` (`seo.service.ts`).

**Preguntas para negocio 🔷 (N7):** ¿la imagen es para todos los planes o es un beneficio monetizado, como Destacada? ¿Recorte fijo (p. ej. 1200×630, que serviría también de OG) o libre?

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

### T26 · Traducciones del sitio (i18n) ⬜

**Qué se pide:** traducciones del sitio web.

**Estado hoy:** **no hay ninguna infraestructura de i18n.** No están `@angular/localize`, ngx-translate ni Transloco; lo único que aparece es el target `extract-i18n` que trae el scaffold del CLI (`angular.json:96`). **Todos los textos están escritos a mano en español dentro de los templates**, y también hay español en el backend (mensajes de error, `message` del envelope, plantillas de correo). Los catálogos —estados MX, áreas profesionales, regímenes SAT— son intrínsecamente mexicanos y no se traducen.

**Decisión previa 🔷 (N6) — qué idiomas y para qué:** ¿inglés para empresas internacionales? ¿el objetivo real es sólo neutralizar regionalismos? El esfuerzo cambia radicalmente según la respuesta; **hasta tenerla, esta tarea no es estimable con precisión.**

**Decisión técnica 🔷 — `@angular/localize` vs. Transloco:**
- **`@angular/localize`** (i18n oficial): traducción en tiempo de build → **un bundle por idioma**, mejor rendimiento y SEO (URLs `/es/`, `/en/`), pero **no permite cambiar de idioma sin recargar** y multiplica el despliegue SSR (una app Node por idioma, o un router delante).
- **Transloco / ngx-translate:** JSON en runtime, cambio de idioma instantáneo, un solo bundle. Más simple de desplegar en cPanel; el SEO multi-idioma (`hreflang`, canonical por idioma) hay que armarlo a mano.
- **Recomendación: Transloco**, por el despliegue en cPanel y porque el portal ya corre como una sola app Node SSR.

**Alcance propuesto (en fases, para no bloquear el resto):**
1. Instalar la librería y **extraer los textos del portal público** a `es.json` (navbar, footer, home, vacantes, detalle, planes, contacto, faq). Sin traducir todavía: es el grueso del trabajo y es puro refactor.
2. Selector de idioma + persistencia (localStorage y `lang` en `<html>`), `hreflang` y canonical por idioma en `seo.service.ts`.
3. Traducir a los idiomas que decida negocio.
4. Áreas privadas (`/candidato`, `/empresa`, `/admin`) — **diferibles**: son usuarios recurrentes de un solo mercado.
5. **Backend:** los `message` del envelope van en español, pero el frontend **ya conmuta sobre `errorCode`** (el contrato estable) → **los errores se traducen en el cliente por `errorCode`, no traduciendo el backend**. Lo que sí necesita idioma son las plantillas de correo (T21) → guardar el idioma preferido en el usuario.
6. Formatos: fechas y **moneda MXN** por locale (`registerLocaleData`).

**Criterios de aceptación:** cambiar de idioma traduce el portal público sin recargar y la elección persiste; el HTML servido por SSR ya sale en el idioma correcto (**sin parpadeo al hidratar**); `hreflang` correcto; un texto sin traducir cae al español sin romper la vista.

**Riesgo:** es la tarea **más transversal** del backlog — toca todos los templates. Hacerla antes de que el portal se estabilice implica re-tocarla entera. Sugerencia: arrancar la fase 1 sólo cuando el diseño del portal público esté cerrado.

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

- **N6 · Idiomas del sitio (T26).** ¿Cuáles y para qué público? Sin esto la tarea no es estimable.
- **N7 · Imagen de vacante (T24).** ¿Para todos los planes o beneficio monetizado? ¿Recorte fijo o libre?
- **N8 · Qué apaga exactamente la expiración del plan (T22).** Ligada a N5 (`postingQuota`).
- ~~**N9 · Skills: catálogo normalizado o texto libre (T25).**~~ Resuelto: catálogo normalizado.

## Orden sugerido (Parte C)

1. ~~**T23**~~ ✅ hecha — falta sólo definir `APP_PUBLIC_URL` en el servidor y correr `uploads:rehost:prod`.
2. ~~**T27**~~ ✅ hecha — sin pasos de despliegue: ni migración ni permisos nuevos.
3. **T21** — desbloquea de paso la verificación de correo y el reset de contraseña en producción (hoy inservibles sin SMTP).
4. **T22** — necesita T21, y tapa un agujero real de negocio (planes vencidos que nunca caducan).
5. **T24** y ~~**T25**~~ ✅ hecha — skills normalizadas en backend, pendiente el frontend de chips.
6. **T26** — la última: es transversal y conviene hacerla con el diseño ya estable.
