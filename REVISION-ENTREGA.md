# Revisión de entrega — Stripe y cumplimiento legal

**Fecha:** 28 de octubre de 2026
**Alcance:** backend NestJS, frontend Angular SSR, módulo `billing` (Stripe) y módulo `legal` (LFPDPPP / LFPC).
**Entorno original de la revisión:** `demo.impulsojobs.com`, con Stripe en **modo prueba**.

> **Actualización 7-nov-2026:** la entrega se despliega en **DigitalOcean**. La guía paso a paso está en [`DEPLOY-DIGITALOCEAN.md`](DEPLOY-DIGITALOCEAN.md); las referencias a cPanel de este documento quedan como historial.

---

## 0. Pendientes de entrega — 7 de noviembre de 2026

### 0.1. Estado del código

| Comprobación | Estado |
|---|---|
| Backend | ✅ 574 tests / 69 suites; `pnpm build` correcto |
| Frontend | ✅ 116 tests; `pnpm build` limpio (sin PDFs, sin `index.html`, 301) |
| Sección de equipo | ✅ Implementada con los 5 integrantes reales; falta desplegar |
| Login con Google | ✅ Client ID nuevo en frontend y `.env` local; falta el `.env` del servidor |
| Stripe | 🟠 Clave `sk_test_` nueva en `.env` local; falta el `whsec_` y completar el onboarding |
| Guardia de build | ✅ `frontend/scripts/check-dist.mjs` falla si vuelven PDFs o el stub |
| Repositorio | ❌ Sigue público y con el CIF en el historial |

### 0.2. P0 — bloquean la entrega

- [ ] **Desplegar el backend en DigitalOcean** (ver `DEPLOY-DIGITALOCEAN.md`).
- [ ] **Desplegar el frontend** (SSR o estático) con el build del 7-nov.
- [ ] **Poner el repositorio privado** y purgar el historial del CIF.
- [ ] **Verificar 404** de `CIF CHRISTIAN-8.pdf`, `politica-privacidad.pdf` y `terminos-condiciones.pdf`.
- [ ] **Verificar 301** de `/` a `/vacantes`.
- [ ] **Corregir el plan `ANUAL`** en `/admin/planes`: nombre, descripción y beneficios que el código no entrega.
- [ ] **Stripe:** `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en el `.env` del servidor; webhook con los 6 eventos; onboarding completo (`charges_enabled=true`).
- [ ] **Correo:** `SMTP_*` con `impulsowebjobs@gmail.com` y contraseña de aplicación; probar registro, verificación y recuperación.
- [ ] **Crons:** `billing:expire`, `vacancies:expire` y `views:consolidate` diarios.
- [ ] **Respaldos:** base de datos y `uploads/`.
- [ ] **Datos de demo:** limpiar vacantes con *lorem ipsum* y cuentas de prueba.

### 0.3. Verificación post-deploy

- [ ] `https://impulsojobs.com/` → 301 a `/vacantes`.
- [ ] Los 3 PDFs legales → 404.
- [ ] `/nosotros` muestra el equipo y el JSON-LD `Organization`.
- [ ] `/planes` sin datos de prueba.
- [ ] Login con correo y con Google.
- [ ] Registro → verificación → recuperación.
- [ ] Flujo candidato: perfil, CV, postulación y guardadas.
- [ ] Flujo empresa: publicar, postulaciones, talento y promociones.
- [ ] Flujo admin: usuarios, empresas, roles, planes, pagos y legal.
- [ ] Compra de prueba con `4242 4242 4242 4242` y OXXO.
- [ ] `GET /api/v1/payments/options` → `stripe` con `CARD, MSI, OXXO`.
- [ ] Permisos negativos: empresa en `/admin` → 403; candidato en `/empresa` → 403.

### 0.4. Pendiente post-entrega (no bloquea)

- e2e de ownership en applications/billing/talent.
- Cupo de CV en banco de talento.
- Stripe: `invoice.payment_failed`, `charge.refunded`, `customer.subscription.updated`, vale OXXO y reconciliación automática.
- Purga de archivos (CV/fotos/logos) al eliminar cuentas.
- CFDI con PAC.
- Pantalla de auditoría y catálogos administrables.
- Filtro de navegación admin por permiso.
- Módulo de equipo administrable (hoy es catálogo estático).
- IA y difusión en redes.
- Licencia comercial de CKEditor.
- Revisión legal final.

### 0.5. Lo que falta del cliente/proveedor

- Acceso al Droplet de DigitalOcean o ejecución del despliegue.
- Contraseña de aplicación de `impulsowebjobs@gmail.com`.
- `whsec_` del webhook nuevo de Stripe.
- Decisión de planes: nombre, descripción y beneficios del plan Anual.
- Confirmación de roles/bios del equipo y, si aplica, fotos.

---

## 1. Resumen ejecutivo

La integración de Stripe está **bien construida técnicamente**: usa Checkout alojado, verifica la firma del webhook sobre el cuerpo crudo, tiene idempotencia por `event_id`, separa pago único de suscripción y modela los pagos asíncronos de OXXO/SPEI. **No encontré un fallo que impida cobrar en modo prueba.**

La parte legal estaba **más avanzada de lo que parecía**, pero tenía tres problemas serios:

1. **La Constancia de Situación Fiscal estaba publicada** en `frontend/public/legal/CIF CHRISTIAN-8.pdf`, accesible desde el sitio y en el historial de un repositorio **público** de GitHub. Contiene RFC, CURP y domicilio particular.
2. **Los PDF legales publicados contradecían las páginas HTML**: eran del 12 de octubre, citaban la ley anterior, tenían un correo distinto y un dominio con typo (`www.impulsjobs.com`).
3. **El aviso de privacidad prometía funciones que no existían** (descarga de datos, baja y revocación “desde Mi cuenta”), y los Términos prometían **CFDI por cada cobro** cuando el PAC no está integrado.

