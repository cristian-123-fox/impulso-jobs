# Impulso Jobs — Candidatos de México, Colombia, Estados Unidos y Canadá

> **Plan de trabajo para entregar a un desarrollador.** Describe todo lo que hay que tocar para que un aspirante de **MX, CO, US o CA** pueda registrarse y mantener su perfil con **su indicativo telefónico** y **su tipo de documento**, sin romper nada de lo que ya funciona en México.
>
> **Escrito el 2026-09-18** contra el estado real del repo (rama `main`, commit `63c9c85`). Las rutas de archivo y los hallazgos de la § 2 están **verificados en el código**, no supuestos.
>
> Léase **después** de [AGENTS.md](AGENTS.md) (spec autoritativa) y [CLAUDE.md](CLAUDE.md) (divergencias y comandos). Este documento **extiende** a [Impulso_Jobs_Localizacion_Mexico.md](Impulso_Jobs_Localizacion_Mexico.md): México sigue siendo el mercado de operación (moneda, facturación, IVA, empresas y vacantes). Lo que se abre es **quién puede postularse**, no dónde opera el negocio.

---

## 1. Resumen ejecutivo

**Lo que pide el negocio:** que en los formularios de aspirante aparezca el **indicativo del país para el teléfono** y que el aspirante pueda **elegir su tipo de documento** según su país. Cuatro países: **México, Colombia, Estados Unidos y Canadá**.

**Lo que eso implica de verdad** (y es más de lo que parece a primera vista):

1. El teléfono hoy es **mexicano por construcción**: se valida con `+52` y 10 dígitos, en un único sitio (`normalizeMxPhone`). Hay que sustituirlo por un normalizador por país y **guardar el país junto al número** — porque `+1` es a la vez Estados Unidos y Canadá y **no se puede distinguir por el prefijo**.
2. El documento hoy es un **enum plano con valores mexicanos** (`CURP`, `RFC`, `INE`, `Pasaporte`) y un **índice único global sobre el número**. Con cuatro países, el número de documento sólo es único **dentro de su país y tipo**.
3. **El bloqueo real está en la ubicación, no en el teléfono.** El campo `state` del aspirante está validado con `@IsIn(MX_STATE_CODES)`. **Un colombiano no puede registrarse hoy aunque se arregle todo lo demás**, porque el formulario le obliga a elegir un estado mexicano. Sin resolver esto, la tarea no entrega valor.
4. Hay **tres defectos ya existentes** que esta tarea destapa y debe arreglar de paso (§ 2.5). Uno de ellos —el teléfono del registro **no se guarda nunca**— haría que el campo nuevo pareciera funcionar y no guardara nada.

**Volumen estimado:** ~13 archivos nuevos y ~30 modificados, 1 migración, 2 suites de tests nuevas y 6 existentes a actualizar. **Entre 5 y 8 días** de una persona que ya conozca el repo; **10–12** si es su primera tarea aquí.

**Fuera de alcance, y es deliberado** (§ 11): las **empresas y las vacantes siguen siendo mexicanas** (RFC, C.P. de 5 dígitos, régimen SAT, estados MX, landings SEO `/trabajo/<área>-en-<estado>`). Moneda MXN, IVA 16 % y facturación CFDI **no se tocan**. Lo que se internacionaliza es **el aspirante**.

---

## 2. Estado actual verificado

### 2.1. Teléfono

| Dónde | Cómo está hoy |
|---|---|
| `backend/src/common/utils/mx-identifiers.ts:16` | `MX_PHONE_REGEX = /^\+52\d{10}$/` |
| `backend/src/common/utils/mx-identifiers.ts:23` | `normalizeMxPhone()` — único normalizador que existe |
| `backend/src/modules/companies/use-cases/company-profile.use-case.ts:222` | **único consumidor** de `normalizeMxPhone`. El teléfono de la empresa sí se normaliza a E.164 |
| `candidate_profiles.phone` `varchar(20)` | Añadida en `1720000026000`. **Nunca se normaliza**: entra tal y como la teclean |
| `users.phone` `varchar(20)` | Añadida en `1720000028000`. Tampoco se normaliza |
| `companies.phone_number` `varchar(20)` | Sí normalizada (vía el use-case) |

**Conclusión:** en la base de datos conviven hoy **teléfonos en E.164** (empresas) y **teléfonos en crudo** (`3312345678`, `33 1234 5678`, `(33) 1234-5678`…) en `candidate_profiles` y `users`. La migración tiene que contar con eso.

### 2.2. Documento

- `backend/src/modules/candidates/enums/document-type.enum.ts` — enum de 4 valores mexicanos. El valor almacenado de pasaporte es la cadena **`'Pasaporte'`**, en español y con mayúscula inicial (no un código).
- `candidate_profiles.document_type` `varchar(20)` · `document_number` `varchar(40)`.
- **`uq_candidate_profiles_document_number` es único sobre `document_number` a secas** (`1720000004000-InitCompaniesCandidates.ts:173`). Global, sin país ni tipo.
- `ICandidateProfileRepository.existsByDocumentNumber(number)` — mismo criterio. Consumido en `register.use-case.ts:165` y `create-user.use-case.ts:254`.
- **No hay columna de país del documento.** `candidate_profiles.country` existe (`varchar(60) DEFAULT 'MX'`) pero es el país de residencia, no el emisor del documento — y no siempre coinciden.

### 2.3. Ubicación

`@IsIn([...MX_STATE_CODES])` aparece en **9 sitios**:

| Archivo | Ocurrencias | ¿Entra en esta tarea? |
|---|---|---|
| `modules/iam/registration/dto/register-candidate.dto.ts:74` | 1 | **Sí** |
| `modules/iam/users/dto/update-user.dto.ts:76` | 1 (sólo `@ApiPropertyOptional`, sin `@IsIn` — ver D3 bis) | **Sí** |
| `modules/talent/dto/candidate-search.dto.ts:31` | 1 | **Sí** |
| `modules/iam/registration/dto/register-company.dto.ts:70` | 1 | No — empresa MX |
| `modules/companies/dto/company-profile.dto.ts:85` | 1 | No — empresa MX |
| `modules/companies/dto/admin-company.dto.ts:57,116,192` | 3 | No — empresa MX |
| `modules/vacancies/dto/vacancy.dto.ts:88,230` | 2 | No — vacante MX |

Y en el frontend, `features/candidate/components/candidate-profile/candidate-profile.ts:548` construye el desplegable de estados desde `MX_STATES`.

### 2.4. Formularios afectados

