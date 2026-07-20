import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { AuthErrorCode } from '@/core/models/error-code.enum';
import { AuthApi } from '@/features/public/auth/data/auth.api';
import { ResetState } from '@/features/public/auth/models/auth.models';
import {
  PASSWORD_POLICY_HINT,
  passwordPolicyValidator,
} from '@/shared/validators/password.validator';
import { passwordsMatchValidator } from '@/shared/validators/passwords-match.validator';
import { IjButton, IjIcon, IjInput } from '@/shared/ui';

/**
 * Restablece la contraseña a partir del `?token=` del magic link. Valida el
 * token al entrar (sólo en navegador), luego pide la nueva contraseña con la
 * misma política del backend y confirma. El token es de un solo uso.
 */
@Component({
  selector: 'app-reset-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [ReactiveFormsModule, RouterLink, IjButton, IjIcon, IjInput],
  template: `
    <div class="w-full rounded-[20px] bg-white p-8 shadow-float sm:p-9">
      @switch (state()) {
        @case ('validating') {
          <div class="flex flex-col items-center py-8 text-center">
            <span
              class="h-8 w-8 animate-spin rounded-full border-[3px] border-brand/25 border-t-brand"
              aria-hidden="true"
            ></span>
            <p class="mt-4 text-[14.5px] text-muted">Validando tu enlace…</p>
          </div>
        }

        @case ('invalid') {
          <div class="text-center">
            <span
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"
            >
              <ij-icon name="alert-triangle" [size]="26" />
            </span>
            <h1 class="text-[22px] font-bold tracking-tight text-ink-900">
              Enlace inválido o expirado
            </h1>
            <p class="mt-2 text-[14.5px] leading-relaxed text-muted">
              Este enlace ya no es válido o ya fue utilizado. Solicita uno nuevo para
              continuar.
            </p>
            <a
              ij-button
              routerLink="/auth/recuperar-password"
              variant="primary"
              shape="rounded"
              size="lg"
              class="mt-6 w-full shadow-search"
            >
              Solicitar un nuevo enlace
            </a>
          </div>
        }

        @case ('success') {
          <div class="text-center">
            <span
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-green-soft text-accent-green"
            >
              <ij-icon name="check" [size]="28" [strokeWidth]="2.6" />
            </span>
            <h1 class="text-[22px] font-bold tracking-tight text-ink-900">
              Contraseña actualizada
            </h1>
            <p class="mt-2 text-[14.5px] leading-relaxed text-muted">
              Tu contraseña se cambió correctamente. Por seguridad, cerramos tus otras
              sesiones. Ya puedes iniciar sesión con la nueva.
            </p>
            <a
              ij-button
              routerLink="/auth/login"
              variant="primary"
              shape="rounded"
              size="lg"
              class="mt-6 w-full shadow-search"
            >
              Iniciar sesión
            </a>
          </div>
        }

        @default {
          <h1 class="text-[25px] font-bold tracking-tight text-ink-900">Nueva contraseña</h1>
          <p class="mt-2 text-[15px] text-muted">
            Crea una contraseña segura para tu cuenta.
          </p>

          @if (errorMessage()) {
            <div
              role="alert"
              class="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13.5px] font-semibold text-red-700"
            >
              <ij-icon name="alert-triangle" [size]="18" class="mt-0.5 shrink-0" />
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form novalidate class="mt-6" [formGroup]="form" (ngSubmit)="onSubmit()">
            <!-- Nueva contraseña -->
            <ij-input
              label="Nueva contraseña"
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="••••••••"
              [hint]="policyHint"
              [error]="passwordInvalid() ? passwordError() : null"
              formControlName="newPassword"
            >
              <button
                ijSuffix
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-body"
                [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                [attr.aria-pressed]="showPassword()"
                (click)="showPassword.set(!showPassword())"
              >
                <ij-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="20" [strokeWidth]="1.9" />
              </button>
            </ij-input>

            <!-- Confirmar contraseña -->
            <div class="mt-5">
              <ij-input
                label="Confirmar contraseña"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                [error]="confirmInvalid() ? confirmError() : null"
                formControlName="confirmPassword"
              />
            </div>

            <button
              ij-button
              type="submit"
              variant="primary"
              shape="rounded"
              size="lg"
              class="mt-6 w-full shadow-search disabled:cursor-wait disabled:opacity-80"
              [disabled]="isSubmitting()"
            >
              @if (isSubmitting()) {
                <span
                  class="h-[17px] w-[17px] animate-spin rounded-full border-[2.4px] border-white/40 border-t-white"
                  aria-hidden="true"
                ></span>
              }
              {{ isSubmitting() ? 'Guardando…' : 'Cambiar contraseña' }}
            </button>
          </form>

          <a
            routerLink="/auth/login"
            class="mt-6 flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-brand"
          >
            <ij-icon name="chevron-left" [size]="16" />
            Volver a iniciar sesión
          </a>
        }
      }
    </div>
  `,
})
export class ResetPasswordPage {
  private readonly api = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly policyHint = PASSWORD_POLICY_HINT;
  protected readonly state = signal<ResetState>('validating');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  private readonly token =
    this.route.snapshot.queryParamMap.get('token') ?? '';

