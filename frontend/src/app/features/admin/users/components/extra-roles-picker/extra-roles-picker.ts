import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  model,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RolesApi } from '@/features/admin/roles/data/roles.api';
import { RoleSummary } from '@/features/admin/roles/models/roles.models';

/**
 * Selección de roles *adicionales* (los personalizados creados en
 * `/admin/roles`). El rol base va aparte: aquí sólo se acumulan permisos
 * extra sobre él, que es como el back-office diferencia, por ejemplo, a un
 * administrador de soporte de uno de contenidos.
 */
@Component({
  selector: 'app-extra-roles-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'block' },
  template: `
    <span class="mb-2 block text-[13px] font-bold text-ink-900">
      Roles adicionales
    </span>

    @if (roles().length) {
      <div class="flex flex-col gap-2">
        @for (role of roles(); track role.id) {
          <label
            class="flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors"
            [class]="
              isSelected(role.id)
                ? 'border-brand bg-brand-50/60'
                : 'border-line hover:bg-surface'
            "
          >
            <input
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"
              [checked]="isSelected(role.id)"
              (change)="toggle(role.id)"
            />
            <span class="min-w-0">
              <span class="block text-[13.5px] font-bold text-ink-900">
                {{ role.name }}
                <span class="ml-1 font-mono text-[11.5px] font-normal text-muted">
                  {{ role.code }}
                </span>
              </span>
              @if (role.description) {
                <span class="block text-[12.5px] text-muted">{{ role.description }}</span>
              }
            </span>
          </label>
        }
      </div>
      <p class="mt-2 text-[12.5px] text-muted">
        Suman permisos sobre el rol base. Cambiarlos cierra las sesiones abiertas
        del usuario.
      </p>
    } @else {
      <p class="rounded-xl border border-line px-3.5 py-3 text-[13px] text-muted">
        Todavía no hay roles personalizados.
        <a
          routerLink="/admin/roles"
          class="font-semibold text-brand-strong hover:text-brand-600"
        >
          Créalos en Roles y permisos
        </a>
        para diferenciar tipos de personal.
      </p>
    }
  `,
})
export class ExtraRolesPicker {
  /** Ids seleccionados (enlace bidireccional con el formulario anfitrión). */
  readonly selected = model<string[]>([]);

  private readonly api = inject(RolesApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly roles = signal<RoleSummary[]>([]);

  constructor() {
    this.api
      .listRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((roles) =>
        this.roles.set(roles.filter((role) => !role.isSystem)),
      );
  }

  protected isSelected(id: string): boolean {
    return this.selected().includes(id);
  }

  protected toggle(id: string): void {
    this.selected.update((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  }
}