| Formulario | Teléfono | Documento | País |
|---|---|---|---|
| Registro de aspirante (`register-candidate-page.ts`) | ❌ **no existe el campo** | ✔ tipo + número | 🔒 `'MX'` **quemado** en el submit (línea 346) |
| Perfil del aspirante (`candidate-profile.ts`) | ❌ no existe | 🔒 sólo lectura (línea 194) | ⚠️ `ij-input` de **texto libre** con `maxLength(2)` |
| Mi cuenta (`account-identity-form.ts`) | ✔ texto libre | — | — |
| Alta de usuario admin (`user-create-form.ts`) | ✔ texto libre, placeholder `3312345678` | ✔ | — |
| Edición de usuario admin (`user-edit-form.ts`) | ✔ texto libre | ✔ | — |
| Perfil de empresa (`company-profile.ts`) | ✔ texto libre | — | — |
| Empresa desde el back-office (`company-edit-form.ts`) | ✔ texto libre | — | — |
| Contacto público (`contact-form-section.ts`) | ✔ texto libre | — | — |

### 2.5. Defectos ya existentes que esta tarea destapa

Los tres son reales y hay que arreglarlos **dentro** de esta tarea; si no, el resultado parecerá funcionar y no funcionará.

- **D1 · El teléfono del registro nunca se guarda.** `RegisterCandidateDto` acepta `phone` y `register.use-case.ts` construye el `CandidateProfile` **sin asignar `profile.phone`** (compárese con `documentType`, `curp`, `country`… en las líneas 224–230). Añadir el campo al formulario sin arreglar esto da un campo que se rellena y se pierde.
- **D2 · El aspirante no puede editar su propio teléfono.** `UpdateCandidateProfileDto` (`modules/candidates/dto/candidate-profile.dto.ts`) **no tiene `phone`**. El único que puede tocarlo es el administrador desde `/admin/usuarios`.
- **D3 · `country` se valida de dos formas incompatibles.** En el registro es `@MaxLength(60)` (cabe `"Colombia"`); en la edición del perfil es `@Length(2,2)` (sólo cabe `"CO"`). Un aspirante registrado con el nombre largo del país **no puede guardar su perfil después**: falla la validación en un campo que él no ve. Hay que fijar **ISO 3166-1 alpha-2** en los dos sitios.
- **D3 bis · `UpdateCandidateProfileDto` del back-office no valida el estado.** En `update-user.dto.ts:76` el `state` lleva `@ApiPropertyOptional({ enum: MX_STATE_CODES })` pero el validador es `@IsString()` a secas: la documentación promete una lista cerrada que el código no comprueba. Al tocar el archivo, ciérrese con el validador nuevo de subdivisión.

---

## 3. Decisiones de diseño

Están tomadas. Si el implementador quiere cambiar alguna, que lo hable antes: varias se sostienen unas a otras.

### D-1 · El teléfono se guarda en E.164 **y** con su país en columna aparte

- `phone` → `+523312345678` (E.164, sin espacios ni signos). `varchar(20)` sobra: E.164 son 15 dígitos como máximo más el `+`.
- `phone_country` → `varchar(2)`, ISO 3166-1 alpha-2 (`MX`, `CO`, `US`, `CA`).

**Por qué la segunda columna, si el `+52` ya va dentro del número:** porque **`+1` es Estados Unidos y Canadá a la vez**. Distinguirlos exige la tabla de códigos de área del NANP (más de 300 entradas que cambian con el tiempo). Dos caracteres en la tabla eliminan el problema para siempre y hacen que el formulario pueda repintarse exactamente como lo dejó el usuario.

**No** se guarda el número nacional por separado: es derivable del E.164 y del país, y duplicarlo abre la puerta a que los dos se desincronicen.

### D-2 · Códigos de documento con prefijo de país, salvo el pasaporte

| Código | Etiqueta | País | Formato |
|---|---|---|---|
| `MX_CURP` | CURP | MX | 18, patrón oficial (ya existe `CURP_REGEX`) |
| `MX_RFC` | RFC | MX | 12 o 13 (ya existe `RFC_REGEX`) |
| `MX_INE` | Clave de elector (INE) | MX | 18 alfanuméricos |
| `CO_CC` | Cédula de ciudadanía | CO | 6–10 dígitos |
| `CO_CE` | Cédula de extranjería | CO | 6–7 dígitos |
| `CO_PPT` | Permiso por Protección Temporal | CO | 7–9 dígitos |
| `US_DL` | Driver's License / State ID | US | 4–20 alfanuméricos |
| `CA_DL` | Driver's Licence / Provincial ID | CA | 4–20 alfanuméricos |
| `PASSPORT` | Pasaporte | *(los cuatro)* | 5–20 alfanuméricos |

**Por qué con prefijo:** la lista de `@IsIn` es plana y explícita, y evita que un mismo código signifique cosas distintas según el país. El pasaporte va sin prefijo a propósito: es **el mismo documento** en los cuatro, y el país emisor ya viaja en `document_country`.

**⚠️ Ni SSN ni SIN.** Para Estados Unidos y Canadá **no se ofrece** el número de seguridad social. En Canadá, la guía de la oficina del Privacy Commissioner bajo PIPEDA desaconseja expresamente pedir el SIN a un candidato **antes de contratarlo**; en Estados Unidos el SSN es el identificador de mayor riesgo de robo de identidad y guardarlo obliga a controles que esta plataforma no tiene. Licencia de conducir y pasaporte cubren el caso de uso real (identificar a la persona) sin ese riesgo. **Esta decisión no se revierte sin pasar por el negocio y por una revisión de seguridad.**

### D-3 · La unicidad del documento pasa a ser `(document_country, document_type, document_number)`

Un pasaporte `AB123456` mexicano y uno colombiano son personas distintas. El índice global de hoy los tomaría por la misma.

El índice nuevo es **más laxo** que el actual, así que **no puede fallar por duplicados preexistentes** al crearlo. Es el sentido seguro del cambio.

### D-4 · La subdivisión se guarda **sin** el prefijo de país, y **nunca se interpreta sin él**

Se conserva el formato de hoy (`JAL`, no `MX-JAL`) para no migrar las filas mexicanas existentes. El país ya está en `country`.

**⚠️ Los códigos de subdivisión NO son únicos entre países.** Verificado, hay dos colisiones reales entre los cuatro países del alcance:

- **`GUA`** → Guanajuato (MX) **y** Guainía (CO)
- **`DC`** → District of Columbia (US) **y** Bogotá D.C. (CO)

Toda función que traduzca código → nombre **debe recibir el país**. En particular `stateBySlug()` y `stateSlugOf()` de `frontend/src/app/shared/utils/seo.ts` buscan hoy sólo en `MX_STATES`: siguen siendo correctas porque las landings son de vacantes (mexicanas), pero **no sirven para pintar la ubicación de un aspirante**. Hace falta un `subdivisionName(country, code)`.

### D-5 · `ij-phone-input`: un control nuevo del UI Kit, con valor de objeto

Selector `ij-phone-input`, en `frontend/src/app/shared/ui/phone-input/`, sobre `IjControlBase<IjPhoneValue>` como el resto del kit.

