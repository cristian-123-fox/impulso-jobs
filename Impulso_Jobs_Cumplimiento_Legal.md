# Impulso Jobs — Cumplimiento legal

> **Fecha del análisis:** 14 de octubre de 2026.
> **Alcance:** portal público + área de empresa + back-office, con backend NestJS y
> front Angular SSR, operando en México.
>
> Este documento informa; no sustituye asesoría legal. Lo que sí hace es señalar
> qué quedó cubierto por código, qué quedó como decisión de negocio y qué está
> pendiente.

---

## 0. Lo primero: cambió la ley bajo los pies del proyecto

El repositorio estaba diseñado contra la **LFPDPPP de 2010**. Esa ley **fue
abrogada**. El transitorio Segundo del decreto del 20 de marzo de 2025 la
sustituyó por una nueva, y la número de artículos es completamente distinto: lo
que era el artículo 16 (contenido del aviso) es ahora el 15, y el artículo 15 es
ahora el 16 (modalidad del aviso). Cualquier referencia a "LFPDPPP art. X" en
`M13_Eliminar_Cuenta.md`, `Impulso_Jobs_*.md` o en el código anterior apunta a un
texto que ya no existe.

**Ordenamientos vigentes al corte:**

| Ordenamiento | Última reforma | Nota |
|---|---|---|
| LFPDPPP | **DOF 14-11-2025** | Ley nueva del DOF 20-03-2025; abrogó la de 2010 |
| LFPC | **DOF 12-12-2025** | Añadió las fracciones VIII y IX al art. 76 Bis |
| LFT | DOF 14-05-2026 | Art. 12 ¶2: las agencias de empleo no son patrones |
| LFDA | DOF 14-05-2026 | Reglamento reformado el 24-09-2026 (cap. V) |
| CCom | — | Arts. 38, 46 y 49: conservación 10 años |
| Reglamento de la LFPDPPP | DOF 21-12-2011 | **Vigencia no confirmada** — ver §7 |

---

## 1. Qué se construyó

### 1.1 Registro de consentimiento (`backend/src/modules/legal/`)

Dos tablas nuevas, migración `1720000035000-InitLegal.ts`:

- **`legal_documents`** — catálogo de versiones. El cliente declara qué versión
  mostró y la API la contrasta contra esta tabla. Si el front y el back no
  coinciden, la aceptación se rechaza con `LEGAL_DOCUMENT_VERSION_UNKNOWN` en
  lugar de guardarse sobre un texto que ya nadie puede leer.
- **`legal_consents`** — bitácora **append-only**: `documento`, `versión`,
  `concedido`, `método`, `origen`, `IP`, `user-agent`, `metadata`, `created_at`.
  No hay `UPDATE` ni `DELETE` en el repositorio. **Revocar es insertar otra
  fila** con `granted = false`.

Esa última decisión es la importante: un registro de aceptación es un hecho
pasado, y reescribirlo lo convierte en una afirmación sin respaldo. El titular
puede ver su historial completo en `GET /legal/consents`, y eso es exactamente
lo que un titular puede exigir que se le demuestre (art. 22 LFPDPPP).

**Lo que se rechaza a propósito:** `POST /legal/consents` sin sesión y sin
`subjectEmail` devuelve 400. Una aceptación sin titular al que imputarla no es
un registro, es basura con formato de evidencia.

### 1.2 Cableado en las vías de alta

| Vía | Antes | Ahora |
|---|---|---|
| `POST /auth/register` | Sin consentimiento | `legal.documents` obligatorio (`@IsDefined`); `TERMS` y `PRIVACY` con `granted: true` se validan **antes** de abrir la transacción |
| `POST /auth/google` | **Creaba cuentas sin consentimiento** y guardaba `identity.picture` | Idéntico, pero `assertLegalAcceptance()` devuelve 400 si no llega. El registro del consentimiento va **dentro de la misma transacción** que el alta |

La segunda fila era el agujero más serio del sistema: `POST /auth/google` crea
una cuenta de candidato si el correo no existe. Era una segunda puerta de alta
que esquivaba por completo el consentimiento del registro, y además almacenaba
una fotografía de Google sin que nadie la hubiera autorizado.

### 1.3 Componente de casillas (`ij-legal-consent`)

Tres casillas, no dos, y la razón importa legally:

