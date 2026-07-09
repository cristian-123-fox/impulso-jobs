import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

type ButtonVariant = 'primary' | 'accent' | 'white' | 'soft';
type ButtonShape = 'pill' | 'rounded' | 'circle';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-600',
  accent: 'bg-brand text-white hover:bg-brand-600',
  white: 'bg-white text-brand hover:bg-surface',
  soft: 'bg-brand-50 text-brand hover:bg-brand hover:text-white',
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
  'no-underline whitespace-nowrap cursor-pointer transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2';

/**
 * Botón del UI Kit. Se aplica sobre un `<button>` o `<a>` nativo, así que la
 * semántica (navegación con `routerLink`, `type`, etc.) la controla el host.
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