```ts
export interface IjPhoneValue {
  /** ISO 3166-1 alpha-2 del país elegido. */
  country: CountryCode;
  /** Número nacional tal y como se teclea (sólo dígitos). */
  national: string;
  /** E.164 (`+523312345678`) o null si `national` aún no es válido. */
  e164: string | null;
}
```

**Por qué un objeto y no la cadena E.164 a secas:** con la cadena, `writeValue('+14155550123')` no podría saber si pintar «Estados Unidos» o «Canadá» (D-1). El objeto va y vuelve sin pérdida.

Para que las páginas no repitan el mapeo, en `shared/utils/phone.ts`:

```ts
toPhonePayload(v: IjPhoneValue | null): { phone: string | null; phoneCountry: string | null }
fromPhonePayload(phone: string | null, phoneCountry: string | null, fallback: CountryCode): IjPhoneValue
```

Cada formulario queda en una línea por dirección.

**Construcción del control:** se reutiliza lo que ya existe, sin hojas de estilo nuevas — `ijControlClass()` para la caja de 42 px, `IJ_PANEL` / `IJ_SEARCH` / `ijOptionClass()` / `IJ_OVERLAY_POSITIONS` para el desplegable con overlay del CDK, igual que `ij-select`. El disparador del país va **dentro** de la misma caja, a la izquierda, separado por un borde vertical.

**⚠️ Nada de banderas emoji.** Chrome sobre Windows no trae el tipo de letra de banderas regionales y pinta las dos letras del país en su lugar: el equipo desarrolla en Windows y vería un resultado distinto al de producción. Se muestra **`MX +52`** como texto, que además es lo que la gente busca. Si más adelante se quieren banderas, que sea un sprite SVG, nunca un `<img>` por país ni `[innerHTML]` sobre un `<svg>` (ver la nota de SSR en la memoria del proyecto).

### D-6 · Un único algoritmo de normalización, y que no adivine

```
1. Deja sólo dígitos.                         "+52 (33) 1234-5678" -> "523312345678"
2. Si empieza por "00", quítalo.              (prefijo internacional)
3. Si length == longitudNacional(país)  -> ése es el número nacional.
4. Si empieza por dialCode(país) Y length == dialCode.length + longitudNacional
                                        -> quita el dialCode.
5. En cualquier otro caso -> null (inválido).
6. Devuelve "+" + dialCode + nacional.
```

**El paso 4 comprueba la longitud resultante antes de recortar, y eso importa.** El `normalizeMxPhone` de hoy hace `.replace(/^\+?52/, '')` a ciegas: mutila cualquier número nacional que empiece por `52`. El algoritmo nuevo sólo recorta si lo que queda encaja exacto.

Longitudes nacionales: **MX 10 · CO 10 · US 10 · CA 10**. Coinciden hoy, pero la función las lee del catálogo, no las asume.

### D-7 · La validación vive en el backend; el frontend sólo adelanta el mensaje

El backend es la autoridad. El frontend replica los mismos patrones para dar respuesta inmediata, **exactamente como ya se hace** con `mx-identifiers.ts` / `mx-identifiers.validator.ts`. Los dos ficheros de reglas se escriben a la vez y se dejan enlazados por comentario, como los existentes.

### D-8 · Catálogos como constantes embebidas, sin librerías nuevas

Ni `libphonenumber-js` ni equivalentes. Razones:

- El proyecto ya resuelve los catálogos así (`common/catalogs/` ↔ `shared/catalogs/`), y meter una librería rompería la simetría de un lado y sólo de uno.
- `libphonenumber-js` ronda los ~145 KB comprimidos en su variante mínima, para un portal público con SSR y presupuestos de tamaño ya ajustados por CKEditor.
- Para **cuatro** países con reglas de longitud fija, el catálogo escrito a mano cabe en una pantalla y es auditable.

Si algún día el alcance pasa de ~10 países, esta decisión se revisa. **Dejar ese comentario en el propio fichero del catálogo**, no sólo aquí.

### D-9 · Los nombres de país y las etiquetas de documento **sí** se traducen; las subdivisiones **no**

La regla del proyecto (T26) es que los catálogos no se traducen. Se hace una excepción acotada: son 4 nombres de país y 9 etiquetas de documento, es interfaz pura, y en inglés «México» debe decir «Mexico». Las 129 subdivisiones se quedan en su idioma oficial — igual que hoy los estados mexicanos.

Claves bajo el espacio `enums` que ya existe: `enums.country.MX`, `enums.documentType.MX_CURP`, …

### D-10 · La empresa se queda en México, pero estrena el control

`companies.phone_number` pasa por el normalizador nuevo con el país **fijado a `MX`**, y el formulario usa `ij-phone-input` con el selector de país **deshabilitado**. Así hay un solo camino de teléfono en todo el producto, sin abrir la puerta a empresas no mexicanas (que arrastrarían RFC, C.P., régimen SAT y CFDI).

---

## 4. Catálogos nuevos

### 4.1. Países

| ISO | Nombre (es) | Nombre (en) | Indicativo | Dígitos nacionales | Ejemplo E.164 |
|---|---|---|---|---|---|
| `MX` | México | Mexico | `52` | 10 | `+525512345678` |
| `CO` | Colombia | Colombia | `57` | 10 | `+573101234567` |
| `US` | Estados Unidos | United States | `1` | 10 | `+14155550123` |
| `CA` | Canadá | Canada | `1` | 10 | `+16045550123` |

Orden en el desplegable: **MX primero** (mercado principal), luego CO, US, CA. País por defecto en todos los formularios: **MX**.

### 4.2. Subdivisiones

- **MX — 32 estados.** Ya existen en `common/catalogs/mx-states.ts` y `shared/catalogs/mx.catalogs.ts`. **No se copian ni se reescriben**: el catálogo nuevo los importa, para que sigan teniendo un único origen.
- **CO — 33** (32 departamentos + Bogotá D.C.), ISO 3166-2:CO:
  `AMA` Amazonas · `ANT` Antioquia · `ARA` Arauca · `ATL` Atlántico · `BOL` Bolívar · `BOY` Boyacá · `CAL` Caldas · `CAQ` Caquetá · `CAS` Casanare · `CAU` Cauca · `CES` Cesar · `CHO` Chocó · `COR` Córdoba · `CUN` Cundinamarca · `DC` Bogotá D.C. · `GUA` Guainía · `GUV` Guaviare · `HUI` Huila · `LAG` La Guajira · `MAG` Magdalena · `MET` Meta · `NAR` Nariño · `NSA` Norte de Santander · `PUT` Putumayo · `QUI` Quindío · `RIS` Risaralda · `SAN` Santander · `SAP` San Andrés, Providencia y Santa Catalina · `SUC` Sucre · `TOL` Tolima · `VAC` Valle del Cauca · `VAU` Vaupés · `VID` Vichada
