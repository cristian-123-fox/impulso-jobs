export type FaqCategoryId = 'general' | 'empleos' | 'pagos' | 'cuenta';

/**
 * Contenido del FAQ (T26).
 *
 * Ni las pestañas ni las preguntas llevan texto: sólo el **id**, que es a la vez
 * la clave bajo `faq.tabs.*` / `faq.items.*` del diccionario y el identificador
 * que usan el acordeón (elemento abierto) y el ancla `#faq-<id>`. Un solo dato
 * para las dos cosas evita que el texto y el estado se desincronicen al
 * traducir.
 */
export interface FaqTab {
  readonly id: FaqCategoryId;
}

export interface FaqItem {
  readonly id: string;
  readonly categoryId: FaqCategoryId;
}
