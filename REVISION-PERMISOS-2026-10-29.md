# Revisión de permisos y checklist de entrega — 29 de octubre de 2026

**Alcance:** RBAC del backend (guards, catálogo, seed, migraciones), guards y navegación del frontend, verificación contra la base local y contra el entorno `demo.impulsojobs.com` / `api.impulsojobs.com`.
**Objetivo:** dejar la plataforma lista para la prueba con el cliente del **sábado 31 de octubre**.

> **Leyenda de estado:** ✅ **LISTO** · 🟠 **PARCIAL** (código/listo, falta desplegar o un dato) · 🕓 **PENDIENTE** · 📝 **DOCUMENTADO**.
> **Última actualización:** 6-nov-2026. El detalle de lo cerrado está en la sección “Actualización — 6 de noviembre de 2026”.

---

## Actualización — 6 de noviembre de 2026

Esta revisión se hizo el 29-oct. Al 6-nov se corrigieron en código:

| Hallazgo | Estado |
|---|---|
| 4.3 `seed:prod` reseteaba el admin | ✅ Corregido: una cuenta existente **conserva** su contraseña; cambiarla exige `SEED_ADMIN_RESET_PASSWORD=true` + `SEED_ADMIN_PASSWORD`. En producción, crear el admin sin contraseña **falla** en vez de usar `Admin123`. |
| 4.5 Sin endpoint para refrescar la caché | ✅ `POST /api/v1/permissions/refresh` (ADMIN + `permissions.assign`). |
| P2 `CreateRoleUseCase` no invalidaba la caché | ✅ Invalida al crear un rol. |
| P2 `AssignUserRoleUseCase` aceptaba roles de sistema/empresa | ✅ Rechaza ambos y renueva `tokensValidFrom` al asignar. |
| P2 `SetUserRolesUseCase` aceptaba roles de empresa | ✅ Rechaza roles con `companyId`. |
| 4.11 Documento de roles desactualizado | ✅ Matriz actualizada: `roles.delete`, `saved_vacancies.manage`, `account.profile_manage`, `legal.consents.read` y `notifications.read` como implementado. |

Siguen pendientes (no son de código, requieren decisión/datos o servidor):

| Hallazgo | Por qué sigue abierto |
|---|---|
| 4.1 CIF/PDFs públicos | Build y ZIP listos; falta desplegar en cPanel y poner el repo privado / purgar el historial. |
| 4.2 Plan `ANUAL` con datos de prueba | Decisión comercial (nombre, descripción y beneficios). Se corrige en `/admin/planes`. |
| 4.4 Frontend de demo viejo | Falta desplegar el build nuevo (`demo-browser-2026-11-06.zip`). |
| 4.6 e2e de ownership | Requiere fixtures de empresa/vacante/postulación y BD sembrada; pendiente de implementar. |
| 4.7 CV de talento sin cupo | Decisión de producto: consumir cupo también al descargar CV o documentar la excepción. |
| 4.8 Roles de plataforma aditivos | Limitación de producto: no existe un rol de plataforma restringido. |
| 4.9 Navegación admin sin filtro por permiso | UX; el backend sigue frenando con 403. |
| 4.10 Permisos sin endpoint/pantalla | `catalogs.manage` y `audit.read` no tienen pantalla; `applications.answers.read`, etc. no existen. |
| P2 caché por proceso | Documentado: con varios workers hay que llamar a refresh en cada uno. |
| P2 documentos sin commitear | `REVISION-*.md` siguen fuera de Git (decisión). |

---

## 1. Veredicto

El sistema de permisos está **bien construido y probado**. No encontré un fallo de código que impida la demo:

- 46 permisos exigidos por guards, **todos concedidos** a algún rol.
- 51 permisos en la base local, **0 usuarios huérfanos** de rol.
- Guard por permiso + rol de plataforma + ownership en el caso de uso.
- Roles personalizados de empresa con techo en `EMPLOYER` y aislamiento por empresa.
- Pruebas unitarias y e2e de RBAC en verde.

