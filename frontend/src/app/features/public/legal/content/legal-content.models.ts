/**
 * Modelo de contenido de los documentos legales.
 *
 * ## Por qué van aquí y no en `es.json` / `en.json`
 *
 * Un aviso de privacidad son unas cuatro mil palabras con anclas, tablas y
 * referencias a artículos. Meter eso en el diccionario de Transloco dejaría un
 * JSON de 5.000 líneas imposible de revisar y, peor, sin tipado: un `{{ t() }}`
 * mal escrito se descubría en la página, no al compilar.
 *
 * Con un modelo tipado, el contrato de la plantilla (`sections[].id`,
 * `heading`, `paragraphs`) lo revisa TypeScript, y el `translations.spec.ts`
 * existente sigue cubriendo lo que sí va por clave — los botones, los títulos de
 * sección y las etiquetas de las casillas.
 *
 * ## Por qué el texto es editorial y el catálogo no
 *
 * `legal.catalogs.ts` dice **qué** documento está vigente y desde cuándo; aquí
 * está **qué dice**. La versión es la que viaja en `legal_consents`, así que
 * tocar cualquiera de los dos exige tocar `LEGAL_DOCUMENTS` en el mismo commit.
 */

export interface LegalTable {
  readonly head: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export interface LegalSection {
  /** Ancla estable. Cambiarla rompe los enlaces con fragmento publicados. */
  readonly id: string;
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
  /** Lista numerada, para procedimiento paso a paso. */
  readonly steps?: readonly string[];
  readonly table?: LegalTable;
  /** Llamada al pie de la sección: lo que un lector debe hacer, no lo laws. */
  readonly callout?: string;
}

export interface LegalDocumentContent {
  /** Bajada bajo el título. */
  readonly intro: string;
  /** "En resumen": las obligaciones en bullets, arriba del documento largo. */
  readonly summary: readonly string[];
  readonly sections: readonly LegalSection[];
  /** Cierre: a dónde escribir. */
  readonly closing: string;
}

/** Los cinco documentos más el bloque de comunicaciones comerciales. */
export type LegalContentKey =
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'refund'
  | 'imageRights';