import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { IjButton, IjIcon, IjInput, IjPasswordStrength } from '@/shared/ui';
import {
  PASSWORD_POLICY_HINT,
  passwordPolicyValidator,
} from '@/shared/validators/password.validator';
import { ChangePasswordPayload } from '@/features/account/models/account.models';

/** La confirmación se valida en el grupo: depende de dos controles. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value as string;
  const confirm = group.get('confirmPassword')?.value as string;
  return !confirm || next === confirm ? null : { mismatch: true };
}

/**
 * Cambio de contraseña del propio titular.
 *
 * Pide la actual porque el backend re-autentica, y avisa **antes** de guardar
 * de que la sesión se cerrará: `POST /account/password` mueve `tokensValidFrom`,
 * así que el token con el que se hizo la petición deja de valer al instante.
 * Sin ese aviso, el usuario acaba en el login sin saber por qué.
 */
@Component({
  selector: 'app-account-password-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IjButton,
    IjIcon,
    IjInput,
    IjPasswordStrength,
  ],
  host: { class: 'block' },
  template: `
    <form novalidate [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="grid gap-4 sm:grid-cols-2">
        <ij-input
          class="sm:col-span-2"
          label="Contraseña actual"
          type="password"
          autocomplete="current-password"
          [required]="true"
          [error]="invalid('currentPassword') ? 'Escribe tu contraseña actual.' : null"
          formControlName="currentPassword"
        />

        <div class="flex flex-col gap-2.5">
          <ij-input
            label="Contraseña nueva"
            [type]="show() ? 'text' : 'password'"
            autocomplete="new-password"
            [required]="true"
            [error]="invalid('newPassword') ? hint : null"
            formControlName="newPassword"
          >
            <button
              ijSuffix
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-body"
              [attr.aria-label]="show() ? 'Ocultar' : 'Mostrar'"
              (click)="show.set(!show())"
            >
              <ij-icon [name]="show() ? 'eye-off' : 'eye'" [size]="19" />
            </button>
          </ij-input>
          <ij-password-strength [value]="password()" />
        </div>

        <ij-input
          label="Repite la contraseña nueva"
          [type]="show() ? 'text' : 'password'"
          autocomplete="new-password"
          [required]="true"
          [error]="mismatch() ? 'Las contraseñas no coinciden.' : null"
          formControlName="confirmPassword"
        />
      </div>

      @if (error(); as message) {
        <p
          role="alert"
          class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
        >
          {{ message }}
        </p>
      }

      <div
        class="mt-4 flex items-start gap-2.5 rounded-xl bg-accent-amber-soft px-3.5 py-3 text-accent-amber-strong"
      >
        <ij-icon name="alert-triangle" [size]="17" class="mt-px flex-none" />
        <p class="text-[12.5px] font-semibold leading-snug">
          Al guardar se cerrarán todas tus sesiones, incluida ésta. Tendrás que
          volver a entrar con la contraseña nueva.
        </p>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          ij-button
          type="submit"
          variant="primary"
          shape="rounded"
          size="sm"
          [disabled]="submitting()"
        >
          {{ submitting() ? 'Guardando…' : 'Cambiar contraseña' }}
        </button>
      </div>
    </form>
  `,
})
export class AccountPasswordForm {
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<ChangePasswordPayload>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly hint = PASSWORD_POLICY_HINT;
  protected readonly show = signal(false);

  protected readonly form = this.fb.group(
    {
      currentPassword: this.fb.control('', [Validators.required]),
      newPassword: this.fb.control('', [
        Validators.required,
        passwordPolicyValidator,
      ]),
      confirmPassword: this.fb.control('', [Validators.required]),
    },
    { validators: passwordsMatch },
  );

  private readonly tick = toSignal(this.form.valueChanges, {
    initialValue: null,
  });

  protected readonly password = computed(() => {
    this.tick();
    return this.form.controls.newPassword.value;
  });

  protected readonly mismatch = computed(() => {
    this.tick();
    const confirm = this.form.controls.confirmPassword;
    return this.form.hasError('mismatch') && (confirm.dirty || confirm.touched);
  });

  protected invalid(name: string): boolean {
    const control = this.form.get(name) as AbstractControl;
    return control.invalid && (control.dirty || control.touched);
  }

  /** Limpia el formulario. Lo llama el padre si el guardado falla y se reintenta. */
  reset(): void {
    this.form.reset();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({
      currentPassword: value.currentPassword,
      newPassword: value.newPassword,
    });
  }
}