Los riesgos reales para el sábado **no son de permisos, son de despliegue y datos**:

1. 🟠 **El CIF con datos fiscales sigue público** en `demo.impulsojobs.com` (HTTP 200) y en el historial de un repositorio **público** de GitHub. **Build y ZIP listos; falta desplegar y poner el repo privado.**
2. 🕓 **El catálogo de planes de producción sigue con datos de prueba**: plan `ANUAL` llamado “anual”, descripción “fghfghfghfgy” y beneficios que el código no entrega. **Decisión comercial; se corrige en `/admin/planes`.**
3. 🟠 **El frontend de demo es un build viejo**: sirve los PDF retirados y la portada sigue siendo el stub de 249 bytes, no el 301. **Build nuevo listo; falta subirlo.**
4. ✅ **`pnpm seed:prod` sin argumentos resetea la contraseña del administrador** a `Admin123`. **Corregido el 6-nov:** una cuenta existente conserva su contraseña y en producción crear el admin exige `SEED_ADMIN_PASSWORD`.
5. 🕓 **El e2e de autorización/ownership solo cubre roles**; no hay pruebas negativas de applications, billing ni talent. **Pendiente de implementar.**

---

## 2. Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| `backend: pnpm build` | ✅ |
| `backend: pnpm test` | ✅ **573 tests / 69 suites** |
| `backend: pnpm test:e2e -- roles.e2e-spec.ts` | ✅ **7 tests** (incluye 403 negativos) |
| `frontend: pnpm build` (SSR + prerender) | ✅ (solo warnings de presupuesto de CKEditor) |
| `frontend: ng test --watch=false` | ✅ **108 tests** |
| Base local: permisos | **51**, todos con componente/acción válidos |
| Base local: códigos exigidos por guards | **46**, todos concedidos a al menos un rol |
| Base local: usuarios sin fila en `user_roles` | **0** |
| Migraciones locales | **44** archivos; la última es `AddPromotionSubscriptionOrigin` |
| Demo: `/api/v1/plans` | ⚠️ plan `ANUAL` con datos de prueba |
| Demo: PDFs legales | 🔴 los 3 responden **200** |
| Demo: `/` | ⚠️ **200** con 249 bytes (stub de redirección), no 301 |
| Demo: aviso de privacidad | ✅ versión **1.1.0**, fecha 2026-10-28, RFC, teléfono y `hola@impulsojobs.mx` |
| Demo: API | ✅ expone los endpoints nuevos (`/auth/google`, suscripciones admin, promociones, notificaciones, legal, CV de talento) |
| **Actualización 6-nov:** `backend: pnpm test` | ✅ **574 tests / 69 suites** |
| **Actualización 6-nov:** `backend: pnpm build` | ✅ |
| **Actualización 6-nov:** regresión del build frontend | ✅ `pnpm build` limpio (sin PDFs, sin `index.html`, 301 verificado) |

> La base local está sembrada y coherente. **No se pudo consultar la base de producción**; las comprobaciones de producción son contra la API y el sitio públicos.

---

## 3. Cómo está implementado (y por qué es sólido)

