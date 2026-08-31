# TASKS — Impulso Jobs

Estados: ✅ hecho · 🔄 en curso · ⬜ pendiente · 🔷 decisión de negocio pendiente

- **Parte A — Demo (QA agosto 2026):** correcciones del PDF "Pruebas software impulso Jobs" + decisiones del equipo. Prioridad absoluta.
- **Parte B — Backlog de producto (análisis Computrabajo):** extraído de `computrabajocontextoclonacion.md`, cruzado contra el código real. Post-demo salvo los quick wins.

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

## Quick wins (bajo costo, alto valor — pueden entrar apenas cierre la demo)

### T10 · Preguntas de filtrado (killer questions) ⬜
El código de feature `screening_questions` ya existe en el catálogo de planes **sin implementación detrás**. Especificación tomada del análisis (§3.1): máx. **5 preguntas** por vacante, tipo abierta/cerrada; cerrada con hasta 5 opciones y **peso por opción `-1` (excluyente) o `0–10`**. En la postulación: `application_answers`, y en `candidate_applications` los derivados `score` e `is_excluded`. La bandeja de empresa ordena por score y separa excluidos. Es lo que sostiene el ranking del ATS y es barato.

### T11 · Moderación anti-PII en descripciones ⬜
Detectar teléfono/email/URL en descripción y (cuando exista T10) en preguntas. **Adoptamos la variante suave** que el propio análisis recomienda (§13.4.4): avisar en línea al reclutador, no rechazar la oferta completa. Regex + normalización de ofuscaciones ("arroba", "punto com"). Hoy no tenemos paywall de contacto, pero es higiene y queda listo si se adopta (ver decisión N1).

### T12 · Denunciar vacante ⬜
Catálogo exacto de 7 motivos (§8): ofensiva/discriminatoria · es anuncio · piden dinero · no responden · pagan mal · duplicada · otro. Endpoint público (con auth de candidato), entidad `vacancy_report`, cola en `/admin`. Usar "piden dinero" y "no responden" como señal de calidad del empleador, no solo buzón.

### T13 · No leídos en postulaciones ⬜
`candidate_applications` no tiene `readAt` — Computrabajo ordena su bandeja por "No leídos". Agregar `readAt` (se marca al abrir el detalle), contador de no leídos por vacante en la bandeja `/empresa/postulaciones`.

### T14 · Coherencia billing: flags muertos y cuota no aplicada ⬜
Dos hallazgos del cruce con el código: (a) **`isUrgent` e `isConfidential` no tienen escritor** — el feature `urgent_confidential_badge` se vende pero `EntitlementService.applyToVacancy` solo activa `isVerified`/`isFeatured`; (b) **`postingQuota` se guarda pero nunca se valida** al crear vacantes. Cablear ambos (o retirarlos del catálogo de features hasta que existan).

## Núcleo post-demo

### T15 · Enriquecer el modelo de vacante ⬜
Hoy el form tiene 11 campos; el de Computrabajo demuestra cuáles faltan para buscar/filtrar bien. Propuesta de subset (no todo): **área profesional** (catálogo de 23, heredar IDs de §3.2 — hoy no existe categoría alguna), **nº de plazas**, **tipo de contrato MX** (indeterminado/determinado/temporada/otro), **escolaridad mínima** (9 niveles), **comisiones** (flag junto al salario), **fecha límite de postulación** (habilita T6). Con eso, sumar al portal público los filtros que faltan: salario, fecha de publicación, área, y selector de orden (relevancia/fecha/salario).

### T16 · SEO del portal público ⬜
Estado real: `/vacantes/:id` con UUID pelado, sin `Meta`/`Title` por vacante, sin JSON-LD, y la **lista** cae en el prerender genérico (el HTML servido va vacío para crawlers). Tareas: slug en la URL (`/vacantes/:id-:slug`), `RenderMode.Server` para la lista, meta/OG por vacante, **JSON-LD JobPosting**, y las landings `trabajo-de-{cargo}-en-{ciudad}` cuando exista el área profesional (T15). Es el canal orgánico entero (§8).

### T17 · Acciones del candidato ⬜
Ninguna existe hoy: **guardar vacante** (primero — alimenta el área nueva del candidato de T8), ocultar, seguir empresa, alertas de búsqueda (job diario `send-search-alerts`), "recibir similares". Fasear en ese orden.

### T18 · Contador de vistas por vacante ⬜
No hay ningún contador en el backend. Copiar el patrón de CT (§4): tabla de eventos + **consolidación diaria** por job (la UI dice "se actualizan una vez al día" — evita contadores calientes). Habilita "N visualizaciones" en la bandeja de empresa y en T6.

### T19 · Snapshot del CV en la postulación ⬜
Hoy `application.resumeId` es FK viva: si el candidato borra o reemplaza su CV, la empresa pierde lo que evaluó. Congelar copia (archivo + metadatos) al postular, como hace CT con el versionado de CV (§6). Encaja con el almacenamiento local ya construido (T9).

### T20 · Vigencia de la vacante ⬜🔷
Hoy la vacante **nunca vence sola** (solo la promoción expira y caen los badges; el cierre es manual). Decidir si adoptamos reloj de publicación (¿60 días?) con job `expire-vacancies` — y si va, **comunicar la vigencia en la ficha desde el día 1** (el análisis recomienda no copiar los relojes opacos, §13.4.5).

## Decisiones de negocio (producto) 🔷

- **N1 · Modelo de cobro del contacto.** Hoy el email del postulante se entrega **gratis y a propósito** a la empresa. Computrabajo cobra exactamente eso ("publicación gratis, contacto de pago", §5.3). Adoptarlo cambiaría el DTO de postulaciones y el masking de talento. Decisión estratégica, no técnica.
- **N2 · Profundidad del masking en talento.** Nuestro buscador es lista-mínima → detalle completo (todo o nada) y la lista muestra **nombre real completo gratis**. CT muestra el CV profesional completo y enmascara solo lo identificable (§7) — convierte mejor y expone menos PII en el listado gratuito. Rediseñar el DTO de búsqueda es tarea mediana.
- **N3 · Edad y género: NO adoptar.** El propio análisis lo desaconseja (§13.4.1, riesgo CONAPRED/LFPDPPP). Hoy no los tenemos — dejarlo como decisión documentada.
- **N4 · Catálogo de CP con lat/lng + filtro por distancia.** Requiere catálogo de códigos postales georreferenciado (hoy municipio es texto libre). Costo alto; diferir hasta que haya volumen.

## Diferido (backlog largo)

Reviews/rating de empresa · IA (crear oferta, sugerir skills, matching — códigos de feature ya reservados: `ai_job_creation`, `ai_candidate_matching`) · reportes asíncronos con cola (`task` + BullMQ) · mensajería reclutador↔candidato · tests de competencias (Talentview).

## No copiar (decisión explícita)

1. Venta solo por asesor comercial — el autoservicio es nuestra ventaja.
2. Bloquear el acceso a postulaciones ya recibidas al vencer (genera el motivo de denuncia "No me responden"); si hay vencimiento, conservar lectura y cobrar solo contacto nuevo.
3. Rechazo duro de la oferta por PII (T11 usa aviso en línea).
4. Filtros de edad/género (N3).
5. Doble reloj opaco 60/30 sin comunicarlo (T20).
