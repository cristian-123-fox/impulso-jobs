import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/** Isotipo de la marca. Vive en `public/`, así que se sirve desde la raíz. */
const LOGO_SRC = '/assets/images/logos/logo_naranja.png';

/** Alto del isotipo en px por tamaño (el ancho sale de la proporción). */
const ICON_HEIGHT: Record<'md' | 'sm', number> = { md: 38, sm: 32 };

/** Proporción del archivo original (518×621), para reservar el espacio. */
const ICON_RATIO = 518 / 621;

/**
 * Marca de Impulso Jobs: isotipo + wordmark. `variant` controla el color del
 * texto según el fondo (claro/oscuro) y `iconOnly` deja sólo el isotipo, para
 * espacios estrechos como el riel del panel colapsado.
 *
 * El isotipo es decorativo (`alt=""`): el nombre ya va como texto al lado; en
 * modo `iconOnly` la marca se anuncia con el `aria-label` del host.
 */
@Component({
  selector: 'ij-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center gap-2.5',
    '[attr.role]': 'iconOnly() ? "img" : null',
    '[attr.aria-label]': 'iconOnly() ? "Impulso Jobs" : null',
  },
  template: `
    <img
      [src]="src"
      alt=""
      aria-hidden="true"
      [width]="width()"
      [height]="height()"
      [style.height.px]="height()"
      class="w-auto select-none"
      decoding="async"
    />
    @if (!iconOnly()) {
      <span [class]="wordmarkClass()">Impulso<span class="text-brand">Jobs</span></span>
    }
  `,
})
export class IjLogo {
  readonly variant = input<'dark' | 'light'>('dark');
  readonly size = input<'md' | 'sm'>('md');
  readonly iconOnly = input(false);

  protected readonly src = LOGO_SRC;

  protected readonly height = computed(() => ICON_HEIGHT[this.size()]);
  protected readonly width = computed(() =>
    Math.round(this.height() * ICON_RATIO),
  );

  protected readonly wordmarkClass = computed(() => {
    const color = this.variant() === 'light' ? 'text-white' : 'text-ink-900';
    const scale = this.size() === 'sm' ? 'text-xl' : 'text-2xl';
    return `font-bold tracking-tight ${scale} ${color}`;
  });
}