- **US — 51** (50 estados + District of Columbia), códigos postales de 2 letras: `AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY`
- **CA — 13** (10 provincias + 3 territorios): `AB` Alberta · `BC` British Columbia · `MB` Manitoba · `NB` New Brunswick · `NL` Newfoundland and Labrador · `NS` Nova Scotia · `NT` Northwest Territories · `NU` Nunavut · `ON` Ontario · `PE` Prince Edward Island · `QC` Quebec · `SK` Saskatchewan · `YT` Yukon

Todos los códigos son de 3 caracteres o menos, así que **`state varchar(10)` no necesita cambiar**.

### 4.3. Etiqueta del segundo nivel territorial

No es lo mismo en los cuatro países y el formulario debe decirlo bien. Va en el catálogo, con clave de traducción:

| País | Subdivisión | Segundo nivel |
|---|---|---|
| MX | Estado | Municipio / Alcaldía |
| CO | Departamento | Municipio |
| US | State | City |
| CA | Province / Territory | City |

La columna sigue llamándose `municipality` (renombrarla no aporta y arrastra migración); **lo que cambia es la etiqueta visible**.

---

## 5. Backend

### 5.1. Archivos nuevos

| Archivo | Contenido |
|---|---|
| `backend/src/common/catalogs/countries.ts` | `SUPPORTED_COUNTRIES`, tipo `CountryCode`, `COUNTRY_CODES`, `countryByCode()`, `isSupportedCountry()` |
| `backend/src/common/catalogs/country-subdivisions.ts` | `SUBDIVISIONS_BY_COUNTRY` (importa `MX_STATES` del fichero existente), `subdivisionsOf(country)`, `isValidSubdivision(country, code)`, `subdivisionName(country, code)` |
| `backend/src/common/catalogs/identity-documents.ts` | `IDENTITY_DOCUMENTS` (los 9 de D-2), `documentsOf(country)`, `isDocumentAllowedIn(country, type)` |
| `backend/src/common/utils/phone.util.ts` | `normalizePhone(country, raw): string \| null` (algoritmo D-6), `formatPhone(country, e164): string`, `PHONE_MAX_LENGTH` |
| `backend/src/common/utils/phone.util.spec.ts` | Tests — § 9 |
| `backend/src/common/utils/identity-document.util.ts` | `normalizeDocumentNumber(type, raw)`, `isValidDocumentNumber(country, type, number)` |
| `backend/src/common/utils/identity-document.util.spec.ts` | Tests — § 9 |
| `backend/src/common/decorators/is-phone.decorator.ts` *(opcional)* | Decorador de clase-validador que normaliza antes de validar, en la línea de `@RichText` |

### 5.2. Archivos modificados

**Comunes**

- `common/utils/mx-identifiers.ts` — **se queda con RFC, CURP y C.P.** (siguen siendo mexicanos y los usan empresa y vacante). `MX_PHONE_REGEX` y `normalizeMxPhone` **se eliminan**, y su único consumidor (`company-profile.use-case.ts:222`) pasa a `normalizePhone('MX', …)`. Dejar borrado, no `@deprecated`: si se queda, alguien lo reusará.
- `common/catalogs/mx-states.ts` — sin cambios de contenido. Lo importa `country-subdivisions.ts`.
- `common/types/error-code.enum.ts` — añadir `INVALID_PHONE`, `INVALID_DOCUMENT_NUMBER`, `UNSUPPORTED_COUNTRY`, `INVALID_SUBDIVISION`. **`COMPANY_INVALID_PHONE` se conserva**: el frontend de empresa ya conmuta sobre él y romper ese contrato es gratuito de evitar.

**Candidatos**

- `modules/candidates/enums/document-type.enum.ts` — el enum pasa a los 9 códigos de D-2. **Ojo: es un cambio de contrato** (§ 6.2 migra los datos).
- `modules/candidates/entities/candidate-profile.entity.ts` — columnas nuevas `documentCountry` (`document_country`, `varchar(2)`, no nulo) y `phoneCountry` (`phone_country`, `varchar(2)`, nulo). Cambiar el `@Index` único de `document_number` por el compuesto de D-3.
- `modules/candidates/dto/candidate-profile.dto.ts` — en `UpdateCandidateProfileDto`: `country` pasa a `@IsIn(COUNTRY_CODES)`; `state` estrena validación cruzada con el país; **añadir `phone` y `phoneCountry`** (defecto D2).
- `modules/candidates/use-cases/candidate-profile.use-case.ts` — normalizar el teléfono al guardar y validar que la subdivisión pertenece al país.
- `modules/candidates/repositories/candidate-profile.repository.interface.ts` **y** `.repository.ts` — `existsByDocumentNumber(number)` → `existsByDocument(country, type, number)`.

**IAM**

- `modules/iam/registration/dto/register-candidate.dto.ts` — `country` obligatorio y `@IsIn(COUNTRY_CODES)`; `documentCountry`; `documentType` contra `documentsOf(country)`; `state` validado contra el país; `phone` + `phoneCountry`. **El validador cruzado país↔subdivisión↔documento se escribe como un validador de clase** (`@ValidatorConstraint` a nivel de DTO), no como tres `@IsIn` sueltos: la regla depende de otro campo.
- `modules/iam/registration/use-cases/register.use-case.ts` — **asignar `profile.phone` y `profile.phoneCountry`** (defecto D1), `profile.documentCountry`, y usar `existsByDocument(...)`.
- `modules/iam/users/entities/user.entity.ts` — columna `phoneCountry` (`phone_country`, `varchar(2)`, nulo).
- `modules/iam/users/dto/create-user.dto.ts` · `update-user.dto.ts` · `user-response.dto.ts` — mismos campos; cerrar además D3 bis.
- `modules/iam/users/use-cases/create-user.use-case.ts` · `update-user.use-case.ts` — normalizar teléfono, usar `existsByDocument(...)`.
- `modules/iam/account/dto/account-profile.dto.ts` — `phoneCountry` en `AccountProfileDto`, en `toAccountProfile()` y en `UpdateAccountProfileDto`.
- `modules/iam/account/use-cases/update-account-profile.use-case.ts` — normalizar.
- `modules/iam/session/…` (`GET /auth/me`) — **revisar si expone teléfono**; si lo hace, añadir el país. Si no, no tocar.

**Empresas** (sólo para unificar el camino del teléfono, D-10)

- `modules/companies/use-cases/company-profile.use-case.ts:222` — `resolvePhone()` pasa a `normalizePhone('MX', value)`. Mensaje y `errorCode` iguales.
- `modules/companies/entities/company.entity.ts` — `phoneCountry` **opcional**. Si se prefiere no añadirla, documentar que la empresa siempre es MX y que el formulario fija el país; el plan la incluye por uniformidad y porque cuesta una línea.

**Talento** (si no se toca, las empresas dejan de ver a los aspirantes no mexicanos)

