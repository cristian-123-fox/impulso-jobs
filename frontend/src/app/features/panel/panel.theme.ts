import { BadgeKind, PanelColor } from '@/features/panel/models/panel.models';

/**
 * Traducción de los colores del diseño (morado + acentos) a la marca de Impulso
 * Jobs: el primario morado pasa a `brand` (ámbar) y el resto usa los acentos ya
 * definidos en Tailwind. Se centraliza aquí para retematizar en un solo lugar.
 */

/** Fondo + texto suave para avatares y tintes de icono KPI. */
export const SOFT_CLASSES: Record<PanelColor, string> = {
  brand: 'bg-brand-50 text-brand',
  blue: 'bg-accent-blue-soft text-accent-blue',
  green: 'bg-accent-green-soft text-accent-green',
  amber: 'bg-accent-amber-soft text-accent-amber',
  pink: 'bg-accent-pink-soft text-accent-pink',
  teal: 'bg-[#e7f6f4] text-[#2aa6a0]',
};

/** Clases de badge de estado dentro de tablas. */
export const BADGE_CLASSES: Record<BadgeKind, string> = {
  green: 'bg-accent-green-soft text-accent-green',
  blue: 'bg-accent-blue-soft text-accent-blue',
  amber: 'bg-accent-amber-soft text-[#b26a15]',
  brand: 'bg-brand-50 text-brand',
  red: 'bg-red-50 text-red-700',
  gray: 'bg-surface text-muted',
  gold: 'bg-[#fbf0dd] text-[#9a6f1e]',
};

/** Valor hex por color, para geometría de gráficos (stroke/fill/anchos). */
export const PALETTE_HEX: Record<PanelColor, string> = {
  brand: '#e47c3f',
  blue: '#2b6df4',
  green: '#1fae6a',
  amber: '#f0a04b',
  pink: '#e8607a',
  teal: '#2aa6a0',
};

/** Gradiente lineal del avatar (header + sidebar) según rol. */
export const AVATAR_GRADIENT: Record<PanelColor, string> = {
  brand: 'linear-gradient(135deg,#f0955a,#cf6d34)',
  blue: 'linear-gradient(135deg,#4c91f6,#2b6df4)',
  green: 'linear-gradient(135deg,#35c07f,#1fae6a)',
  amber: 'linear-gradient(135deg,#f6b45f,#f0a04b)',
  pink: 'linear-gradient(135deg,#ef7d92,#e8607a)',
  teal: 'linear-gradient(135deg,#48bdb7,#2aa6a0)',
};

/** Color de texto para el porcentaje de "match" según su valor. */
export function matchTextClass(pct: number): string {
  if (pct >= 85) return 'text-accent-green';
  if (pct >= 70) return 'text-[#b26a15]';
  return 'text-muted';
}

/** Color de barra para el "match" según su valor. */
export function matchBarColor(pct: number): string {
  if (pct >= 85) return PALETTE_HEX.green;
  if (pct >= 70) return PALETTE_HEX.amber;
  return '#8a8a9e';
}