1. **Obligatoria** — Términos + Aviso. Nunca viene marcada.
2. **Accesoria** — comunicaciones comerciales. Sin marcar.
3. **Opcional** — cesión de derechos de imagen, sólo donde hay foto.

La ley separa esas dos categorías: los Términos y el Aviso son *necesarios*
(arts. 7 y 16), y las comunicaciones comerciales son una *finalidad accesoria*
que el art. 15 fr. III obliga a distinguir y que nadie puede imponer. Presentarlas
como dos casillas iguales habría sido el defecto que esa fracción busca evitar.

**Lo que se registra también cuando se rechaza.** La casilla de marketing viaja
con `granted: false` aunque nadie la marque. Que a alguien se le ofreciera el
newsletter y lo declinara es lo que demuestra que la casilla no venía marcada por
el sistema; si sólo se guardaran las aceptaciones, esa prueba no existiría.

### 1.4 Documentos (`features/public/legal/`)

Cinco páginas HTML versionadas en español e inglés, más el aviso de derechos de
autor:

| Ruta | Documento |
|---|---|
| `/legal/aviso-de-privacidad` | Aviso integral (art. 15) + modalidad simplificada (art. 16 fr. II) |
| `/legal/terminos-y-condiciones` | Contrato de adhesión (art. 85 LFPC) |
| `/legal/politica-de-cookies` | Cookies y tecnologías de recabado automático |
| `/legal/politica-de-reembolso` | Reembolsos y cancelación |
| `/legal/cesion-de-derechos-de-imagen` | Cesión de derechos de imagen |
| `/legal/aviso-de-derechos-de-autor` | Aviso y contraaviso (arts. 114 Septies/Octies LFDA) |

Cada sección cita el artículo que la obliga. `legal-content.spec.ts` falla si
español e inglés dejan de estar emparejados: una mitad del mercado sin aviso no
es una versión menor del mismo documento, es ninguno.

Los dos PDF de `public/legal/` se eliminaron. Un PDF no se versiona, no tiene
índice navegable y no se traduce.

### 1.5 Banner de cookies y cierre de fugas

**¿Se necesita consentimiento de cookies en México?** No hay ley tipo GDPR. Pero
el **art. 14, párrafo tercero, del Reglamento de la LFPDPPP** obliga a informar
*"en ese momento"* del uso de mecanismos que *"recaban datos personales de manera
automática y simultánea al tiempo que el titular hace contacto con los mismos"*,
y a indicar *"la forma en que se podrán deshabilitar"*. Un banner es la forma
más cómoda de cumplir las dos cosas.

Lo que había antes, y qué se hizo:

| Recurso | Antes | Ahora |
|---|---|---|
| **Google Fonts** | `<link>` en `index.html`, **en cada visita**, sin preguntar | Autoalojada con `@fontsource/rubik` (SIL OFL 1.1). **Cero peticiones a terceros** |
| **Google Identity** | Script insertado sin mirar nada en `/auth/login` | Detrás de la categoría `functional`. Sin permiso, **el script no se descarga** y se explica por qué con enlace a la Política de cookies |
| **Teselas de OpenStreetMap** | Se pedían siempre en `/contacto` y en el detalle de vacante | Detrás de la categoría `functional`. Sin permiso, el mapa no inicializa y el sitio sigue igual de usable |

`ThirdPartyGateService` es la única puerta por la que sale una petición a un
tercero. Así la Política de cookies no puede quedarse corta respecto de lo que la
web hace de verdad, que es la forma habitual de que estas políticas mientan sin
querer.

### 1.6 Auditoría de imágenes y licencias

| Elemento | Veredicto | Acción |
|---|---|---|
| `logo_naranja.png` | Sin metadatos de autoría. Probablemente generado con IA (518×621, 240 KB RGBA) | ⚠️ **No registrable** como obra (art. 12 LFDA exige persona física; la SCJN resolvió en AD 6/2025 que lo hecho solo con IA no admite derechos de autor). Ver §4 |
| 3 JPEG de WhatsApp | Capturas de pantalla sin procedencia, **sin ninguna referencia en el código** | **Eliminados** |
| Atribución de OpenStreetMap | Ya existía y es correcta | Sin cambios |
| `favicon.ico` | Declarado como `type="image/png"` apuntando al PNG; el `.ico` no se usa nunca | ⚠️ Corregir (§4) |
| Simple Icons (LinkedIn, Facebook, X, IG, YouTube) | CC0 | Sin cambios |
| Logos y fotos que suben usuarios | Sin garantía de titularidad | Garantía exigida en los Términos y en el aviso de derechos de autor |

