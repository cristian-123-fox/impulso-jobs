import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

type ButtonVariant = 'primary' | 'accent' | 'white' | 'soft' | 'outline';
type ButtonShape = 'pill' | 'rounded' | 'circle';
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Contraste de cada variante con su texto (WCAG AA pide 4.5:1):
 *   primary  blanco sobre `brand-700` #b3571d ....... 4.89:1
 *   white    `brand-strong` sobre blanco ............ 5.78:1
 *   soft     `brand-strong` sobre `brand-50` ........ 5.13:1
 *   outline  `brand-strong` sobre blanco ............ 5.78:1
 * El naranja de marca (`brand` #e47c3f) da 2.90:1 con texto blanco, así que no
 * se usa como relleno de un botón: queda para superficies y decoración.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-strong',
  accent: 'bg-brand-700 text-white hover:bg-brand-strong',
  white: 'bg-white text-brand-strong hover:bg-brand-50',
  soft: 'bg-brand-50 text-brand-strong hover:bg-brand-700 hover:text-white',
  outline:
    'bg-transparent text-brand-strong ring-1 ring-inset ring-brand-700/45 hover:bg-brand-50 hover:ring-brand-700',
};

const SHAPES: Record<ButtonShape, string> = {
  pill: 'rounded-full',
  rounded: 'rounded-lg',
  circle: 'rounded-full aspect-square p-0',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-sm px-5 py-2.5',
  md: 'text-sm px-6 py-3',
  lg: 'text-sm px-8 py-3.5',
};

const CIRCLE_SIZES: Record<ButtonSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-[38px] h-[38px]',
  lg: 'w-11 h-11',
};

const BASE =
  'inline-flex items-center justify-center gap-2 border-0 font-sans font-medium ' +
  'no-underline whitespace-nowrap cursor-pointer transition-[background-color,color,transform,box-shadow] duration-200 ' +
  // Empuje físico al pulsar. `transform` va por compositor, no dispara layout.
  'active:translate-y-px motion-reduce:active:translate-y-0 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/50 focus-visible:ring-offset-2 ' +
  // `<a>` no admite [disabled]; el estado inerte llega por `aria-disabled`.
  'disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55';

/**
 * Botón del UI Kit. Se aplica sobre un `<button>` o `<a>` nativo, así que la
 * semántica (navegación con `routerLink`, `type`, etc.) la controla el host.
 *
 * Forma: el portal usa **pastilla** por defecto; `rounded` queda reservado para
 * botones que van pegados dentro de una caja de radio menor (el buscador del
 * hero, el newsletter del footer) y `circle` para los controles de carrusel.
 *
 * Uso:
 *   `<button ij-button variant="primary">Publicar empleo</button>`
 *   `<a ij-button variant="soft" shape="circle"><ij-icon name="chevron-left"/></a>`
 */
@Component({
  selector: 'button[ij-button], a[ij-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
})
export class IjButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly shape = input<ButtonShape>('pill');
  readonly size = input<ButtonSize>('md');

  protected readonly classes = computed(() => {
    const shape = this.shape();
    const sizing =
      shape === 'circle' ? CIRCLE_SIZES[this.size()] : SIZES[this.size()];
    return [BASE, VARIANTS[this.variant()], SHAPES[shape], sizing].join(' ');
  });
}
