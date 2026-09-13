import sanitizeHtml from 'sanitize-html';

/**
 * Etiquetas que el editor de la vacante puede producir (T32).
 *
 * La lista es **deliberadamente corta**. Cuanto más se permita, más difícil es
 * que el detalle público no se descuadre: una tabla o una imagen metida en la
 * descripción rompería la maqueta del portal, y el editor no las ofrece. Lo que
 * no esté aquí se elimina conservando su texto.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'a',
  'h3',
  'h4',
  'blockquote',
];

/**
 * Saneador del texto enriquecido de la vacante.
 *
 * **Se sanea al guardar, no al pintar**, por tres motivos:
 *
 * 1. La API es pública: `GET /vacancies/:id` sirve este HTML a cualquiera, y no
 *    todos los consumidores son Angular. Guardar sucio y confiar en el cliente
 *    deja la inyección a un `fetch` de distancia.
 * 2. El JSON-LD de SEO mete la descripción dentro de un
 *    `<script type="application/ld+json">`. Angular sanea `[innerHTML]`, pero
 *    **no** ese caso: un `</script>` en la descripción se escaparía del bloque.
 *    Por eso `toPlainText` existe y por eso se aplica ahí.
 * 3. Un dato limpio en la base se queda limpio en los correos, en los
 *    exportables y en lo que venga después.
 *
 * `disallowedTagsMode: 'discard'` tira la etiqueta pero **conserva su texto**:
 * si alguien pega desde Word, se pierde el formato raro, no el contenido.
 */
export function sanitizeRichText(value: string): string {
  const clean = sanitizeHtml(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      // Sólo enlaces, y sólo su destino. Nada de `style`, `class` ni `on*`.
      a: ['href', 'target', 'rel'],
    },
    // `javascript:` y `data:` quedan fuera: son el vector clásico de un <a>.
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    disallowedTagsMode: 'discard',
    // Un enlace del portal que se abre fuera no debe dar acceso a `window.opener`.
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
    },
  });

  return isBlank(clean) ? '' : clean.trim();
}

/**
 * HTML → texto plano, para donde el marcado no sirve o es peligroso: la
 * `<meta name="description">`, el `description` del JSON-LD y cualquier recorte.
 *
 * Los saltos de bloque se convierten en saltos de línea antes de quitar las
 * etiquetas; si no, "…del puesto</p><p>Buscamos…" quedaría pegado.
 */
export function toPlainText(value: string): string {
  const withBreaks = value
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  const stripped = sanitizeHtml(withBreaks, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });

  return (
    decodeEntities(stripped)
      // `&nbsp;` llega aquí ya decodificado como espacio duro (U+00A0). En una
      // `<meta description>` o en el JSON-LD no pinta nada: se normaliza.
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * `true` si el valor no aporta nada: vacío, espacios, o el `<p>&nbsp;</p>` que
 * deja un editor enriquecido cuando el usuario borra todo lo que había. Sin
 * esto, un campo "vacío" pasaría un `@IsNotEmpty` con una etiqueta dentro.
 */
export function isBlank(value: string): boolean {
  return toPlainText(value).length === 0;
}

/** Longitud del contenido real, sin contar el marcado, para validar topes. */
export function richTextLength(value: string): number {
  return toPlainText(value).length;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