En el árbol de trabajo ya quedaron corregidos el punto 1 y 2, y el punto 3 se corrigió en los textos + versión legal 1.1.0. Falta **desplegar** y **purgar el historial de Git**.

---

## 2. Bloqueantes para el sábado

### 🔴 2.1. Constancia fiscal expuesta (crítico)

- **Qué pasó:** el archivo `frontend/public/legal/CIF CHRISTIAN-8.pdf` era servido por Angular como archivo estático. Estaba enlazado en el repositorio y sigue accesible en `https://demo.impulsojobs.com/legal/CIF%20CHRISTIAN-8.pdf` hasta el próximo despliegue.
- **Qué contiene:** RFC `GARC840404P36`, CURP, nombre completo y domicilio en Guadalajara.
- **Estado:** ya lo moví a `private/legal/` (ignorado por Git) y eliminé la copia de `frontend/public/legal/` y de `frontend/dist/`.
- **Lo que falta y es obligatorio:**
  1. **Desplegar el frontend** para que la URL deje de existir.
  2. **Purgar el archivo del historial de Git.** El repositorio `https://github.com/cristian-123-fox/impulso-jobs` es **público** y el archivo se subió en el commit `37ec5d9`. Borrarlo del commit actual no lo borra del historial.
  3. Pedir a GitHub que purgue la caché del objeto si el repositorio estuvo público (GitHub conserva commits inalcanzables un tiempo).

Comandos sugeridos (hacer respaldo antes; reescriben historia y requieren `force push`):

```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch "frontend/public/legal/CIF CHRISTIAN-8.pdf"' \
  --prune-empty --tag-name-filter cat -- --all

git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
git push origin --force --tags
```

> Si hay colaboradores, tienen que volver a clonar. Si el repositorio debe seguir público, conviene además revisar si el CIF aparece indexado en buscadores.

### 🔴 2.2. Stripe está en modo prueba

- `backend/.env` tiene una clave `sk_test_...` y un `whsec_...` de pruebas.
- **No se cobrará dinero real.** Una tarjeta real será rechazada o se comportará como prueba.
- Si la entrega es una **demo**, es lo correcto; hay que decírselo al cliente y usar la tarjeta de prueba `4242 4242 4242 4242`.
- Si el cliente espera cobrar el sábado, hay que cambiar a `sk_live_...`, registrar el webhook live, definir `APP_WEB_URL` y probar un cobro real pequeño antes de la entrega.

### 🔴 2.3. El catálogo de planes tiene datos de prueba

La API pública `GET /api/v1/plans` devuelve hoy:

- Plan **“anual”** (minúsculas), descripción **“fghfghfghfgy”**, precio $2,000 + IVA.
- El plan Anual anuncia beneficios que **el código no aplica a la suscripción**: `featured_ranking`, `urgent_confidential_badge`, `social_media_distribution`, `ai_candidate_matching`, `ai_job_creation`, `publication_days=-1`.
- La suscripción sí otorga cupo de talento, pero **no enciende distintivos ni cupos de publicación**. Eso está reconocido en T34/N13.

**Antes de enseñar la plataforma:** limpiar nombres/descripciones y quitar del plan Anual los beneficios que no se entregan, o el cliente estará pagando por algo que no recibe (riesgo LFPC).

### 🟠 2.4. CFDI: los textos ya no prometen lo que no hay, pero falta el proceso

- Los Términos y la Política de reembolso ahora dicen **“CFDI a solicitud”**, no “por cada cobro”.
- **No hay integración con PAC.** Si el cliente pide factura, hay que emitirla por fuera (PAC/contador) y registrar el UUID manualmente.
- Si el cliente exige factura automática desde el sábado, esto sigue siendo un bloqueante funcional.

### 🟠 2.5. Reembolsos: política sí, operación manual

- La Política de reembolso promete reembolsos por cobros duplicados, errores y cancelaciones.
- **No existe endpoint de reembolso** ni manejo de `charge.refunded`. El reembolso se hace desde el dashboard de Stripe y hay que conciliarlo a mano.
- Definir quién lo hace, en qué plazo y cómo se registra en `/admin/pagos` (hoy no hay estado `REFUNDED` operable desde la UI).

### 🟠 2.6. Avisos de renovación y expiración dependen del cron

- La ley y los Términos prometen aviso **≥ 5 días naturales** antes del cobro.
- El backend envía avisos a 30/7/1 días, pero **solo si corre `billing:expire` a diario** (`0 6 * * *` en cPanel).
- Verificar en el servidor que el cron está activo y que `SMTP_*`/`MAIL_FROM` funcionan. Sin correo, el aviso no sale.

### 🟠 2.7. ARCO: el aviso ya no promete autoservicio, pero el correo debe funcionar

- El aviso ahora remite al correo de datos personales (`hola@impulsojobs.mx`) para acceso, baja y revocación. Es válido legalmente.
- **Probar que ese buzón recibe y responde.** El backend tiene `GET /account/data-export` y `DELETE /account`, pero **no hay UI**; la baja de cuentas creadas con Google tampoco funciona por contraseña. El proceso por correo cubre ambos casos.

---

## 3. Stripe: lo que está bien

| Pieza | Estado |
|---|---|
| Checkout alojado (tarjeta, MSI, OXXO; suscripción solo tarjeta) | ✅ |
| Montos en centavos, MXN, IVA 16 % calculado en servidor | ✅ |
| Firma del webhook sobre `rawBody` (`rawBody: true` en `main.ts`) | ✅ |
| Idempotencia por `event_id` (`processed_payment_events`) | ✅ |
| OXXO/SPEI asíncronos: `completed` ≠ pagado; activa en `async_payment_succeeded` | ✅ |
| Activación **solo** por webhook, nunca por `success_url` | ✅ |
| Cancelación de checkout abandonado y liberación de reserva | ✅ |
| Reconciliación manual desde `/admin/pagos` (`POST :id/sync`) | ✅ |
| Suscripción anual, renovación por `invoice.paid`, recarga de cupo | ✅ |
| Cancelación de renovación en Stripe (`cancel_at_period_end`) | ✅ |
| Pruebas del módulo | ✅ 526 tests backend en verde |