| Pieza | Dónde | Qué hace |
|---|---|---|
| `PermissionsGuard` | `backend/src/modules/iam/permissions/guards/permissions.guard.ts` | Exige `@RequirePermissions('component.action')`; responde 403 `PERMISSION_DENIED`. |
| `RolesGuard` | `.../guards/roles.guard.ts` | Cierra `/admin/**`: exige rol de plataforma `ADMIN`. Sin él, un `EMPLOYER` con `companies.read` podría entrar al back-office. |
| Catálogo de permisos | `.../catalogs/permission-catalog.ts` | Etiqueta, grupo, ámbito y **`SCOPE_BASELINE`** (lo que todo rol tiene por código). |
| `PermissionsService` | `.../services/permissions.service.ts` | Cachea `rol → permisos`; invalida al mutar roles. **Un rol de empresa nunca supera a `EMPLOYER`.** |
| Seed RBAC | `backend/src/database/seed-rbac.ts` | 51 permisos, 3 roles base y su matriz. Idempotente y actualizador. |
| Roles de empresa | `backend/src/modules/companies/use-cases/company-roles.use-case.ts` | La empresa crea perfiles propios; solo puede repartir permisos que `EMPLOYER` ya tiene. |
| Miembros de empresa | `.../company-members.use-case.ts` | El rol de acceso **reemplaza** a `EMPLOYER` en `user_roles` (no se suma). `OWNER`/`ADMIN` conservan acceso completo. |
| Guardado del árbol | `.../roles/use-cases/replace-role-permissions.use-case.ts` | Guardado en lote, valida ámbito, ignora permisos base y blinda al `ADMIN` de sistema. |
| Pruebas de coherencia | `backend/src/database/permission-codes.spec.ts` y `guards-di.spec.ts` | Atan guard ↔ catálogo ↔ seed ↔ migración, y detectan módulos sin `PermissionsModule`. |
| Frontend | `core/guards/auth.guard.ts`, `layout/company-layout`, `shared/permissions/permission-tree.ts` | `roleGuard` por área, navegación de empresa filtrada por permiso y árbol de permisos con búsqueda y “siempre activo”. El backend sigue siendo la autoridad. |

**Regla que se cumple:** el frontend oculta/enruta; el backend autoriza **permiso + rol + propiedad del recurso**. Un `EMPLOYER` que llama a `/candidate/applications` recibe 403; un `CANDIDATE` que llama a `/company/applications` recibe 404.

---

## 4. Hallazgos

### 🔴 P0 — Bloquean la entrega si no se corrigen

#### 4.1. El CIF y los PDF antiguos siguen públicos — 🟠 PARCIAL

> **Estado 6-nov-2026:** build y ZIP listos; la demo sigue sirviendo los PDFs hasta desplegar.

Comprobado hoy contra el entorno de demo:

```
200  172 KB  https://demo.impulsojobs.com/legal/CIF%20CHRISTIAN-8.pdf
200  281 KB  https://demo.impulsojobs.com/legal/politica-privacidad.pdf
200  334 KB  https://demo.impulsojobs.com/legal/terminos-condiciones.pdf
```

Además, el CIF está en el historial del repositorio **público** `github.com/cristian-123-fox/impulso-jobs` (commits `37ec5d9` y `dee68ee`). Borrarlo del árbol actual no lo borra del historial.

**Qué hacer, en este orden:**

1. **Hacer privado el repositorio ahora** (GitHub → Settings → Danger Zone → Change visibility). Es la mitigación más rápida.
2. En el servidor, **borrar los tres PDF del `dist`** (no solo del repo). El deploy actual no elimina archivos que ya no existen en el build:
   ```bash
   find ~/demo -path '*dist*legal*' -name '*.pdf' -print
   # revisar la ruta real del subdominio y borrar CIF, politica-privacidad y terminos-condiciones
   ```
3. **Publicar el frontend con `dist` limpio**: borrar `frontend/dist` antes de compilar y reemplazar el directorio en el servidor (no hacer merge encima).
4. Verificar que las tres URLs devuelvan **404**.
5. Purgar el historial de Git (`git filter-repo` o `filter-branch`) y `force push`, o mantener el repo privado de forma permanente. Pedir a GitHub la purga de la caché del objeto.
6. Asumir que el RFC/CURP/domicilio estuvieron expuestos: valorar aviso interno y revisión de indexación en buscadores.

#### 4.2. Catálogo de planes con datos de prueba y beneficios no entregados — 🕓 PENDIENTE (decisión comercial)

La API pública de demo devuelve hoy:

- `ANUAL` → nombre **“anual”**, descripción **“fghfghfghfgy”**, total $2,320.
- Beneficios marcados que **el código no aplica a una suscripción**: `featured_ranking`, `urgent_confidential_badge`, `social_media_distribution`, `ai_candidate_matching`, `ai_job_creation`, `publication_days=-1`.
- `ESENCIAL` → no incluye `promoted_vacancies` pero sí `promotion_days=7` (configuración muerta).

