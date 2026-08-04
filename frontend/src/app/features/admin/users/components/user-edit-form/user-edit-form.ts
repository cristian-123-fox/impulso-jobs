import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
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
import { ExtraRolesPicker } from '@/features/admin/users/components/extra-roles-picker/extra-roles-picker';
import {
  AdminUser,
  ROLE_LABELS,
  STATUS_LABELS,
  UpdateUserPayload,
  UserStatus,
} from '@/features/admin/users/models/users.models';

/** Lo que devuelve el formulario: cambios de la cuenta y, aparte, sus roles. */
export interface UserEditResult {
  changes: UpdateUserPayload;
  /** `null` si la selección de roles adicionales no cambió. */
  extraRoleIds: string[] | null;
}

/**
 * Edición de una cuenta: correo, rol, estado y restablecimiento de contraseña.
 * La contraseña es opcional — si se deja vacía no se toca; al cambiarla, el
 * backend invalida las sesiones vigentes de ese usuario.
 */
@Component({
  selector: 'app-user-edit-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ExtraRolesPicker,
    IjButton,
    IjIcon,
    IjInput,
    IjSelect,
  ],
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
          [required]="true"
          [error]="invalid('email') ? 'Ingresa un correo válido.' : null"
          formControlName="email"
        />
        <ij-select
          label="Rol de plataforma"
          [options]="roleOptions"
          [searchable]="false"
          [hint]="isSelf() ? 'No puedes cambiar tu propio rol.' : ''"
          formControlName="role"
        />
        <ij-select
          label="Estado"
          [options]="statusOptions"
          [searchable]="false"
          [hint]="isSelf() ? 'No puedes desactivar tu propia cuenta.' : ''"
          formControlName="status"
        />
        <ij-input
          label="Nueva contraseña (opcional)"
          [type]="showPassword() ? 'text' : 'password'"
          placeholder="Dejar vacío para no cambiarla"
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
      </div>

      @if (form.controls.role.value === admin) {
        <app-extra-roles-picker class="mt-5" [(selected)]="extraRoleIds" />
      }

      <label class="mt-4 flex items-center gap-2.5 text-[13.5px] text-body">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
          formControlName="emailVerified"
        />
        Correo verificado (sin esto la cuenta no puede iniciar sesión)
      </label>

      <div
        class="mt-6 flex justify-end gap-3 border-t border-line pt-4"
      >
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
          {{ submitting() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </form>
  `,
})
export class UserEditForm {
  readonly user = input.required<AdminUser>();
  readonly isSelf = input(false);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<UserEditResult>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  protected readonly showPassword = signal(false);
  protected readonly admin = Role.ADMIN;
  protected readonly extraRoleIds = signal<string[]>([]);
  /** Selección de partida, para saber si los roles cambiaron al guardar. */
  private readonly initialExtraRoleIds = signal<string[]>([]);

  protected readonly roleOptions: readonly IjOption[] = Object.values(Role).map(
    (role) => ({ value: role, label: ROLE_LABELS[role] }),
  );
  protected readonly statusOptions: readonly IjOption[] = Object.values(
    UserStatus,
  ).map((status) => ({ value: status, label: STATUS_LABELS[status] }));

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    role: this.fb.control<Role>(Role.CANDIDATE),
    status: this.fb.control<UserStatus>(UserStatus.ACTIVE),
    password: this.fb.control('', [passwordPolicyValidator]),
    emailVerified: this.fb.control(true),
  });

  constructor() {
    effect(() => {
      const user = this.user();
      this.form.reset({
        email: user.email,
        role: user.role,
        status: user.status,
        password: '',
        emailVerified: user.emailVerified,
      });
      const extra = (user.roles ?? [])
        .filter((role) => !role.isSystem)
        .map((role) => role.id);
      this.extraRoleIds.set(extra);
      this.initialExtraRoleIds.set(extra);
      // El propio administrador no puede degradarse ni desactivarse.
      const lock = this.isSelf();
      lock ? this.form.controls.role.disable() : this.form.controls.role.enable();
      lock
        ? this.form.controls.status.disable()
        : this.form.controls.status.enable();
    });
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
    const user = this.user();
    const payload: UpdateUserPayload = {};

    if (value.email.trim().toLowerCase() !== user.email) {
      payload.email = value.email.trim().toLowerCase();
    }
    if (!this.isSelf() && value.role !== user.role) payload.role = value.role;
    if (!this.isSelf() && value.status !== user.status) {
      payload.status = value.status;
    }
    if (value.emailVerified !== user.emailVerified) {
      payload.emailVerified = value.emailVerified;
    }
    if (value.password) payload.password = value.password;

    this.save.emit({
      changes: payload,
      extraRoleIds: this.rolesChanged() ? this.extraRoleIds() : null,
    });
  }

  private rolesChanged(): boolean {
    const before = this.initialExtraRoleIds();
    const now = this.extraRoleIds();
    return (
      before.length !== now.length || now.some((id) => !before.includes(id))
    );
  }
}
