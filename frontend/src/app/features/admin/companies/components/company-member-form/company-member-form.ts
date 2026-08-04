import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Role } from '@/core/models/role.enum';
import { IjButton, IjIcon, IjInput, IjOption, IjSelect } from '@/shared/ui';
import {
  PASSWORD_POLICY_HINT,
  passwordPolicyValidator,
} from '@/shared/validators/password.validator';
import { UsersApi } from '@/features/admin/users/data/users.api';
import {
  AddCompanyMemberPayload,
  COMPANY_MEMBER_ROLE_HINTS,
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMemberRole,
} from '@/features/admin/companies/models/companies.models';

type MemberSource = 'existing' | 'new';

/**
 * Alta de un miembro del equipo. O se vincula una cuenta de empresa que ya
 * existe y no pertenece a ninguna, o se crea una nueva (verificada y activa).
 */
@Component({
  selector: 'app-company-member-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjIcon, IjInput, IjSelect],
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

      <div class="mb-4 flex gap-2 rounded-xl bg-surface p-1.5">
        @for (option of sourceOptions; track option.value) {
          <button
            type="button"
            [class]="sourceClass(option.value)"
            (click)="setSource(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        @if (source() === 'existing') {
          <div class="sm:col-span-2">
            <ij-select
              label="Cuenta de empresa sin asignar"
              [required]="true"
              [options]="availableUsers()"
              [error]="invalid('userId') ? 'Selecciona una cuenta.' : null"
              [hint]="
                availableUsers().length
                  ? 'Sólo se listan cuentas de empresa que no pertenecen a ninguna.'
                  : 'No hay cuentas de empresa libres: crea una nueva.'
              "
              formControlName="userId"
            />
          </div>
        } @else {
          <ij-input
            label="Correo electrónico"
            type="email"
            placeholder="persona@empresa.com"
            [required]="true"
            [error]="invalid('email') ? 'Ingresa un correo válido.' : null"
            formControlName="email"
          />
          <ij-input
            label="Contraseña"
            [type]="showPassword() ? 'text' : 'password'"
            placeholder="••••••••"
            [required]="true"
            [hint]="passwordHint"
            [error]="invalid('password') ? passwordHint : null"
            formControlName="password"
          >
            <button
              ijSuffix
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-body"
              [attr.aria-label]="showPassword() ? 'Ocultar' : 'Mostrar'"
              (click)="showPassword.set(!showPassword())"
            >
              <ij-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="19" />
            </button>
          </ij-input>
        }

        <div class="sm:col-span-2">
          <ij-select
            label="Rol dentro de la empresa"
            [required]="true"
            [options]="roleOptions"
            [searchable]="false"
            [hint]="roleHint()"
            formControlName="role"
          />
        </div>
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
          type="submit"
          variant="primary"
          shape="rounded"
          size="md"
          [disabled]="submitting()"
        >
          {{ submitting() ? 'Agregando…' : 'Agregar al equipo' }}
        </button>
      </div>
    </form>
  `,
})
export class CompanyMemberForm {
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly add = output<AddCompanyMemberPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly usersApi = inject(UsersApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  protected readonly showPassword = signal(false);
  protected readonly source = signal<MemberSource>('existing');
  protected readonly availableUsers = signal<readonly IjOption[]>([]);

  protected readonly sourceOptions: readonly {
    value: MemberSource;
    label: string;
  }[] = [
    { value: 'existing', label: 'Cuenta existente' },
    { value: 'new', label: 'Crear cuenta nueva' },
  ];

  protected readonly roleOptions: readonly IjOption[] = Object.values(
    CompanyMemberRole,
  ).map((role) => ({ value: role, label: COMPANY_MEMBER_ROLE_LABELS[role] }));

  protected readonly form = this.fb.group({
    userId: this.fb.control('', [Validators.required]),
    email: this.fb.control(''),
    password: this.fb.control(''),
    role: this.fb.control<CompanyMemberRole>(CompanyMemberRole.RECRUITER, [
      Validators.required,
    ]),
  });

  private readonly selectedRole = signal<CompanyMemberRole>(
    CompanyMemberRole.RECRUITER,
  );

  protected readonly roleHint = computed(
    () => COMPANY_MEMBER_ROLE_HINTS[this.selectedRole()],
  );

  constructor() {
    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => this.selectedRole.set(role));

    // Cuentas de empresa que aún no pertenecen a ninguna empresa.
    this.usersApi
      .list({ page: 1, limit: 100, role: Role.EMPLOYER })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const free = result.items.filter((user) => !user.companyId);
        this.availableUsers.set(
          free.map((user) => ({ value: user.id, label: user.email })),
        );
        // Sin cuentas libres, el alta sólo puede ser creando una nueva.
        if (free.length === 0) this.setSource('new');
      });
  }

  protected setSource(source: MemberSource): void {
    this.source.set(source);
    const { userId, email, password } = this.form.controls;

    if (source === 'existing') {
      userId.setValidators([Validators.required]);
      email.clearValidators();
      password.clearValidators();
      email.setValue('');
      password.setValue('');
    } else {
      userId.clearValidators();
      userId.setValue('');
      email.setValidators([Validators.required, Validators.email]);
      password.setValidators([Validators.required, passwordPolicyValidator]);
    }

    userId.updateValueAndValidity();
    email.updateValueAndValidity();
    password.updateValueAndValidity();
  }

  protected sourceClass(source: MemberSource): string {
    const base =
      'flex-1 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors';
    return source === this.source()
      ? `${base} bg-white text-brand shadow-card`
      : `${base} text-muted hover:text-body`;
  }

  protected invalid(name: string): boolean {
    const control = this.form.get(name) as AbstractControl;
    return control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.add.emit(
      this.source() === 'existing'
        ? { role: value.role, userId: value.userId }
        : {
            role: value.role,
            email: value.email.trim().toLowerCase(),
            password: value.password,
          },
    );
  }
}