**Qué hacer antes de enseñar la plataforma:**

1. En `/admin/planes`, corregir nombre y descripción del plan anual.
2. **Quitar** del plan los beneficios que no se entregan, o implementarlos. Lo que se anuncie y no se dé es riesgo LFPC.
3. Decidir si `ESENCIAL` incluye promociones: si sí, añadir `promoted_vacancies`; si no, quitar `promotion_days`.
4. Verificar `GET /api/v1/plans` y `/planes` después del cambio.

#### 4.3. `pnpm seed:prod` resetea la contraseña del administrador — ✅ LISTO (código, commit `74123df`)

`backend/src/database/seed.ts` corre por defecto `rbac`, `applications`, `plan-features` y **`admin`**. **Antes**, `seed-admin.ts` hacía:

```ts
user.passwordHash = hashPassword(SEED_ADMIN_PASSWORD ?? 'Admin123');
```

Es decir, `pnpm seed:prod` sin variables dejaba al administrador con `Admin123`.

**✅ Corregido el 6-nov (commit `74123df`):**
- Si el administrador **ya existe**, se conserva su contraseña. Sólo se cambia con `SEED_ADMIN_RESET_PASSWORD=true` **y** `SEED_ADMIN_PASSWORD`.
- Si no existe y `NODE_ENV=production`, crear el admin **exige** `SEED_ADMIN_PASSWORD` (no cae a `Admin123`).
- Si no existe en desarrollo, usa `Admin123` y avisa por consola.

**Comando seguro para permisos y catálogos:**

```bash
pnpm seed:prod -- --only=rbac,applications,plan-features
# o, si se quiere todo menos el admin:
pnpm seed:prod -- --skip=admin
```

Si de verdad se quiere cambiar la contraseña del admin:

```bash
SEED_ADMIN_PASSWORD='...' SEED_ADMIN_RESET_PASSWORD=true pnpm seed:prod -- --only=admin
```

> La instrucción de “correr `pnpm seed` para que las cuentas de demo queden con la constancia 1.1.0” tampoco es exacta: sin `--demo` las cuentas demo no se tocan, y con `--demo` en producción exige `--force` y **resetea sus contraseñas**. Como el login ya no obliga a re-consentir (§11.1 de `REVISION-ENTREGA`), no es necesario para la demo.

#### 4.4. El frontend de demo es un build viejo — 🟠 PARCIAL

- `/` responde **200 con 249 bytes** (el stub `<title>Redirecting</title>`), no el 301 de la última versión.
- Los PDF retirados siguen sirviéndose.
- `Last-Modified` del sitio: 28 oct 20:27; el último commit es del 28 oct 22:34.

**Qué hacer:** recompilar y **publicar con `dist` limpio**, no solo copiar archivos encima. Eso resuelve a la vez los PDFs y el 301.

### 🟠 P1 — Corregir antes del sábado si hay tiempo

#### 4.5. No hay endpoint para refrescar la caché de permisos — ✅ LISTO (código)

Tras `seed` o tras editar permisos por SQL, el proceso en marcha seguía usando el mapa viejo hasta reiniciarse.

**✅ Implementado el 6-nov:** `POST /api/v1/permissions/refresh` (rol `ADMIN` + permiso `permissions.assign`) invalida la caché del proceso. Con varios workers hay que llamarlo en cada uno o reiniciar la app completa.

#### 4.6. El e2e de permisos solo cubre roles — 🕓 PENDIENTE

`backend/test/` tiene e2e de auth, registro, reset, verificación y roles. **No hay e2e de applications, billing, talent ni ownership.** AGENTS.md lo exige para applications y billing. Mínimo recomendado:

| Caso | Esperado |
|---|---|
| CANDIDATE `POST /candidate/applications` | 201 |
| EMPLOYER `POST /candidate/applications` | 403 |
| CANDIDATE `GET /company/applications` | 404 |
| EMPLOYER `GET /admin/users` | 403 |
| EMPLOYER `GET /company/applications` de otra empresa | 404/403 |
| Sin token `GET /company/applications` | 401 |