### Huecos técnicos (no bloquean la demo, sí producción)

1. **No se guarda el vale de OXXO de Stripe.** El adaptador devuelve `voucher: null`; si el usuario cierra la pestaña después de generar el vale, el panel no puede mostrarle la referencia. La página de Stripe sí la muestra en el momento.
2. **No se maneja `invoice.payment_failed`.** Una renovación fallida no pasa a `PAST_DUE` ni avisa a la empresa; el job de expiración la apagará al vencer el periodo.
3. **No se maneja `charge.refunded`.** Un reembolso hecho en Stripe no revoca la promoción/suscripción ni cambia la orden.
4. **No se maneja `customer.subscription.updated`.** Cambios hechos desde el dashboard/portal de Stripe no sincronizan estado ni fecha.
5. **No hay facturación CFDI** (ver 2.4).
6. **No hay cron automático de reconciliación**; solo el botón manual de `/admin/pagos`.

### Eventos que deben estar dados de alta en el endpoint

`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `customer.subscription.deleted`.

> Añadir `invoice.payment_failed`, `customer.subscription.updated` y `charge.refunded` cuando se implementen los huecos 2–4.

---

## 4. Legal: cambios aplicados en el árbol de trabajo

### 4.1. Identidad del responsable

- **Correo corregido:** `holla@impulsojobs.com` → `hola@impulsojobs.mx` (coincide con el footer y el dominio real).
- **Teléfono agregado:** `+52 55 4160 3820` (confirmado por el negocio).
- **Domicilio unificado:** Av. Alemania 1294, Interior 1, Col. Moderna, 44190, Guadalajara, Jalisco.
- `isIdentityComplete()` ahora también exige teléfono; ya no publica un aviso con “—”.
- `brand.catalogs.ts` (footer, contacto, mapa) se alineó con el domicilio legal. Las coordenadas son aproximadas a la altura de Av. Alemania 1294.

### 4.2. Versión legal 1.1.0

Se creó la migración `1720000041000-BumpLegalVersionsForLaunch.ts` y se actualizaron las versiones en el frontend:

| Documento | Versión nueva | Vigencia |
|---|---|---|
| Aviso de privacidad | 1.1.0 | 2026-10-28 |
| Términos y condiciones | 1.1.0 | 2026-10-28 |
| Política de reembolso | 1.1.0 | 2026-10-28 |

Las versiones 1.0.0 se conservan para no perder la evidencia de lo que aceptó cada persona.

**Consecuencia:** al iniciar sesión, las cuentas existentes verán la pantalla de re-consentimiento. Es el comportamiento correcto (T39), pero hay que avisar al cliente. Para las cuentas de demo, correr `pnpm seed` después de migrar para que queden con la constancia 1.1.0.

### 4.3. Correcciones de contenido

- **Privacidad / transferencias:** ya no afirma que no hay transferencias fuera de México. Reconoce que Stripe, el correo y Google pueden tratar datos fuera del país como encargados, bajo contrato.
- **Privacidad / ARCO:** ya no promete descarga, baja y revocación “desde Mi cuenta”. Remite al correo de datos personales, que es el cauce que existe.
- **Privacidad / retención:** la hoja de vida y archivos se eliminan al purgar la cuenta, no “con la cuenta” (la baja es lógica y la purga es posterior).
- **Términos / identidad:** ya no dice que se autentica la identidad documental; dice que se valida formato y unicidad del documento.
- **Términos y reembolso / CFDI:** ahora es “a solicitud”, no “por cada cobro”.
- **Reembolso / cancelación:** dice la verdad del flujo real: se detiene la renovación y se conserva el periodo pagado; el reembolso proporcional se solicita por correo.

### 4.4. PDFs retirados

- Se eliminaron del sitio `politica-privacidad.pdf` y `terminos-condiciones.pdf` (eran del 2026-10-12, con la ley anterior, otro correo y un dominio con typo).
- Se quitó la columna “Descargas” del footer y el botón “Descargar PDF” de las páginas legales.
- La página HTML queda como única versión canónica, que es la que se registra en `legal_consents`.
- Los PDF antiguos se archivaron en `private/legal/` (no se publican).

### 4.5. Consentimiento de cobro recurrente

- Nuevo checkbox **sin premarcar** en la contratación de suscripción con Stripe.
- El backend ahora rechaza una suscripción Stripe sin `recurringConsent: true` (`SUBSCRIPTION_CONSENT_REQUIRED`).
- Se registra en auditoría con IP, user-agent, plan, importe y proveedor.
- Se añadió el bloque de **información precontractual** (razón social, RFC, domicilio, teléfono, correo, total con IVA y enlaces a Términos/Aviso/Reembolso) en los formularios de promoción y suscripción.

---

## 5. Legal: puntos que siguen abiertos

1. **Revisión por abogado.** Los textos los ajusté para que digan la verdad operativa; no sustituyen una revisión legal. En particular: transferencias internacionales, retención y cláusulas de reembolso.
2. **Purga de archivos.** `purge-accounts.ts` borra perfil y usuario, pero **no borra los PDF de CV ni las fotos/logos del disco**. El aviso ya dice “al purgarse la cuenta”; hay que hacer que la purga también elimine los archivos.
3. **Baja de cuentas Google.** No pueden usar “Eliminar cuenta” con contraseña. El cauce por correo del aviso lo cubre, pero conviene documentarlo en el procedimiento de soporte.
4. **Reembolsos.** La política es ejecutable a mano desde Stripe; falta el registro en la plataforma.
5. **CFDI.** Falta PAC y emisión; por ahora “a solicitud” y manual.
6. **Consentimiento de cookies.** Verificar que el banner bloquea Google Identity y OpenStreetMap hasta que el usuario acepte (el código ya lo hace).
7. **Aviso de vulneración (art. 19 LFPDPPP).** Es un proceso, no un endpoint; definir responsable y plazo.
8. **NOM-035 / NOM-030** si hay empleados. No es software.

---

## 6. Checklist de despliegue para el sábado

### Backend

```bash
cd backend
pnpm install
pnpm build
pnpm migration:run:prod          # incluye BumpLegalVersionsForLaunch
pnpm seed:prod -- --only=rbac    # solo si no se ha corrido; no hay permisos nuevos
pnpm seed:prod                   # registra consentimientos 1.1.0 en cuentas de demo
```

- Verificar `.env` de producción:
  - `NODE_ENV=production`
  - `APP_WEB_URL=https://demo.impulsojobs.com`
  - `APP_PUBLIC_URL=https://api.impulsojobs.com`
  - `CORS_ORIGIN=https://demo.impulsojobs.com`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
  - `STRIPE_SECRET_KEY=sk_test_...` (o `sk_live_...` si se decide cobrar)
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
- Reiniciar la app Node después de migrar y de sembrar RBAC.
- Verificar cron diario de `billing:expire:prod`.