  protected readonly form = this.fb.group(
    {
      newPassword: this.fb.control('', [
        Validators.required,
        passwordPolicyValidator,
      ]),
      confirmPassword: this.fb.control('', [Validators.required]),
    },
    { validators: passwordsMatchValidator('newPassword', 'confirmPassword') },
  );
  private readonly controls = this.form.controls;

  protected readonly isSubmitting = computed(() => this.state() === 'submitting');

  constructor() {
    // La validación golpea la API: sólo en navegador (evita el prerender SSR).
    afterNextRender(() => this.validateToken());
  }

  private validateToken(): void {
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    this.api
      .validateResetToken(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.state.set('form'),
        error: () => this.state.set('invalid'),
      });
  }

  protected passwordInvalid(): boolean {
    const control = this.controls.newPassword;
    return control.invalid && (control.dirty || control.touched);
  }

  protected passwordError(): string {
    return this.controls.newPassword.hasError('required')
      ? 'La contraseña es obligatoria'
      : this.policyHint;
  }

  protected confirmInvalid(): boolean {
    const control = this.controls.confirmPassword;
    const mismatch =
      this.form.hasError('passwordsMismatch') && (control.dirty || control.touched);
    return (control.invalid && (control.dirty || control.touched)) || mismatch;
  }

  protected confirmError(): string {
    if (this.controls.confirmPassword.hasError('required')) {
      return 'Confirma tu contraseña';
    }
    return 'Las contraseñas no coinciden';
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.state.set('submitting');

    const { newPassword, confirmPassword } = this.form.getRawValue();
    this.api
      .confirmPasswordReset({ token: this.token, newPassword, confirmPassword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.state.set('success'),
        error: (error: unknown) => this.handleError(error),
      });
  }

  private handleError(error: unknown): void {
    switch (this.errorCodeOf(error)) {
      case AuthErrorCode.INVALID_RESET_TOKEN:
        // Token expirado o ya usado → no tiene sentido reintentar el formulario.
        this.state.set('invalid');
        break;
      case AuthErrorCode.PASSWORD_MISMATCH:
        this.state.set('form');
        this.errorMessage.set('Las contraseñas no coinciden.');
        break;
      case AuthErrorCode.VALIDATION_ERROR:
        this.state.set('form');
        this.errorMessage.set(this.policyHint);
        break;
      default:
        this.state.set('form');
        this.errorMessage.set('No pudimos cambiar tu contraseña. Inténtalo más tarde.');
    }
  }

  private errorCodeOf(error: unknown): string | undefined {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errorCode;
    }
    return undefined;
  }
}