#### 4.7. El CV de la base de talento no consume cupo — 🕓 PENDIENTE (decisión)

`GET /company/candidates/:id/resumes/:resumeId` comprueba permiso, visibilidad y pertenencia, pero **no consume ni exige visitas** (decisión explícita de T30). En la práctica el `resumeId` se conoce tras abrir la ficha (que sí cobra), pero llamando en frío una empresa sin plan puede leer un CV público. Es una fuga de entitlement, no de autenticación. Decidir antes de la demo si se corrige (`this.quota.consume(...)` ya está señalado en el JSDoc).

#### 4.8. Los roles personalizados de plataforma son solo aditivos — 🕓 PENDIENTE (producto)

En `/admin/usuarios` los “roles adicionales” solo se ofrecen a cuentas con rol base `ADMIN` y **suman** permisos; no permiten crear un administrador limitado. Si el cliente prueba “creo un rol de soporte y se lo asigno a un usuario de soporte”, no va a restringir nada. Es una limitación de producto: explicarla o cambiarla post-entrega.

#### 4.9. Navegación y rutas no siempre reflejan el permiso — 🕓 PENDIENTE (UX)

- El riel de **empresa** sí filtra por permiso (`company-layout.ts`).
- El riel de **admin** no filtra: todas las secciones se ven aunque un permiso se haya retirado; la página dará 403.
- Las rutas de empresa solo tienen `roleGuard`, no un guard por permiso: entrar por URL directa a una sección sin permiso muestra el error del backend.

No es un fallo de seguridad (el backend frena), pero es UX a pulir.

#### 4.10. Permisos sembrados sin endpoint/pantalla — 🕓 PENDIENTE

- `catalogs.manage`: no hay CRUD de catálogos (son constantes).
- `audit.read`: no hay endpoint ni pantalla de auditoría.
- `applications.answers.read` y `applications.contact.read` **no existen** como permisos: las respuestas de filtrado se sirven con `applications.read` y el contacto de los postulados va incluido en `applications.read`.
- `vacancy_questions.manage` **no existe**: el cuestionario se edita con `vacancies.update`.

Si el cliente pregunta por “auditoría” o “catálogos” en el back-office, hoy no están.

#### 4.11. El documento de roles está desactualizado — ✅ LISTO

**✅ Actualizado el 6-nov:** `Impulso_Jobs_Roles_y_Permisos.md` ya incluye `roles.delete`, `saved_vacancies.manage`, `account.profile_manage` y `legal.consents.read`; `notifications.read` está marcado como implementado; y los permisos que no existen (`ai.*`, `invoices.read`, `applications.answers.read`, `applications.contact.read`, `vacancy_questions.manage`) quedan marcados `🕓` con una nota de con qué permiso se cubren hoy.

### 🟡 P2 — Deuda menor (2 de 5 cerrados, 2 documentados)

- ✅ **Cerrado 6-nov:** `CreateRoleUseCase` invalida la caché al crear un rol de plataforma.
- ✅ **Cerrado 6-nov:** `AssignUserRoleUseCase` rechaza roles de sistema y de empresa, y renueva `tokensValidFrom`. `SetUserRolesUseCase` también rechaza roles de empresa.
- 📝 **Documentado:** la caché sigue siendo por proceso. Con varios workers hay que llamar a `POST /permissions/refresh` en cada uno o reiniciar la app completa.
- 🕓 **Pendiente:** `REVISION-ENTREGA.md` y `REVISION-PERMISOS-2026-10-29.md` siguen sin commitear. No se subieron a propósito mientras el repo sea público (el primero contiene RFC/CURP).
- ✅ **Verificado 6-nov:** el frontend tiene **108 tests**, todos en verde. La diferencia con 111 es histórica, no un fallo actual.

---

## 5. Checklist para el sábado

> ✅ hecho · 🟠 hecho en local, falta servidor · 🕓 pendiente.