### Frontend

```bash
cd frontend
pnpm install
pnpm build
```

- Publicar `dist/frontend` (SSR) en el subdominio.
- Verificar que `https://demo.impulsojobs.com/legal/CIF%20CHRISTIAN-8.pdf` devuelve **404**.
- Verificar que el aviso de privacidad muestra:
  - nombre, RFC, domicilio, teléfono y `hola@impulsojobs.mx`;
  - versión 1.1.0 y fecha 2026-10-28;
  - sin botón “Descargar PDF”.
- Verificar footer: domicilio de Guadalajara, `hola@impulsojobs.mx`, teléfono.
- Verificar registro: casillas sin marcar, enlaces legales, re-consentimiento al entrar.

### Stripe

- Dashboard → Developers → Webhooks: endpoint `https://api.impulsojobs.com/api/v1/payments/stripe/webhook`, modo prueba, eventos de la sección 3.
- Probar:
  1. Promoción con tarjeta `4242 4242 4242 4242` → activa al instante.
  2. Promoción con OXXO → queda `AWAITING_PAYMENT`; el webhook `async_payment_succeeded` la activa.
  3. Suscripción anual con tarjeta → activa y guarda `provider_subscription_id`.
  4. Renovación con Stripe CLI (`invoice.paid`) → extiende periodo y recarga cupo.
  5. Cancelar renovación → `cancel_at_period_end` en Stripe y `autoRenew=false` local.
  6. Checkout abandonado → `checkout.session.expired` libera la reserva.
  7. Webhook duplicado → responde 200 y no duplica la activación.
- Confirmar que `GET /api/v1/payments/options` devuelve `stripe` con `CARD, MSI, OXXO` y `recurringMethods: [CARD]`.

---

## 7. Verificación técnica de esta revisión

| Comprobación | Resultado |
|---|---|
| `backend: pnpm build` | ✅ |
| `backend: pnpm test` | ✅ 526 tests, 67 suites |
| `backend: tsc --noEmit` | ⚠️ errores preexistentes en specs (`jest.Mocked<T>` desactualizados), no en código de producción |
| `frontend: pnpm build` (SSR + prerender) | ✅ |
| `frontend: pnpm test` | ✅ 110 tests |
| PDF/CIF en `dist` | ✅ ya no está |
| Migración legal nueva | ✅ creada, pendiente de correr en demo/producción |

---

## 8. Archivos tocados en esta revisión

**Backend**

- `src/database/migrations/1720000041000-BumpLegalVersionsForLaunch.ts` (nuevo)
- `src/common/types/error-code.enum.ts`
- `src/modules/billing/controllers/company-billing.controller.ts`
- `src/modules/billing/dto/billing.dto.ts`
- `src/modules/billing/dto/billing-response.dto.ts`
- `src/modules/billing/use-cases/company-subscription.use-case.ts`

**Frontend**

- `src/app/shared/catalogs/legal.catalogs.ts`
- `src/app/shared/catalogs/brand.catalogs.ts`
- `src/app/features/public/legal/content/legal-content.es.ts`
- `src/app/features/public/legal/content/legal-content.en.ts`
- `src/app/layout/public-layout/footer/footer.ts`
- `src/app/shared/ui/provider-info/provider-info.ts` (nuevo)
- `src/app/shared/ui/index.ts`
- `src/app/features/company/billing/components/promotion-form/promotion-form.ts`
- `src/app/features/company/billing/components/subscription-form/subscription-form.ts`
- `src/app/features/company/billing/data/billing.api.ts`
- `src/app/features/company/billing/data/billing.facade.ts`
- `src/app/features/company/billing/models/billing.models.ts`
- `src/app/features/company/billing/pages/promotions-page/promotions-page.ts`

**Archivos movidos fuera del sitio público**

- `frontend/public/legal/CIF CHRISTIAN-8.pdf` → `private/legal/`
- `frontend/public/legal/politica-privacidad.pdf` → `private/legal/politica-privacidad-2026-10-12.pdf`
- `frontend/public/legal/terminos-condiciones.pdf` → `private/legal/terminos-condiciones-2026-10-12.pdf`
- `.gitignore` ahora ignora `private/`.

---

## 9. Módulo de promociones — corrección 2026-10-28

### 9.1. Qué estaba mal