- `modules/talent/dto/candidate-search.dto.ts:31` — el filtro `state` deja de ser `@IsIn(MX_STATE_CODES)`; se añade un filtro `country` opcional y el `state` se valida contra él.
- `modules/talent/dto/candidate-search-response.dto.ts` — exponer `country` junto a `state` (líneas 113 y 147): sin él, la empresa lee «GUA» y no sabe si es Guanajuato o Guainía. **Ésta es la consecuencia práctica de la colisión de D-4.**

### 5.3. Cómo se valida la combinación país + subdivisión + documento

Son reglas **cruzadas entre campos**, así que no caben en un `@IsIn` por campo. Un validador de clase sobre el DTO, con tres comprobaciones y tres mensajes distintos:

| Comprobación | Código de error | Mensaje |
|---|---|---|
| `country` ∈ `COUNTRY_CODES` | `UNSUPPORTED_COUNTRY` | «El país no está disponible.» |
| `isValidSubdivision(country, state)` | `INVALID_SUBDIVISION` | «El estado/departamento no corresponde al país.» |
| `isDocumentAllowedIn(documentCountry, documentType)` | `INVALID_DOCUMENT_NUMBER` | «Ese tipo de documento no aplica al país seleccionado.» |
| `isValidDocumentNumber(...)` | `INVALID_DOCUMENT_NUMBER` | «El número de documento no tiene el formato esperado.» |

**El backend no puede fiarse de que el frontend filtró la lista.** Un `POST` a mano con `country: 'CO'` y `documentType: 'MX_CURP'` tiene que ser rechazado en el servidor.

---

## 6. Base de datos

### 6.1. Numeración

El último fichero del directorio es `1720000030000-RepairMojibakeText.ts`. **El hueco libre es `1720000031000`.** Antes de crearlo, **volver a mirar el directorio**: los timestamps son correlativos a mano y dos ramas se llevan el mismo hueco con facilidad (ya pasó entre T25 y T22).

Nombre sugerido: `1720000031000-InitMultiCountryCandidate.ts`.

### 6.2. Qué hace la migración, en este orden

1. **`ALTER TABLE candidate_profiles`** — añadir `document_country varchar(2) NOT NULL DEFAULT 'MX'` y `phone_country varchar(2) NULL`.
2. **`ALTER TABLE users`** — añadir `phone_country varchar(2) NULL`.
3. **`ALTER TABLE companies`** — añadir `phone_country varchar(2) NULL` (si se acepta D-10).
4. **Remapeo de `document_type`** — cuatro `UPDATE` acotados, con los valores como **parámetros** y no como literales (misma cautela de `1720000030000`, por el historial de codificación):

   | Valor viejo | Valor nuevo |
   |---|---|
   | `CURP` | `MX_CURP` |
   | `RFC` | `MX_RFC` |
   | `INE` | `MX_INE` |
   | `Pasaporte` | `PASSPORT` |

5. **Backfill de `phone_country`** — `'MX'` **sólo donde el teléfono no es nulo ni vacío**, en las tres tablas. Dejar `NULL` donde no hay teléfono: un país de teléfono sin teléfono es ruido.
6. **Normalización de los teléfonos ya guardados** — `candidate_profiles.phone` y `users.phone` nunca pasaron por un normalizador (§ 2.1). La migración los pasa a E.164 mexicano.
   **⚠️ Hágase con un script de migración en TypeScript, no con SQL puro**, y **que no falle sobre datos malos**: lo que no encaje en 10 dígitos se **deja como está** y se escribe en el log con su `id`. Una migración que aborta a mitad por una fila con `"n/a"` en el teléfono deja el despliegue roto; una que salta esa fila deja un dato a corregir en la siguiente edición del perfil. Lo segundo es recuperable, lo primero no.
7. **Índice único** — eliminar `uq_candidate_profiles_document_number` y crear `uq_candidate_profiles_document` sobre `(document_country, document_type, document_number)`.

### 6.3. `down()`

Reversible salvo en un punto: **la normalización de teléfonos del paso 6 no se deshace** (no se guarda el valor anterior). Escribirlo en el `down()` como comentario, con el motivo — es el mismo criterio de `1720000030000`. Todo lo demás sí se revierte: quitar columnas, remapear los cuatro valores al revés y restaurar el índice antiguo.

**⚠️ Restaurar el índice antiguo puede fallar** si entretanto entraron dos documentos con el mismo número en países distintos. Es correcto que falle —son datos que el esquema viejo no admite— pero el `down()` debe decirlo con un mensaje claro en vez de soltar el error críptico del driver.

### 6.4. Portabilidad MySQL / PostgreSQL

El esquema tiene que valer en los dos (`DB_TYPE`). Usar la API de `QueryRunner` (`addColumns`, `createIndex`, `dropIndex`) y, para los `UPDATE` de datos, `createParameter` — **nunca identificadores entrecomillados a mano**: `"tabla"` revienta en MySQL con `ER_PARSE_ERROR 1064`. El patrón está en `migrations/helpers/seed-data.helper.ts`.

### 6.5. Semillas

**Ninguna.** Los catálogos de esta tarea son constantes en el código, como los de México — no hay filas que sembrar ni permisos nuevos que conceder. Tampoco hay que re-ejecutar `seed:rbac`.

---

## 7. Frontend

### 7.1. Archivos nuevos

| Archivo | Contenido |
|---|---|
| `shared/catalogs/countries.catalogs.ts` | Espejo de los tres catálogos del backend (§ 4). **Mismo contenido, misma forma.** |
| `shared/ui/phone-input/phone-input.ts` | `IjPhoneInput` + `IjPhoneValue` (D-5) |
| `shared/utils/phone.ts` | `normalizePhone`, `formatPhone`, `toPhonePayload`, `fromPhonePayload` |
| `shared/validators/phone.validator.ts` | `phoneValidator(country)` → `{ phone: true }` |
| `shared/validators/identity-document.validator.ts` | `documentNumberValidator(country, type)` → `{ documentNumber: true }` |

### 7.2. Archivos modificados

