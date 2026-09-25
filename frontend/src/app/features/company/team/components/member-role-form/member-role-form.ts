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
import { IjButton, IjIcon, IjOption, IjSelect } from '@/shared/ui';
import {
  COMPANY_MEMBER_ROLE_HINTS,
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMember,
  CompanyMemberRole,
  CompanyRole,
  FULL_ACCESS,
  TEAM_MANAGER_ROLES,
} from '@/features/company/team/models/team.models';

/** Lo que se guarda: rol interno y rol de acceso (`null` = completo). */
export interface MemberRoleChange {
  role: CompanyMemberRole;
  accessRoleId: string | null;
}

/**
 * Rol interno y permisos de un miembro. Incluye OWNER: así se transfiere la
 * titularidad —el backend impide dejar a la empresa sin propietario—.
 *
 * El rol de acceso sólo se ofrece a reclutador y miembro: propietario y
 * administrador tienen siempre el acceso completo, para que nadie pueda
 * quitarse a sí mismo la gestión del equipo.
 */
@Component({
  selector: 'app-member-role-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjButton, IjIcon, IjSelect],
  template: `
    @if (error()) {
      <p
        role="alert"
        class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
      >
        {{ error() }}
      </p>
    }

    <div class="flex flex-col gap-4">
      <ij-select
        label="Rol dentro de la empresa"
        name="role"
        [required]="true"
        [options]="roleOptions"
        [searchable]="false"
        [hint]="roleHint()"
        [(ngModel)]="role"
      />

      @if (isManager()) {
        <p class="flex items-start gap-2 rounded-xl bg-surface px-3.5 py-3 text-[12.5px] text-muted">
          <ij-icon name="shield" [size]="15" class="mt-0.5 flex-shrink-0 text-brand-strong" />
          <span>Con este rol tiene siempre el <strong class="text-body">acceso completo</strong>.</span>
        </p>
      } @else {
        <ij-select
          label="Permisos"
          name="access"
          [options]="accessOptions()"
          [searchable]="false"
          [hint]="accessHint()"
          [(ngModel)]="access"
        />
      }
    </div>

    <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
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
        [disabled]="submitting() || !changed()"
        (click)="onSubmit()"
      >
        {{ submitting() ? 'Guardando…' : 'Guardar' }}
      </button>
    </div>
  `,
})
export class MemberRoleForm implements OnInit {
  readonly member = input.required<CompanyMember>();
  /** Roles de la empresa que se pueden asignar. */
  readonly roles = input<readonly CompanyRole[]>([]);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<MemberRoleChange>();
  readonly cancel = output<void>();

  protected readonly role = signal<CompanyMemberRole>(CompanyMemberRole.MEMBER);
  protected readonly access = signal<string>(FULL_ACCESS);

  protected readonly roleOptions: readonly IjOption[] = Object.values(
    CompanyMemberRole,
  ).map((role) => ({ value: role, label: COMPANY_MEMBER_ROLE_LABELS[role] }));

  protected readonly roleHint = computed(
    () => COMPANY_MEMBER_ROLE_HINTS[this.role()],
  );

  protected readonly isManager = computed(() =>
    TEAM_MANAGER_ROLES.includes(this.role()),
  );

  protected readonly accessOptions = computed<readonly IjOption[]>(() => [
    { value: FULL_ACCESS, label: 'Acceso completo' },
    ...this.roles().map((role) => ({ value: role.id, label: role.name })),
  ]);

  protected readonly accessHint = computed(() => {
    const chosen = this.roles().find((role) => role.id === this.access());
    if (chosen) {
      return chosen.description || `${chosen.permissionCodes.length} permisos.`;
    }
    return this.roles().length
      ? 'Todo lo que permite la cuenta de empresa. Elige un rol para limitarlo.'
      : 'Todo lo que permite la cuenta de empresa. Crea roles en la pestaña «Roles» para limitarlo.';
  });

  /** Rol de acceso efectivo que se guardaría. */
  private readonly accessRoleId = computed<string | null>(() =>
    this.isManager() || this.access() === FULL_ACCESS ? null : this.access(),
  );

  protected readonly changed = computed(
    () =>
      this.role() !== this.member().companyRole ||
      this.accessRoleId() !== (this.member().accessRole?.id ?? null),
  );

  ngOnInit(): void {
    this.role.set(this.member().companyRole);
    this.access.set(this.member().accessRole?.id ?? FULL_ACCESS);
  }

  protected onSubmit(): void {
    this.save.emit({ role: this.role(), accessRoleId: this.accessRoleId() });
  }
}
