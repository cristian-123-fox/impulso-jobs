# Impulso Jobs — Contexto del proyecto (índice)

Portal de empleabilidad para **México** que conecta candidatos y empresas, con monetización por planes (Stripe). Repositorio con dos apps: **NestJS + TypeORM** (backend, Postgres o MySQL) y **Angular 20 + SSR + Tailwind** (frontend). Este README ordena la documentación y marca la **versión vigente** de cada tema.

> **Última sincronización con el código: agosto 2026.**

---

## ✅ Set canónico (vigente — usar estos)

| Archivo | Qué contiene | Úsalo para |
|---|---|---|
| **AGENTS.md** | Reglas para agentes de IA: estructura del backend por capas, frontend Tailwind, contrato de API, RBAC, auditoría, y **§10 con el estado real y qué sigue**. | Contexto base de TODO el desarrollo. Anteponer siempre. |
| **CLAUDE.md** | Divergencias concretas contra AGENTS.md, comandos (incl. migraciones y seeds) y notas de tooling. | Trabajar en el repo día a día. |
| **Impulso_Jobs_Modelo_ER.md** | Esquema de datos completo + tabla de **qué está creado y qué no**. | Fuente de verdad del modelo de datos y las migraciones. |
| **Impulso_Jobs_Roles_y_Permisos.md** | Roles, matriz `component.action` con columna de **estado de la semilla**, beneficios *gated* por plan. | Seed de RBAC y reglas de autorización. |
| **Impulso_Jobs_Planes_Suscripciones.md** | Planes **Media / Alta / Anual**, catálogo de beneficios, decisiones abiertas. | Definir billing y el seed de planes. |
| **Impulso_Jobs_Localizacion_Mexico.md** | RFC, CURP, IVA 16 %, estados/municipios, CFDI, OXXO/SPEI, LFPDPPP/ARCO. | Todo lo específico de México. |
| **Impulso_Jobs_Stripe.md** | Integración de pagos: tarjeta/OXXO/SPEI/MSI, webhooks, pago asíncrono, adaptador. | Implementar el módulo de pagos. |
| **DEPLOY-CPANEL.md** | Despliegue real: SPA + Node app en subdominio + MySQL, migraciones y seeds de producción. | Publicar. |
| **README.md** | Puesta en marcha local de ambas apps. | Arrancar el entorno. |

---

## 📊 Estado del desarrollo

### Construido y funcionando

| Área | Detalle |
|---|---|
| **Identidad** | Registro (empresa \| candidato), login, refresh, logout, reset de contraseña, verificación de correo, bloqueo por intentos fallidos, blacklist de tokens. |
| **RBAC** | `PermissionsGuard` + `@RequirePermissions`, matriz sembrada, ABM de roles y asignación de permisos. |
| **Back-office** | `/admin/usuarios`, `/admin/empresas` (con gestión de miembros y su rol interno), `/admin/roles`. |
| **Candidato** | Perfil, experiencia, educación, idiomas, habilidades, hojas de vida (PDF) y configuración de visibilidad/disponibilidad. |
| **Empresa** | Perfil con datos fiscales CFDI (RFC inmutable), logo, equipo. |
| **Vacantes** | CRUD, cambio de estado, pausar/reactivar/refrescar, listado y detalle públicos. |
| **Postulaciones** (backend) | Postularse, listar/filtrar, detalle, historial de estados, embudo por estado y cambio de estado por la empresa. Sin UI todavía. |
| **Portal** | Home, vacantes, planes, nosotros, contacto, FAQ, mantenimiento; auth completo. |
| **Infra** | Swagger en `/docs`, envelope y `errorCode` unificados, auditoría, 11 migraciones, 5 seeds, despliegue cPanel. |

### Pendiente

