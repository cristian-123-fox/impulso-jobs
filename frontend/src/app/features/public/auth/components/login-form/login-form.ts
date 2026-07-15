import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AccountType,
  LoginCredentials,
  LoginStatus,
  ResendStatus,
} from '@/features/public/auth/models/auth.models';
import { IjButton, IjIcon } from '@/shared/ui';

const INPUT_BASE =
  'w-full rounded-xl border bg-surface px-4 py-3.5 text-[15px] text-body ' +
  'outline-none transition placeholder:text-muted focus:ring-2';

/**
 * Tarjeta del formulario de acceso (presentacional). Incluye el selector
 * Candidato/Empresa, valida con un formulario reactivo tipado y emite las
 * credenciales; el estado del envío llega por inputs desde la fachada.
 */
@Component({
  selector: 'app-login-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [ReactiveFormsModule, RouterLink, IjButton, IjIcon],
  template: `
    <form
      novalidate
      [formGroup]="form"
      [class.animate-shake]="isError()"
      class="w-full rounded-[20px] bg-white p-8 shadow-float sm:p-9"
      (ngSubmit)="onSubmit()"
    >
      <h1 class="text-[25px] font-bold tracking-tight text-ink-900">Inicia sesión</h1>
      <p class="mt-2 text-[15px] text-muted">
        Ingresa a tu cuenta de {{ accountType() === 'company' ? 'empresa' : 'candidato' }}
      </p>

      <!-- Selector de tipo de cuenta -->
      <div class="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-surface p-1" role="tablist">
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="accountType() === 'candidate'"
          [class]="segClass('candidate')"
          (click)="accountType.set('candidate')"
        >
          Candidato
        </button>
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="accountType() === 'company'"
          [class]="segClass('company')"
          (click)="accountType.set('company')"
        >
          Empresa
        </button>
      </div>

      <!-- Banner de error / verificación -->
      @if (isError()) {
        <div
          role="alert"
          class="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-700"
        >
          <ij-icon name="alert-triangle" [size]="18" class="mt-0.5 shrink-0" />
          <div class="flex-1 text-[13.5px]">
            <p class="font-semibold">
              {{ errorMessage() ?? 'No pudimos iniciar sesión. Inténtalo de nuevo.' }}
            </p>
            @if (showResend()) {
              <div class="mt-2">
                @if (resendStatus() === 'sent') {
                  <span class="font-semibold text-accent-green">
                    Te reenviamos el enlace de verificación a tu correo.
                  </span>
                } @else {
                  <button
                    type="button"
                    class="font-bold text-brand underline transition-opacity hover:text-brand-600 disabled:opacity-60"
                    [disabled]="resendStatus() === 'sending'"
                    (click)="resendRequested.emit()"
                  >
                    {{ resendStatus() === 'sending' ? 'Reenviando…' : 'Reenviar correo de verificación' }}
                  </button>
                  @if (resendStatus() === 'error') {
                    <span class="ml-2 text-red-600">No se pudo reenviar. Intenta de nuevo.</span>
                  }
                }
              </div>
            }
          </div>
        </div>
      }

      @if (isSuccess()) {
        <div
          role="status"
          class="mt-5 flex items-center gap-2.5 rounded-xl border border-accent-green/25 bg-accent-green-soft px-3.5 py-3 text-[13.5px] font-semibold text-accent-green"
        >
          <ij-icon name="check" [size]="18" [strokeWidth]="2.6" />
          <span>Sesión iniciada. Redirigiendo…</span>
        </div>
      }

      <!-- Correo -->
      <div class="mt-6">
        <label for="login-email" class="mb-2 block text-sm font-semibold text-ink-900">
          Correo electrónico
        </label>
        <input
          id="login-email"
          type="email"
          formControlName="email"
          autocomplete="email"
          placeholder="tucorreo@ejemplo.com"
          [class]="inputClass('email')"
          [attr.aria-invalid]="isInvalid('email')"
        />
        @if (emailError()) {
          <p class="mt-1.5 text-xs font-medium text-red-600">{{ emailError() }}</p>
        }
      </div>

      <!-- Contraseña -->
      <div class="mt-5">
        <label for="login-password" class="mb-2 block text-sm font-semibold text-ink-900">
          Contraseña
        </label>
        <div class="relative">
          <input
            id="login-password"
            [type]="showPassword() ? 'text' : 'password'"
            formControlName="password"
            autocomplete="current-password"
            placeholder="••••••••"
            [class]="inputClass('password') + ' pr-12'"
            [attr.aria-invalid]="isInvalid('password')"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-body"
            [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            [attr.aria-pressed]="showPassword()"
            (click)="togglePassword()"
          >
            <ij-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="20" [strokeWidth]="1.9" />
          </button>
        </div>
        @if (passwordError()) {
          <p class="mt-1.5 text-xs font-medium text-red-600">{{ passwordError() }}</p>
        }
      </div>

      <!-- Recordar / recuperar -->
      <div class="mt-4 flex items-center justify-between gap-3">
        <label class="flex cursor-pointer select-none items-center gap-2.5 text-[13.5px] text-body">
          <input
            type="checkbox"
            formControlName="remember"
            class="h-[17px] w-[17px] cursor-pointer rounded accent-brand"
          />
          Recordar sesión
        </label>
        <a
          routerLink="/auth/recuperar-password"
          class="text-[13.5px] font-semibold text-brand transition-colors hover:text-brand-600"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <!-- Enviar -->
      <button
        ij-button
        type="submit"
        variant="primary"
        shape="rounded"
        size="lg"
        class="mt-6 w-full shadow-search disabled:cursor-wait disabled:opacity-80"
        [disabled]="isLoading()"
      >
        @if (isLoading()) {
          <span
            class="h-[17px] w-[17px] animate-spin rounded-full border-[2.4px] border-white/40 border-t-white"
            aria-hidden="true"
          ></span>
        }
        {{ submitLabel() }}
      </button>

      <!-- Accesos sociales -->
      @if (showSocialLogins()) {
        <div class="mt-7">
          <div class="flex items-center gap-3.5">
            <span class="whitespace-nowrap text-[13.5px] font-semibold text-body">O ingresa con</span>
            <span class="h-px flex-1 bg-line"></span>
          </div>
          <div class="mt-4 flex justify-center gap-3">
            <button type="button" [class]="socialClass" aria-label="Ingresar con LinkedIn">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0ZM.2 8.2h4.56V24H.2V8.2Zm7.14 0h4.37v2.16h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 6.99V24h-4.56v-6.99c0-1.67-.03-3.82-2.33-3.82-2.33 0-2.69 1.82-2.69 3.7V24H7.34V8.2Z" />
              </svg>
            </button>
            <button type="button" [class]="socialClass" aria-label="Ingresar con X">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.24 2.25h3.31l-7.23 8.26L22.75 21.75h-6.66l-5.22-6.82-5.97 6.82H1.58l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.02 4.13H5.05L17.08 19.77Z" />
              </svg>
            </button>
            <button type="button" [class]="socialClass" aria-label="Ingresar con Google">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.57-5.17 3.57-8.87Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
              </svg>
            </button>
          </div>
        </div>
      }

      <p class="mt-6 text-center text-[13.5px] text-muted">
        ¿No tienes cuenta?
        <a [routerLink]="registerLink()" class="font-semibold text-brand transition-colors hover:text-brand-600">
          Crea una cuenta
        </a>
      </p>
    </form>
  `,
})
export class LoginForm {
  readonly status = input<LoginStatus>('idle');
  readonly errorMessage = input<string | null>(null);
  readonly showResend = input(false);
  readonly resendStatus = input<ResendStatus>('idle');
  readonly showSocialLogins = input(true);
  readonly submitted = output<LoginCredentials>();
  readonly resendRequested = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    remember: this.fb.control(true),
  });
  protected readonly controls = this.form.controls;

  protected readonly accountType = signal<AccountType>('candidate');
  protected readonly showPassword = signal(false);

  protected readonly isLoading = computed(() => this.status() === 'loading');
  protected readonly isSuccess = computed(() => this.status() === 'success');
  protected readonly isError = computed(() => this.status() === 'error');

  protected readonly submitLabel = computed(() =>
    this.isLoading() ? 'Ingresando…' : this.isSuccess() ? 'Sesión iniciada' : 'Ingresar',
  );

  protected readonly registerLink = computed(() =>
    this.accountType() === 'company' ? '/auth/registro/empresa' : '/auth/registro',
  );

  protected readonly socialClass =
    'flex h-[46px] w-[52px] items-center justify-center rounded-xl border ' +
    'border-line bg-surface text-ink-900 transition-colors ' +
    'hover:border-brand/30 hover:bg-brand-50';

  protected segClass(type: AccountType): string {
    const base = 'rounded-lg py-2.5 text-sm font-semibold transition-colors';
    return this.accountType() === type
      ? `${base} bg-white text-brand shadow-sm`
      : `${base} text-muted hover:text-body`;
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected isInvalid(name: 'email' | 'password'): boolean {
    const control = this.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  protected inputClass(name: 'email' | 'password'): string {
    return this.isInvalid(name)
      ? `${INPUT_BASE} border-red-300 focus:border-red-400 focus:ring-red-200/70`
      : `${INPUT_BASE} border-line focus:border-brand focus:ring-brand/25`;
  }

  protected emailError(): string {
    if (!this.isInvalid('email')) return '';
    return this.controls.email.hasError('required')
      ? 'El correo es obligatorio'
      : 'Ingresa un correo válido';
  }

  protected passwordError(): string {
    if (!this.isInvalid('password')) return '';
    return this.controls.password.hasError('required')
      ? 'La contraseña es obligatoria'
      : 'La contraseña debe tener al menos 6 caracteres';
  }

  protected onSubmit(): void {
    if (this.isLoading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({ ...value, accountType: this.accountType() });
  }
}
