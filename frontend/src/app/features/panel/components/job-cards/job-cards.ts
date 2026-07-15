import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IjButton } from '@/shared/ui';
import { PanelFacade } from '@/features/panel/data/panel.facade';
import { PanelColor } from '@/features/panel/models/panel.models';
import { SOFT_CLASSES } from '@/features/panel/panel.theme';

/** Vista "Buscar empleo" del aspirante: chips de filtro + grilla de vacantes. */
@Component({
  selector: 'app-job-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjButton],
  template: `
    <div class="mb-[18px] flex flex-wrap gap-2.5">
      @for (f of filters; track f; let first = $first) {
        <span
          class="cursor-pointer rounded-lg px-3.5 py-2 text-[12.5px] font-semibold"
          [class]="first ? 'bg-brand text-white' : 'bg-surface text-body'"
        >
          {{ f }}
        </span>
      }
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      @for (j of jobs; track j.title) {
        <div
          class="flex items-start gap-3.5 rounded-2xl border border-line bg-white p-5 shadow-card transition-colors hover:border-brand/30"
        >
          <span
            class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold"
            [class]="soft(j.logo)"
          >
            {{ j.initials }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2.5">
              <span class="text-[15.5px] font-bold text-ink-900">{{ j.title }}</span>
              <span
                class="whitespace-nowrap rounded-md bg-accent-green-soft px-2.5 py-1 text-[11.5px] font-bold text-accent-green"
              >
                {{ j.match }} match
              </span>
            </div>
            <div class="mt-0.5 text-[13px] text-muted">{{ j.company }} · {{ j.location }}</div>
            <div class="mt-3 flex flex-wrap gap-2">
              @for (t of j.tags; track t) {
                <span class="rounded-md bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-body">
                  {{ t }}
                </span>
              }
            </div>
            <div class="mt-3.5 flex items-center justify-between">
              <span class="text-sm font-bold text-brand">{{ j.salary }}</span>
              <button ij-button type="button" variant="primary" shape="rounded" size="sm">
                Postularme
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class JobCards {
  private readonly facade = inject(PanelFacade);
  protected readonly jobs = this.facade.jobList();
  protected readonly filters = this.facade.jobFilters();

  protected soft(kind: PanelColor): string {
    return SOFT_CLASSES[kind];
  }
}