---

## 2. Lo que NO se hizo, y por qué

Estas son decisiones deliberadas, no olvidos.

### 2.1 No se añadió casilla a los formularios del back-office

El back-office lo usa personal propio de la empresa, no usuarios finales. Meter
una casilla de "acepto el aviso de privacidad" en `user-create-form` es ruido que
no protege a nadie: los datos que el admin teclea son datos de la empresa, y el
tratamiento ya tiene relación contractual. El alcance acordado fue "formularios de
datos personales".

### 2.2 No se puso un checkbox en la postulación a vacante

La casilla de consentimiento no se añadió al modal de postulación. El motivo es
que ahí no hay recabación: el candidato ya tiene cuenta, ya aceptó los Términos
al registrarse, y postularse es usar el servicio, no entregar datos nuevos. El
transfer de su perfil a la empresa sí está cubierto —por el art. 36 fr. VII de la
LFPDPPP y por el consentimiento expreso de visibilidad— y está documentado en el
aviso, sección 4.

### 2.3 `document_hash` se queda en `NULL`

La columna existe y la API la acepta, pero el front **no** calcula la huella. La
razón es práctica: `crypto.subtle` sólo existe en contexto seguro y además es
asíncrono, así que la casilla y el envío acabarían compitiendo por el mismo
estado. La evidencia que se mira en una verificación es la tríada **versión +
fecha + IP**, y las tres quedan fijadas sin coste adicional.

### 2.4 La huella del texto no se valida contra el original

La API valida `(código, versión)` contra `legal_documents`, pero **no** puede
verificar que la `contentHash` que declara el cliente corresponda al texto real,
porque el texto vive en el front. Es una limitación consciente y documentada:
detecta que dos aceptaciones no fueron sobre el mismo texto, pero no verifica
autenticidad. Para eso haría falta servir el texto desde el backend.

---

## 3. Riesgos abiertos — decisiones de negocio

### 🔴 3.1 ApexCharts puede requerir licencia de pago

**Esto no lo detectó el análisis automático y hay que revisarlo hoy.**

`node_modules/apexcharts/LICENSE` dice que ApexCharts es de **doble licencia**:
Community (gratis) **sólo** para individuals, non-profits, educators y empresas
con **menos de USD 2 millones de ingresos anuales**, y **prohibido** expresamente
*"Embedding in a product or platform used by other people, which needs the OEM
License below"*.

Impulso Jobs **es** una plataforma usada por otras personas: los gráficos aparecen
en los paneles de empresa y de candidato, o sea usuarios que no son nosotros. Eso
cae de lleno en la definición de lo que la Community License prohíbe.

**Dos condiciones que hay que cumplir:**
1. Ingresos anuales < USD 2 M.
2. O bien no se trata como plataforma para terceros y se acepta el riesgo.

Si alguna falla, hay que comprar la licencia. El diagnóstico automatizado inicial
decía "MIT" y era **incorrecto** — el `LICENSE` del paquete dice otra cosa.

### 🔴 3.2 CKEditor 5 es GPL-2.0-or-later con licencia dual

`node_modules/ckeditor5/LICENSE.md` confirma doble licencia GPL-2.0-or-later /
comercial de CKSource. La GPL 2 sólo se activa por distribución, y usar el editor
como SaaS normalmente no es distribución. Pero:

- Se usa en `vacancy-wizard-page` (el editor se sirve al navegador).
- Si alguien modifica el build de CKEditor y lo sirve a usuarios remotos, la
  obligación de ofrecer el código fuente correspondiente se puede alegar.
- **Recomendación:** comprar la licencia comercial, o sustituirlo por Quill
  (BSD-3) o TinyMCE (MIT). El contenido que crean los usuarios (descripciones de
  vacante) no es obra derivada protegida.

### 🟡 3.3 OpenStreetMap puede cortar el acceso

El Tile Usage Policy advierte que **para servicios comerciales el acceso puede
retirarse**, y exige un `User-Agent` y `Referer` válidos. Impulso Jobs es un
producto de pago. La atribución visible ya estaba bien, pero la dependencia de un
servicio comunitario para un producto comercial es un riesgo de disponibilidad.
Evaluar un proveedor de teselas comercial o autoalojar.

