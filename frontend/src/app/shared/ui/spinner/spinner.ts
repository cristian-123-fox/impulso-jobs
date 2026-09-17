import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Spinner de puntos con animación circular.
 *
 * @example
 * ```html
 * <ij-spinner />                              <!-- 32px, naranja marca -->
 * <ij-spinner size="lg" />                    <!-- 48px -->
 * <ij-spinner color="white" />                <!-- blanco sobre fondo oscuro -->
 * ```
 */
@Component({
  selector: 'ij-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
  styles: `
    :host {
      display: inline-flex;
      justify-content: center;
      align-items: center;
    }

    .ij-spinner {
      position: relative;
      width: var(--ij-spinner-size, 32px);
      height: var(--ij-spinner-size, 32px);
      animation: ij-spinner-rotate 1.2s linear infinite;
    }

    .ij-spinner__dot {
      position: absolute;
      width: 22%;
      height: 22%;
      border-radius: 9999px;
      background: currentColor;
      top: 0;
      left: calc(50% - 11%);
      transform-origin: center calc(100% / 0.22 / 2);
    }

    .ij-spinner__dot:nth-child(1) { transform: rotate(0deg); opacity: 1; }
    .ij-spinner__dot:nth-child(2) { transform: rotate(45deg); opacity: 0.85; }
    .ij-spinner__dot:nth-child(3) { transform: rotate(90deg); opacity: 0.7; }
    .ij-spinner__dot:nth-child(4) { transform: rotate(135deg); opacity: 0.55; }
    .ij-spinner__dot:nth-child(5) { transform: rotate(180deg); opacity: 0.4; }
    .ij-spinner__dot:nth-child(6) { transform: rotate(225deg); opacity: 0.3; }
    .ij-spinner__dot:nth-child(7) { transform: rotate(270deg); opacity: 0.2; }
    .ij-spinner__dot:nth-child(8) { transform: rotate(315deg); opacity: 0.12; }

    @keyframes ij-spinner-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  template: `
    <div
      class="ij-spinner"
      [style.--ij-spinner-size.px]="sizePx()"
      role="status"
      [attr.aria-label]="ariaLabel()"
    >
      @for (_ of dots; track $index) {
        <span class="ij-spinner__dot"></span>
      }
    </div>
  `,
})
export class IjSpinner {
  /** Tamaño en píxeles. Valores predefinidos: sm (20), md (32), lg (48). */
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Color del spinner. `brand` = naranja marca (default). */
  readonly color = input<'brand' | 'white' | 'muted'>('brand');
  readonly ariaLabel = input('Cargando');

  protected readonly dots = [0, 1, 2, 3, 4, 5, 6, 7];

  protected readonly hostClass = computed(() => {
    const colorMap: Record<string, string> = {
      brand: 'text-brand',
      white: 'text-white',
      muted: 'text-muted',
    };
    return colorMap[this.color()] ?? 'text-brand';
  });

  protected sizePx(): number {
    switch (this.size()) {
      case 'sm':
        return 20;
      case 'lg':
        return 48;
      default:
        return 32;
    }
  }
}
