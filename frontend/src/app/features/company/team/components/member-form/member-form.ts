import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
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
import { IjButton, IjIcon, IjInput, IjOption, IjSelect } from '@/shared/ui';
import {
  PASSWORD_POLICY_HINT,
  passwordPolicyValidator,
} from '@/shared/validators/password.validator';
import {
  AddCompanyMemberPayload,
  COMPANY_MEMBER_ROLE_HINTS,
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMemberRole,
  CompanyRole,
  FULL_ACCESS,
  TEAM_MANAGER_ROLES,
} from '@/features/company/team/models/team.models';

/**
 * Alta de un usuario del equipo. Crea la cuenta ya verificada y activa: la
 * persona puede entrar de inmediato con el correo y la contraseña que se le
 * dan aquí.
 *
 * A diferencia del back-office, no ofrece "vincular una cuenta existente":
 * eso exigiría listarle a la empresa cuentas de la plataforma que no son suyas.
 */
@Component({
  selector: 'app-member-form',
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

      <div class="grid gap-4 sm:grid-cols-2">
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
        @if (isManager()) {
          <p class="rounded-xl bg-surface px-3.5 py-3 text-[12.5px] text-muted sm:col-span-2">
            Un administrador tiene siempre el <strong class="text-body">acceso completo</strong>.
          </p>
        } @else {
          <div class="sm:col-span-2">
            <ij-select
              label="Permisos"
              [options]="accessOptions()"
              [searchable]="false"
              [hint]="
                roles().length
                  ? 'Elige un rol para limitar lo que puede hacer.'
                  : 'Crea roles en la pestaña «Roles» para limitar lo que puede hacer.'
              "
              formControlName="access"
            />
          </div>
        }
      </div>

      <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <p class="mr-auto text-[12.5px] text-muted">
          La cuenta queda activa: comparte estos datos con la persona.
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
export class MemberForm {
  /** Roles de la empresa que se pueden asignar. */
  readonly roles = input<readonly CompanyRole[]>([]);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly add = output<AddCompanyMemberPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  protected readonly showPassword = signal(false);

  /** Sin OWNER: el titular se transfiere cambiando el rol, no dando de alta. */
  protected readonly roleOptions: readonly IjOption[] = [
    CompanyMemberRole.ADMIN,
    CompanyMemberRole.RECRUITER,
    CompanyMemberRole.MEMBER,
  ].map((role) => ({ value: role, label: COMPANY_MEMBER_ROLE_LABELS[role] }));

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [
      Validators.required,
      passwordPolicyValidator,
    ]),
    role: this.fb.control<CompanyMemberRole>(CompanyMemberRole.RECRUITER, [
      Validators.required,
    ]),
    access: this.fb.control<string>(FULL_ACCESS),
  });

  protected readonly accessOptions = computed<readonly IjOption[]>(() => [
    { value: FULL_ACCESS, label: 'Acceso completo' },
    ...this.roles().map((role) => ({ value: role.id, label: role.name })),
  ]);

  private readonly selectedRole = signal<CompanyMemberRole>(
    CompanyMemberRole.RECRUITER,
  );
  protected readonly roleHint = computed(
    () => COMPANY_MEMBER_ROLE_HINTS[this.selectedRole()],
  );
  protected readonly isManager = computed(() =>
    TEAM_MANAGER_ROLES.includes(this.selectedRole()),
  );

  constructor() {
    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => this.selectedRole.set(role));
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
    this.add.emit({
      role: value.role,
      accessRoleId:
        TEAM_MANAGER_ROLES.includes(value.role) || value.access === FULL_ACCESS
          ? null
          : value.access,
      email: value.email.trim().toLowerCase(),
      password: value.password,
    });
  }
}
