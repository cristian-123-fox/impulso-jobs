/**
 * Utilidades para el texto de la vacante, que desde T32 puede venir como HTML
 * del editor o como texto plano (las vacantes publicadas antes).
 *
 * Es el gemelo en cliente de `common/utils/rich-text.util.ts` del backend. Aquí
 * **no se sanea**: para pintar se usa `[innerHTML]`, que Angular ya sanea, y el
 * backend guarda el HTML limpio. Esto sirve para lo contrario — quitar el
 * marcado donde estorba.
 */

/**
 * HTML → texto plano. Se usa donde el marcado no sirve o es peligroso:
 *
 * - La `<meta name="description">`: con etiquetas dentro sale ilegible en el
 *   buscador.
 * - El `description` del **JSON-LD**, que vive dentro de un
 *   `<script type="application/ld+json">`. Angular sanea `[innerHTML]`, pero no
 *   este caso: un `</script>` en la descripción cerraría el bloque antes de
 *   tiempo. Por eso aquí se quitan las etiquetas en vez de escaparlas.
 * - Los recortes de las tarjetas del listado.
 *
 * El regex basta porque el contenido llega **ya saneado** del backend: la
 * entrada no es HTML arbitrario de un tercero, es una lista corta de etiquetas
 * conocidas.
 */
export function toPlainText(value: string | null | undefined): string {
  if (!value) return '';

  return (
    value
      // `<script>`/`<style>` se van **con su contenido**, no sólo la etiqueta:
      // quitar sólo las etiquetas dejaría un "alert(1)" suelto en la meta
      // description. Es lo mismo que hace `sanitize-html` en el backend, y
      // mantener ambos lados de acuerdo es el objetivo de este gemelo.
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      // Los cierres de bloque se vuelven saltos: sin esto "…del puesto</p><p>Buscamos…"
      // quedaría pegado en una sola frase.
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // `&nbsp;` puede llegar ya decodificado como espacio duro (U+00A0).
      .replace(/ /g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Recorte para tarjetas y previsualizaciones: texto plano cortado por palabra,
 * no a mitad de una.
 */
export function excerpt(value: string | null | undefined, max = 160): string {
  const plain = toPlainText(value).replace(/\n+/g, ' ');
  if (plain.length <= max) return plain;

  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