- La página mezclaba **promociones**, **compra de plan**, **suscripción**, **pagos** y **consultas de talento**.
- La tabla de “promociones” se alimentaba del mismo endpoint de promociones pero la vista antigua podía mostrar datos de la orden (precio, método, folio) en lugar de centrarse en la vacante.
- El “0 promociones disponibles de 0” venía de leer `company_subscriptions.promotion_credits`, una **caché** que podía quedar en 0 aunque el plan sí incluyera `promoted_vacancies`.
- La duración de la promoción se tomaba de `publication_days`, que también define la vigencia de publicación. No había forma de tener “publica 30 días, promociona 7”.

### 9.2. Corrección de cupos (backend)

`EntitlementService` ahora resuelve también:

- `promotionCredits` desde `promoted_vacancies`.
- `promotionDays` desde el nuevo `promotion_days`; si falta, cae a `publication_days` y luego a `validity_days`.

`GET /company/promotions/summary` calcula:

```
incluidas  = plan.promoted_vacancies
utilizadas = company_subscriptions.used_promotion_credits
disponibles = max(0, incluidas - utilizadas)
```

No usa `posting_quota` ni `talent_db_access`. Si la caché de la suscripción estaba en 0, el plan manda y el resumen muestra el cupo real.

La activación con crédito ahora:

1. Bloquea la suscripción con `SELECT … FOR UPDATE` (`findLiveSubscriptionByCompany(..., lock = true)`).
2. Resuelve el plan y sus cupos dentro de la misma transacción.
3. Vuelve a comprobar que no exista una promoción viva para la vacante.
4. Consume **un** cupo y actualiza la caché `promotion_credits`.

Así dos peticiones simultáneas no pueden gastar el último cupo.

### 9.3. Migración de datos

`1720000042000-AddPromotionDaysFeature.ts`:

- Añade el beneficio `promotion_days` (NUMERIC) al catálogo.
- Siembra los valores iniciales: **Básico 7, Premium 15, Anual 30**.
- Asegura los cupos iniciales: **Básico 1, Premium 4, Anual 12** en `promoted_vacancies`.
- **No toca precios, periodicidad ni `posting_quota`.**

### 9.4. Pantalla nueva (cinco secciones)

1. **Mi plan y promociones disponibles:** una tarjeta compacta con plan, estado, incluidas, utilizadas, disponibles, duración de promoción y vigencia. Sin precios, sin barra, sin renovación y sin enlace de gestión: exactamente la estructura visual aprobada.
2. **Promocionar una vacante:** modal que consulta vacantes elegibles, muestra duración, finalización prevista, cupo consumido y disponibles después; activa con `POST /company/promotions` usando el crédito.
3. **Mis promociones activas:** tabla de vacante, inicio, finalización, días restantes, estado y acción “Ver vacante”. Sin precios, métodos ni folios.
4. **Historial:** promociones `EXPIRED`/`CANCELLED` con vacante, plan, inicio, fin y estado.
5. **¿Cómo funciona?:** Selecciona / Activa / Destaca.

La compra/renovación de plan quedó fuera de las secciones: solo se abre en un modal cuando llega `?plan=` desde `/planes` o desde “Gestionar mi plan”. Ya no hay tarjetas de Básico/Premium ni tabla de pagos dentro de la página.

### 9.5. Verificación real

Contra el backend local y la base PostgreSQL:

```json
{
  "subscription": {
    "planName": "Básico",
    "status": "ACTIVE",
    "promotionCredits": 1,
    "usedPromotionCredits": 0,
    "availableCredits": 1,
    "promotionDurationDays": 7
  },
  "promotionsIncluded": 1,
  "promotionsUsed": 0,
  "promotionsAvailable": 1,
  "promotionDurationDays": 7
}
```

Capturas generadas con Chrome Headless en `/empresa/promociones`:

- `C:\Users\sebba\AppData\Local\Temp\ij-promotions-exact.png` — pantalla final con la estructura aprobada.
- `C:\Users\sebba\AppData\Local\Temp\ij-promotions-modal.png` — modal de activación.
- `C:\Users\sebba\AppData\Local\Temp\ij-promotions.png` — versión anterior de referencia.

La pantalla mostró: “Mi plan Básico · Activo · 1 incluidas · 0 utilizadas · 1 disponible · Duración 7 días · Vigencia 29/11/2026”, la tabla de activas y el historial vacío.

**Diagnóstico de la cuenta `sebastiantovarmlo@gmail.com` (Innovasoft Team):** esa empresa **no tenía una suscripción activa**. Sus dos suscripciones al plan anterior (`ALTA`) estaban `CANCELLED` por una revocación administrativa; por eso la pantalla mostraba “Mi plan · Sin plan activo”, no “Mi plan Básico”. La promoción activa de “Desarrollador php senior” durante 60 días era una **compra puntual del plan Premium** ($2,500 + IVA), no un cupo de Básico. El registro “Cancelada” sin fechas era una compra fallida que nunca llegó a ser promoción.

**Corrección de datos de demo aplicada:** se asignó Básico a Innovasoft (cortesía, 1 cupo, vigencia 30/11/2026) y se retiró la promoción Premium (pasa a `CANCELLED` con sus fechas en el historial). La pantalla quedó con **Mi plan Básico · Activo · 1 incluidas · 0 utilizadas · 1 disponible · 7 días · 0 activas**. Captura: `C:\Users\sebba\AppData\Local\Temp\ij-promotions-demo-basico.png`.

> Esto se hizo sobre la base local de demo. En el entorno de demo/producción, la asignación se hace desde `/admin/empresas/:id` (sección «Plan»); no hay que ejecutar SQL a mano.

### 9.6. Separación estricta de pagos y promociones