### 5.1. Antes de tocar el servidor

- [ ] Hacer privado el repositorio de GitHub. **(responsable del repo)**
- [ ] Commitear `REVISION-ENTREGA.md` y este documento (o decidir que no se despliegan). **🕓 No se commitearon: el repo sigue público y el primero contiene RFC/CURP.**
- [ ] Respaldar base de datos y `uploads/` del servidor.
- [ ] Confirmar con el cliente si la entrega es **demo con Stripe en modo prueba** o cobro real.

### 5.2. Backend

> ✅ **Código listo y probado** (commit `74123df`): **574 tests / 69 suites** y `pnpm build` en verde. Los pasos de abajo son del servidor.

```bash
cd ~/api
source ~/nodevenv/api/22/bin/activate
git pull
pnpm install
pnpm build
pnpm migration:run:prod
pnpm seed:prod -- --only=rbac,applications,plan-features
# El seeder del admin ya no resetea la contraseña existente.
# Para cambiarla: SEED_ADMIN_PASSWORD='...' SEED_ADMIN_RESET_PASSWORD=true pnpm seed:prod -- --only=admin
```

- [ ] Reiniciar la **Node.js App** después del seed (la caché de permisos vive en memoria). **Alternativa: `POST /api/v1/permissions/refresh`.**
- [ ] Verificar en la base de producción:
  ```sql
  SELECT COUNT(*) FROM permissions;                    -- esperado: 51
  SELECT r.code, COUNT(*) FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id GROUP BY r.code; -- ADMIN/EMPLOYER/CANDIDATE
  SELECT u.email FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
   WHERE ur.user_id IS NULL AND u.deleted_at IS NULL;  -- esperado: 0 filas
  ```
- [ ] Verificar `.env`: `NODE_ENV=production`, `APP_WEB_URL`, `APP_PUBLIC_URL`, `CORS_ORIGIN`, `SMTP_*`, `MAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

### 5.3. Frontend

> 🟠 **Build local listo**: `pnpm build` termina limpio (sin PDFs, sin `index.html` raíz, con 301 en `.htaccess` y `server.mjs`). ZIP: `demo-browser-2026-11-06.zip`. Falta subirlo a la demo.

```bash
cd ~/demo   # ruta real del subdominio
# 1) respaldar
cp -a . ~/backups/demo-$(date +%F-%H%M) 2>/dev/null || true
# 2) borrar los archivos que el build nuevo ya no contiene
rm -f index.html
rm -f "legal/CIF CHRISTIAN-8.pdf" legal/politica-privacidad.pdf legal/terminos-condiciones.pdf
# 3) subir el ZIP y extraerlo aquí (incluye .htaccess e index.csr.html)
```

- [ ] `https://demo.impulsojobs.com/` → **301** a `/vacantes`.
- [ ] `.../legal/CIF%20CHRISTIAN-8.pdf` → **404**.
- [ ] `.../legal/politica-privacidad.pdf` → **404**.
- [ ] `.../legal/terminos-condiciones.pdf` → **404**.
- [ ] Aviso de privacidad: versión 1.1.0, 2026-10-28, RFC, domicilio, teléfono, `hola@impulsojobs.mx`, sin botón “Descargar PDF”.
- [ ] Footer: domicilio de Guadalajara y correo correcto.
- [ ] Registro: una sola casilla obligatoria, sin premarcar; login con pestañas Candidato/Empresa.

### 5.4. Datos

> 🕓 Depende de la decisión comercial y de la cuenta admin.

- [ ] `/admin/planes`: corregir `ANUAL` (nombre, descripción, beneficios no entregados) y revisar `ESENCIAL`.
- [ ] `/planes` público muestra solo planes reales y sin texto de prueba.
- [ ] Cuentas de demo verificadas (candidato, empresa, admin) y con contraseña conocida.
- [ ] Al menos una empresa con plan activo, una vacante publicada y una postulación para poder demostrar el flujo completo.
- [ ] Revisar vacantes/empresas con datos de prueba visibles en el portal.

