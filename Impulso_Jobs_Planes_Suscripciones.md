# Impulso Jobs — Planes y suscripciones (revisado contra la especificación)

> Revisión literal de las tres ofertas descritas y su consolidación. Cada beneficio se marca según su **origen**:
> **[D]** = declarado explícitamente en la especificación · **[I]** = inferido (requiere confirmación) · **[?]** = no especificado.

> 🕓 **Estado (agosto 2026): sin implementar.** No existe `modules/billing/` ni ninguna de las tablas de §5. Lo único que ya está en el código son los campos que las vacantes necesitan para recibir estos beneficios (`is_verified`, `is_featured`, `is_urgent`, `is_confidential`, `pause_count`, `max_pauses`, `can_edit_title_on_reactivate`, `refreshed_at`), hoy con valores por defecto y sin plan que los alimente. La página `/planes` del portal es **estática**.
> **Las decisiones de §7 bloquean el arranque**: sin precios en MXN ni el alcance de la Anual no se puede sembrar el catálogo de planes.

---

## 1. Lo que dice la especificación (transcripción estructurada)

| | **Publicación Media – Verificada** | **Oferta Alta – Verificada** | **Oferta Alta‑Premium – Verificada** |
|---|---|---|---|
| Datos de contacto | Email y teléfono de los candidatos **postulados** | Correo y teléfono de los candidatos | Correo y teléfono de los candidatos |
| Oferta destacada | **NO** aparece en primeros lugares | ✓ Primeros lugares | ✓ Primeros lugares |
| Redes sociales | — (no mencionado) | ✓ Ligada a redes sociales | ✓ Redes sociales **de Impulso Jobs** |
| Urgente / Confidencial | **NO** | ✓ Puede aparecer con botón | ✓ Puede aparecer con botón |
| Preguntas de filtrado | ✓ Sí | ✓ Sí | ✓ Sí |
| Creación de ofertas con IA | **NO genera** | — (no mencionado) | — (no mencionado) |
| Matching con IA | — (no mencionado) | — (no mencionado) | ✓ IA de matching |
| Base de talento (CV internos) | **NO**; solo CV de los postulados | ✓ Verificados y preevaluados · **10 visitas** | ✓ Verificados y preevaluados · **20 visitas** |
| Pausar / reactivar / refrescar | — (no mencionado) | ✓ **1 vez** | ✓ **2 veces**, con **modificación de título** |
| Vencimiento | **30 días** | **45 días** | **60 días** |
| Mensaje automático al cerrar | ✓ A los no seleccionados | ✓ A los no seleccionados | ✓ A los no seleccionados |

## 2. Discrepancias que encontré en mi versión anterior (corregidas)

1. **"Creación de ofertas con IA" en Alta.** La especificación **solo** dice que Media *no* la genera; nunca afirma que Alta o Premium sí. Yo la había marcado ✓ en Alta — ahora queda **[I] a confirmar**.
2. **Beneficios de la suscripción Anual.** Yo había escrito "publicaciones ilimitadas, base de talento ilimitada, pausas ilimitadas". **Nada de eso está en la especificación**: tú solo dijiste que la tercera sea "abierta como una anual". Ahora todo el alcance de la Anual queda marcado **[?] por definir**.
3. **Vencimiento de Alta tras la fusión.** Alta original = 45 días; Premium = 60 días. Al fusionarlas tomé **60 días** (el superconjunto). Confirmar que es lo correcto y no 45.

---

## 3. Catálogo consolidado (2 planes por publicación + 1 anual)

Uniendo **Alta + Alta‑Premium** en un solo plan (superconjunto = el de Premium):

| Beneficio | **MEDIA** | **ALTA** (fusión) | **ANUAL** (abierta) |
|---|:--:|:--:|:--:|
| Publicación verificada | ✓ [D] | ✓ [D] | [?] |
| Preguntas de filtrado | ✓ [D] | ✓ [D] | [?] |
| Mensaje automático a no seleccionados | ✓ [D] | ✓ [D] | [?] |
| Contacto (email/teléfono) de **postulados** | ✓ [D] | ✓ [D] | [?] |
| Oferta destacada (primeros lugares) | ✗ [D] | ✓ [D] | [?] |
| Etiqueta urgente / confidencial | ✗ [D] | ✓ [D] | [?] |
| Redes sociales de Impulso Jobs | ✗ [I] | ✓ [D] | [?] |
| Base de talento (verificados/preevaluados) | ✗ [D] | ✓ **20 visitas** [D] | [?] |
| IA de matching con candidatos | ✗ [I] | ✓ [D] | [?] |
| Creación de ofertas con IA | ✗ [D] | **[I] ¿sí?** | [?] |
| Pausar / reactivar / refrescar | ✗ [I] | ✓ **2 veces** [D] | [?] |
| Modificación de título al reactivar | ✗ [I] | ✓ [D] | [?] |
| **Vencimiento** | **30 días** [D] | **60 días** [D] | **12 meses** [D] |
| Modelo de cobro | Pago único **por vacante** | Pago único **por vacante** | **Suscripción anual de empresa** |