| Archivo | Qué cambia |
|---|---|
| `shared/ui/index.ts` | Exportar `IjPhoneInput` y `IjPhoneValue` |
| `shared/catalogs/mx.catalogs.ts` | `DOCUMENT_TYPES` **se va** a `countries.catalogs.ts`. Estados, SAT y CFDI se quedan |
| `shared/validators/mx-identifiers.validator.ts` | Sin cambios de contenido (RFC/CURP/C.P. siguen siendo de empresa) |
| `features/public/auth/pages/register-candidate-page/register-candidate-page.ts` | **El grueso.** Ver § 7.3 |
| `features/public/auth/models/auth.models.ts` | `country`, `documentCountry`, `phone`, `phoneCountry` en el payload de registro |
| `features/candidate/components/candidate-profile/candidate-profile.ts` | `country` deja de ser `ij-input` libre y pasa a `ij-select`; el desplegable de estados se recalcula con el país; **campo de teléfono nuevo** (defecto D2); la etiqueta del municipio sale del catálogo (§ 4.3) |
| `features/candidate/models/candidate-profile.models.ts` | `phone`, `phoneCountry`, `documentCountry` en el modelo y en el payload |
| `features/account/components/account-identity-form/account-identity-form.ts` | El teléfono pasa a `ij-phone-input` |
| `features/account/models/account.models.ts` | `phoneCountry` |
| `features/admin/users/components/user-create-form/user-create-form.ts` | Selector de país; documento y estado dependientes de él; teléfono con `ij-phone-input` |
| `features/admin/users/components/user-edit-form/user-edit-form.ts` | Lo mismo |
| `features/admin/users/models/users.models.ts` | Campos nuevos |
| `features/admin/users/components/users-table/users-table.ts` | Pintar el teléfono con `formatPhone()` |
| `features/company/profile/components/company-profile/company-profile.ts` | `ij-phone-input` con país fijo `MX` (D-10) |
| `features/admin/companies/components/company-edit-form/company-edit-form.ts` | Lo mismo |
| `features/public/contact/components/contact-form-section/contact-form-section.ts` | `ij-phone-input`; **aquí sí con los cuatro países** |
| `features/company/candidates/pages/candidates-page/candidates-page.ts` | Filtro de país; el de estado depende de él |
| `features/company/candidates/components/candidate-detail/candidate-detail.ts` | Pintar la ubicación con `subdivisionName(country, code)` y el teléfono con `formatPhone()` |
| `features/company/candidates/models/candidates.models.ts` | `country` en el modelo |
| `core/i18n/translations/es.json` · `en.json` | § 8 |

### 7.3. El formulario de registro, paso a paso

Es el más delicado: es un asistente de 3 pasos con `STEP_CONTROLS` (línea 40) y validación por paso.

1. **El país sube al paso 2** («Datos personales»), **antes** del documento. Es lo que condiciona todo lo demás, así que tiene que elegirse primero.
2. `STEP_CONTROLS[1]` pasa a `['country', 'firstName', 'lastName', 'documentCountry', 'documentType', 'documentNumber', 'birthDate']`; `STEP_CONTROLS[2]` añade `'phone'`. **Si se olvida esta constante, el paso valida de menos y el asistente deja avanzar con campos vacíos** — falla silencioso.
3. **Al cambiar el país**: repoblar los desplegables de documento y de subdivisión, **y limpiar los dos controles** (`setValue('')` + `updateValueAndValidity()`). Si no se limpian, queda seleccionado un `MX_CURP` con país `CO` y el backend devuelve un 400 que el usuario no entiende.
4. **El campo CURP se vuelve condicional.** Hoy es un campo suelto siempre visible (línea 168). **Sólo tiene sentido con `country === 'MX'`.** Cuando el tipo de documento ya es `MX_CURP`, el campo aparte sobra; mantenerlo sólo para el mexicano que se identifica con RFC o INE y además quiere dar su CURP.
5. **`country: 'MX'` quemado en el submit (línea 346)** pasa a leerse del formulario. Es una línea, y es la que hace que todo lo demás sirva de algo.
6. **Añadir el teléfono al paso 3**, junto a la ubicación. Opcional, como en el DTO.
7. `handleError()` (línea 359) gana los casos `INVALID_SUBDIVISION` y `INVALID_DOCUMENT_NUMBER`, cada uno **saltando al paso donde está el campo** y marcándolo — que es lo que ya hace con `CANDIDATE_DOCUMENT_ALREADY_EXISTS`.

### 7.4. SSR

`ij-phone-input` usa el overlay del CDK, igual que `ij-select`, que ya convive con SSR. **Que no toque `window`, `document` ni `navigator` fuera de un manejador de eventos**, y en particular: **nada de detectar el país por la IP o por `navigator.language` al iniciar**. El registro y `/auth/**` se sirven con `RenderMode.Server` desde T26, y una detección así daría un HTML de servidor distinto del cliente. El país por defecto es `MX`, constante.

---

## 8. i18n

Toda clave nueva va **en los dos ficheros**; `core/i18n/translations.spec.ts` falla si uno se queda atrás (compara juegos de claves **y** nombres de parámetros).

Claves nuevas, agrupadas:

- `enums.country.{MX,CO,US,CA}` — 4
- `enums.documentType.{MX_CURP,MX_RFC,MX_INE,CO_CC,CO_CE,CO_PPT,US_DL,CA_DL,PASSPORT}` — 9
- `enums.subdivisionLabel.{MX,CO,US,CA}` — «Estado» / «Departamento» / «State» / «Province or territory»
- `enums.localityLabel.{MX,CO,US,CA}` — «Municipio o alcaldía» / «Municipio» / «City» / «City»
- `validation.phone` — «El teléfono no es válido para el país seleccionado.»
- `validation.documentNumber` — «El número de documento no tiene el formato esperado.»
- `validation.subdivision` — «Selecciona una opción del país elegido.»
- `auth.register.candidate.country` · `countryError` · `phone` · `phonePlaceholder` · `documentCountry`
- `ui.phone.countryLabel` · `ui.phone.search` — para el desplegable del control

**Traducir también los mensajes ya existentes que se vuelven mentira en inglés:** `auth.register.candidate.state` dice «Estado» y `municipality` dice «Municipio»; con el país seleccionado deben salir de `enums.subdivisionLabel` / `enums.localityLabel`, no ser literales.

En código, siempre con `AppTranslateService`, nunca con `TranslocoService.translate()` a secas — un `computed` que use el segundo no se recalcula al cambiar de idioma.

---

## 9. Tests

### 9.1. Suites nuevas (backend)

**`common/utils/phone.util.spec.ts`** — como mínimo:

| Caso | Entrada | Esperado |
|---|---|---|
| MX nacional | `('MX', '3312345678')` | `+523312345678` |
| MX con indicativo | `('MX', '+52 33 1234 5678')` | `+523312345678` |
| MX con signos | `('MX', '(33) 1234-5678')` | `+523312345678` |
| MX con `00` | `('MX', '00523312345678')` | `+523312345678` |
| **MX que empieza por 52** | `('MX', '5212345678')` | `+525212345678`, **no** `null` ni recortado |
| MX corto | `('MX', '33123456')` | `null` |
| MX largo | `('MX', '33123456789')` | `null` |
| CO móvil | `('CO', '3101234567')` | `+573101234567` |
| US | `('US', '(415) 555-0123')` | `+14155550123` |
| CA | `('CA', '604 555 0123')` | `+16045550123` |
| **US y CA no se confunden** | `('CA', '+14155550123')` | `+14155550123` con `phoneCountry = 'CA'` |
| Vacío / basura | `('MX', '')`, `('MX', 'n/a')` | `null` |

