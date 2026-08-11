import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjButton, IjOption, IjSelect } from '@/shared/ui';
import {
  COMPANY_MEMBER_ROLE_HINTS,
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMember,
  CompanyMemberRole,
} from '@/features/company/team/models/team.models';

/**
 * Cambio del rol interno de un miembro. Incluye OWNER: así se transfiere la
 * titularidad —el backend impide dejar a la empresa sin propietario—.
 */
@Component({
  selector: 'app-member-role-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjButton, IjSelect],
  template: `
    @if (error()) {
      <p
        role="alert"
        class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
      >
        {{ error() }}
      </p>
    }

    <ij-select
      label="Rol dentro de la empresa"
      name="role"
      [required]="true"
      [options]="roleOptions"
      [searchable]="false"
      [hint]="roleHint()"
      [(ngModel)]="role"
    />

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
        [disabled]="submitting() || role() === member().companyRole"
        (click)="save.emit(role())"
      >
        {{ submitting() ? 'Guardando…' : 'Guardar' }}
      </button>
    </div>
  `,
})
export class MemberRoleForm implements OnInit {
  readonly member = input.required<CompanyMember>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<CompanyMemberRole>();
  readonly cancel = output<void>();

  protected readonly role = signal<CompanyMemberRole>(CompanyMemberRole.MEMBER);

  protected readonly roleOptions: readonly IjOption[] = Object.values(
    CompanyMemberRole,
  ).map((role) => ({ value: role, label: COMPANY_MEMBER_ROLE_LABELS[role] }));

  protected readonly roleHint = computed(
    () => COMPANY_MEMBER_ROLE_HINTS[this.role()],
  );

  ngOnInit(): void {
    this.role.set(this.member().companyRole);
  }
}