- `GET /company/promotions` ahora devuelve `PromotionListItemDto`: **sin `order`, `pricePaid` ni `currency`**. La tabla no puede mostrar folios, métodos ni importes porque ya no los recibe.
- El detalle (`GET /company/promotions/:id`) conserva la orden para el checkout, pero la tabla de la página no lo usa.
- `vacancy_promotions` ganó `subscription_id` (migración `AddPromotionSubscriptionOrigin`), así una promoción activada con cupo guarda de qué suscripción salió. Las compras puntuales quedan con NULL y su origen es la orden.
- La activación con cupo se probó de punta a punta: `POST /company/promotions` respondió **201**, la promoción quedó `ACTIVE`, `startsAt`/`endsAt` a **7 días**, `subscription_id` poblado y el resumen pasó a **1 incluida / 1 utilizada / 0 disponibles**. Después se restauraron los datos de prueba.

### 9.7. Estado de compilación

- Backend: `pnpm build` ✅ · `pnpm test` ✅ **531 tests** (incluye 3 de cupos/duración y 2 de tipo de cuenta).
- Frontend: `pnpm build` ✅ (SSR + prerender) · `pnpm test` ✅ 111 tests.
- Migraciones aplicadas en local: `BumpLegalVersionsForLaunch`, `AddPromotionDaysFeature`, `AddPromotionSubscriptionOrigin` ✅.
- Pendiente de despliegue: `pnpm migration:run:prod` y publicar frontend/backend.

---

## 10. Login por tipo de cuenta y cookies

### 10.1. Diferenciación Candidato / Empresa

**Antes:** el selector Candidato/Empresa sólo cambiaba el subtítulo y el enlace de registro. El frontend enviaba `accountType`, pero el backend lo ignoraba; una cuenta de empresa podía entrar desde la pestaña Candidato y el selector no protegía nada.

**Ahora:**

- `POST /auth/login` acepta `accountType: 'candidate' | 'company'`.
- El backend valida que coincida con `users.role` (`CANDIDATE` / `EMPLOYER`) **después** de comprobar la contraseña, para no revelar el tipo de cuenta a un desconocido.
- Si no coincide, responde `403 AUTH_WRONG_ACCOUNT_TYPE` y audita `auth.login.wrong_account_type`.
- Los `ADMIN` pueden entrar desde cualquiera de las dos pestañas y se redirigen a `/admin`.
- Los mensajes del frontend dicen a qué pestaña cambiar:
  - cuenta de empresa en pestaña Candidato → “Cambia a la pestaña Empresa”;
  - cuenta de candidato en pestaña Empresa → “Cambia a la pestaña Candidato”.
- El login con Google sigue siendo sólo de candidato: el botón se oculta en Empresa y el backend rechaza una cuenta de empresa que intente entrar por Google.
- La redirección sigue siendo por rol: `CANDIDATE → /candidato`, `EMPLOYER → /empresa`, `ADMIN → /admin`.

### 10.2. Cookies

- El banner ahora se monta en **todas las áreas**: público, acceso, empresa, candidato y admin (`public-layout`, `auth-layout` y `app-shell`). Antes sólo aparecía en público y login; al entrar directo a `/empresa`, `/candidato` o `/admin` no se pedía consentimiento.
- Se mantiene el comportamiento correcto:
  - “Aceptar todo” y “Rechazar todo” con el mismo peso visual.
  - `necessary` no se puede rechazar (idioma y la propia respuesta).
  - Todo lo demás apagado por defecto.
  - Google Identity y OpenStreetMap no se cargan hasta aceptar `functional`; el login explica por qué no aparece el botón de Google y enlaza a la Política de cookies.
  - La decisión se guarda en `ij_consent` y se puede cambiar reabriendo el banner desde la Política de cookies.
- **Rechazar todo es una opción válida** y no bloquea la web: es lo que exige la LFPDPPP (opciones para limitar el uso), no una aceptación forzada.

### 10.3. Verificación

- Backend: **69 suites / 576 tests** (2 de tipo de cuenta + 45 de portabilidad de migraciones).
- Frontend: **111 tests** (1 nuevo del mensaje de tipo de cuenta).
- Build backend y frontend ✅.
- Verificación visual con Chrome Headless:
  - `/auth/login` sin cookie: banner visible y mensaje de Google bloqueado.
  - Pestaña Empresa: subtítulo “Ingresa a tu cuenta de empresa”, sin botón ni aviso de Google.
  - `/empresa/promociones` con sesión y sin cookie: banner visible.

Capturas:
- `C:\Users\sebba\AppData\Local\Temp\ij-login-cookies.png`
- `C:\Users\sebba\AppData\Local\Temp\ij-login-company-tab.png`
- `C:\Users\sebba\AppData\Local\Temp\ij-company-cookies2.png`

---

## 11. Ajustes de login, registro y dashboard

### 11.1. Login sin consentimiento legal

El login ya **no muestra ni registra Términos, Aviso ni cesión de imagen**. Esos consentimientos se piden únicamente en el registro / creación de cuenta.

- Se eliminó el bloque legal del login (incluido el de Google).
- Se eliminó el re-consentimiento por cambio de versión en el login: una cuenta existente entra aunque sus documentos estén desactualizados.
- Google solo entra a cuentas existentes. Si el correo no tiene cuenta, pide crearla por el registro.
- **Consecuencia legal:** si se publica una versión nueva de Términos o Aviso, las cuentas existentes no serán obligadas a aceptarla al entrar. Es una decisión explícita del negocio; si se quiere conservar esa obligación, hay que restaurar el re-consentimiento solo para cambios de versión.

### 11.2. Login en producción

El backend ya valida que la pestaña Candidato/Empresa coincida con el rol. Si una cuenta de empresa intenta entrar desde Candidato (o al revés), el backend responde `AUTH_WRONG_ACCOUNT_TYPE`.

Para no dejar al usuario fuera, el frontend ahora **reintenta una sola vez** en la pestaña correcta:

