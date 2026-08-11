# Impulso Jobs — Estado del proyecto y qué falta para salir a producción

**Fecha:** 11 de agosto de 2026 · **Destinatario:** Dirección · **Preparado por:** equipo de desarrollo

---

## 1. Resumen ejecutivo

El **motor de la plataforma está construido y probado**: identidad, empresas, candidatos, vacantes, postulaciones, banco de talento y toda la monetización funcionan de punta a punta en el servidor. El circuito completo —una empresa publica, un candidato se postula, la empresa gestiona el proceso, compra un plan y recibe sus beneficios— está verificado.

Faltan tres cosas para poder facturar:

1. **Decisiones comerciales que solo dirección puede tomar** (precios, alcance de los planes). Ya no bloquean el desarrollo, pero **sin ellas no se puede vender**.
2. **Tres contrataciones o trámites externos**: correo saliente, entidad legal para la pasarela de pago y facturación CFDI.
3. **Las pantallas** de lo construido en los últimos módulos. El servidor responde, pero el usuario todavía no tiene dónde hacer clic.

> **El punto más urgente:** hoy la plataforma **no puede enviar ni un solo correo**. Sin eso nadie puede verificar su cuenta ni recuperar su contraseña. Es el único bloqueante absoluto para abrir al público, y se resuelve con una contratación de bajo coste.

---

## 2. Dónde estamos

| Indicador | Estado |
|---|---|
| Módulos de negocio en el servidor | **7 de 10** construidos |
| Superficie construida | 24 controladores · 49 casos de uso · 34 entidades · 13 migraciones |
| Pruebas automáticas | **209** en verde |
| Pantallas publicadas | 22 páginas (portal público, acceso, back-office, vacantes de empresa) |
| Despliegue | Funcionando en cPanel (web + servidor + base de datos) |

---

## 3. Lo que necesitamos de dirección

Esta es la sección que requiere acción fuera del equipo técnico. Está ordenada por urgencia.

### 3.1. Contrataciones y trámites

| # | Qué | Por qué es necesario | Consecuencia de no tenerlo |
|---|---|---|---|
| **C1** | **Servicio de correo saliente** (SMTP o similar) | Verificación de cuenta y recuperación de contraseña | 🔴 **Bloquea la apertura al público.** Hoy los enlaces solo se escriben en el registro técnico del servidor; nadie los recibe. |
| **C2** | **Entidad legal mexicana** para operar la pasarela de pago | Requisito de Stripe México para cobrar | 🔴 **Bloquea cobrar.** El resto del sistema de pagos ya está construido y esperando. |
| **C3** | **PAC autorizado** para timbrar el CFDI | Obligación fiscal al facturar | 🟠 Se puede cobrar sin él temporalmente, pero no emitir factura. |
| **C4** | **Almacenamiento de archivos** (opcional pero recomendado) | Hoy las hojas de vida se guardan en el disco del propio servidor | 🟠 Riesgo de pérdida: sin respaldo y no sobreviven a una migración de servidor. |

### 3.2. Decisiones comerciales pendientes

Estas ocho decisiones **ya no bloquean el desarrollo**: el catálogo de planes se administra desde el panel, sin tocar código. Pero mientras no se definan, la página de precios está vacía y no se puede vender.

| # | Decisión | Opciones sobre la mesa |
|---|---|---|
| **D1** | **Precio de Media y Alta** (MXN, sin IVA) | Por definir. ⚠️ Si el total con IVA de **Alta** supera **$10.000 MXN**, deja de poder pagarse en **OXXO** (límite de la pasarela). |
| **D2** | **Alcance del plan Anual** | Precio, si incluye publicaciones ilimitadas o con cupo, cuántas visitas a la base de talento, y si renueva automáticamente. Hoy no está especificado en absoluto. |
| **D3** | **Vigencia de Alta** | ¿60 días (como la antigua Premium) o 45 (como la Alta original)? |
| **D4** | **Visitas a base de talento en Alta** | ¿20 o 10? |
| **D5** | **Pausas de publicación en Alta** | ¿2 con cambio de título, o 1? |
| **D6** | **Creación de ofertas con IA** | ¿En qué planes entra? La especificación solo dice que Media *no* la tiene. |
| **D7** | **Qué significa "Verificada"** | ¿Se verifica la oferta (revisión de contenido) o al empleador (identidad)? ¿Es un beneficio del plan o un requisito general? |
| **D8** | **Datos de contacto en Media** | La especificación dice "candidatos postulados" en Media y "los candidatos" en Alta. ¿Es la misma cosa redactada distinto, o Alta da acceso más amplio? |

**Recomendación:** D1 y D2 son las urgentes; el resto se pueden fijar con valores por defecto y ajustar después sin coste de desarrollo.

---

## 4. Qué está construido

### Servidor (backend)

