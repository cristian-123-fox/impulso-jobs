import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjIcon, IjOption, IjSelect } from '@/shared/ui';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';

/** Barra de filtros del listado de empresas (búsqueda libre + estado). */
@Component({
  selector: 'app-companies-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjSelect, IjIcon],
  template: `
    <form
      class="grid gap-3 rounded-2xl bg-white p-4 shadow-card md:grid-cols-[1fr_220px_auto]"
      (ngSubmit)="apply.emit()"
    >
      <label class="relative block">
        <span class="sr-only">Buscar empresa</span>
        <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <ij-icon name="search" [size]="17" />
        </span>
        <input
          type="search"
          name="search"
          placeholder="Buscar por nombre, razón social o RFC…"
          class="h-[46px] w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[13.5px] text-ink-900 placeholder:text-muted focus:border-brand focus:outline-none focus:ring-0"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
      </label>

      <ij-select
        name="state"
        placeholder="Todos los estados"
        [options]="stateOptions"
        [ngModel]="stateCode()"
        (ngModelChange)="stateCode.set($event)"
      />

      <div class="flex items-center gap-2">
        <button
          type="submit"
          class="h-[46px] rounded-xl bg-brand px-5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
        >
          Filtrar
        </button>
        <button
          type="button"
          class="h-[46px] rounded-xl border border-line bg-white px-4 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
          (click)="clear.emit()"
        >
          Limpiar
        </button>
      </div>
    </form>
  `,
})
export class CompaniesFilters {
  readonly search = model.required<string>();
  readonly stateCode = model.required<string>();
  readonly apply = output<void>();
  readonly clear = output<void>();

  protected readonly stateOptions: readonly IjOption[] = [
    { value: '', label: 'Todos los estados' },
    ...MX_STATES.map((s) => ({ value: s.code, label: s.name })),
  ];
}