- cuenta de empresa en Candidato → reintenta como Empresa;
- cuenta de candidato en Empresa → reintenta como Candidato;
- si el reintento también falla, muestra el mensaje y no entra en bucle.

Esto cubre el caso más probable del fallo en producción. Si el login sigue fallando, el error ya no es la pestaña: hay que revisar el mensaje exacto (`LEGAL_VERSION_OUTDATED`, correo sin verificar, bloqueo temporal, etc.).

### 11.3. Registro: sólo consentimiento necesario

En los formularios de registro se ocultaron las casillas accesorias:

- ya no aparece “comunicaciones comerciales”;
- la casilla de cesión de derechos de imagen del candidato se conserva **opcional** (es el consentimiento de la fotografía, no marketing);
- queda **una sola casilla obligatoria**, que acepta los Términos y el Aviso de Privacidad.

El Aviso sigue dentro de la misma casilla porque la LFPDPPP exige informarlo y el backend lo valida. No se eliminó del backend: hacerlo dejaría el alta sin base legal. Si el negocio quiere separar “sólo Términos” del Aviso, es una decisión legal que hay que revisar antes de tocar el contrato.

### 11.4. Dashboard `/empresa`

Revisado con sesión real y Chrome Headless. Correcciones:

- “Vacantes con más respuesta” ya no muestra un eje vacío cuando no hay postulaciones; muestra “Aún no hay datos suficientes.”
- “Base de talento” distingue tres estados:
  - ilimitado,
  - consultas restantes,
  - “Sin consultas incluidas” si el plan no da acceso.
- La tarjeta “Tu plan” ya no dice “Se renueva automáticamente” en un plan de pago manual: muestra “Renovación manual: te avisaremos antes de vencer”. Para Stripe conserva la renovación automática.
- Se expiró el cupo de 20 consultas que quedaba de la promoción Premium retirada; ya no aparece como si fuera un beneficio del Básico.
- Sin errores de consola.

Captura: `C:\Users\sebba\AppData\Local\Temp\ij-company-dashboard-final.png`

---

## 12. Migraciones PostgreSQL → MySQL/MariaDB

La migración `BackfillPromotionCredits1720000039000` falló en MariaDB por dos construcciones de PostgreSQL:

- `COUNT(*)::int` (cast con `::`), exclusivo de PostgreSQL.
- `CAST(pfv.value AS INTEGER)` se dejó como `DECIMAL(10,0)`, que funciona en ambos motores.

Se corrigieron `1720000039000-BackfillPromotionCredits.ts` y `1720000040000-FixPromotionCreditsUsed.ts`.

**Validación real:** se creó una base MySQL 8.3 limpia y se ejecutaron **las 44 migraciones**, en orden, sin errores. Después se ejecutaron las semillas `rbac` y `plan-features` también contra MySQL, sin errores. La segunda pasada de migraciones respondió “No hay migraciones pendientes”.

Además se añadió `migrations.portability.spec.ts`: recorre todos los archivos de migración y falla si vuelve a aparecer `::`, `ILIKE`, `RETURNING`, `ON CONFLICT`, `DISTINCT ON`, `NULLS FIRST/LAST`, `jsonb` o `gen_random_uuid`.

### Paso a producción

En el servidor, después de `git pull`:

```bash
cd ~/api
source ~/nodevenv/api/22/bin/activate

pnpm install
pnpm build
pnpm migration:run:prod
pnpm seed:prod -- --only=rbac
pnpm seed:prod -- --only=plan-features
# Opcional: administrador inicial
pnpm seed:prod -- --only=admin
```

Luego **Restart** de la Node.js App. `migration:run:prod` usa el `dist/` compilado: sin `pnpm build` antes, sigue ejecutando el SQL viejo y volverá a fallar.

> La primera vez, la migración 39000 falló antes de escribir: no quedó aplicada ni a medias. Al relanzar empieza por ella con el SQL corregido.

> Los planes **no se siembran**: hay que crearlos en `/admin/planes` con los precios reales. La semilla `plan-features` sólo crea el catálogo de beneficios.

> Si el código de los planes en producción no es `BASICO`, `PREMIUM` o `EMPRESA_ANUAL`, la migración 42000 no les asignará `promotion_days` ni `promoted_vacancies`; se configura desde `/admin/planes` o se ajusta el mapa de la migración antes de correrla.

---

## 13. Footer

El pie quedó en **una sola fila de columnas**, con la columna legal incluida (ya no hay una fila aparte de enlaces legales ni la columna de descargas). En pantallas estrechas la fila se desplaza horizontalmente para no apilarse. También se actualizaron el domicilio de Guadalajara y el correo `hola@impulsojobs.mx`.

## 14. Identidad del sitio en Google

Google mostraba **“My Blog”** como nombre del sitio. El nombre no salía del código: el `<title>` de producción ya decía “Impulso Jobs”. Es un nombre heredado que Google conserva hasta que vuelve a rastrear el dominio y reinterpreta su identidad.

### 14.1. La causa real: la portada se prerenderizaba como redirección

La ruta `''` redirige a `/vacantes` (así entra el aspirante a postularse). El problema era **dónde** se hacía esa redirección: en el router. El prerender de una redirección genera un HTML de **249 bytes**:

```html
<title>Redirecting</title>
<meta http-equiv="refresh" content="0; url=/vacantes">
```

Eso era todo lo que recibía Google en `https://impulsojobs.com/`: sin título de marca, sin descripción, sin Open Graph, sin JSON-LD y sin `lang`. El nombre visible dependía por completo de la caché vieja del dominio.

Ahora la redirección es **HTTP 301**, en dos capas:

- `frontend/src/server.ts` → `app.get('/', (_req, res) => res.redirect(301, '/vacantes'))`, antes del handler de Angular. Cubre el despliegue SSR.
- `frontend/public/.htaccess` → `RewriteRule ^$ /vacantes [R=301,L]` como primera regla, más `DirectoryIndex index.csr.html` por si `AllowOverride` no permite rewrites. Cubre el despliegue estático.

