import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconName, IjIcon } from '@/shared/ui/icon/icon';

export type IjKpiTone = 'brand' | 'blue' | 'green' | 'purple' | 'danger';

/**
 * Indicador suelto de un panel: un número que se lee de un vistazo.
 *
 * Es una **tarjeta, no una gráfica**: un valor único sin comparación no gana
 * nada dibujado, y sí pierde legibilidad. La nota de abajo aporta el contexto
 * que al número le falta ("3 sin abrir", "de 12 publicadas").
 *
 * Vive en el kit porque lo usan los paneles de las tres áreas; tenerlo en una
 * feature obligaría a las otras dos a importar de ella.
 */
@Component({
  selector: 'ij-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, RouterLink],
  host: { class: 'block' },
  template: `
    <a
      [routerLink]="link()"
      class="group flex h-full items-start gap-3.5 rounded-2xl border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-float"
    >
      <span [class]="iconClass()">
        <ij-icon [name]="icon()" [size]="20" [strokeWidth]="1.9" />
      </span>

      <span class="min-w-0 flex-1">
        <span class="block text-[12.5px] font-semibold uppercase tracking-wide text-muted">
          {{ label() }}
        </span>
        <span
          class="mt-0.5 block text-[26px] font-extrabold leading-none tracking-tight text-ink-900 tabular-nums"
        >
          {{ value() }}
        </span>
        @if (note()) {
          <span class="mt-1.5 block text-[12.5px] text-muted">{{ note() }}</span>
        }
      </span>

      <ij-icon
        name="chevron-right"
        [size]="16"
        class="mt-1 text-line transition-colors group-hover:text-brand-strong"
      />
    </a>
  `,
})
export class IjKpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input.required<IconName>();
  readonly link = input.required<string>();
  readonly note = input('');
  readonly tone = input<IjKpiTone>('brand');

  protected iconClass(): string {
    const base =
      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105';
    switch (this.tone()) {
      case 'blue':
        return `${base} bg-accent-blue-soft text-accent-blue-strong`;
      case 'green':
        return `${base} bg-accent-green-soft text-accent-green-strong`;
      case 'purple':
        return `${base} bg-[#f1ecfb] text-[#6d3fc0]`;
      case 'danger':
        return `${base} bg-red-50 text-red-600`;
      default:
        return `${base} bg-brand-50 text-brand-strong`;
    }
  }
}
