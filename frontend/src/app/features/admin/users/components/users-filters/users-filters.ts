import { ChangeDetectionStrategy, Component, computed, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjIcon } from '@/shared/ui';
import {
  STATUS_LABELS,
  UserStatus,
} from '@/features/admin/users/models/users.models';

interface StatusChip {
  readonly value: UserStatus | '';
  readonly label: string;
}

/**
 * Barra de filtros del listado de usuarios: búsqueda por correo y estado. El
 * rol no está aquí — lo determina la pestaña activa (`app-users-tabs`).
 *
 * Va empotrada como primera franja de la tarjeta del listado, así que no lleva
 * fondo ni borde propios: los pone la tarjeta.
 *
 * El estado se aplica **al pulsar** cada chip (es un valor cerrado, esperar a
 * un botón «Filtrar» sólo añadía un clic); la búsqueda se aplica al enviar,
 * porque teclear dispararía una petición por letra.
 */
@Component({
  selector: 'app-users-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjIcon],
  host: { class: 'block' },
  template: `
    <form
      class="flex flex-wrap items-center gap-2.5 px-4 py-3.5"
      (ngSubmit)="apply.emit()"
    >
      <label
        class="flex h-[38px] min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 text-muted focus-within:border-brand"
      >
        <span class="sr-only">Buscar por nombre o correo</span>
        <ij-icon name="search" [size]="16" />
        <input
          type="search"
          name="search"
          placeholder="Buscar por nombre o correo…"
          class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] font-medium text-ink-900 placeholder:text-muted focus:border-0 focus:outline-none focus:ring-0"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
      </label>

      <div
        role="group"
        aria-label="Filtrar por estado"
        class="flex gap-1.5 rounded-xl bg-surface p-[3px]"
      >
        @for (chip of chips; track chip.value) {
          <button
            type="button"
            [attr.aria-pressed]="chip.value === status()"
            [class]="chipClass(chip.value)"
            (click)="onStatus(chip.value)"
          >
            {{ chip.label }}
          </button>
        }
      </div>

      <button
        type="submit"
        class="h-[38px] rounded-xl bg-brand-700 px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-strong active:translate-y-px"
      >
        Buscar
      </button>

      @if (hasFilters()) {
        <button
          type="button"
          class="h-[38px] rounded-xl px-3 text-[13px] font-bold text-brand-strong transition-colors hover:bg-brand-50"
          (click)="clear.emit()"
        >
          Limpiar
        </button>
      }
    </form>
  `,
})
export class UsersFilters {
  readonly search = model.required<string>();
  readonly status = model.required<UserStatus | ''>();
  readonly apply = output<void>();
  readonly clear = output<void>();

  protected readonly chips: readonly StatusChip[] = [
    { value: '', label: 'Todos' },
    ...Object.values(UserStatus).map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
    })),
  ];

  protected readonly hasFilters = computed(
    () => Boolean(this.search().trim()) || Boolean(this.status()),
  );

  protected onStatus(value: UserStatus | ''): void {
    if (value === this.status()) return;
    this.status.set(value);
    this.apply.emit();
  }

  protected chipClass(value: UserStatus | ''): string {
    const base =
      'h-8 whitespace-nowrap rounded-lg px-3 text-[13px] font-bold transition-colors';
    return value === this.status()
      ? `${base} bg-white text-ink-900 shadow-card`
      : `${base} text-muted hover:text-ink-900`;
  }
}