### 5.5. Stripe

> 🟠 La `sk_test_` nueva ya está en el `.env` local (cuenta `acct_1UYqED...`, MX/MXN). Falta el `whsec_` y activar la cuenta (hoy `charges_enabled=false`).

- [ ] Dashboard → Developers → Webhooks: `https://api.impulsojobs.com/api/v1/payments/stripe/webhook`, modo prueba, eventos:
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `customer.subscription.deleted`.
- [ ] Promoción con `4242 4242 4242 4242` → activa al instante.
- [ ] Promoción con OXXO → `AWAITING_PAYMENT`; el webhook la activa.
- [ ] Suscripción anual con tarjeta → activa y guarda `provider_subscription_id`.
- [ ] Cancelar renovación → `cancel_at_period_end` y `autoRenew=false`.
- [ ] Checkout abandonado → `checkout.session.expired` libera la reserva.
- [ ] Webhook duplicado → 200 sin duplicar activación.
- [ ] `GET /api/v1/payments/options` devuelve `stripe` con `CARD, MSI, OXXO` y `recurringMethods: [CARD]`.
- [ ] Decir al cliente que, en modo prueba, **no se cobra dinero real**.

### 5.6. Correo y cron

- [ ] Probar registro, verificación y recuperación de contraseña con un correo real.
- [ ] Confirmar que el buzón `hola@impulsojobs.mx` recibe y responde (ARCO).
- [ ] Cron diario activo:
  ```bash
  0 6 * * *  ... pnpm run billing:expire:prod
  15 6 * * * ... pnpm run vacancies:expire:prod
  30 6 * * * ... pnpm run views:consolidate:prod
  ```
- [ ] Los avisos de renovación (30/7/1 días) dependen de `billing:expire` y del SMTP.

### 5.7. Google

- [x] El client ID coincide en `frontend/src/environments/environment.production.ts` y `GOOGLE_CLIENT_ID` del backend. **(actualizado 6-nov; también en `environment.ts` y `backend/.env`)**
- [ ] Orígenes autorizados: `https://impulsojobs.com`, `https://www.impulsojobs.com`, `https://demo.impulsojobs.com`, `http://localhost:4200`.
- [ ] Si la app OAuth sigue en **Testing**, añadir a los usuarios de prueba o publicarla.

### 5.8. Legal / operación

> 🕓 Pendiente de decisión y operación.

- [ ] Confirmar quién emite CFDI a solicitud (PAC/contador) y cómo se registra el UUID.
- [ ] Confirmar quién procesa reembolsos desde Stripe y cómo se anota en `/admin/pagos`.
- [ ] Documentar el cauce de baja para cuentas Google (por correo).
- [ ] La purga de cuentas **no borra los PDF de CV ni fotos/logos** del disco: decidir si se corrige antes o se documenta como manual.

---

## 6. Guion de prueba de permisos (15–20 min con el cliente)

### 6.1. Administrador

1. Entrar a `/admin` con la cuenta admin.
2. `/admin/roles` → abrir `EMPLOYER` → ver el árbol por grupos y los permisos “Siempre activo”.
3. Crear un rol de plataforma de prueba, marcar/desmarcar un grupo, guardar y recargar: los cambios persisten.
4. Intentar quitar `users.read`, `roles.read` o `permissions.assign` al rol `ADMIN`: deben estar bloqueados.
5. `/admin/usuarios` → asignar el rol adicional a una cuenta `ADMIN` y comprobar que suma permisos (no restringe).
6. `/admin/empresas/:id` → sección “Plan”: asignar/cambiar/retirar un plan y ver la auditoría.
7. `/admin/legal` → consultar consentimientos (versión 1.1.0).

### 6.2. Empresa

1. Entrar a `/empresa`.
2. `/empresa/usuarios` → crear un rol de empresa, por ejemplo “Reclutador junior”, con:
   `vacancies.read`, `applications.read`, `applications.status.update`; **sin** `promotions.read` ni `company_users.manage`.