> **Diferencia estructural clave:** Media y Alta se compran **por publicación** (promocionan *una* vacante). La **Anual** es una **suscripción de la empresa**, no de una vacante: cambia el modelo de datos (ver §5).

## 4. Catálogo de beneficios (para `plan_features`)

| `feature.code` | Tipo | Media | Alta | Anual |
|---|---|:--:|:--:|:--:|
| `verified_publication` | boolean | ✓ | ✓ | [?] |
| `screening_questions` | boolean | ✓ | ✓ | [?] |
| `auto_rejection_message` | boolean | ✓ | ✓ | [?] |
| `applicant_contact_data` | boolean | ✓ | ✓ | [?] |
| `featured_ranking` | boolean | — | ✓ | [?] |
| `urgent_confidential_badge` | boolean | — | ✓ | [?] |
| `social_media_distribution` | boolean | — | ✓ | [?] |
| `talent_db_access` | numeric (visitas; `-1`=ilimitado) | 0 | 20 | [?] |
| `ai_candidate_matching` | boolean | — | ✓ | [?] |
| `ai_job_creation` | boolean | — | [I] | [?] |
| `pause_reactivate` | numeric (nº pausas) | 0 | 2 | [?] |
| `edit_title_on_reactivate` | boolean | — | ✓ | [?] |
| `publication_days` | numeric | 30 | 60 | n/a |

## 5. Impacto en el modelo de datos

- **`plans`**: agregar `plan_type` (`per_publication` | `annual_subscription`), `validity_days` (30/60; nulo en anual), `billing_period` (`one_time` | `annual`), `posting_quota` (para la anual).
- **`company_subscriptions`** *(nueva)*: `id, company_id, plan_id, status, starts_at, ends_at, auto_renew, order_id`. Es el equivalente anual de `vacancy_promotions`.
- **`vacancy_promotions`**: sigue para Media/Alta (por vacante).
- **`talent_access_grants`** *(nueva)*: `company_id, source_type (promotion|subscription), source_id, total_visits, used_visits, expires_at` → controla las **visitas** a la base de talento y su consumo.
- **`vacancy_questions`** *(nueva)* + **`application_answers`** *(nueva)* → preguntas de filtrado y respuestas del candidato.
- **`vacancies`**: agregar `is_verified`, `is_confidential`, `is_urgent`, `pause_count`, `max_pauses`, `refreshed_at`.

## 6. Funcionalidades nuevas que implican desarrollo (no son solo un flag)

- **Preguntas de filtrado** → definición por vacante + respuestas en la postulación + vista para el reclutador.
- **Mensaje automático a no seleccionados** → hook al cerrar la vacante + capa de notificaciones.
- **Base de talento con visitas** → catálogo de candidatos preevaluados + *ledger* de consumo de cupo.
- **IA de matching** → servicio de ranking/sugerencia de candidatos.
- **IA de creación de ofertas** → generación del borrador de la vacante *(si se confirma)*.
- **Redes sociales** → adaptador de distribución.
- **Pausar / reactivar / refrescar** → contador de pausas contra el límite del plan + edición de título al reactivar.
- **"Verificada"** → proceso de verificación *(¿de la oferta o del empleador?)*.

## 7. Decisiones abiertas (bloquean la implementación de billing)

1. **Vencimiento de Alta tras la fusión:** ¿60 días (Premium) o 45 (Alta original)?
2. **Visitas a base de talento en Alta:** ¿20 (Premium) o 10 (Alta original)?
3. **Pausas en Alta:** ¿2 con edición de título (Premium) o 1 (Alta original)?
4. **Creación de ofertas con IA:** ¿incluida en Alta? ¿En la Anual?
5. **Suscripción Anual — todo su alcance:** precio, ¿publicaciones ilimitadas o con cupo?, ¿cuántas visitas a base de talento?, ¿renovación automática?
6. **Precios** de Media y Alta.
7. **"Verificada":** ¿verifica la oferta (revisión de contenido) o al empleador (KYC)? ¿Es beneficio del plan o requisito general de la plataforma?
8. **Datos de contacto:** Media dice "candidatos **postulados**"; Alta/Premium dicen "los candidatos" — ¿implica acceso más amplio (incluida la base de talento) o es la misma cosa redactada distinto?