### 🟡 3.4 La entidad legal es `[PENDIENTE]`

**Esto bloquea la publicación comercial.** El art. 15 fr. I de la LFPDPPP exige
identificar al responsable y su domicilio; el art. 128 de la LFPC impone multas
de hasta $4.27 M MXN por no informar los datos del proveedor antes de una venta.

Todo está en `frontend/src/app/shared/catalogs/legal.catalogs.ts`:

```ts
export const LEGAL_IDENTITY: LegalIdentity = {
  legalName: PENDING_TOKEN,              // razón social
  rfc: PENDING_TOKEN,
  fiscalAddress: PENDING_TOKEN,
  operatingAddress: PENDING_TOKEN,
  dataProtectionContact: PENDING_TOKEN,  // el art. 29 exige designar a alguien
  consumerPhone: PENDING_TOKEN,
  consumerEmail: PENDING_TOKEN,
};
```

`brand.catalogs.ts` tiene el mismo `TODO(negocio)` con **datos de muestra**
("Av. Paseo de la Reforma 296, +52 55"). Mientras siga así, el aviso se imprime
con marcadores y la página muestra un aviso en rojo que lo dice.

### 🟡 3.5 El formulario de contacto y el newsletter no tienen backend

No hay endpoint. El mensaje de contacto no sale a ninguna parte y el alta de
newsletter tampoco. Aun así **se puso la casilla y se registra la aceptación**,
porque el correo se pide igual y el art. 16 obliga a dar el aviso en el punto de
recabado. Que no exista el envío no exime del aviso.

---

## 4. Pendientes técnicos

| # | Qué | Dónde | Prioridad |
|---|---|---|---|
| 1 | Corregir `<link rel="icon" type="image/png">` — el `.ico` nunca se usa | `src/index.html:8` | Baja |
| 2 | Documentar la procedencia del logo y asumir que no es registrable | `public/assets/images/logos/` | Media |
| 3 | Implementar el panel ARCO en "Mi cuenta" (el backend ya tiene `data-export` y `DELETE /account`; **no hay UI**) | `features/account/` | Media |
| 3b | **Hecho:** pantalla de consulta del registro en el back-office | `/admin/legal` + `GET /admin/legal-consents` | — |
| 4 | Migración real del refund: existe `PaymentStatus.REFUNDED` pero **no hay use-case, endpoint ni permiso de reembolso** | `modules/billing/` | Media |
| 5 | Renovar `M13_Eliminar_Cuenta.md` y el resto de la documentación a la LFPDPPP de 2025 | raíz del repo | Media |
| 6 | Aviso 5 días naturales antes de cada renovación (art. 76 Bis fr. VIII LFPC) | `modules/billing/notifications` | Media |
| 7 | Emisión de CFDI 4.0 por cada cobro (CFF art. 29) | `modules/billing` | Alta |
| 8 | Lint del repo: hay **25 errores de typecheck preexistentes**, todos en specs con `jest.Mocked<T>` desactualizados | `backend/**/*.spec.ts` | Media |

---

## 5. Obligaciones que la ley impone y el producto aún no cumple

Estas no son opcionales y no están cubiertas:

1. **Aviso de renovación ≥5 días naturales** (art. 76 Bis fr. VIII LFPC) — la
   tabla `subscription_notices` existe pero no hay nada que la escriba con el
   aviso al usuario.
2. **Cancelación inmediata sin penalización** (art. 76 Bis fr. IX **añadido el
   DOF 12-12-2025**) — `DELETE company/subscriptions/renewal` existe, pero falta
   comprobar que el flujo sea realmente de dos pasos y sin fricción.
3. **Consentimiento expreso al cobro recurrente** (misma fracción) — la casilla
   del checkout debe ser **no preseleccionada**. No verificado.
4. **Información precontractual completa** (art. 7 BIS y 76 Bis fr. III LFPC):
   razón social, domicilio, RFC, teléfono y correo de reclamaciones **antes del
   pago**, con el monto total incluyendo impuestos.
5. **CFDI por cada cobro** (CFF art. 29; el IVA de una suscripción a empresas
  plataformas no está exento, art. 15 LIVA).
6. **NOM-035-STPS-2018 y NOM-030-STPS-2009** si hay empleados: aplican a todos
   los centros de trabajo, incluidos los remotos.

