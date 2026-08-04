import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IjButton, IjOption, IjSelect } from '@/shared/ui';
import {
  COMPANY_MEMBER_ROLE_HINTS,
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMember,
  CompanyMemberRole,
} from '@/features/admin/companies/models/companies.models';

/** Cambio del rol interno de un miembro, con la descripción de cada rol. */
@Component({
  selector: 'app-company-member-role-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjSelect],
  template: `
    <form novalidate [formGroup]="form" (ngSubmit)="onSubmit()">
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
        [required]="true"
        [options]="roleOptions"
        [searchable]="false"
        formControlName="role"
      />

      <ul class="mt-4 flex flex-col gap-2">
        @for (role of roles; track role) {
          <li
            class="rounded-xl border px-3.5 py-2.5 text-[13px] transition-colors"
            [class]="
              role === selectedRole()
                ? 'border-brand bg-brand-50/60 text-body'
                : 'border-line text-muted'
            "
          >
            <span class="font-bold text-ink-900">{{ label(role) }}</span>
            — {{ hint(role) }}
          </li>
        }
      </ul>

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
          type="submit"
          variant="primary"
          shape="rounded"
          size="md"
          [disabled]="submitting() || selectedRole() === member().companyRole"
        >
          {{ submitting() ? 'Guardando…' : 'Guardar rol' }}
        </button>
      </div>
    </form>
  `,
})
export class CompanyMemberRoleForm implements OnInit {
  readonly member = input.required<CompanyMember>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<CompanyMemberRole>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly roles = Object.values(CompanyMemberRole);
  protected readonly roleOptions: readonly IjOption[] = this.roles.map(
    (role) => ({ value: role, label: COMPANY_MEMBER_ROLE_LABELS[role] }),
  );

  protected readonly form = this.fb.group({
    role: this.fb.control<CompanyMemberRole>(CompanyMemberRole.MEMBER, [
      Validators.required,
    ]),
  });

  private readonly current = signal<CompanyMemberRole>(CompanyMemberRole.MEMBER);
  protected readonly selectedRole = computed(() => this.current());

  constructor() {
    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => this.current.set(role));
  }

  ngOnInit(): void {
    this.form.controls.role.setValue(this.member().companyRole);
  }

  protected label(role: CompanyMemberRole): string {
    return COMPANY_MEMBER_ROLE_LABELS[role];
  }

  protected hint(role: CompanyMemberRole): string {
    return COMPANY_MEMBER_ROLE_HINTS[role];
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.save.emit(this.form.getRawValue().role);
  }
}