Y `app.routes.server.ts` marca `''` como `RenderMode.Client` para que **no se genere** el stub. La ruta de Angular (`redirectTo: 'vacantes'`) se conserva sólo para `ng serve` y la navegación interna.

Resultado: `/` responde 301 y el rastreo llega directo a `/vacantes`, que es el HTML que trae título, descripción, canonical, `hreflang`, Open Graph y JSON-LD. `/inicio` sigue siendo la home con canonical a `/inicio`; el navbar y el breadcrumb apuntan ahí.

### 14.2. Metadatos en `frontend/src/index.html`

- `<html lang="es">`.
- `<title>Impulso Jobs | Conectando Talento y Empresas</title>`.
- `meta description` con el texto de marca: “En Impulso Jobs creemos que el capital humano correcto transforma empresas y el empleo correcto transforma vidas. Llevamos 11 años conectando talento con las mejores empresas.”
- `application-name` y `apple-mobile-web-app-title` = `Impulso Jobs`.
- `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
- JSON-LD `WebSite` con `name`, `alternateName` (`ImpulsoJobs`, `Impulso Jobs México`), `url`, `inLanguage: es-MX` y `description`.
- JSON-LD `Organization` con `@id`, logo, correo, teléfono y domicilio de Guadalajara. El `publisher` del `WebSite` apunta a ese `@id`, que es lo que permite a Google consolidar marca y entidad.

**Sin `canonical` fijo a propósito.** El mismo archivo es el cascarón CSR de `/vacantes`, `/vacantes/<id>` y `/trabajo/<landing>`; un canonical fijo a `/` habría declarado duplicadas justo las páginas que deben posicionar. El canonical por página lo pone `SeoService`. `og:url` sí va, porque las redes sociales leen el HTML sin ejecutar JavaScript.

### 14.2-bis. Redirección de entrada

`/` → `301` → `/vacantes`. Es la entrada de la plataforma: quien llega nuevo viene a postularse. En `ng serve` la hace el router de Angular; en producción, el servidor (SSR) o `.htaccess` (estático). En los tres casos el usuario termina en `/vacantes` y Google no recibe un stub vacío.

### 14.3. Título y descripción también en runtime

`app.config.ts` registra un `provideAppInitializer` que fija título, descripción, Open Graph y Twitter con los servicios nativos `Title` y `Meta` de `@angular/platform-browser`. Corre también en SSR, así que una ruta sin SEO propio (`/auth`, `/mantenimiento`) no hereda el título de la vista anterior. Las vistas que declaran SEO lo sobrescriben después con `SeoService`.

`SeoService` recorta la descripción a ~160 caracteres **cortando en un espacio** (`truncateDescription`). Antes hacía `slice(0, 160)` y partía palabras: “Llevamos 11 a”.

### 14.4. Buscadores

- `frontend/public/sitemap.xml` — nuevo. Antes `/sitemap.xml` devolvía el cascarón HTML con `Content-Type: text/html`. Lista las rutas públicas sin datos; las vacantes necesitan un sitemap generado desde la API (pendiente).
- `frontend/public/robots.txt` — ahora declara `Sitemap: https://impulsojobs.com/sitemap.xml`.

### 14.5. Servidor

El backend NestJS **no sirve el frontend**. Es una API pura en `api.impulsojobs.com` con prefijo `/api/v1`; su único estático es `/uploads` (`app.useStaticAssets` en `main.ts`). Por eso no hay ni debe haber un `ServeStaticModule` ahí: añadirlo expondría el frontend bajo el dominio de la API y chocaría con el prefijo global y CORS.

Quien sirve el HTML es:

- **Opción A (SSR, recomendada):** `frontend/src/server.ts` con `express.static(browserDistFolder, { index: false })` + `AngularNodeAppEngine`. Las rutas `RenderMode.Server` se renderizan por petición.
- **Opción B (estática):** `frontend/public/.htaccess`, que sirve `index.html` (la home) en `/` por `DirectoryIndex` y usa `index.csr.html` como fallback del resto de rutas.

En ambos casos los metadatos viajan en el HTML, no dependen de que se ejecute JavaScript.

### 14.6. Google OAuth: “Acceso bloqueado: Error de autorización”

Ese mensaje viene de Google Cloud, no de Impulso Jobs: la cuenta `sebastiantovarchavez304@gmail.com` no está autorizada para el cliente OAuth. La app está en modo **Testing** y esa cuenta falta en **Público / Audience → Usuarios de prueba**, o el tipo de usuario es **Interno**.

Revisar además, en **Credenciales → OAuth Client ID (Web)**, los orígenes JavaScript autorizados:

```
https://impulsojobs.com
https://www.impulsojobs.com
https://demo.impulsojobs.com
http://localhost:4200
```

El client ID debe coincidir en `frontend/src/environments/environment.production.ts` (`googleClientId`) y en `GOOGLE_CLIENT_ID` del `.env` del backend. Valor actual:

```
137355028824-pnrlrhge6ma3hf9rdfjbtmoqgtsn3mfe.apps.googleusercontent.com
```

No hace falta URI de redirección: el login usa Google Identity Services con popup.

### 14.7. Lo que hay que hacer fuera del código

**El nombre en Google no cambia solo con desplegar.** Requiere recrawl:

1. Verificar la propiedad de `impulsojobs.com` en Search Console (por DNS).
2. Inspeccionar URL → `https://impulsojobs.com/` → Probar URL en vivo → Solicitar indexación.
3. Repetir con `/vacantes` y `/planes`.
4. En Sitemaps, enviar `https://impulsojobs.com/sitemap.xml`.
5. Revisar Cobertura e indexación y pedir la eliminación de URLs heredadas del blog anterior.


