import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjButton, IjInput, IjTextarea } from '@/shared/ui';
import {
  PermissionToggle,
  PermissionTree,
  PermissionTreeGroup,
} from '@/shared/permissions/permission-tree';
import {
  CompanyRole,
  SaveCompanyRolePayload,
} from '@/features/company/team/models/team.models';

/**
 * Alta o edición de un rol de la empresa: nombre, descripción y permisos, en
 * un solo guardado. El árbol es el mismo que el de `/admin/roles/:id`, pero
 * sólo con lo que una empresa puede repartir; lo que tiene cualquier rol
 * (leer catálogos, su propia cuenta) sale marcado y bloqueado.
 */
@Component({
  selector: 'app-company-role-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjButton, IjInput, IjTextarea, PermissionTree],
  template: `
    @if (error()) {
      <p
        role="alert"
        class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
      >
        {{ error() }}
      </p>
    }

    <div class="grid gap-4">
      <ij-input
        label="Nombre del rol"
        name="name"
        placeholder="Ej. Reclutador junior"
        [required]="true"
        [maxLength]="80"
        [(ngModel)]="name"
      />
      <ij-textarea
        label="Descripción (opcional)"
        name="description"
        [rows]="2"
        [maxLength]="255"
        hint="Para que el resto del equipo sepa cuándo usarlo."
        [(ngModel)]="description"
      />

      <div>
        <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span class="text-[13px] font-bold text-ink-900">Qué puede hacer</span>
          <span class="text-[12.5px] text-muted">
            {{ chosenCount() }} de {{ editableCount() }} permisos
          </span>
        </div>
        @if (groups().length === 0) {
          <p class="rounded-xl bg-surface px-4 py-6 text-center text-[13px] text-muted">
            Cargando permisos…
          </p>
        } @else {
          <app-permission-tree
            [groups]="groups()"
            [selected]="selected()"
            [locked]="locked()"
            [disabled]="submitting()"
            (toggle)="onToggle($event)"
          />
        }
      </div>
    </div>

    <div
      class="sticky bottom-0 -mx-5 -mb-5 mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white/95 px-5 py-3.5 backdrop-blur-sm sm:-mx-6 sm:px-6"
    >
      <p class="mr-auto text-[12.5px] text-muted">
        Los cambios se aplican al momento a quien tenga el rol.
      </p>
      <button
        type="button"
        class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
        (click)="cancel.emit()"
      >
        Cancelar
      </button>
      <button
        ij-button
        type="button"
        variant="primary"
        shape="rounded"
        size="md"
        [disabled]="submitting() || !canSubmit()"
        (click)="onSubmit()"
      >
        {{ submitting() ? 'Guardando…' : role() ? 'Guardar cambios' : 'Crear rol' }}
      </button>
    </div>
  `,
})
export class CompanyRoleForm implements OnInit {
  /** `null` = alta. */
  readonly role = input<CompanyRole | null>(null);
  readonly groups = input.required<readonly PermissionTreeGroup[]>();
  readonly locked = input.required<ReadonlySet<string>>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<SaveCompanyRolePayload>();
  readonly cancel = output<void>();

  protected readonly name = signal('');
  protected readonly description = signal('');
  /** Códigos marcados a mano (sin los fijos). */
  private readonly chosen = signal<ReadonlySet<string>>(new Set<string>());

  /** Lo que ve el árbol: lo marcado más lo fijo, que siempre se ve marcado. */
  protected readonly selected = computed<ReadonlySet<string>>(
    () => new Set([...this.chosen(), ...this.locked()]),
  );

  protected readonly editableCount = computed(
    () =>
      this.groups()
        .flatMap((group) => group.items)
        .filter((item) => !this.locked().has(item.id)).length,
  );

  protected readonly chosenCount = computed(() => this.chosen().size);

  protected readonly canSubmit = computed(
    () => this.name().trim().length > 0 && this.chosen().size > 0,
  );

  ngOnInit(): void {
    const role = this.role();
    if (!role) return;
    this.name.set(role.name);
    this.description.set(role.description ?? '');
    this.chosen.set(new Set(role.permissionCodes));
  }

  protected onToggle(event: PermissionToggle): void {
    const next = new Set(this.chosen());
    for (const id of event.ids) {
      if (this.locked().has(id)) continue;
      if (event.checked) next.add(id);
      else next.delete(id);
    }
    this.chosen.set(next);
  }

  protected onSubmit(): void {
    if (!this.canSubmit()) return;
    this.save.emit({
      name: this.name().trim(),
      description: this.description().trim() || undefined,
      permissionCodes: [...this.chosen()],
    });
  }
}