3. Añadir un miembro con ese rol de acceso.
4. Cerrar sesión y entrar con el miembro:
   - El riel **oculta** “Promociona tus vacantes” y “Usuarios de la empresa”.
   - Puede ver vacantes y mover postulaciones.
   - Si entra por URL directa a `/empresa/promociones`, el backend responde 403.
5. Volver al `OWNER`: sigue teniendo acceso completo y no puede quedarse sin `OWNER`.
6. Intentar `GET /api/v1/admin/users` con el token de empresa → **403**.
7. Intentar `GET /api/v1/company/applications` de otra empresa → **404/403**.

### 6.3. Candidato

1. Registrarse o entrar como candidato.
2. Postularse a una vacante → **201**.
3. “Mis postulaciones” y “Guardadas” funcionan sin 403 (T29).
4. Intentar `POST /api/v1/candidate/applications` con token de empresa → **403**.
5. Intentar abrir `/admin` o `/empresa` → redirección por `roleGuard`.

### 6.4. Sin sesión

- `GET /api/v1/auth/me` → **401**.
- `GET /api/v1/company/applications` → **401**.
- `GET /api/v1/plans` y `GET /api/v1/vacancies` → **200** (públicos).

---

## 7. Pendiente post-entrega (no bloquea el sábado)

> ✅ **Cerrados en código el 6-nov:** 4.3, 4.5 y los P2 de roles. Lo que sigue en esta tabla es trabajo post-entrega o requiere decisión.

| Tema | Estado |
|---|---|
| CFDI automático (PAC) | ❌ No integrado; “a solicitud” y manual. |
| Reembolsos automatizados | ❌ No hay endpoint ni `charge.refunded`; se hacen en Stripe. |
| `invoice.payment_failed` / `customer.subscription.updated` / `charge.refunded` | ❌ No manejados. |
| Vale de OXXO guardado | ❌ El adaptador devuelve `voucher: null`. |
| Reconciliación automática | ❌ Solo botón manual en `/admin/pagos`. |
| Purga de archivos (CV/fotos/logos) | ❌ `purge-accounts` no borra archivos. |
| Auditoría en back-office | ❌ Sin endpoint/pantalla. |
| Catálogos administrables | ❌ Son constantes. |
| e2e de ownership en applications/billing/talent | ❌ Pendiente. |
| T17 (ocultar vacante, seguir empresa, alertas) | 🔄 Fase 1 hecha; resto pendiente. |
| T28 (i18n de áreas privadas y correos) | ⬜ Pendiente. |
| T31 (campos nuevos del formulario de usuarios) | 🔄 Parcial (N11). |
| IA y difusión en redes | ⬜ Pendientes. |
| Licencia comercial de CKEditor 5 | ⚠️ Hoy usa `licenseKey: 'GPL'`; un producto comercial necesita licencia. |

---

## 8. Anexo: matriz real vs documento de roles

**Permisos que existen y el documento no menciona:** ✅ **Resuelto 6-nov** — la matriz ya incluye `roles.delete`, `saved_vacancies.manage`, `account.profile_manage` y `legal.consents.read`.

**Permisos que el documento menciona y no existen:** 📝 **Aclarado 6-nov** — la matriz los marca `🕓` y hay una nota que explica con qué permiso se cubren hoy. No son un fallo del documento: son objetivo de producto.

**Permisos que el documento marca como pendientes y ya se usan:** ✅ **Resuelto 6-nov** — `notifications.read` ya está marcado `✅`; `saved_vacancies.manage` y `legal.consents.read` ya están en la matriz.

**Permisos sembrados sin endpoint que los exija (correcto hoy):** 📝 **Nota añadida 6-nov** — se documentó que `catalogs.manage` y `audit.read` no tienen endpoint/pantalla (los catálogos son constantes y la auditoría no tiene consulta en el back-office).

---

*Revisión hecha el 2026-10-29 contra el árbol de trabajo, la base local y los entornos públicos de demo/API. Los conteos de producción deben confirmarse en el servidor antes del sábado.*
