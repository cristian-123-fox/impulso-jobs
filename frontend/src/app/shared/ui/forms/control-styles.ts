/**
 * Estilos Tailwind compartidos por los controles de formulario del UI Kit
 * (ij-input, ij-select, ij-multiselect, ij-autocomplete, ij-datepicker).
 * Se escriben como strings completos para que el JIT/AOT de Tailwind los detecte.
 */

export const IJ_LABEL = 'mb-1.5 block text-[13px] font-semibold text-ink-900';
export const IJ_HINT = 'mt-1 text-[12px] text-muted';
export const IJ_ERROR = 'mt-1 text-[12px] font-medium text-red-600';

/** Caja base de un control (input o disparador de dropdown). Altura fija ~42px,
 *  contenido centrado; `box-border` (preflight de Tailwind) incluye el borde.
 *  `outline-none` evita el foco azul del navegador en los disparadores `<button>`
 *  (select/datepicker). */
const CONTROL_BASE =
  'flex h-[42px] w-full items-center gap-2 rounded-xl border bg-white px-3.5 ' +
  'text-[14px] leading-5 text-ink-900 transition-colors outline-none focus:outline-none';

/** Devuelve las clases de la caja según estado (abierto/foco, error, disabled). */
export function ijControlClass(options: {
  focused?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  /** `auto` deja crecer la caja (textarea multilínea); por defecto altura fija. */
  height?: 'fixed' | 'auto';
}): string {
  const { focused, invalid, disabled, height } = options;
  let state: string;
  if (disabled) {
    state = 'border-line bg-surface text-muted cursor-not-allowed';
  } else if (invalid) {
    state = 'border-red-400 ring-2 ring-red-100';
  } else if (focused) {
    state = 'border-brand ring-2 ring-brand/15';
  } else {
    state = 'border-line hover:border-brand/50';
  }
  const box =
    height === 'auto'
      ? CONTROL_BASE.replace('h-[42px] ', 'min-h-[42px] items-start py-2 ')
      : CONTROL_BASE;
  return `${box} ${state}`;
}

/** Clase para un `<input>` nativo dentro del control (sin borde ni padding
 *  propio; la caja aporta el alto). Ocupa toda la altura para el área de clic.
 *  El foco visual vive en la caja: aquí se anula el anillo azul de
 *  `@tailwindcss/forms` (`focus:ring-0 focus:border-transparent`). */
export const IJ_NATIVE_INPUT =
  'h-full w-full border-0 bg-transparent p-0 text-[14px] leading-5 text-ink-900 ' +
  'placeholder:text-muted outline-none focus:outline-none focus:border-transparent focus:ring-0';

/** Panel flotante del dropdown (dentro del overlay del CDK). */
export const IJ_PANEL =
  'max-h-[260px] overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-float';

/** Caja de búsqueda dentro del panel. */
export const IJ_SEARCH =
  'mb-1 w-full border-b border-line px-2.5 pb-2.5 pt-1 text-[13.5px] text-ink-900 ' +
  'placeholder:text-muted outline-none focus:outline-none focus:border-line focus:ring-0';

/** Fila de opción dentro del panel. */
export function ijOptionClass(active: boolean, highlighted = false): string {
  const base =
    'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors';
  if (active) return `${base} bg-surface font-bold text-brand`;
  if (highlighted) return `${base} bg-surface font-medium text-ink-900`;
  return `${base} font-medium text-ink-900 hover:bg-surface`;
}

/** Posiciones del overlay conectado (abajo preferente, arriba de reserva). */
export const IJ_OVERLAY_POSITIONS = [
  {
    originX: 'start' as const,
    originY: 'bottom' as const,
    overlayX: 'start' as const,
    overlayY: 'top' as const,
    offsetY: 6,
  },
  {
    originX: 'start' as const,
    originY: 'top' as const,
    overlayX: 'start' as const,
    overlayY: 'bottom' as const,
    offsetY: -6,
  },
];