| Área | Bloqueo |
|---|---|
| **Frontend de postulaciones** | Ninguno — **es lo siguiente**. El backend ya está listo y probado. |
| **Preguntas de filtrado** | Ninguno técnico; el hueco ya está preparado en el módulo de postulaciones. |
| **Billing + Stripe** | Decisiones de negocio abiertas (abajo). |
| **Notificaciones + SMTP real** | Hoy `MAILER_PORT` → `ConsoleMailerAdapter`: solo escribe el enlace en el log. |
| **Banco de talento, IA, redes sociales, CFDI/PAC** | Dependen de billing. |
| **Calidad** | e2e de autorización/ownership; piezas del UI Kit (`table`, `pagination`, `tabs`, `spinner`, `empty-state`); retirar los datos de demostración de `features/panel/`; `packages/api-contract`; limpiar la instrumentación de depuración commiteada en `candidate-resume.use-case.ts`. |

---

## Decisiones pendientes (bloquean billing)

1. **Precios en MXN** de Media y Alta. ⚠️ Si **Alta** supera **$10,000 MXN**, no podrá pagarse con OXXO.
2. **Alcance de la suscripción Anual:** precio, si es ilimitada, cupos, renovación.
3. **Vencimiento de Alta** tras fusionar Alta + Alta‑Premium: ¿60 días o 45?
4. **Visitas a base de talento en Alta:** ¿20 o 10? **Pausas:** ¿2 con edición de título, o 1?
5. **IA de creación de ofertas:** ¿en qué planes aplica?
6. **"Verificada":** ¿verifica la oferta o al empleador? ¿Beneficio del plan o requisito general?
7. **PAC para el CFDI** y **entidad legal** para operar Stripe en México.

Detalle en `Impulso_Jobs_Planes_Suscripciones.md` §7 y `Impulso_Jobs_Stripe.md` §10.

---

## 🗄️ Referencias históricas (no usar como fuente)

Estos documentos **ya no están en el repositorio**; se listan solo para que nadie los busque ni los reintroduzca. Su contenido vigente vive en el set canónico:

| Archivo | Por qué quedó superado | Reemplazado por |
|---|---|---|
| Impulso_Jobs_Plan_Modular_y_Prompts.md | Era de 2 repos, planes Essential/Pro/Premium, sin México. | `AGENTS.md` + este set. |
| Impulso_Jobs_Prompts_y_Roles.md | Roles de la versión Essential/Pro/Premium. | `Impulso_Jobs_Roles_y_Permisos.md`. |
| Impulso_Jobs_Frontend_Estructura.md | Estructura con **Bootstrap** (ahora Tailwind) y 2 repos. | `AGENTS.md` §5. |
| Impulso_Jobs_CU_Compra_Plan.md | Caso de uso en **COP** y plan Pro. | `Impulso_Jobs_Stripe.md`. |
| `prompts/` (M00–M19) | Prompt por módulo para arrancar el desarrollo. | Ya cumplió su función hasta M10. El resto del plan vive en `AGENTS.md` §10. |
| Impulso_Jobs_Backlog.xlsx · Impulso_Jobs_Presentacion.pptx | Nunca se versionaron aquí y quedaron desactualizados frente al código. | El estado real es la tabla de arriba. |

> La numeración **M#** sigue viva en los comentarios del código (p. ej. `// Vacantes (M10)` en `error-code.enum.ts`). Equivalencia verificada en el código, útil para leerlos:
>
> | | | | |
> |---|---|---|---|
> | **M2** RBAC ✅ | **M3** reset de contraseña ✅ | **M4** verificación de correo ✅ | **M5** registro + dominios empresa/candidato ✅ |
> | **M6** perfil del candidato ✅ | **M8** configuración del candidato ✅ | **M9** perfil de empresa ✅ | **M10** vacantes ✅ |
> | **M11** postulaciones ✅ (backend) | **M12** búsqueda / banco de talento 🕓 | **M14** planes y billing 🕓 | **M16** notificaciones 🕓 |
> | **M18** CFDI 🕓 | | | |