| Área | Alcance |
|---|---|
| **Identidad y acceso** | Registro de empresa y de candidato, inicio de sesión, renovación de sesión, cierre, recuperación de contraseña, verificación de correo, bloqueo por intentos fallidos |
| **Roles y permisos** | Control de acceso por permiso en cada operación, con matriz administrable |
| **Back-office** | Gestión de usuarios, empresas (con su equipo y roles internos) y roles de plataforma |
| **Perfil de candidato** | Datos personales, experiencia, formación, idiomas, habilidades, hojas de vida en PDF y configuración de visibilidad |
| **Perfil de empresa** | Datos corporativos y fiscales para CFDI, logo, equipo |
| **Vacantes** | Alta, edición, pausar, reactivar, refrescar, cerrar, y portal público de búsqueda |
| **Postulaciones** | Postularse, bandeja del reclutador con filtros y embudo, cambio de estado con historial completo |
| **Banco de talento** | Búsqueda de candidatos con filtros combinables, reglas de privacidad y cupo de visitas de pago |
| **Monetización** | Catálogo de planes y beneficios, compra por vacante, suscripción anual, órdenes con IVA, vale de OXXO, activación de beneficios y caducidad |
| **Cuenta y datos personales** | Baja de cuenta, descarga de datos y restauración (derechos ARCO / LFPDPPP) |
| **Auditoría** | Rastro de quién hizo qué, cuándo y desde dónde |

### Web (frontend)

Publicado: portal público (inicio, vacantes y su detalle, precios, nosotros, contacto, preguntas frecuentes), acceso completo (entrar, dos flujos de registro, recuperación y verificación), back-office (usuarios, empresas, roles) y gestión de vacantes de la empresa.

---

## 5. Qué falta construir

Tamaños orientativos para **una persona desarrolladora**: **S** ≈ días · **M** ≈ 1–2 semanas · **L** ≈ 3+ semanas. No son compromisos.

| Prioridad | Trabajo | Tamaño | Depende de |
|---|---|---|---|
| 1 | **Pantallas de postulaciones** — botón de postularse, "mis postulaciones" del candidato, bandeja del reclutador con filtros y cambio de estado | **M** | — |
| 2 | **Pantallas de compra** — página de precios conectada al catálogo real, checkout y estado del pago (incluido el vale de OXXO pendiente) | **M** | D1, D2 |
| 3 | **Pantallas del banco de talento** — buscador con filtros y contador de visitas restantes | **M** | — |
| 4 | **Administración de planes** en el back-office | **S** | — |
| 5 | **Pantalla de baja de cuenta y descarga de datos** | **S** | — |
| 6 | **Conexión real con Stripe** — el sistema ya está preparado; falta el conector y el aviso automático de pagos | **M** | C2 |
| 7 | **Preguntas de filtrado** por vacante y respuestas del candidato | **M** | — |
| 8 | **Avisos automáticos** — mensaje a los no seleccionados al cerrar una vacante, y bandeja de notificaciones | **M** | C1 |
| 9 | **Facturación CFDI** | **M** | C3 |
| 10 | **IA** (borrador de vacante y emparejamiento de candidatos) | **L** | D6 |
| 11 | **Difusión en redes sociales** de las ofertas | **M** | D7 |

---

## 6. Riesgos técnicos que conviene resolver

| Riesgo | Impacto | Acción |
|---|---|---|
| **Sin correo saliente** | 🔴 Nadie puede verificar su cuenta ni recuperar su contraseña | Contratar C1. Es un cambio de una línea en la configuración. |
| **Código de depuración en producción** | 🔴 En cada subida de una hoja de vida, el servidor intenta enviar datos del archivo a una dirección de pruebas. No funciona en producción, pero **no debería estar ahí**. | Eliminarlo antes de abrir al público. Tamaño: **S**. |
| **Hojas de vida en el disco del servidor** | 🟠 Sin respaldo; se perderían al cambiar de servidor | Contratar C4 o establecer respaldos. |
| **Sin pruebas de extremo a extremo de permisos** | 🟠 Los permisos están probados por unidad, pero no simulando peticiones reales | Añadirlas antes de abrir al público. Tamaño: **S–M**. |
| **Datos de demostración en el panel** | 🟡 Un tablero del panel todavía muestra cifras inventadas | Sustituir por datos reales al construir las pantallas nuevas. |

---

## 7. Plan sugerido

Las fases están ordenadas por dependencia real: cada una desbloquea la siguiente.

**Fase 1 — Poder abrir al público** *(no depende de ninguna decisión comercial)*
Contratar el correo saliente, eliminar el código de depuración, añadir las pruebas de permisos y construir las pantallas de postulaciones. Al terminar, la plataforma es utilizable de verdad por candidatos y empresas, aunque todavía gratis.

**Fase 2 — Poder cobrar** *(requiere D1, D2 y C2)*
Dar de alta los planes reales con sus precios, construir las pantallas de compra y conectar Stripe. Al terminar, la plataforma factura.

**Fase 3 — Cumplir y competir** *(requiere C3, D6, D7)*
Facturación CFDI, avisos automáticos, preguntas de filtrado y banco de talento en pantalla.

**Fase 4 — Diferenciación**
IA y difusión en redes sociales.

---

## 8. Qué pedimos concretamente

1. **Esta semana:** aprobar la contratación del **servicio de correo** (C1). Es lo único que impide abrir al público.
2. **Este mes:** iniciar el trámite de la **entidad legal para la pasarela** (C2), que suele ser el de plazo más largo.
3. **Antes de la Fase 2:** cerrar los **precios de Media y Alta** (D1) y el **alcance del plan Anual** (D2).
4. **Cuando se pueda:** resolver D3–D8. Son ajustes de configuración, no de desarrollo.

---

*Documento generado a partir del estado real del código a 11 de agosto de 2026. El detalle técnico vive en `AGENTS.md` y `README_CONTEXTO.md` del repositorio.*
