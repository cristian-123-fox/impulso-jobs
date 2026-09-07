/**
 * Tonos de acento reutilizables del UI Kit.
 * Cada tono mapea a un par de clases Tailwind (fondo suave + color de acento)
 * construidas con los tokens de `tailwind.config.js` (sin hex hardcodeado).
 *
 * Se escriben como strings completos para que el JIT/AOT de Tailwind los detecte
 * (Tailwind no soporta concatenación dinámica de nombres de clase).
 *
 * El color de texto es siempre la variante `-strong`, que es la que alcanza
 * WCAG AA sobre su propio fondo `-soft` (4.8:1 a 5.4:1). El tono base no llega
 * (1.95:1 a 2.9:1) ni siquiera al umbral de 3:1 de objetos gráficos, así que no
 * sirve como color de contenido: queda para superficies y decoración.
 */
export type Tone = 'brand' | 'blue' | 'green' | 'amber' | 'pink';

/** Fondo suave + color de acento (iconos, tarjetas de categoría, badges, logos). */
export const TONE_SOFT: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-strong',
  blue: 'bg-accent-blue-soft text-accent-blue-strong',
  green: 'bg-accent-green-soft text-accent-green-strong',
  amber: 'bg-accent-amber-soft text-accent-amber-strong',
  pink: 'bg-accent-pink-soft text-accent-pink-strong',
};

/** Sólo el color de acento legible, para texto sobre blanco o `surface`. */
export const TONE_TEXT: Record<Tone, string> = {
  brand: 'text-brand-strong',
  blue: 'text-accent-blue-strong',
  green: 'text-accent-green-strong',
  amber: 'text-accent-amber-strong',
  pink: 'text-accent-pink-strong',
};
