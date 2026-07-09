/**
 * Tonos de acento reutilizables del UI Kit.
 * Cada tono mapea a un par de clases Tailwind (fondo suave + color de acento)
 * construidas con los tokens de `tailwind.config.js` (sin hex hardcodeado).
 *
 * Se escriben como strings completos para que el JIT/AOT de Tailwind los detecte
 * (Tailwind no soporta concatenación dinámica de nombres de clase).
 */
export type Tone = 'brand' | 'blue' | 'green' | 'amber' | 'pink';

/** Fondo suave + color de acento (iconos, tarjetas de categoría, badges, logos). */
export const TONE_SOFT: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand',
  blue: 'bg-brand-50 text-brand',
  green: 'bg-accent-green-soft text-accent-green',
  amber: 'bg-accent-amber-soft text-accent-amber',
  pink: 'bg-accent-pink-soft text-accent-pink',
};
