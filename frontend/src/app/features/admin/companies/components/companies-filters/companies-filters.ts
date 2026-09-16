import { ChangeDetectionStrategy, Component, computed, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjIcon, IjOption, IjSelect } from '@/shared/ui';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';

/**
 * Barra de filtros del listado de empresas (búsqueda libre + estado).
 *
 * Va empotrada como primera franja de la tarjeta del listado, así que no lleva
 * fondo ni borde propios: los pone la tarjeta. Misma forma que la de usuarios.
 *
 * El estado **sí** es un select y no chips: son las 32 entidades de México, y
 * una fila de 32 pastillas no es un control, es un muro.
 */
@Component({
  selector: 'app-companies-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjSelect, IjIcon],
  host: { class: 'block' },
  template: `
    <form
      class="flex flex-wrap items-center gap-2.5 px-4 py-3.5"
      (ngSubmit)="apply.emit()"
    >
      <label
        class="flex h-[42px] min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 text-muted focus-within:border-brand"
      >
        <span class="sr-only">Buscar empresa</span>
        <ij-icon name="search" [size]="16" />
        <input
          type="search"
          name="search"
          placeholder="Buscar por nombre, razón social o RFC…"
          class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] font-medium text-ink-900 placeholder:text-muted focus:border-0 focus:outline-none focus:ring-0"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
      </label>

      <ij-select
        class="w-[220px]"
        name="state"
        placeholder="Todos los estados"
        [options]="stateOptions"
        [ngModel]="stateCode()"
        (ngModelChange)="onState($event)"
      />

      <button
        type="submit"
        class="h-[42px] rounded-xl bg-brand-700 px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-strong active:translate-y-px"
      >
        Buscar
      </button>

      @if (hasFilters()) {
        <button
          type="button"
          class="h-[42px] rounded-xl px-3 text-[13px] font-bold text-brand-strong transition-colors hover:bg-brand-50"
          (click)="clear.emit()"
        >
          Limpiar
        </button>
      }
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

  protected readonly hasFilters = computed(
    () => Boolean(this.search().trim()) || Boolean(this.stateCode()),
  );

  /** Elegir estado es un valor cerrado: se aplica solo, sin pasar por Buscar. */
  protected onState(value: string): void {
    if (value === this.stateCode()) return;
    this.stateCode.set(value);
    this.apply.emit();
  }
}
