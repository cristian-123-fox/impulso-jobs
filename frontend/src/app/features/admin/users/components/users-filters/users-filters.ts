import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjIcon, IjOption, IjSelect } from '@/shared/ui';
import {
  STATUS_LABELS,
  UserStatus,
} from '@/features/admin/users/models/users.models';

/**
 * Barra de filtros del listado de usuarios: búsqueda por correo y estado. El
 * rol no está aquí — lo determina la pestaña activa (`app-users-tabs`).
 */
@Component({
  selector: 'app-users-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjSelect, IjIcon],
  template: `
    <form
      class="grid gap-3 rounded-2xl bg-white p-4 shadow-card md:grid-cols-[1fr_200px_auto]"
      (ngSubmit)="apply.emit()"
    >
      <label class="relative block">
        <span class="sr-only">Buscar por correo</span>
        <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <ij-icon name="search" [size]="17" />
        </span>
        <input
          type="search"
          name="search"
          placeholder="Buscar por correo…"
          class="h-[46px] w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[13.5px] text-ink-900 placeholder:text-muted focus:border-brand focus:outline-none focus:ring-0"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
      </label>

      <ij-select
        name="status"
        placeholder="Todos los estados"
        [options]="statusOptions"
        [searchable]="false"
        [ngModel]="status()"
        (ngModelChange)="status.set($event)"
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
export class UsersFilters {
  readonly search = model.required<string>();
  readonly status = model.required<UserStatus | ''>();
  readonly apply = output<void>();
  readonly clear = output<void>();

  protected readonly statusOptions: readonly IjOption[] = [
    { value: '', label: 'Todos los estados' },
    ...Object.values(UserStatus).map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
    })),
  ];
}
