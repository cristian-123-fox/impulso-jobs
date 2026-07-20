import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { AuthErrorCode } from '@/core/models/error-code.enum';
import { AuthApi } from '@/features/public/auth/data/auth.api';
import { RegisterStatus } from '@/features/public/auth/models/auth.models';
import { AuthStepper } from '@/features/public/auth/components/auth-stepper/auth-stepper';
import { MX_STATES, SAT_TAX_REGIMES } from '@/shared/catalogs/mx.catalogs';
import {
  PASSWORD_POLICY_HINT,
  passwordPolicyValidator,
} from '@/shared/validators/password.validator';
import { passwordsMatchValidator } from '@/shared/validators/passwords-match.validator';
import {
  postalCodeValidator,
  rfcValidator,
} from '@/shared/validators/mx-identifiers.validator';
import { IjButton, IjIcon, IjInput, IjOption, IjSelect } from '@/shared/ui';

const STEP_CONTROLS: string[][] = [
  ['email', 'password', 'confirmPassword'],
  ['legalName', 'businessName', 'rfc', 'taxRegime', 'postalCode'],
  ['state', 'municipality'],
];

/** Registro de empresa (HU-005) en 3 pasos, localizado a México. */
@Component({
  selector: 'app-register-company-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthStepper,
    IjButton,
    IjIcon,
    IjInput,
    IjSelect,
  ],
  template: `
    <div class="w-full rounded-[20px] bg-white p-8 shadow-float sm:p-9">
      @if (status() === 'success') {
        <div class="text-center">
          <span
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-green-soft text-accent-green"
          >
            <ij-icon name="mail" [size]="26" />
          </span>
          <h1 class="text-[22px] font-bold tracking-tight text-ink-900">¡Empresa registrada!</h1>
          <p class="mt-2 text-[14.5px] leading-relaxed text-muted">
            Enviamos un enlace de verificación a
            <b class="text-ink-900">{{ form.controls.email.value }}</b>. Verifícalo para poder
            iniciar sesión.
          </p>
          <a
            ij-button
            routerLink="/auth/login"
            variant="primary"
            shape="rounded"
            size="lg"
            class="mt-6 w-full shadow-search"
          >
            Ir a iniciar sesión
          </a>
        </div>
      } @else {
        <h1 class="text-[24px] font-bold tracking-tight text-ink-900">Crea tu cuenta de empresa</h1>
        <p class="mt-1.5 mb-6 text-[14.5px] text-muted">Publica vacantes y encuentra talento.</p>

        <app-auth-stepper [steps]="stepLabels" [current]="step()" />

        @if (errorMessage()) {
          <div
            role="alert"
            class="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13.5px] font-semibold text-red-700"
          >
            <ij-icon name="alert-triangle" [size]="18" class="mt-0.5 shrink-0" />
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form novalidate [formGroup]="form" (ngSubmit)="onSubmit()">
          <!-- Paso 1: Cuenta -->
          @if (step() === 0) {
            <div class="space-y-4">
              <ij-input
                label="Correo electrónico"
                type="email"
                autocomplete="email"
                placeholder="empresa@correo.com"
                [error]="invalid('email') ? 'Ingresa un correo válido.' : null"
                formControlName="email"
              />
              <ij-input
                label="Contraseña"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                [hint]="passwordHint"
                [error]="invalid('password') ? passwordHint : null"
                formControlName="password"
              >
                <button
                  ijSuffix
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-body"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Ocultar' : 'Mostrar'"
                >
                  <ij-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="20" [strokeWidth]="1.9" />
                </button>
              </ij-input>
              <ij-input
                label="Confirmar contraseña"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                [error]="confirmMismatch() ? 'Las contraseñas no coinciden.' : null"
                formControlName="confirmPassword"
              />
            </div>
          }

          <!-- Paso 2: Datos fiscales -->
          @if (step() === 1) {
            <div class="space-y-4">
              <ij-input label="Razón social" placeholder="Impulso Talent S.A. de C.V." [required]="true"
                [error]="invalid('legalName') ? 'La razón social es obligatoria.' : null" formControlName="legalName" />
              <ij-input label="Nombre comercial" placeholder="Impulso Talent" [required]="true"
                [error]="invalid('businessName') ? 'El nombre comercial es obligatorio.' : null" formControlName="businessName" />
              <div class="grid grid-cols-2 gap-3">
                <ij-input label="RFC" placeholder="ABC123456T12" [required]="true"
                  [error]="invalid('rfc') ? 'RFC inválido (12–13 caracteres).' : null" formControlName="rfc" />
                <ij-input label="Código postal" inputmode="numeric" placeholder="44100" [maxLength]="5" [required]="true"
                  [error]="invalid('postalCode') ? 'C.P. de 5 dígitos.' : null" formControlName="postalCode" />
              </div>
              <ij-select label="Régimen fiscal (SAT)" [required]="true" [options]="taxRegimeOptions"
                [error]="invalid('taxRegime') ? 'Selecciona el régimen fiscal.' : null" formControlName="taxRegime" />
            </div>
          }

          <!-- Paso 3: Ubicación y contacto -->
          @if (step() === 2) {
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <ij-select label="Estado" [required]="true" [options]="stateOptions"
                  [error]="invalid('state') ? 'Selecciona el estado.' : null" formControlName="state" />
                <ij-input label="Municipio" placeholder="Guadalajara" [required]="true"
                  [error]="invalid('municipality') ? 'El municipio es obligatorio.' : null" formControlName="municipality" />
              </div>
              <ij-input label="Sector económico (opcional)" placeholder="Tecnología" formControlName="economicSector" />
              <ij-input label="Sitio web (opcional)" type="url" placeholder="https://tuempresa.com" formControlName="website" />
            </div>
          }

          <!-- Navegación -->
          <div class="mt-7 flex items-center gap-3">
            @if (step() > 0) {
              <button ij-button type="button" variant="soft" shape="rounded" size="lg"
                class="flex-1" (click)="prev()">Anterior</button>
            }
            @if (step() < 2) {
              <button ij-button type="button" variant="primary" shape="rounded" size="lg"
                class="flex-1 shadow-search" (click)="next()">Continuar</button>
            } @else {
              <button ij-button type="submit" variant="primary" shape="rounded" size="lg"
                class="flex-1 shadow-search disabled:cursor-wait disabled:opacity-80"
                [disabled]="status() === 'loading'">
                @if (status() === 'loading') {
                  <span class="h-[17px] w-[17px] animate-spin rounded-full border-[2.4px] border-white/40 border-t-white"></span>
                }
                {{ status() === 'loading' ? 'Creando…' : 'Crear cuenta' }}
              </button>
            }
          </div>
        </form>

        <p class="mt-6 text-center text-[13.5px] text-muted">
          ¿Eres candidato?
          <a routerLink="/auth/registro" class="font-semibold text-brand hover:text-brand-600">Regístrate como candidato</a>
        </p>
        <p class="mt-1.5 text-center text-[13.5px] text-muted">
          ¿Ya tienes cuenta?
          <a routerLink="/auth/login" class="font-semibold text-brand hover:text-brand-600">Inicia sesión</a>
        </p>
      }
    </div>
  `,
})
export class RegisterCompanyPage {
  private readonly api = inject(AuthApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly stepLabels = ['Cuenta', 'Datos fiscales', 'Ubicación'];
  protected readonly stateOptions: IjOption[] = MX_STATES.map((s) => ({
    value: s.code,
    label: s.name,
  }));
  protected readonly taxRegimeOptions: IjOption[] = SAT_TAX_REGIMES.map((r) => ({
    value: r.code,
    label: r.name,
  }));
  protected readonly passwordHint = PASSWORD_POLICY_HINT;

  protected readonly step = signal(0);
  protected readonly status = signal<RegisterStatus>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group(
    {
      email: this.fb.control('', [Validators.required, Validators.email]),
      password: this.fb.control('', [
        Validators.required,
        passwordPolicyValidator,
      ]),
      confirmPassword: this.fb.control('', [Validators.required]),
      legalName: this.fb.control('', [Validators.required, Validators.maxLength(160)]),
      businessName: this.fb.control('', [Validators.required, Validators.maxLength(160)]),
      rfc: this.fb.control('', [Validators.required, rfcValidator]),
      taxRegime: this.fb.control('', [Validators.required]),
      postalCode: this.fb.control('', [Validators.required, postalCodeValidator]),
      state: this.fb.control('', [Validators.required]),
      municipality: this.fb.control('', [Validators.required, Validators.maxLength(120)]),
      economicSector: this.fb.control(''),
      website: this.fb.control(''),
    },
    { validators: passwordsMatchValidator('password', 'confirmPassword') },
  );

  protected invalid(name: string): boolean {
    const c = this.form.get(name) as AbstractControl;
    return c.invalid && (c.dirty || c.touched);
  }

  protected confirmMismatch(): boolean {
    const c = this.form.controls.confirmPassword;
    return (
      (c.invalid || this.form.hasError('passwordsMismatch')) &&
      (c.dirty || c.touched)
    );
  }

  protected next(): void {
    if (!this.stepValid(this.step())) {
      this.touchStep(this.step());
      return;
    }
    this.errorMessage.set(null);
    this.step.update((s) => Math.min(s + 1, 2));
  }

  protected prev(): void {
    this.errorMessage.set(null);
    this.step.update((s) => Math.max(s - 1, 0));
  }

  private stepValid(index: number): boolean {
    const controlsValid = STEP_CONTROLS[index].every(
      (name) => this.form.get(name)!.valid,
    );
    if (index === 0) return controlsValid && !this.form.hasError('passwordsMismatch');
    return controlsValid;
  }

  private touchStep(index: number): void {
    STEP_CONTROLS[index].forEach((name) =>
      this.form.get(name)!.markAsTouched(),
    );
  }

  protected onSubmit(): void {
    if (this.status() === 'loading') return;
    if (this.form.invalid) {
      const firstInvalid = STEP_CONTROLS.findIndex((_, i) => !this.stepValid(i));
      if (firstInvalid >= 0) {
        this.step.set(firstInvalid);
        this.touchStep(firstInvalid);
      }
      return;
    }

    const v = this.form.getRawValue();
    this.status.set('loading');
    this.errorMessage.set(null);

    this.api
      .register({
        accountType: 'company',
        email: v.email,
        password: v.password,
        company: {
          businessName: v.businessName,
          legalName: v.legalName,
          rfc: v.rfc.trim().toUpperCase(),
          taxRegime: v.taxRegime,
          postalCode: v.postalCode,
          economicSector: v.economicSector || undefined,
          website: v.website || undefined,
          country: 'MX',
          state: v.state,
          municipality: v.municipality,
        },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.status.set('success'),
        error: (error: unknown) => this.handleError(error),
      });
  }

  private handleError(error: unknown): void {
    this.status.set('idle');
    const code = this.errorCodeOf(error);
    switch (code) {
      case AuthErrorCode.EMAIL_ALREADY_EXISTS:
        this.step.set(0);
        this.form.controls.email.setErrors({ taken: true });
        this.errorMessage.set('Ya existe una cuenta con este correo.');
        break;
      case AuthErrorCode.COMPANY_RFC_ALREADY_EXISTS:
        this.step.set(1);
        this.form.controls.rfc.setErrors({ taken: true });
        this.errorMessage.set('Ya existe una empresa registrada con este RFC.');
        break;
      default:
        this.errorMessage.set('No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.');
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