El caso del `52` es el que atrapa la regresión del `normalizeMxPhone` antiguo (D-6). **No se puede omitir.**

**`common/utils/identity-document.util.spec.ts`** — un caso válido y uno inválido por cada uno de los 9 tipos, más los cruzados: `MX_CURP` con `country: 'CO'` → rechazado; `PASSPORT` aceptado en los cuatro.

### 9.2. Suites existentes que hay que actualizar

Las seis dejan de compilar o de pasar al cambiar las firmas:

- `modules/iam/registration/use-cases/register.use-case.spec.ts` — mockea `existsByDocumentNumber` (líneas 105 y 202). **Añadir un caso que compruebe que `profile.phone` se persiste** (defecto D1): sin él, la regresión vuelve.
- `modules/iam/users/use-cases/create-user.use-case.spec.ts` — ídem (líneas 109 y 202).
- `modules/iam/users/use-cases/update-user.use-case.spec.ts`
- `modules/iam/account/use-cases/update-account-profile.use-case.spec.ts`
- `modules/companies/use-cases/company-profile.use-case.spec.ts` — el teléfono pasa por el normalizador nuevo; los casos existentes deben seguir dando el mismo resultado.
- Los cuatro specs de `modules/candidates/use-cases/*.spec.ts` mockean `existsByDocumentNumber` en su objeto de repositorio — hay que renombrarlo aunque no lo usen.

### 9.3. Frontend

- `core/i18n/translations.spec.ts` **tiene que pasar en verde** — es la guarda de las claves nuevas.
- Test del control `ij-phone-input`: que `writeValue` + `onChange` hagan ida y vuelta sin pérdida, y que cambiar de país recalcule el E.164.

### 9.4. Comandos

```bash
cd backend  && pnpm test && pnpm run lint && pnpm run build
cd frontend && pnpm test && pnpm run build
```

**El `build` del frontend no es opcional**: `pnpm start` sirve sólo en cliente, y sólo el build de producción extrae rutas y valida el SSR (ver CLAUDE.md).

---

## 10. Riesgos y trampas conocidas

| # | Riesgo | Cómo se evita |
|---|---|---|
| R1 | **`+1` es US y CA.** Guardar sólo el E.164 hace imposible repintar el país correcto | Columna `phone_country` (D-1). Test explícito en § 9.1 |
| R2 | **`GUA` y `DC` colisionan entre países.** Traducir código → nombre sin el país da el nombre equivocado | `subdivisionName(country, code)` siempre con los dos argumentos. `country` en la respuesta de talento |
| R3 | **`STEP_CONTROLS` olvidado** en el asistente de registro → el paso valida de menos y deja avanzar con campos vacíos | Está en § 7.3 punto 2. Probar avanzando con el paso 2 en blanco |
| R4 | **La migración aborta** sobre un teléfono viejo que no encaja | Se salta la fila y se registra; nunca lanza (§ 6.2 punto 6) |
| R5 | **`document_type` cambia de valores** y algo que no se migró lo sigue comparando con `'CURP'` | `grep -rn "'CURP'\|'Pasaporte'\|'INE'\|'RFC'" backend/src frontend/src` **después** del cambio, y revisar cada resultado |
| R6 | El desplegable de documento se queda con la opción del país anterior | Limpiar el control al cambiar de país (§ 7.3 punto 3) |
| R7 | El backend confía en que el frontend filtró la lista | Validador cruzado en el DTO (§ 5.3) y un `POST` a mano en la QA (§ 12) |
| R8 | **Regresión en México**, que es el 100 % de los datos actuales | La QA arranca por el camino mexicano completo (§ 12) antes de tocar los otros tres |
| R9 | Banderas emoji que no se ven en Windows | Texto `MX +52` (D-5) |
| R10 | Se añade una clave en `es.json` y no en `en.json` | `translations.spec.ts` lo detecta; correr `pnpm test` en el frontend antes de dar por cerrado |
| R11 | Alguien reusa `normalizeMxPhone` | Se borra, no se marca `@deprecated` (§ 5.2) |
| R12 | **Servidor en marcha con datos migrados pero proceso viejo** | No aplica aquí (no hay caché de permisos), pero el despliegue sigue siendo `migration:run` **antes** de arrancar el código nuevo |

---

## 11. Fuera de alcance (explícito)

Nada de esto entra. Si el negocio lo quiere, es **otra** tarjeta:

1. **Empresas no mexicanas.** RFC, C.P. de 5 dígitos, régimen SAT y uso de CFDI son obligatorios y mexicanos. Una empresa colombiana necesitaría NIT, DIAN y otro modelo fiscal completo.
2. **Vacantes fuera de México.** `vacancies.state` sigue siendo MX, y con ella las landings SEO `/trabajo/<área>-en-<estado>`, el `JSON-LD` y el sitemap.
3. **Moneda y facturación.** MXN e IVA 16 % se quedan. El aspirante no paga nada, así que no hay conflicto.
4. **Zona horaria.** `America/Mexico_City` para todo. Un aspirante en Vancouver verá las fechas en horario de México; es aceptable y consciente.
5. **Detección automática del país** por IP o por `navigator.language`. Rompe el SSR (§ 7.4) y adivina mal más de lo que acierta.
6. **Validación del dígito verificador** de CC/NIT colombianos o del dígito de control del RFC. Hoy tampoco se hace para México: se valida **formato**, no autenticidad. Mantener el mismo nivel en los cuatro países.
7. **Verificación del teléfono por SMS.** Es otra tarea, con proveedor, coste y flujo propios.
8. **Traducir el área privada del aspirante.** Es **T28**, ya en el backlog. Un aspirante de Toronto entrando a `/candidato` lo verá en español hasta que T28 se haga. **Merece la pena decírselo al negocio**: abrir el registro a Canadá y Estados Unidos hace que T28 deje de ser opcional.

---

## 12. Checklist de QA manual

Se hace **en este orden**. Los primeros cinco son la garantía de no regresión en México, que es donde están todos los datos reales.

**Camino mexicano (no debe cambiar nada)**

- [ ] Registro de aspirante con país MX, CURP y estado Jalisco → cuenta creada, correo de verificación recibido.
- [ ] El teléfono introducido en el registro **aparece** en `/candidato/perfil` y en `/admin/usuarios`. *(Si no aparece, el defecto D1 no se arregló.)*
- [ ] Editar el perfil del aspirante y guardar **sin tocar nada** → guarda sin error. *(Detecta D3.)*
- [ ] Un aspirante mexicano creado **antes** de la migración abre su perfil: el documento sale bien (`CURP`, no `MX_CURP` en pantalla) y el teléfono sale normalizado.
- [ ] Perfil de empresa: guardar el teléfono `3312345678` → se guarda `+523312345678`, como antes.

**Camino internacional**