---

## 6. Lo que sí está alineado

- **No hay patrón.** El art. 12 ¶2 de la LFT dice que las agencias de empleo o
  intermediarios no son patrones: ese carácter es de quien se beneficia del
  servicio. Impulso Jobs no tiene relación laboral con los candidatos.
- **Retención de 10 años** para registros mercantiles, contratos y comprobantes
  (CCom arts. 38, 46, 49).
- **Eliminación a 72 meses** del incumplimiento de obligaciones contractuales
  (art. 10 ¶3 LFPDPPP) — `purge-accounts.ts` ya lo tiene parametrizado.
- **Derechos ARCO**: acceso, rectificación, cancelación y oposición existen en
  backend (`GET /account/data-export`, `PUT /account/profile`, `DELETE /account`,
  visibilidad del perfil).
- **Transferencias**: documentadas las dos únicas (empresa que contrata, y
  persona encargada). No hay transferencias fuera de México.
- **Sin tratamiento automatizado con efectos jurídicos**, y así se declara en el
  aviso (§3). El art. 26 fr. II de la LFPDPPP da derecho a oponerse, y la forma
  más limpia de respetarlo es no hacerlo.
- **Confidencialidad y seguridad** (arts. 18, 19, 20): bcrypt, tokens revocables,
  RBAC en el backend, ownership validado en use-case, bitácora de auditoría.
  Falta el **aviso de vulneración** del art. 19, que es un proceso, no un endpoint.
- **Tipografías y mapas autoalojados / con consentimiento**, sin fugas.
- **No se usan datos sensibles** del art. 2 fr. VI: ni salud, ni origen étnico,
  ni creencias, ni orientación sexual. La fotografía sí se trata con casilla
  separada.

---

## 7. Lo que no se pudo confirmar

- **Vigencia del Reglamento de la LFPDPPP de 2011.** El artículo 14 ¶3 (que
  obliga al banner) es de ese Reglamento, emitido bajo la ley abrogada. Existe la
  definición de "Reglamento" en el art. 2 fr. XIII de la ley nueva, lo que implica
  que habrá uno nuevo, pero **no se localizó publicado**. **Verificar en el DOF
  antes de considerar cerrado el asunto de cookies.**
- **El artículo 7 Bis** (consentimiento expreso e inequívoco, y una ampliación del
  derecho de oposición) fue aprobado por el Senado en marzo de 2026 como
  **proyecto de decreto**. No consta en DOF al corte. Si se promulga, habría que
  revisar los textos.
- **Régimen fiscal de Stripe México** y si aplica retención de IVA/ISR sobre lo
  que se le paga.
- **Trámite ante la STPS para agencias de empleo privadas.** No se confirmó que
  exista.
- **NOM de comercio electrónico** del art. 76 Bis 1 LFPC. Sólo se halló el
  proyecto `PROY-NMX-COE-001-SCFI-2018`. El artículo es autoejecutable, así que
  se cumplen sus siete puntos directamente.
- **Si la fotografía de perfil califica como dato sensible** bajo la LFPDPPP. No
  hay criterio publicado. La ley la trata como dato personal con consentimiento
  expreso y separado, que es más fuerte que el tácito —posición conservadora y
  defendible.
- **Constitución de la SCJN en AD 2808/2025** sobre la constitucionalidad del
  art. 87 LFDA. Incertidumbre real sobre derechos de imagen.

---

## 8. Cómo mantener esto

### Cambiar un documento

1. Editar `features/public/legal/content/legal-content.{es,en}.ts`.
2. Subir la versión en `LEGAL_DOCUMENTS` (`legal.catalogs.ts`).
3. Crear una migración que marque la versión nueva como `is_current` y pase la
   anterior a `false`.

Si sólo se hace el paso 2 o el 3, la API devuelve
`LEGAL_DOCUMENT_VERSION_UNKNOWN` y el registro de consentimiento se rechaza.
Comportamiento correcto, pero corta el alta de cuentas: haz los tres en el mismo
commit.

### Quitar un tercero

Todo sale por `ThirdPartyGateService`. Si añades un recurso nuevo, tiene que
pasar por ahí **y** añadirse a `COOKIES`, o la Política de cookies se quedará
corta respecto de lo que la web hace.

### Cambiar el responsable

Todo sale de `LEGAL_IDENTITY`. No hay ningún otro archivo que tocar.