import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IjIcon } from '@/shared/ui/icon/icon';

/**
 * Caja de un bloque de panel: título, subtítulo, enlace opcional y contenido
 * proyectado. Existe para que todos los bloques compartan borde, radio, sombra
 * y ritmo vertical sin repetir las clases en cada uno.
 */
@Component({
  selector: 'ij-dashboard-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, RouterLink],
  host: { class: 'block' },
  template: `
    <section class="flex h-full flex-col rounded-2xl border border-line bg-white shadow-card">
      <header class="flex items-start justify-between gap-3 px-5 pt-4">
        <div class="min-w-0">
          <h2 class="text-[15px] font-bold text-ink-900">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="mt-0.5 text-[12.5px] text-muted">{{ subtitle() }}</p>
          }
        </div>
        @if (link()) {
          <a
            [routerLink]="link()"
            class="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-bold text-brand-strong transition-colors hover:bg-brand-50"
          >
            {{ linkLabel() }}
            <ij-icon name="chevron-right" [size]="14" [strokeWidth]="2.4" />
          </a>
        }
      </header>

      <div class="flex-1 px-2 pb-3 pt-1">
        <ng-content />
      </div>
    </section>
  `,
})
export class IjDashboardCard {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly link = input('');
  readonly linkLabel = input('Ver todo');
}