- [ ] Registro con país **Colombia**: el desplegable de documento ofrece CC/CE/PPT/Pasaporte y **no** CURP; el de departamentos ofrece 33 y **no** estados mexicanos; la etiqueta dice «Departamento».
- [ ] Registro con **Estados Unidos**: sólo Driver's License y Pasaporte; 51 estados; etiqueta «City» para la localidad.
- [ ] Registro con **Canadá**: 13 provincias y territorios.
- [ ] Teléfono con país **Canadá** `604 555 0123` → se guarda `+16045550123` **y al reabrir el formulario sigue diciendo Canadá**, no Estados Unidos. *(Es R1: si vuelve como US, falta `phone_country`.)*
- [ ] Cambiar el país a mitad del formulario limpia documento y subdivisión, y no deja una combinación imposible.
- [ ] Dos aspirantes, uno MX y otro CO, con **el mismo número de pasaporte** → los dos se registran. *(Es D-3.)*
- [ ] El mismo documento, mismo país y mismo tipo, dos veces → el segundo recibe `CANDIDATE_DOCUMENT_ALREADY_EXISTS`.

**Seguridad y contorno**

- [ ] `POST /api/v1/auth/register` a mano con `country: 'CO'` y `documentType: 'MX_CURP'` → **400**, no 201.
- [ ] Lo mismo con `country: 'AR'` (fuera del alcance) → **400**.
- [ ] `PUT /candidate/profile` con `state: 'JAL'` y `country: 'CO'` → **400**.

**Empresa y back-office**

- [ ] `/empresa/candidatos`: filtrar por país Colombia devuelve sólo colombianos; la ficha del aspirante muestra «Guainía, Colombia» y no «Guanajuato». *(Es R2.)*
- [ ] `/admin/usuarios`: alta y edición de un aspirante colombiano desde el back-office.
- [ ] La tabla de `/admin/usuarios` muestra el teléfono con su indicativo.

**Idioma y SSR**

- [ ] `?lang=en` en el registro: los nombres de país salen en inglés y las etiquetas dicen «State» / «Province».
- [ ] `pnpm run build && pnpm run serve:ssr:frontend` en el frontend → el registro carga sin error y el desplegable de país funciona tras la hidratación.

---

## 13. Definición de hecho

1. `pnpm test`, `pnpm run lint` y `pnpm run build` en verde **en los dos proyectos**.
2. Los 12 casos de `phone.util.spec.ts` pasan, incluido el del número que empieza por `52`.
3. La migración corre y **revierte** en MySQL **y** en PostgreSQL, sobre una base con datos.
4. Los tres defectos de § 2.5 están cerrados, cada uno con su test.
5. La lista completa de § 12 está marcada.
6. `grep -rn "normalizeMxPhone\|MX_PHONE_REGEX" backend/ frontend/` **no devuelve nada**.
7. `grep -rn "'CURP'\|'Pasaporte'" backend/src frontend/src` sólo devuelve la tabla de remapeo de la migración.
8. Swagger (`/docs`) refleja los campos nuevos y los enums nuevos.
9. **CLAUDE.md actualizado** con la divergencia nueva: el aspirante es multipaís, la empresa y la vacante no. Es la convención del repo y sin ella la siguiente persona reintroduce el supuesto MX.
10. Una tarjeta en TASKS.md (§ 14) con lo hecho y lo que quedó fuera.

---

## 14. Encaje en el backlog

La numeración actual llega a **T35** (Parte D). Esta tarea entra como **T36 · Aspirantes de México, Colombia, Estados Unidos y Canadá**, con una tarjeta en TASKS.md que enlace aquí.

**Orden interno sugerido** — cada fase deja el repo compilando y con los tests en verde, así que se puede parar entre una y otra:

| Fase | Qué | Días |
|---|---|---|
| 1 | Catálogos y utilidades del backend, con sus tests. Sin tocar ningún módulo | 1 |
| 2 | Migración, entidades, repositorio. Probada en ida y vuelta sobre datos reales | 1–1,5 |
| 3 | DTOs, validador cruzado y use-cases; actualizar las 6 suites. **Aquí se cierran D1, D2, D3 y D3 bis** | 1,5–2 |
| 4 | Catálogos, utilidades y validadores del frontend + `ij-phone-input`, con su test | 1–1,5 |
| 5 | Los 12 formularios y las traducciones | 1,5–2 |
| 6 | Talento, back-office y QA completa de § 12 | 1 |

**No empezar por el frontend.** El control se ve rápido en pantalla y da sensación de avance, pero si los códigos de documento o el contrato de la API cambian en la fase 3, se rehacen los 12 formularios.

---

## 15. Decisiones que necesita el negocio 🔷

Ninguna bloquea el arranque: las cinco tienen ya una respuesta por defecto en este plan. Conviene confirmarlas antes de la fase 5.

- **N14 · ¿Se acepta no pedir SSN ni SIN?** *Por defecto: sí, no se piden* (D-2). Es la única con implicación legal.
- **N15 · ¿El teléfono del aspirante es obligatorio?** *Por defecto: opcional*, como hoy. Si la empresa necesita contactar, debería ser obligatorio — pero eso sube la fricción del registro y afecta a las cuentas ya existentes, que no lo tienen.
- **N16 · ¿La empresa puede ver el teléfono del aspirante?** Hoy **no se expone en ninguna respuesta** ni en postulaciones ni en el banco de talento. Si se quiere, es un cambio aparte con implicaciones de privacidad y de consumo de cupo.
- **N17 · ¿Se filtra el portal público por país?** Las vacantes siguen siendo mexicanas (§ 11). Un aspirante en Bogotá verá vacantes de México. **Confirmar que eso es lo que se quiere**, porque es lo primero que notará.
- **N18 · ¿T28 (traducir el área privada) pasa a ser obligatoria?** Abrir el registro a Estados Unidos y Canadá deja a esos aspirantes con un panel sólo en español. Este plan no lo resuelve.

---

## 16. Referencias del repo

- Estilo de catálogo embebido → `backend/src/common/catalogs/mx-states.ts`
- Espejo en el frontend → `frontend/src/app/shared/catalogs/mx.catalogs.ts`
- Validadores paralelos back/front → `common/utils/mx-identifiers.ts` ↔ `shared/validators/mx-identifiers.validator.ts`
- Control del UI Kit con overlay del CDK → `frontend/src/app/shared/ui/select/select.ts`
- Base de los controles (CVA) → `frontend/src/app/shared/ui/forms/ij-control-base.ts`
- Estilos compartidos de los controles → `frontend/src/app/shared/ui/forms/control-styles.ts`
- Migración de datos con parámetros → `backend/src/database/migrations/1720000030000-RepairMojibakeText.ts`
- Ayudante de filas de catálogo → `backend/src/database/migrations/helpers/seed-data.helper.ts`
- Guarda de traducciones → `frontend/src/app/core/i18n/translations.spec.ts`
